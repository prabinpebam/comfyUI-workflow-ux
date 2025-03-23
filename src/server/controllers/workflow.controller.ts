import { Request, Response, NextFunction } from 'express';
import asyncHandler from 'express-async-handler';
import { WorkflowService } from '../../database/services/workflow.service';
import { FileService } from '../services/file.service';
import { LoggerService } from '../services/logger.service';
import * as path from 'path';
import fs from 'fs/promises';

const workflowService = new WorkflowService();
const fileService = new FileService();

export const addWorkflow = asyncHandler(async (req: Request, res: Response) => {
  const { title, description, version } = req.body;
  const files = req.files as { [fieldname: string]: Express.Multer.File[] };

  await LoggerService.log('Starting workflow addition', { 
    title, 
    description,
    version,
    files: Object.keys(files).map(key => ({
      fieldname: key,
      originalname: files[key][0].originalname,
      path: files[key][0].path
    }))
  });

  if (!files.workflow || !files.parameters) {
    const error = 'Workflow and parameters files are required';
    await LoggerService.log('Workflow addition failed - Missing files', { error });
    res.status(400);
    throw new Error(error);
  }

  try {
    await LoggerService.log('Validating workflow files');
    await fileService.validateWorkflowFiles(files.workflow[0], files.parameters[0]);

    const workflowName = title.replace(/\s+/g, '-');
    await LoggerService.log('Clean workflow name created', { workflowName });

    const movedFiles = await fileService.moveWorkflowFiles(
      path.join(process.cwd(), 'temp'),
      workflowName,
      files
    );

    await LoggerService.log('Files moved successfully', { movedFiles });

    // For the manifest, we want just the folder name
    const manifestPath = workflowName;
    await LoggerService.log('Using manifest path', { manifestPath });

    // Create the workflow in the database
    const workflow = await workflowService.createWorkflow({
      title,
      description,
      version,
      files: {
        workflow: manifestPath,
        parameters: manifestPath,
        preview: movedFiles.preview ? manifestPath : undefined
      }
    });

    await LoggerService.log('Workflow created in database', { workflow });
    res.status(201).json(workflow);
  } catch (error) {
    await LoggerService.log('Error in workflow addition', {
      error: error instanceof Error ? error.message : 'Unknown error',
      title
    });
    
    // Clean up the workflow directory if something went wrong
    const cleanName = title.replace(/\s+/g, '-');
    await fileService.cleanWorkflowDirectory(cleanName);
    throw error;
  }
});

export const updateWorkflow = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { title, description, version } = req.body;
  const files = req.files as { [fieldname: string]: Express.Multer.File[] };

  // Get existing workflow to check if it exists
  const existingWorkflow = await workflowService.getWorkflow(id);
  if (!existingWorkflow) {
    res.status(404);
    throw new Error('Workflow not found');
  }

  const workflowName = title.replace(/\s+/g, '-');
  const updateData: any = {
    title,
    description,
    version
  };

  if (Object.keys(files).length > 0) {
    // If files are provided, move them to the workflow directory
    await fileService.moveWorkflowFiles(
      path.join(process.cwd(), 'temp'),
      workflowName,
      files
    );

    // For the manifest and database, we want just the folder name
    updateData.files = {
      ...existingWorkflow.files,
      workflow: workflowName,
      parameters: workflowName,
      preview: workflowName  // If no new preview, keep existing one which should already be the folder name
    };
  }

  const workflow = await workflowService.updateWorkflow(id, updateData);
  res.json(workflow);
});

export const listWorkflows = asyncHandler(async (req: Request, res: Response) => {
  const workflows = await workflowService.listWorkflows();
  res.json(workflows);
});

export const getWorkflow = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const workflow = await workflowService.getWorkflow(id);
  
  if (!workflow) {
    res.status(404);
    throw new Error('Workflow not found');
  }

  res.json(workflow);
});

/**
 * Delete a workflow and its associated files
 */
export const deleteWorkflow = asyncHandler(async (req: Request, res: Response) => {
  const workflowIdOrName = req.params.id;

  // First try to get the workflow by ID
  let workflow = await workflowService.getWorkflow(workflowIdOrName);
  
  // If not found by ID, try listing all workflows and finding by name match
  if (!workflow) {
    const allWorkflows = await workflowService.listWorkflows();
    const foundWorkflow = allWorkflows.find(w => 
      w.files.workflow === workflowIdOrName || 
      w.title.replace(/\s+/g, '-') === workflowIdOrName
    );
    workflow = foundWorkflow || null;
  }

  if (!workflow) {
    res.status(404);
    throw new Error('Workflow not found');
  }

  // Get the clean workflow name from the stored workflow document
  const workflowName = workflow.files.workflow;
  const workflowPath = path.join(process.cwd(), 'docs', 'workflow', workflowName);
  
  // Read manifest to update it
  const manifestPath = path.join(process.cwd(), 'docs', 'workflow', 'manifest.json');
  const manifestContent = await fs.readFile(manifestPath, 'utf-8');
  const manifest = JSON.parse(manifestContent);

  // Delete workflow from database
  await workflowService.deleteWorkflow(workflow.id);

  // Remove workflow from manifest using the ID for reliability
  manifest.workflows = manifest.workflows.filter((w: { id: string }) => w.id !== workflow!.id);
  
  // Write updated manifest
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
  
  // Delete workflow directory and all its contents
  await fs.rm(workflowPath, { recursive: true, force: true });
  
  res.status(200).json({ message: 'Workflow deleted successfully' });
});