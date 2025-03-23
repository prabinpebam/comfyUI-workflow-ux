import * as fs from 'fs/promises';
import * as path from 'path';

export class LoggerService {
  private static logFilePath = path.join(process.cwd(), 'logs', 'workflow-operations.log');

  private static async ensureLogDirectory(): Promise<void> {
    const logDir = path.dirname(this.logFilePath);
    try {
      await fs.access(logDir);
    } catch {
      await fs.mkdir(logDir, { recursive: true });
    }
  }

  static async log(message: string, data?: any): Promise<void> {
    await this.ensureLogDirectory();
    
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}\n${data ? JSON.stringify(data, null, 2) + '\n' : ''}\n`;
    
    try {
      await fs.appendFile(this.logFilePath, logEntry, 'utf8');
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }
}