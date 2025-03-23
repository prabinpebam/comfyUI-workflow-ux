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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteWorkflow = exports.getWorkflow = exports.listWorkflows = exports.updateWorkflow = exports.addWorkflow = void 0;
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const workflow_service_1 = require("../../database/services/workflow.service");
const file_service_1 = require("../services/file.service");
const logger_service_1 = require("../services/logger.service");
const path = __importStar(require("path"));
const promises_1 = __importDefault(require("fs/promises"));
const workflowService = new workflow_service_1.WorkflowService();
const fileService = new file_service_1.FileService();
exports.addWorkflow = (0, express_async_handler_1.default)(async (req, res) => {
    const { title, description, version } = req.body;
    const files = req.files;
    await logger_service_1.LoggerService.log('Starting workflow addition', {
        title,
        description,
        version,
        files: Object.keys(files).map(key => ({
            fieldname: key,
            originalname: files[key][0].originalname,
            path: files[key][0].path
        }))
    });
    if (!files.workflow || !files.parameters) {
        const error = 'Workflow and parameters files are required';
        await logger_service_1.LoggerService.log('Workflow addition failed - Missing files', { error });
        res.status(400);
        throw new Error(error);
    }
    try {
        await logger_service_1.LoggerService.log('Validating workflow files');
        await fileService.validateWorkflowFiles(files.workflow[0], files.parameters[0]);
        const workflowName = title.replace(/\s+/g, '-');
        await logger_service_1.LoggerService.log('Clean workflow name created', { workflowName });
        const movedFiles = await fileService.moveWorkflowFiles(path.join(process.cwd(), 'temp'), workflowName, files);
        await logger_service_1.LoggerService.log('Files moved successfully', { movedFiles });
        const manifestPath = workflowName;
        await logger_service_1.LoggerService.log('Using manifest path', { manifestPath });
        const workflow = await workflowService.createWorkflow({
            title,
            description,
            version,
            files: {
                workflow: manifestPath,
                parameters: manifestPath,
                preview: movedFiles.preview ? manifestPath : undefined
            }
        });
        await logger_service_1.LoggerService.log('Workflow created in database', { workflow });
        res.status(201).json(workflow);
    }
    catch (error) {
        await logger_service_1.LoggerService.log('Error in workflow addition', {
            error: error instanceof Error ? error.message : 'Unknown error',
            title
        });
        const cleanName = title.replace(/\s+/g, '-');
        await fileService.cleanWorkflowDirectory(cleanName);
        throw error;
    }
});
exports.updateWorkflow = (0, express_async_handler_1.default)(async (req, res) => {
    const { id } = req.params;
    const { title, description, version } = req.body;
    const files = req.files;
    const existingWorkflow = await workflowService.getWorkflow(id);
    if (!existingWorkflow) {
        res.status(404);
        throw new Error('Workflow not found');
    }
    const workflowName = title.replace(/\s+/g, '-');
    const updateData = {
        title,
        description,
        version
    };
    if (Object.keys(files).length > 0) {
        await fileService.moveWorkflowFiles(path.join(process.cwd(), 'temp'), workflowName, files);
        updateData.files = {
            ...existingWorkflow.files,
            workflow: workflowName,
            parameters: workflowName,
            preview: workflowName
        };
    }
    const workflow = await workflowService.updateWorkflow(id, updateData);
    res.json(workflow);
});
exports.listWorkflows = (0, express_async_handler_1.default)(async (req, res) => {
    const workflows = await workflowService.listWorkflows();
    res.json(workflows);
});
exports.getWorkflow = (0, express_async_handler_1.default)(async (req, res) => {
    const { id } = req.params;
    const workflow = await workflowService.getWorkflow(id);
    if (!workflow) {
        res.status(404);
        throw new Error('Workflow not found');
    }
    res.json(workflow);
});
exports.deleteWorkflow = (0, express_async_handler_1.default)(async (req, res) => {
    const workflowIdOrName = req.params.id;
    let workflow = await workflowService.getWorkflow(workflowIdOrName);
    if (!workflow) {
        const allWorkflows = await workflowService.listWorkflows();
        const foundWorkflow = allWorkflows.find(w => w.files.workflow === workflowIdOrName ||
            w.title.replace(/\s+/g, '-') === workflowIdOrName);
        workflow = foundWorkflow || null;
    }
    if (!workflow) {
        res.status(404);
        throw new Error('Workflow not found');
    }
    const workflowName = workflow.files.workflow;
    const workflowPath = path.join(process.cwd(), 'docs', 'workflow', workflowName);
    const manifestPath = path.join(process.cwd(), 'docs', 'workflow', 'manifest.json');
    const manifestContent = await promises_1.default.readFile(manifestPath, 'utf-8');
    const manifest = JSON.parse(manifestContent);
    await workflowService.deleteWorkflow(workflow.id);
    manifest.workflows = manifest.workflows.filter((w) => w.id !== workflow.id);
    await promises_1.default.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
    await promises_1.default.rm(workflowPath, { recursive: true, force: true });
    res.status(200).json({ message: 'Workflow deleted successfully' });
});
