"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const cors_1 = __importDefault(require("cors"));
let dbModule;
try {
    const correctPath = path_1.default.join(__dirname, 'database/config/db.prod.config.js');
    console.log('Trying direct server path:', correctPath);
    dbModule = require(correctPath);
    if (!dbModule.connectToDatabase) {
        throw new Error('connectToDatabase not found in module');
    }
    console.log('Successfully loaded database module with direct path');
}
catch (err) {
    console.error('Failed to load database with direct path:', err);
    try {
        console.log('Creating inline database connection as fallback');
        const { MongoClient } = require('mongodb');
        const COSMOS_CONNECTION = `mongodb://${process.env.MONGODB_USER}:${encodeURIComponent(process.env.MONGODB_PASSWORD || '')}@${process.env.MONGODB_HOST}:10255/?ssl=true&replicaSet=globaldb&retrywrites=false&maxIdleTimeMS=120000&appName=@${process.env.MONGODB_USER}@&authMechanism=SCRAM-SHA-256&authSource=admin`;
        let client = null;
        dbModule = {
            connectToDatabase: async function () {
                if (client)
                    return client;
                console.log('Connecting with inline function...');
                client = new MongoClient(COSMOS_CONNECTION, {
                    ssl: true,
                    directConnection: true,
                    maxPoolSize: 10
                });
                if (client) {
                    await client.connect();
                    console.log('Inline connection successful');
                    return client;
                }
                throw new Error('Failed to create MongoDB client');
            },
            getDb: async function () {
                if (!client)
                    client = await this.connectToDatabase();
                if (client) {
                    return client.db();
                }
                throw new Error('MongoDB client is null');
            }
        };
    }
    catch (fallbackErr) {
        console.error('All connection attempts failed:', fallbackErr);
        process.exit(1);
    }
}
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
    ? path_1.default.join(__dirname, '../public')
    : path_1.default.join(__dirname, '../../docs');
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
console.log('dbConfig loaded:', dbModule);
console.log('dbConfig keys:', Object.keys(dbModule));
console.log('connectToDatabase type:', typeof dbModule.connectToDatabase);
console.log('Starting server initialization...');
Promise.all([
    dbModule.connectToDatabase(),
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
console.log('Node.js version:', process.version);
console.log('Current directory:', __dirname);
console.log('Working directory:', process.cwd());
try {
    console.log('Controller path:', require.resolve('./controllers/workflow.controller'));
    console.log('Middleware path:', require.resolve('./middleware/upload.middleware'));
    console.log('Services path:', require.resolve('./services/file.service'));
}
catch (err) {
    console.error('Error resolving module paths:', err);
}
