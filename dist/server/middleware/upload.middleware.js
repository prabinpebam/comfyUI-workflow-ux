"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.upload = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        var _a;
        const workflowName = ((_a = req.body.title) === null || _a === void 0 ? void 0 : _a.replace(/\s+/g, '-')) || 'temp';
        const uploadPath = path_1.default.join(process.cwd(), 'docs', 'workflow', workflowName);
        if (!fs_1.default.existsSync(uploadPath)) {
            fs_1.default.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        var _a;
        const workflowName = ((_a = req.body.title) === null || _a === void 0 ? void 0 : _a.replace(/\s+/g, '-')) || 'temp';
        const ext = path_1.default.extname(file.originalname);
        let baseName;
        switch (file.fieldname) {
            case 'workflow':
                baseName = `${workflowName}.json`;
                break;
            case 'parameters':
                baseName = `${workflowName}-user-editable-parameters.json`;
                break;
            case 'preview':
                baseName = `${workflowName}${ext}`;
                break;
            default:
                baseName = file.originalname;
        }
        cb(null, baseName);
    }
});
exports.upload = (0, multer_1.default)({
    storage,
    fileFilter: (req, file, cb) => {
        if (file.fieldname === 'preview') {
            const allowedTypes = /jpeg|jpg|png|gif/;
            const ext = path_1.default.extname(file.originalname).toLowerCase();
            if (allowedTypes.test(ext)) {
                cb(null, true);
            }
            else {
                cb(new Error('Only image files are allowed for preview!'));
            }
        }
        else {
            const ext = path_1.default.extname(file.originalname).toLowerCase();
            if (ext === '.json') {
                cb(null, true);
            }
            else {
                cb(new Error('Only JSON files are allowed for workflow and parameters!'));
            }
        }
    }
});
