import express, { Express } from 'express';
import path from 'path';
import cors from 'cors';
const dbConfig = require('../database/config/db.prod.config');
import { addWorkflow, updateWorkflow, listWorkflows, getWorkflow, deleteWorkflow } from './controllers/workflow.controller';
import { upload } from './middleware/upload.middleware';
import { FileService } from './services/file.service';
import { errorHandler } from './middleware/error.middleware';
import { validateWorkflowCreate, validateWorkflowUpdate } from './middleware/validation.middleware';
import { promises as fs } from 'fs';
import asyncHandler from 'express-async-handler';

const app: Express = express();
const fileService = new FileService();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configure CORS
app.use(cors({
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// API Routes
app.post('/api/workflows', 
  upload.fields([
    { name: 'workflow', maxCount: 1 },
    { name: 'parameters', maxCount: 1 },
    { name: 'preview', maxCount: 1 }
  ]),
  validateWorkflowCreate,
  addWorkflow
);

app.put('/api/workflows/:id',
  upload.fields([
    { name: 'workflow', maxCount: 1 },
    { name: 'parameters', maxCount: 1 },
    { name: 'preview', maxCount: 1 }
  ]),
  validateWorkflowUpdate,
  updateWorkflow
);

app.get('/api/workflows', listWorkflows);
app.get('/api/workflows/:id', getWorkflow);
app.delete('/api/workflows/:id', asyncHandler(deleteWorkflow));

// Static file serving
const staticPath = process.env.NODE_ENV === 'production' 
  ? path.join(__dirname, '../../public')
  : path.join(__dirname, '../../../docs');

app.use(express.static(staticPath));

// Error handling
app.use(errorHandler);

// Default route
app.get('*', (req, res) => {
  res.sendFile(path.join(staticPath, 'index.html'));
});

// Temp file cleanup
setInterval(() => {
  fileService.cleanupTempFiles()
    .catch(err => console.error('Error cleaning up temp files:', err));
}, 60 * 60 * 1000);

// Start server
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