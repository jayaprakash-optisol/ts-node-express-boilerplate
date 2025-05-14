import { type Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { type ZodError } from 'zod';

import env from '../config/env.config';
import { type ServiceResponse } from '../types';

import { encrypt } from './encryption.util';
import { logger } from './logger';

// ===== ERROR HANDLING =====

/**
 * Custom API error class with status code and operational flag
 */
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

/**
 * Type guard to check if an error has a statusCode property
 */
export const isAppError = (error: unknown): error is AppError => {
  return error instanceof AppError;
};

/**
 * Error factory methods
 */
export const createError = {
  badRequest: (message: string): AppError => new AppError(message, StatusCodes.BAD_REQUEST),

  unauthorized: (message = 'Unauthorized'): AppError =>
    new AppError(message, StatusCodes.UNAUTHORIZED),

  forbidden: (message = 'Forbidden'): AppError => new AppError(message, StatusCodes.FORBIDDEN),

  notFound: (message = 'Resource not found'): AppError =>
    new AppError(message, StatusCodes.NOT_FOUND),

  internal: (message = 'Internal server error'): AppError =>
    new AppError(message, StatusCodes.INTERNAL_SERVER_ERROR, false),
};

// For backward compatibility
export const createBadRequestError = createError.badRequest;
export const createUnauthorizedError = createError.unauthorized;
export const createForbiddenError = createError.forbidden;
export const createNotFoundError = createError.notFound;
export const createInternalServerError = createError.internal;

/**
 * Format ZodError for API response
 */
export const formatZodError = (error: ZodError): string => {
  return error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ');
};

// ===== SERVICE RESPONSES =====

/**
 * Create a standardized service response
 */
export const createServiceResponse = <T>(
  success: boolean,
  data?: T | null,
  error?: string | null,
  statusCode = StatusCodes.OK,
): ServiceResponse<T> => {
  const message = success ? 'Operation successful' : (error ?? 'Operation failed');
  logger.debug('Service response:', { success, hasData: !!data, statusCode });

  return { success, data, error, statusCode, message };
};

/**
 * Create a success service response
 */
export const createSuccessResponse = <T>(
  data?: T,
  message = 'Operation successful',
  statusCode = StatusCodes.OK,
): ServiceResponse<T> => {
  const response = createServiceResponse<T>(true, data, null, statusCode);
  response.message = message;
  return response;
};

/**
 * Create an error service response
 */
export const createErrorResponse = <T>(
  error: string,
  statusCode = StatusCodes.BAD_REQUEST,
  data?: T,
): ServiceResponse<T> => {
  return createServiceResponse<T>(false, data, error, statusCode);
};

// Shorthand functions
export const serviceSuccess = createSuccessResponse;
export const serviceError = createErrorResponse;

// ===== EXPRESS RESPONSE HELPERS =====

/**
 * Send a success response through Express
 */
export const sendSuccess = <T>(
  res: Response,
  data?: T,
  message = 'Operation successful',
  statusCode = StatusCodes.OK,
): void => {
  try {
    const encryptedData = env?.ENCRYPTION_ENABLED ? encrypt(JSON.stringify(data)) : data;
    const response = createSuccessResponse(encryptedData, message, statusCode);
    res.status(response.statusCode).json(response);
  } catch (error) {
    logger.error('Error sending success response:', error);
    throw error;
  }
};

/**
 * Send an error response through Express
 */
export const sendError = <T>(
  res: Response,
  error: string,
  statusCode = StatusCodes.BAD_REQUEST,
  data?: T,
): void => {
  try {
    const response = createErrorResponse(error, statusCode, data);
    res.status(response.statusCode).json(response);
  } catch (err) {
    logger.error('Error sending error response:', err);
    throw err;
  }
};

// ===== BACKWARD COMPATIBILITY =====

export const _ok = <T>(data: T, message = '', code = StatusCodes.OK): ServiceResponse<T> => {
  return createSuccessResponse(data, message || 'Operation successful', code);
};

export const _error = <T>(
  error: string,
  code = StatusCodes.INTERNAL_SERVER_ERROR,
  data?: T,
): ServiceResponse<T> => {
  return createErrorResponse(error, code, data);
};
