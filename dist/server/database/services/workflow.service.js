"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowService = void 0;
const mongodb_1 = require("mongodb");
const db_config_1 = require("../config/db.config");
const proper_lockfile_1 = require("proper-lockfile");
const path = __importStar(require("path"));
const fs = __importStar(require("fs/promises"));
const logger_service_1 = require("../../server/services/logger.service");
class WorkflowService {
    constructor() {
        this.collection = null;
        this.manifestPath = path.join(process.cwd(), 'docs', 'workflow', 'manifest.json');
    }
    async initCollection() {
        if (!this.collection) {
            const db = await (0, db_config_1.getDb)();
            this.collection = db.collection('workflows');
        }
        return this.collection;
    }
    async createWorkflow(dto) {
        await logger_service_1.LoggerService.log('Creating workflow in database', { dto });
        const collection = await this.initCollection();
        const cleanWorkflowName = dto.title.replace(/\s+/g, '-');
        await logger_service_1.LoggerService.log('Generated clean workflow name', {
            original: dto.title,
            cleaned: cleanWorkflowName
        });
        const workflow = {
            id: new mongodb_1.ObjectId().toHexString(),
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
        await logger_service_1.LoggerService.log('Inserting workflow document', { workflow });
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
    async deleteWorkflow(id) {
        const collection = await this.initCollection();
        const result = await collection.deleteOne({ id });
        return result.deletedCount > 0;
    }
    async updateManifest(workflow) {
        await logger_service_1.LoggerService.log('Starting manifest update', { workflowId: workflow.id });
        const release = await (0, proper_lockfile_1.lock)(this.manifestPath, { retries: 5 });
        try {
            const manifestContent = await fs.readFile(this.manifestPath, 'utf-8');
            const manifest = JSON.parse(manifestContent);
            await logger_service_1.LoggerService.log('Current manifest content', { manifest });
            let workflowName;
            if (workflow.files.workflow) {
                workflowName = workflow.files.workflow.replace(/\.json$/, '');
                const segments = workflowName.split(/[/\\]/);
                workflowName = segments.length >= 1 ? segments[segments.length - 1] : workflowName;
                workflowName = workflowName.replace(/\s+/g, '-').replace(/-+/g, '-');
            }
            else {
                workflowName = workflow.id;
            }
            await logger_service_1.LoggerService.log('Processed workflow name for manifest', {
                original: workflow.files.workflow,
                processed: workflowName
            });
            const existingIndex = manifest.workflows.findIndex((w) => w.id === workflow.id);
            if (existingIndex >= 0) {
                await logger_service_1.LoggerService.log('Updating existing manifest entry', {
                    index: existingIndex,
                    oldEntry: manifest.workflows[existingIndex]
                });
                manifest.workflows[existingIndex] = {
                    id: workflow.id,
                    path: workflowName
                };
            }
            else {
                await logger_service_1.LoggerService.log('Adding new manifest entry');
                manifest.workflows.push({
                    id: workflow.id,
                    path: workflowName
                });
            }
            manifest.workflows.sort((a, b) => a.id.localeCompare(b.id));
            await logger_service_1.LoggerService.log('Writing updated manifest', {
                updatedManifest: manifest
            });
            await fs.writeFile(this.manifestPath, JSON.stringify(manifest, null, 2));
        }
        catch (error) {
            await logger_service_1.LoggerService.log('Error updating manifest', {
                error: error instanceof Error ? error.message : 'Unknown error',
                workflowId: workflow.id
            });
            throw error;
        }
        finally {
            await release();
        }
    }
}
exports.WorkflowService = WorkflowService;
