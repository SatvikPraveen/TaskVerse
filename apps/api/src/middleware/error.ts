// apps/api/src/middleware/error.ts
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import mongoose from 'mongoose';
import { ZodError } from 'zod';

import { env } from '@/config/env';
import { logger } from '@/config/logger';

export class AppError extends Error {
  readonly statusCode: number;
  readonly isOperational = true;
  readonly details?: unknown;

  constructor(message: string, statusCode = 500, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

export const createError = (message: string, statusCode = 500, details?: unknown): AppError =>
  new AppError(message, statusCode, details);

const getErrorTitle = (statusCode: number): string => {
  const titles: Record<number, string> = {
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    409: 'Conflict',
    413: 'Payload Too Large',
    422: 'Unprocessable Entity',
    429: 'Too Many Requests',
    500: 'Internal Server Error',
    503: 'Service Unavailable',
  };
  return titles[statusCode] ?? 'Error';
};

interface MongoDuplicateKeyError extends Error {
  code: number;
  keyValue?: Record<string, unknown>;
}

const isDuplicateKeyError = (error: unknown): error is MongoDuplicateKeyError =>
  typeof error === 'object' &&
  error !== null &&
  (error as { name?: string }).name === 'MongoServerError' &&
  (error as { code?: number }).code === 11000;

export interface ErrorBody {
  error: string;
  message: string;
  details?: unknown;
  requestId?: string;
  stack?: string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler = (error: unknown, req: Request, res: Response, _next: NextFunction): void => {
  let statusCode = 500;
  let message = 'Internal Server Error';
  let title: string | undefined;
  let details: unknown;

  if (error instanceof ZodError) {
    statusCode = 400;
    title = 'Validation Error';
    message = 'Request validation failed';
    details = error.errors.map(err => ({ field: err.path.join('.'), message: err.message }));
  } else if (error instanceof mongoose.Error.ValidationError) {
    statusCode = 400;
    title = 'Validation Error';
    message = 'Document validation failed';
    details = Object.values(error.errors).map(err => ({ field: err.path, message: err.message }));
  } else if (isDuplicateKeyError(error)) {
    statusCode = 409;
    message = 'Duplicate Entry';
    const field = Object.keys(error.keyValue ?? {})[0];
    details = field ? `${field} already exists` : undefined;
  } else if (error instanceof mongoose.Error.CastError) {
    statusCode = 400;
    message = 'Invalid ID format';
  } else if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
    details = error.details;
  } else if (error instanceof Error && error.name === 'MulterError') {
    statusCode = 400;
    message = error.message;
  } else if (error instanceof Error && error.message === 'Not allowed by CORS policy') {
    statusCode = 403;
    message = error.message;
  } else if (error instanceof Error && error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  } else if (error instanceof Error && error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  } else if (error instanceof Error && 'type' in error && error.type === 'entity.too.large') {
    statusCode = 413;
    message = 'Request body too large';
  }

  const requestId = (req as Request & { id?: string }).id;
  const log = statusCode >= 500 ? logger.error.bind(logger) : logger.warn.bind(logger);
  log(
    {
      err: error,
      requestId,
      url: req.originalUrl,
      method: req.method,
      statusCode,
    },
    statusCode >= 500 ? 'Unhandled error' : 'Request failed'
  );

  const body: ErrorBody = {
    error: title ?? getErrorTitle(statusCode),
    message,
    ...(details !== undefined && { details }),
    ...(requestId && { requestId }),
    ...(env.NODE_ENV !== 'production' && error instanceof Error && { stack: error.stack }),
  };

  res.status(statusCode).json(body);
};

type AsyncHandler<Req extends Request = Request> = (
  req: Req,
  res: Response,
  next: NextFunction
) => Promise<unknown>;

export const asyncHandler =
  <Req extends Request = Request>(fn: AsyncHandler<Req>): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req as Req, res, next)).catch(next);
  };
