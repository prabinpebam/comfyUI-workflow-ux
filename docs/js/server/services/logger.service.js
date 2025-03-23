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
exports.LoggerService = void 0;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
class LoggerService {
    static async ensureLogDirectory() {
        const logDir = path.dirname(this.logFilePath);
        try {
            await fs.access(logDir);
        }
        catch (_a) {
            await fs.mkdir(logDir, { recursive: true });
        }
    }
    static async log(message, data) {
        await this.ensureLogDirectory();
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] ${message}\n${data ? JSON.stringify(data, null, 2) + '\n' : ''}\n`;
        try {
            await fs.appendFile(this.logFilePath, logEntry, 'utf8');
        }
        catch (error) {
            console.error('Failed to write to log file:', error);
        }
    }
}
exports.LoggerService = LoggerService;
LoggerService.logFilePath = path.join(process.cwd(), 'logs', 'workflow-operations.log');
//# sourceMappingURL=logger.service.js.map