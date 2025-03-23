import { ObjectId } from 'mongodb';
import { getDb } from '../config/db.config';
import { lock } from 'proper-lockfile';
import * as path from 'path';
import * as fs from 'fs/promises';
export class WorkflowService {
    constructor() {
        this.collection = null;
        this.manifestPath = path.join(process.cwd(), 'docs', 'workflow', 'manifest.json');
    }
    async initCollection() {
        if (!this.collection) {
            const db = await getDb();
            this.collection = db.collection('workflows');
        }
        return this.collection;
    }
    async createWorkflow(dto) {
        const collection = await this.initCollection();
        const workflow = {
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
    async updateWorkflow(id, dto) {
        const collection = await this.initCollection();
        const update = {
            $set: {
                ...dto,
                modified: new Date()
            }
        };
        const result = await collection.findOneAndUpdate({ id }, update, { returnDocument: 'after' });
        if (result) {
            await this.updateManifest(result);
        }
        return result;
    }
    async getWorkflow(id) {
        const collection = await this.initCollection();
        return collection.findOne({ id });
    }
    async listWorkflows() {
        const collection = await this.initCollection();
        return collection.find().toArray();
    }
    async updateManifest(workflow) {
        // Use proper-lockfile to handle concurrent manifest updates
        const release = await lock(this.manifestPath, { retries: 5 });
        try {
            const manifestContent = await fs.readFile(this.manifestPath, 'utf-8');
            const manifest = JSON.parse(manifestContent);
            const existingIndex = manifest.workflows.findIndex((w) => w.id === workflow.id);
            if (existingIndex >= 0) {
                manifest.workflows[existingIndex] = {
                    id: workflow.id,
                    path: workflow.files.workflow.split('/')[0] // Get the folder name
                };
            }
            else {
                manifest.workflows.push({
                    id: workflow.id,
                    path: workflow.files.workflow.split('/')[0]
                });
            }
            // Sort workflows by ID for consistency
            manifest.workflows.sort((a, b) => a.id.localeCompare(b.id));
            await fs.writeFile(this.manifestPath, JSON.stringify(manifest, null, 2));
        }
        finally {
            await release();
        }
    }
}
//# sourceMappingURL=workflow.service.js.map