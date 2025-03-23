import { Collection, ObjectId } from 'mongodb';
import { getDb } from '../config/db.config';
import { WorkflowDocument, CreateWorkflowDto } from '../models/workflow.model';
import { lock } from 'proper-lockfile';
import * as path from 'path';
import * as fs from 'fs/promises';

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
    const collection = await this.initCollection();
    
    const workflow: WorkflowDocument = {
      id: new ObjectId().toHexString(),
      ...dto,
      created: new Date(),
      modified: new Date(),
      metadata: dto.metadata || {}
    };

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

  private async updateManifest(workflow: WorkflowDocument): Promise<void> {
    // Use proper-lockfile to handle concurrent manifest updates
    const release = await lock(this.manifestPath, { retries: 5 });
    try {
      const manifestContent = await fs.readFile(this.manifestPath, 'utf-8');
      const manifest = JSON.parse(manifestContent);
      
      const existingIndex = manifest.workflows.findIndex((w: any) => w.id === workflow.id);
      if (existingIndex >= 0) {
        manifest.workflows[existingIndex] = {
          id: workflow.id,
          path: workflow.files.workflow.split('/')[0] // Get the folder name
        };
      } else {
        manifest.workflows.push({
          id: workflow.id,
          path: workflow.files.workflow.split('/')[0]
        });
      }

      // Sort workflows by ID for consistency
      manifest.workflows.sort((a: any, b: any) => a.id.localeCompare(b.id));

      await fs.writeFile(this.manifestPath, JSON.stringify(manifest, null, 2));
    } finally {
      await release();
    }
  }
}