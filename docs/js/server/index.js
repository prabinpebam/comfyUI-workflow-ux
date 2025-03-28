"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const cors_1 = __importDefault(require("cors"));
const db_config_1 = require("../database/config/db.config");
const workflow_controller_1 = require("./controllers/workflow.controller");
const upload_middleware_1 = require("./middleware/upload.middleware");
const file_service_1 = require("./services/file.service");
const error_middleware_1 = require("./middleware/error.middleware");
const validation_middleware_1 = require("./middleware/validation.middleware");
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const app = (0, express_1.default)();
const fileService = new file_service_1.FileService();
// Middleware
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Configure CORS
app.use((0, cors_1.default)({
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));
// API Routes
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
// Static file serving
const staticPath = process.env.NODE_ENV === 'production'
    ? path_1.default.join(__dirname, '../../public')
    : path_1.default.join(__dirname, '../../../docs');
app.use(express_1.default.static(staticPath));
// Error handling
app.use(error_middleware_1.errorHandler);
// Default route
app.get('*', (req, res) => {
    res.sendFile(path_1.default.join(staticPath, 'index.html'));
});
// Temp file cleanup
setInterval(() => {
    fileService.cleanupTempFiles()
        .catch(err => console.error('Error cleaning up temp files:', err));
}, 60 * 60 * 1000);
// Start server
const port = process.env.PORT || 8080;
Promise.all([
    (0, db_config_1.connectToDatabase)(),
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
//# sourceMappingURL=index.js.map