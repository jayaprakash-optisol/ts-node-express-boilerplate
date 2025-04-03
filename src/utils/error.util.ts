import { StatusCodes } from 'http-status-codes';
import { ZodError } from 'zod';
import { ServiceResponse } from '../types';

// Custom API error class
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Error.captureStackTrace?.(this, this.constructor);
  }
}

// Common error factory methods
export const createBadRequestError = (message: string): AppError => {
  return new AppError(message, StatusCodes.BAD_REQUEST);
};

export const createUnauthorizedError = (message = 'Unauthorized'): AppError => {
  return new AppError(message, StatusCodes.UNAUTHORIZED);
};

export const createForbiddenError = (message = 'Forbidden'): AppError => {
  return new AppError(message, StatusCodes.FORBIDDEN);
};

export const createNotFoundError = (message = 'Resource not found'): AppError => {
  return new AppError(message, StatusCodes.NOT_FOUND);
};

export const createInternalServerError = (message = 'Internal server error'): AppError => {
  return new AppError(message, StatusCodes.INTERNAL_SERVER_ERROR, false);
};

// Format ZodError for API response
export const formatZodError = (error: ZodError): string => {
  return error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ');
};

// Create standardized service response
export const createServiceResponse = <T>(
  success: boolean,
  data?: T,
  error?: string,
  statusCode = StatusCodes.OK,
): ServiceResponse<T> => {
  return {
    success,
    data,
    error,
    statusCode,
    message: success ? 'Operation successful' : error || 'Operation failed',
  };
};
