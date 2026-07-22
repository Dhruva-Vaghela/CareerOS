import { Request, Response, NextFunction } from 'express';
import { createLogger } from '@careeros/logger';

const logger = createLogger('error-handler');

// Base Application Error class
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(message: string, statusCode: number, code: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

// Concrete Error Classes
export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized access') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden access') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

export class ConflictError extends AppError {
  constructor(message: string, code = 'CONFLICT_ERROR') {
    super(message, 409, code);
  }
}

export class DatabaseError extends AppError {
  constructor(message = 'Database operation failed', details?: unknown) {
    super(message, 500, 'DATABASE_ERROR', details);
  }
}

// Standardized response wrappers
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export function formatSuccess<T>(data: T): ApiResponse<T> {
  return {
    success: true,
    data,
  };
}

export function formatError(code: string, message: string, details?: unknown): ApiResponse {
  return {
    success: false,
    error: {
      code,
      message,
      details,
    },
  };
}

// Express Global Error Handler Middleware
export function globalErrorHandler(
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction,
): void {
  const traceId = (req.headers['x-trace-id'] as string) || 'none';

  if (err instanceof AppError) {
    logger.warn({
      message: err.message,
      statusCode: err.statusCode,
      code: err.code,
      details: err.details,
      path: req.path,
      method: req.method,
      traceId,
    });

    res.status(err.statusCode).json(formatError(err.code, err.message, err.details));
    return;
  }

  // Unhandled internal errors
  logger.error({
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    traceId,
  });

  res.status(500).json(
    formatError(
      'INTERNAL_SERVER_ERROR',
      process.env.NODE_ENV === 'production'
        ? 'An unexpected error occurred.'
        : err.message,
    ),
  );
}
