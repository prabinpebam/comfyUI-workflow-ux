import { Request, Response, NextFunction } from 'express';
import asyncHandler from 'express-async-handler';
import { WorkflowService } from '../../database/services/workflow.service';
import { FileService } from '../services/file.service';
import * as path from 'path';
import fs from 'fs/promises';

const workflowService = new WorkflowService();
const fileService = new FileService();

export const addWorkflow = asyncHandler(async (req: Request, res: Response) => {
  const { title, description, version } = req.body;
  const files = req.files as { [fieldname: string]: Express.Multer.File[] };

  if (!files.workflow || !files.parameters) {
    res.status(400);
    throw new Error('Workflow and parameters files are required');
  }

  try {
    // Validate the uploaded files
    await fileService.validateWorkflowFiles(files.workflow[0], files.parameters[0]);

    // Move files to their final location
    const workflowName = title.replace(/\s+/g, '-');
    const movedFiles = await fileService.moveWorkflowFiles(
      path.join(process.cwd(), 'temp'),
      workflowName,
      files
    );

    // Create the workflow in the database
    const workflow = await workflowService.createWorkflow({
      title,
      description,
      version,
      files: {
        workflow: movedFiles.workflow!,
        parameters: movedFiles.parameters!,
        preview: movedFiles.preview
      }
    });

    res.status(201).json(workflow);
  } catch (error) {
    // Clean up the workflow directory if something went wrong
    await fileService.cleanWorkflowDirectory(title.replace(/\s+/g, '-'));
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

  const updateData: any = {
    title,
    description,
    version
  };

  if (Object.keys(files).length > 0) {
    // If files are provided, move them to the workflow directory
    const workflowName = title.replace(/\s+/g, '-');
    const movedFiles = await fileService.moveWorkflowFiles(
      path.join(process.cwd(), 'temp'),
      workflowName,
      files
    );

    updateData.files = {
      ...existingWorkflow.files,
      ...movedFiles
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
  const workflowId = req.params.id;
  const workflowPath = path.join(process.cwd(), 'docs', 'workflow', workflowId);
  
  // Read manifest to update it
  const manifestPath = path.join(process.cwd(), 'docs', 'workflow', 'manifest.json');
  const manifestContent = await fs.readFile(manifestPath, 'utf-8');
  const manifest = JSON.parse(manifestContent);

  // Remove workflow from manifest
  manifest.workflows = manifest.workflows.filter((w: { path: string }) => w.path !== workflowId);
  
  // Write updated manifest
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
  
  // Delete workflow directory and all its contents
  await fs.rm(workflowPath, { recursive: true, force: true });
  
  res.status(200).json({ message: 'Workflow deleted successfully' });
});