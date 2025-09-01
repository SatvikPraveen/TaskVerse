// apps/api/src/middleware/error.ts
import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import mongoose from 'mongoose';
import { logger } from '@/config/logger';
import { env } from '@/config/env';

interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export const createError = (message: string, statusCode: number = 500): AppError => {
  const error = new Error(message) as AppError;
  error.statusCode = statusCode;
  error.isOperational = true;
  return error;
};

export const errorHandler = (
  error: AppError | Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let statusCode = 500;
  let message = 'Internal Server Error';
  let details: any = undefined;

  // Zod validation errors
  if (error instanceof ZodError) {
    statusCode = 400;
    message = 'Validation Error';
    details = error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
    }));
  }
  // MongoDB validation errors
  else if (error instanceof mongoose.Error.ValidationError) {
    statusCode = 400;
    message = 'Validation Error';
    details = Object.values(error.errors).map(err => ({
      field: err.path,
      message: err.message,
    }));
  }
  // MongoDB duplicate key error
  else if (error.name === 'MongoServerError' && (error as any).code === 11000) {
    statusCode = 409;
    message = 'Duplicate Entry';
    const field = Object.keys((error as any).keyValue)[0];
    details = `${field} already exists`;
  }
  // MongoDB cast error (invalid ObjectId)
  else if (error instanceof mongoose.Error.CastError) {
    statusCode = 400;
    message = 'Invalid ID format';
  }
  // JWT errors
  else if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  }
  else if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  }
  // Custom app errors
  else if ((error as AppError).isOperational && (error as AppError).statusCode) {
    statusCode = (error as AppError).statusCode!;
    message = error.message;
  }
  // Generic errors
  else if (error.message) {
    message = error.message;
  }

  // Log error details
  logger.error('Error occurred:', {
    error: error.message,
    stack: env.NODE_ENV === 'development' ? error.stack : undefined,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    statusCode,
  });

  // Send error response
  const response: any = {
    error: getErrorTitle(statusCode),
    message,
    ...(details && { details }),
    ...(env.NODE_ENV === 'development' && { stack: error.stack }),
  };

  res.status(statusCode).json(response);
};

const getErrorTitle = (statusCode: number): string => {
  switch (statusCode) {
    case 400: return 'Bad Request';
    case 401: return 'Unauthorized';
    case 403: return 'Forbidden';
    case 404: return 'Not Found';
    case 409: return 'Conflict';
    case 422: return 'Unprocessable Entity';
    case 429: return 'Too Many Requests';
    case 500: return 'Internal Server Error';
    default: return 'Error';
  }
};

export const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};