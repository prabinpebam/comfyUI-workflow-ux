import * as fs from 'fs/promises';
import * as path from 'path';
export class FileService {
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
    async moveWorkflowFiles(tempPath, workflowName, files) {
        const finalDir = await this.ensureWorkflowDirectory(workflowName);
        const results = {};
        for (const [key, fileArray] of Object.entries(files)) {
            if (fileArray && fileArray.length > 0) {
                const file = fileArray[0];
                const finalPath = path.join(finalDir, path.basename(file.path));
                await fs.rename(file.path, finalPath);
                results[key] = path.relative(path.join(process.cwd(), 'docs'), finalPath);
            }
        }
        return results;
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
//# sourceMappingURL=file.service.js.map