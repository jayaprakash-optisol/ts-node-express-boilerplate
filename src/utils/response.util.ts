import { StatusCodes } from 'http-status-codes';
import { ZodError } from 'zod';
import { ServiceResponse } from '../types';
import { logger } from './logger';
import { Response } from 'express';
import { encrypt } from './encryption.util';

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
  const message = success ? 'Operation successful' : (error ?? 'Operation failed');

  logger.debug('Creating service response:', { success, hasData: !!data, statusCode });

  return {
    success,
    data,
    error,
    statusCode,
    message,
  };
};

// Create error response
export const createErrorResponse = <T>(
  error: string,
  statusCode: number = StatusCodes.BAD_REQUEST,
  data?: T,
): ServiceResponse<T> => {
  logger.debug('Creating error response:', { error, statusCode });

  return {
    success: false,
    data,
    error,
    statusCode,
    message: 'Operation failed',
  };
};

/**
 * Send a success response with optional data
 * @param res Express response object
 * @param data Data to send in the response
 * @param message Optional success message
 * @param statusCode HTTP status code (default: 200)
 */
export const sendSuccess = <T>(
  res: Response,
  data?: T,
  message = 'Operation successful',
  statusCode = StatusCodes.OK,
): void => {
  try {
    const encryptedData = encrypt(JSON.stringify(data));
    logger.info('encryptedData', encryptedData);
    const response = createServiceResponse(true, encryptedData, undefined, statusCode);
    response.message = message;
    res.status(response.statusCode).json(response);
  } catch (error) {
    logger.error('Error sending success response:', error);
    throw error;
  }
};

/**
 * Send an error response
 * @param res Express response object
 * @param error Error message
 * @param statusCode HTTP status code (default: 400)
 * @param data Optional data to include in the response
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
