import express, { Express } from 'express';
import path from 'path';
import cors from 'cors';
// Get database module with correct function exports
let dbModule;
try {
  // Use the EXACT server path since we now know where the correct file is
  const correctPath = path.join(__dirname, 'database/config/db.prod.config.js');
  console.log('Trying direct server path:', correctPath);
  dbModule = require(correctPath);
  
  if (!dbModule.connectToDatabase) {
    throw new Error('connectToDatabase not found in module');
  }
  
  console.log('Successfully loaded database module with direct path');
} catch (err) {
  console.error('Failed to load database with direct path:', err);
  
  try {
    // Final fallback: create connection inline if all else fails
    console.log('Creating inline database connection as fallback');
    const { MongoClient } = require('mongodb');
    const COSMOS_CONNECTION = `mongodb://${process.env.MONGODB_USER}:${encodeURIComponent(process.env.MONGODB_PASSWORD || '')}@${process.env.MONGODB_HOST}:10255/?ssl=true&replicaSet=globaldb&retrywrites=false&maxIdleTimeMS=120000&appName=@${process.env.MONGODB_USER}@&authMechanism=SCRAM-SHA-256&authSource=admin`;
    
    let client: import('mongodb').MongoClient | null = null;
    dbModule = {
      connectToDatabase: async function() {
        if (client) return client;
        console.log('Connecting with inline function...');
        client = new MongoClient(COSMOS_CONNECTION, {
          ssl: true,
          directConnection: true,
          maxPoolSize: 10
        });
        // Add null check or non-null assertion
        if (client) {
          await client.connect();
          console.log('Inline connection successful');
          return client;
        }
        throw new Error('Failed to create MongoDB client');
      },
      getDb: async function() {
        if (!client) client = await this.connectToDatabase();
        // Add null check or non-null assertion
        if (client) {
          return client.db();
        }
        throw new Error('MongoDB client is null');
      }
    };
  } catch (fallbackErr) {
    console.error('All connection attempts failed:', fallbackErr);
    process.exit(1);
  }
}
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