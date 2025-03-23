import { Collection, ObjectId } from 'mongodb';
import { getDb } from '../config/db.config';
import { WorkflowDocument, CreateWorkflowDto } from '../models/workflow.model';
import { lock } from 'proper-lockfile';
import * as path from 'path';
import * as fs from 'fs/promises';
import { LoggerService } from '../../server/services/logger.service';

interface ManifestEntry {
  id: string;
  path: string;
}

interface ManifestData {
  workflows: ManifestEntry[];
}

export class WorkflowService {
  private collection: Collection<WorkflowDocument> | null = null;
  private readonly manifestPath: string;

  constructor() {
    this.manifestPath = path.join(process.cwd(), 'docs', 'workflow', 'manifest.json');
  }

  private async initCollection() {
    if (!this.collection) {
      const db = await getDb();
      this.collection = db.collection<WorkflowDocument>('workflows');
    }
    return this.collection;
  }

  async createWorkflow(dto: CreateWorkflowDto): Promise<WorkflowDocument> {
    await LoggerService.log('Creating workflow in database', { dto });
    
    const collection = await this.initCollection();
    
    // Clean the file paths before storing in database
    const cleanWorkflowName = dto.title.replace(/\s+/g, '-');
    await LoggerService.log('Generated clean workflow name', { 
      original: dto.title,
      cleaned: cleanWorkflowName 
    });
    
    const workflow: WorkflowDocument = {
      id: new ObjectId().toHexString(),
      ...dto,
      files: {
        workflow: cleanWorkflowName,
        parameters: cleanWorkflowName,
        preview: dto.files.preview ? cleanWorkflowName : undefined
      },
      created: new Date(),
      modified: new Date(),
      metadata: dto.metadata || {}
    };

    await LoggerService.log('Inserting workflow document', { workflow });
    await collection.insertOne(workflow);
    
    await this.updateManifest(workflow);
    return workflow;
  }

  async updateWorkflow(id: string, dto: Partial<CreateWorkflowDto>): Promise<WorkflowDocument | null> {
    const collection = await this.initCollection();
    
    const update = {
      $set: {
        ...dto,
        modified: new Date()
      }
    };

    const result = await collection.findOneAndUpdate(
      { id },
      update,
      { returnDocument: 'after' }
    );

    if (result) {
      await this.updateManifest(result);
    }

    return result;
  }

  async getWorkflow(id: string): Promise<WorkflowDocument | null> {
    const collection = await this.initCollection();
    return collection.findOne({ id });
  }

  async listWorkflows(): Promise<WorkflowDocument[]> {
    const collection = await this.initCollection();
    return collection.find().toArray();
  }

  async deleteWorkflow(id: string): Promise<boolean> {
    const collection = await this.initCollection();
    const result = await collection.deleteOne({ id });
    return result.deletedCount > 0;
  }

  async updateManifest(workflow: WorkflowDocument): Promise<void> {
    await LoggerService.log('Starting manifest update', { workflowId: workflow.id });
    
    // Use proper-lockfile to handle concurrent manifest updates
    const release = await lock(this.manifestPath, { retries: 5 });
    try {
      const manifestContent = await fs.readFile(this.manifestPath, 'utf-8');
      const manifest: ManifestData = JSON.parse(manifestContent);
      await LoggerService.log('Current manifest content', { manifest });

      // Extract just the workflow name
      let workflowName: string;
      
      if (workflow.files.workflow) {
        // First remove any file extension
        workflowName = workflow.files.workflow.replace(/\.json$/, '');
        // Then extract just the folder name, handling both forward and back slashes
        const segments = workflowName.split(/[/\\]/);
        workflowName = segments.length >= 1 ? segments[segments.length - 1] : workflowName;
        // Clean any remaining hyphens or spaces
        workflowName = workflowName.replace(/\s+/g, '-').replace(/-+/g, '-');
      } else {
        workflowName = workflow.id;
      }

      await LoggerService.log('Processed workflow name for manifest', { 
        original: workflow.files.workflow,
        processed: workflowName 
      });

      const existingIndex = manifest.workflows.findIndex((w: ManifestEntry) => w.id === workflow.id);
      if (existingIndex >= 0) {
        await LoggerService.log('Updating existing manifest entry', { 
          index: existingIndex,
          oldEntry: manifest.workflows[existingIndex] 
        });
        
        manifest.workflows[existingIndex] = {
          id: workflow.id,
          path: workflowName  // Store just the clean folder name
        };
      } else {
        await LoggerService.log('Adding new manifest entry');
        manifest.workflows.push({
          id: workflow.id,
          path: workflowName  // Store just the clean folder name
        });
      }

      // Sort workflows by ID for consistency
      manifest.workflows.sort((a: ManifestEntry, b: ManifestEntry) => a.id.localeCompare(b.id));

      await LoggerService.log('Writing updated manifest', { 
        updatedManifest: manifest 
      });
      
      await fs.writeFile(this.manifestPath, JSON.stringify(manifest, null, 2));
    } catch (error) {
      await LoggerService.log('Error updating manifest', {
        error: error instanceof Error ? error.message : 'Unknown error',
        workflowId: workflow.id
      });
      throw error;
    } finally {
      await release();
    }
  }
}