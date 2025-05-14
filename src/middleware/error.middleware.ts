import { type NextFunction, type Request, type Response } from 'express';
import { StatusCodes } from 'http-status-codes';

import env from '../config/env.config';
import { type AuthRequest } from '../types';
import { logger } from '../utils/logger';

// Define user interface for request
type RequestWithUser = AuthRequest;

// Error interfaces
interface ValidationConstraint {
  [key: string]: string;
}

interface IValidationError {
  constraints?: ValidationConstraint;
  children?: IValidationError[];
  property?: string;
}

interface ErrorWithStatusCode extends Error {
  statusCode?: number;
  isOperational?: boolean;
  code?: string | number;
}

interface PostgreSQLUniqueViolationError extends ErrorWithStatusCode {
  code: '23505';
  detail: string;
}

// Custom error classes
export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string) {
    super(message, StatusCodes.BAD_REQUEST);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, StatusCodes.UNAUTHORIZED);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, StatusCodes.FORBIDDEN);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, StatusCodes.NOT_FOUND);
  }
}

// 404 route handler
export const notFoundHandler = (_req: Request, _res: Response, next: NextFunction): void => {
  next(new NotFoundError(`Route not found`));
};

// Main error handler
export const errorHandler = (
  err: Error | ErrorWithStatusCode,
  req: RequestWithUser,
  res: Response,

  _next: NextFunction,
): void => {
  let error = err as ErrorWithStatusCode;
  let statusCode = error.statusCode ?? StatusCodes.INTERNAL_SERVER_ERROR;
  let message = error.message || 'Something went wrong';

  // Handle validation errors
  if (Array.isArray(error) && error[0]?.constraints) {
    const validationErrors = error.map((e: IValidationError) =>
      Object.values(e.constraints || {}).join(', '),
    );
    statusCode = StatusCodes.BAD_REQUEST;
    message = validationErrors.join('; ');
    error = new BadRequestError(message);
  }

  // Handle PostgreSQL unique constraint violation
  if (error.code === '23505') {
    const duplicateError = error as PostgreSQLUniqueViolationError;
    statusCode = StatusCodes.CONFLICT;
    message = duplicateError.detail || 'Duplicate key value violates unique constraint';
    error = new AppError(message, statusCode);
  }

  // Handle JWT errors
  if ('name' in error) {
    if (error.name === 'JsonWebTokenError') {
      statusCode = StatusCodes.UNAUTHORIZED;
      message = 'Invalid token';
      error = new UnauthorizedError(message);
    }

    if (error.name === 'TokenExpiredError') {
      statusCode = StatusCodes.UNAUTHORIZED;
      message = 'Token expired';
      error = new UnauthorizedError(message);
    }
  }

  // Log errors
  const logObject = {
    message: `[${req.method}] ${req.path} - ${statusCode}: ${message}`,
    requestId: req.headers['x-request-id'],
    userId: req.user?.id,
    path: req.path,
  };

  if (statusCode >= 500) {
    logger.error({ ...logObject, error: error.stack, method: req.method, ip: req.ip });
  } else {
    logger.warn(logObject);
  }

  // Send error response
  const response = {
    success: false,
    error: message,
    ...(env.NODE_ENV === 'development' && { stack: error.stack }),
  };

  res.status(statusCode).json(response);
};
