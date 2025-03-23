import * as fs from 'fs/promises';
import * as path from 'path';
import { LoggerService } from './logger.service';

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

  private async moveFile(file: Express.Multer.File, destinationPath: string): Promise<void> {
    try {
      await fs.rename(file.path, destinationPath);
    } catch (error) {
      // If rename fails (e.g., across devices), fallback to copy and delete
      await fs.copyFile(file.path, destinationPath);
      await fs.unlink(file.path);
    }
  }

  async moveWorkflowFiles(tempPath: string, workflowName: string, files: { [key: string]: Express.Multer.File[] }): Promise<{ workflow?: string; parameters?: string; preview?: string }> {
    try {
      console.log('📁 Moving workflow files');
      console.log('📁 Workflow name:', workflowName);
      
      const workflowDirPath = path.join(process.cwd(), 'docs', 'workflow', workflowName);
      await fs.mkdir(workflowDirPath, { recursive: true });
      console.log('📁 Created directory:', workflowDirPath);

      const movedFiles: { workflow?: string; parameters?: string; preview?: string } = {};

      // Process workflow file
      if (files.workflow?.[0]) {
        // Just store the clean name
        movedFiles.workflow = workflowName;
        const destPath = path.join(workflowDirPath, `${workflowName}.json`);
        console.log('📁 Moving workflow file to:', destPath);
        console.log('📁 Storing clean name:', movedFiles.workflow);
        await this.moveFile(files.workflow[0], destPath);
      }

      // Process parameters file
      if (files.parameters?.[0]) {
        // Just store the clean name
        movedFiles.parameters = workflowName;
        const destPath = path.join(workflowDirPath, `${workflowName}-user-editable-parameters.json`);
        console.log('📁 Moving parameters file to:', destPath);
        console.log('📁 Storing clean name:', movedFiles.parameters);
        await this.moveFile(files.parameters[0], destPath);
      }

      // Process preview image if present
      if (files.preview?.[0]) {
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
      
    } catch (error) {
      console.error('📁 Error in moveWorkflowFiles:', error);
      await this.cleanWorkflowDirectory(workflowName);
      throw error;
    }
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