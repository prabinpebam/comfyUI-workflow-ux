import { Request, Response, NextFunction } from 'express';

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('Error:', err);

  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      message: err.message,
      details: err.details,
      ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {})
    });
  }

  // Handle multer errors
  if (err.name === 'MulterError') {
    return res.status(400).json({
      message: 'File upload error',
      details: err.message
    });
  }

  // Handle validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      message: 'Validation error',
      details: err.message
    });
  }

  // Default error
  return res.status(500).json({
    message: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' ? { 
      details: err.message,
      stack: err.stack 
    } : {})
  });
};