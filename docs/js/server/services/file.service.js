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
exports.FileService = void 0;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
class FileService {
    constructor() {
        this.workflowsDir = path.join(process.cwd(), 'docs', 'workflow');
        this.tempDir = path.join(process.cwd(), 'temp');
    }
    async initialize() {
        // Ensure temp directory exists
        try {
            await fs.access(this.tempDir);
        }
        catch (_a) {
            await fs.mkdir(this.tempDir, { recursive: true });
        }
        // Ensure workflows directory exists
        try {
            await fs.access(this.workflowsDir);
        }
        catch (_b) {
            await fs.mkdir(this.workflowsDir, { recursive: true });
        }
    }
    async ensureWorkflowDirectory(workflowName) {
        const dirPath = path.join(this.workflowsDir, workflowName);
        try {
            await fs.access(dirPath);
        }
        catch (_a) {
            await fs.mkdir(dirPath, { recursive: true });
        }
        return dirPath;
    }
    async cleanWorkflowDirectory(workflowName) {
        const dirPath = path.join(this.workflowsDir, workflowName);
        try {
            await fs.rm(dirPath, { recursive: true, force: true });
        }
        catch (error) {
            if (error.code !== 'ENOENT') {
                throw error;
            }
        }
    }
    async moveFile(file, destinationPath) {
        try {
            await fs.rename(file.path, destinationPath);
        }
        catch (error) {
            // If rename fails (e.g., across devices), fallback to copy and delete
            await fs.copyFile(file.path, destinationPath);
            await fs.unlink(file.path);
        }
    }
    async moveWorkflowFiles(tempPath, workflowName, files) {
        var _a, _b, _c;
        try {
            console.log('📁 Moving workflow files');
            console.log('📁 Workflow name:', workflowName);
            const workflowDirPath = path.join(process.cwd(), 'docs', 'workflow', workflowName);
            await fs.mkdir(workflowDirPath, { recursive: true });
            console.log('📁 Created directory:', workflowDirPath);
            const movedFiles = {};
            // Process workflow file
            if ((_a = files.workflow) === null || _a === void 0 ? void 0 : _a[0]) {
                // Just store the clean name
                movedFiles.workflow = workflowName;
                const destPath = path.join(workflowDirPath, `${workflowName}.json`);
                console.log('📁 Moving workflow file to:', destPath);
                console.log('📁 Storing clean name:', movedFiles.workflow);
                await this.moveFile(files.workflow[0], destPath);
            }
            // Process parameters file
            if ((_b = files.parameters) === null || _b === void 0 ? void 0 : _b[0]) {
                // Just store the clean name
                movedFiles.parameters = workflowName;
                const destPath = path.join(workflowDirPath, `${workflowName}-user-editable-parameters.json`);
                console.log('📁 Moving parameters file to:', destPath);
                console.log('📁 Storing clean name:', movedFiles.parameters);
                await this.moveFile(files.parameters[0], destPath);
            }
            // Process preview image if present
            if ((_c = files.preview) === null || _c === void 0 ? void 0 : _c[0]) {
                const ext = path.extname(files.preview[0].originalname);
                // Just store the clean name
                movedFiles.preview = workflowName;
                const destPath = path.join(workflowDirPath, `${workflowName}${ext}`);
                console.log('📁 Moving preview file to:', destPath);
                console.log('📁 Storing clean name:', movedFiles.preview);
                await this.moveFile(files.preview[0], destPath);
            }
            console.log('📁 Final moved files object:', movedFiles);
            return movedFiles;
        }
        catch (error) {
            console.error('📁 Error in moveWorkflowFiles:', error);
            await this.cleanWorkflowDirectory(workflowName);
            throw error;
        }
    }
    async validateWorkflowFiles(workflowFile, parametersFile) {
        try {
            // Validate workflow JSON
            const workflowContent = await fs.readFile(workflowFile.path, 'utf8');
            const workflow = JSON.parse(workflowContent);
            if (!workflow || typeof workflow !== 'object') {
                throw new Error('Invalid workflow JSON format');
            }
            // Validate parameters JSON
            const parametersContent = await fs.readFile(parametersFile.path, 'utf8');
            const parameters = JSON.parse(parametersContent);
            if (!parameters || !parameters.workflowDetails) {
                throw new Error('Invalid parameters JSON format');
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error during file validation';
            throw new Error(`File validation failed: ${errorMessage}`);
        }
    }
    async cleanupTempFiles() {
        try {
            const files = await fs.readdir(this.tempDir);
            await Promise.all(files.map(file => fs.rm(path.join(this.tempDir, file), { force: true })));
        }
        catch (error) {
            console.error('Error cleaning up temp files:', error);
        }
    }
}
exports.FileService = FileService;
//# sourceMappingURL=file.service.js.map