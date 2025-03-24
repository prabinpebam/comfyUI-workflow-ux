const express = require('express');
const path = require('path');
const cors = require('cors');

// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
// IMPORTANT: This project compiles TypeScript to ./docs/js - DO NOT change these paths
// See tsconfig.json for project architecture details
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

const { connectToDatabase } = require('./docs/js/database/config/db.config.js');
const { addWorkflow, updateWorkflow, listWorkflows, getWorkflow, deleteWorkflow } = require('./docs/js/server/controllers/workflow.controller');
const { upload } = require('./docs/js/server/middleware/upload.middleware');
const { FileService } = require('./docs/js/server/services/file.service');
const { errorHandler } = require('./docs/js/server/middleware/error.middleware');
const { validateWorkflowCreate, validateWorkflowUpdate } = require('./docs/js/server/middleware/validation.middleware');
const fs = require('fs').promises;
const asyncHandler = require('express-async-handler');

const app = express();
const fileService = new FileService();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configure CORS with specific options
app.use(cors({
  origin: true, // Allow all origins
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Explicitly allow DELETE
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

// Serve static files from the docs directory (moved after API routes)
app.use(express.static(path.join(__dirname, 'docs')));

// Error handling middleware
app.use(errorHandler);

// Handle all other routes by serving index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'docs', 'index.html'));
});

// Schedule temp file cleanup every hour
setInterval(() => {
  fileService.cleanupTempFiles()
    .catch(err => console.error('Error cleaning up temp files:', err));
}, 60 * 60 * 1000);

// Initialize services and start server
const port = process.env.PORT || 8080;

// Failsafe startup - continue even if MongoDB connection fails
Promise.all([
  connectToDatabase().catch(err => {
    console.error('WARNING: Failed to connect to MongoDB but continuing server startup:', err.message);
    return null; // Return null instead of rejecting to continue server startup
  }),
  fileService.initialize()
])
.then(() => {
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
})
.catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});