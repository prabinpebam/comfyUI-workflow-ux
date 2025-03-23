"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateWorkflowUpdate = exports.validateWorkflowCreate = void 0;
const error_middleware_1 = require("./error.middleware");
const validateWorkflowCreate = (req, res, next) => {
    var _a, _b, _c;
    const { title, version } = req.body;
    const files = req.files;
    if (!(title === null || title === void 0 ? void 0 : title.trim())) {
        throw new error_middleware_1.ApiError(400, 'Workflow title is required');
    }
    if (!((_a = files === null || files === void 0 ? void 0 : files.workflow) === null || _a === void 0 ? void 0 : _a[0]) || !((_b = files === null || files === void 0 ? void 0 : files.parameters) === null || _b === void 0 ? void 0 : _b[0])) {
        throw new error_middleware_1.ApiError(400, 'Both workflow and parameters files are required');
    }
    // Validate file types
    const workflowFile = files.workflow[0];
    const parametersFile = files.parameters[0];
    const previewFile = (_c = files.preview) === null || _c === void 0 ? void 0 : _c[0];
    if (!workflowFile.originalname.endsWith('.json')) {
        throw new error_middleware_1.ApiError(400, 'Workflow file must be a JSON file');
    }
    if (!parametersFile.originalname.endsWith('.json')) {
        throw new error_middleware_1.ApiError(400, 'Parameters file must be a JSON file');
    }
    if (previewFile && !previewFile.mimetype.startsWith('image/')) {
        throw new error_middleware_1.ApiError(400, 'Preview file must be an image');
    }
    next();
};
exports.validateWorkflowCreate = validateWorkflowCreate;
const validateWorkflowUpdate = (req, res, next) => {
    var _a, _b, _c;
    const { id } = req.params;
    const { title } = req.body;
    const files = req.files;
    if (!(id === null || id === void 0 ? void 0 : id.trim())) {
        throw new error_middleware_1.ApiError(400, 'Workflow ID is required');
    }
    if (title && !title.trim()) {
        throw new error_middleware_1.ApiError(400, 'Workflow title cannot be empty if provided');
    }
    // If files are provided, validate them
    if (files) {
        if (((_a = files.workflow) === null || _a === void 0 ? void 0 : _a[0]) && !files.workflow[0].originalname.endsWith('.json')) {
            throw new error_middleware_1.ApiError(400, 'Workflow file must be a JSON file');
        }
        if (((_b = files.parameters) === null || _b === void 0 ? void 0 : _b[0]) && !files.parameters[0].originalname.endsWith('.json')) {
            throw new error_middleware_1.ApiError(400, 'Parameters file must be a JSON file');
        }
        if (((_c = files.preview) === null || _c === void 0 ? void 0 : _c[0]) && !files.preview[0].mimetype.startsWith('image/')) {
            throw new error_middleware_1.ApiError(400, 'Preview file must be an image');
        }
    }
    next();
};
exports.validateWorkflowUpdate = validateWorkflowUpdate;
//# sourceMappingURL=validation.middleware.js.map