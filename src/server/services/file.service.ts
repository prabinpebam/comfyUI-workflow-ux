import * as fs from 'fs/promises';
import * as path from 'path';

export class FileService {
  private readonly workflowsDir: string;
  private readonly tempDir: string;

  constructor() {
    this.workflowsDir = path.join(process.cwd(), 'docs', 'workflow');
    this.tempDir = path.join(process.cwd(), 'temp');
  }

  async initialize(): Promise<void> {
    // Ensure temp directory exists
    try {
      await fs.access(this.tempDir);
    } catch {
      await fs.mkdir(this.tempDir, { recursive: true });
    }

    // Ensure workflows directory exists
    try {
      await fs.access(this.workflowsDir);
    } catch {
      await fs.mkdir(this.workflowsDir, { recursive: true });
    }
  }

  async ensureWorkflowDirectory(workflowName: string): Promise<string> {
    const dirPath = path.join(this.workflowsDir, workflowName);
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
    }
    return dirPath;
  }

  async cleanWorkflowDirectory(workflowName: string): Promise<void> {
    const dirPath = path.join(this.workflowsDir, workflowName);
    try {
      await fs.rm(dirPath, { recursive: true, force: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  async moveWorkflowFiles(
    tempPath: string,
    workflowName: string,
    files: {
      workflow?: Express.Multer.File[];
      parameters?: Express.Multer.File[];
      preview?: Express.Multer.File[];
    }
  ): Promise<{
    workflow?: string;
    parameters?: string;
    preview?: string;
  }> {
    const finalDir = await this.ensureWorkflowDirectory(workflowName);
    const results: any = {};

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

  async validateWorkflowFiles(
    workflowFile: Express.Multer.File,
    parametersFile: Express.Multer.File
  ): Promise<void> {
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
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error during file validation';
      throw new Error(`File validation failed: ${errorMessage}`);
    }
  }

  async cleanupTempFiles(): Promise<void> {
    try {
      const files = await fs.readdir(this.tempDir);
      await Promise.all(
        files.map(file => 
          fs.rm(path.join(this.tempDir, file), { force: true })
        )
      );
    } catch (error) {
      console.error('Error cleaning up temp files:', error);
    }
  }
}