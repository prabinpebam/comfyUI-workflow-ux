import { Request, Response, NextFunction } from 'express';
import { ApiError } from './error.middleware';

export const validateWorkflowCreate = (req: Request, res: Response, next: NextFunction) => {
  const { title, version } = req.body;
  const files = req.files as { [fieldname: string]: Express.Multer.File[] };

  if (!title?.trim()) {
    throw new ApiError(400, 'Workflow title is required');
  }

  if (!files?.workflow?.[0] || !files?.parameters?.[0]) {
    throw new ApiError(400, 'Both workflow and parameters files are required');
  }

  // Validate file types
  const workflowFile = files.workflow[0];
  const parametersFile = files.parameters[0];
  const previewFile = files.preview?.[0];

  if (!workflowFile.originalname.endsWith('.json')) {
    throw new ApiError(400, 'Workflow file must be a JSON file');
  }

  if (!parametersFile.originalname.endsWith('.json')) {
    throw new ApiError(400, 'Parameters file must be a JSON file');
  }

  if (previewFile && !previewFile.mimetype.startsWith('image/')) {
    throw new ApiError(400, 'Preview file must be an image');
  }

  next();
};

export const validateWorkflowUpdate = (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { title } = req.body;
  const files = req.files as { [fieldname: string]: Express.Multer.File[] };

  if (!id?.trim()) {
    throw new ApiError(400, 'Workflow ID is required');
  }

  if (title && !title.trim()) {
    throw new ApiError(400, 'Workflow title cannot be empty if provided');
  }

  // If files are provided, validate them
  if (files) {
    if (files.workflow?.[0] && !files.workflow[0].originalname.endsWith('.json')) {
      throw new ApiError(400, 'Workflow file must be a JSON file');
    }

    if (files.parameters?.[0] && !files.parameters[0].originalname.endsWith('.json')) {
      throw new ApiError(400, 'Parameters file must be a JSON file');
    }

    if (files.preview?.[0] && !files.preview[0].mimetype.startsWith('image/')) {
      throw new ApiError(400, 'Preview file must be an image');
    }
  }

  next();
};