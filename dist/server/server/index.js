"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const cors_1 = __importDefault(require("cors"));
const dbConfig = require('../database/config/db.prod.config');
const workflow_controller_1 = require("./controllers/workflow.controller");
const upload_middleware_1 = require("./middleware/upload.middleware");
const file_service_1 = require("./services/file.service");
const error_middleware_1 = require("./middleware/error.middleware");
const validation_middleware_1 = require("./middleware/validation.middleware");
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const app = (0, express_1.default)();
const fileService = new file_service_1.FileService();
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, cors_1.default)({
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));
app.post('/api/workflows', upload_middleware_1.upload.fields([
    { name: 'workflow', maxCount: 1 },
    { name: 'parameters', maxCount: 1 },
    { name: 'preview', maxCount: 1 }
]), validation_middleware_1.validateWorkflowCreate, workflow_controller_1.addWorkflow);
app.put('/api/workflows/:id', upload_middleware_1.upload.fields([
    { name: 'workflow', maxCount: 1 },
    { name: 'parameters', maxCount: 1 },
    { name: 'preview', maxCount: 1 }
]), validation_middleware_1.validateWorkflowUpdate, workflow_controller_1.updateWorkflow);
app.get('/api/workflows', workflow_controller_1.listWorkflows);
app.get('/api/workflows/:id', workflow_controller_1.getWorkflow);
app.delete('/api/workflows/:id', (0, express_async_handler_1.default)(workflow_controller_1.deleteWorkflow));
const staticPath = process.env.NODE_ENV === 'production'
    ? path_1.default.join(__dirname, '../../public')
    : path_1.default.join(__dirname, '../../../docs');
app.use(express_1.default.static(staticPath));
app.use(error_middleware_1.errorHandler);
app.get('*', (req, res) => {
    res.sendFile(path_1.default.join(staticPath, 'index.html'));
});
setInterval(() => {
    fileService.cleanupTempFiles()
        .catch(err => console.error('Error cleaning up temp files:', err));
}, 60 * 60 * 1000);
const port = process.env.PORT || 8080;
console.log('dbConfig loaded:', dbConfig);
console.log('dbConfig keys:', Object.keys(dbConfig));
console.log('connectToDatabase type:', typeof dbConfig.connectToDatabase);
console.log('Starting server initialization...');
Promise.all([
    dbConfig.connectToDatabase(),
    fileService.initialize()
])
    .then(() => {
    app.listen(port, () => {
        console.log(`Server running in ${process.env.NODE_ENV} mode on port ${port}`);
    });
})
    .catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
});
