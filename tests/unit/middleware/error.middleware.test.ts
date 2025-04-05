import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  errorHandler,
  notFoundHandler,
} from '../../../src/middleware/error.middleware';
import { logger } from '../../../src/utils/logger';
import { AuthRequest } from '../../../src/types';

// Mock logger
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

// Mock environment config
jest.mock('../../../src/config/env.config', () => ({
  NODE_ENV: 'test',
}));

describe('Error Middleware', () => {
  let mockRequest: Partial<AuthRequest>;
  let mockResponse: Partial<Response>;
  let nextFunction: jest.Mock;

  beforeEach(() => {
    mockRequest = {
      method: 'GET',
      path: '/test',
      ip: '127.0.0.1',
      headers: { 'x-request-id': 'test-id' },
      user: { id: 1 } as any,
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    nextFunction = jest.fn();
    jest.clearAllMocks();
  });

  describe('Custom Error Classes', () => {
    it('should create AppError with correct properties', () => {
      const error = new AppError('Test error', StatusCodes.BAD_REQUEST);

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(StatusCodes.BAD_REQUEST);
      expect(error.isOperational).toBe(true);
    });

    it('should create BadRequestError with correct properties', () => {
      const error = new BadRequestError('Bad request');

      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('Bad request');
      expect(error.statusCode).toBe(StatusCodes.BAD_REQUEST);
    });

    it('should create UnauthorizedError with correct properties', () => {
      const error = new UnauthorizedError();

      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('Unauthorized');
      expect(error.statusCode).toBe(StatusCodes.UNAUTHORIZED);
    });

    it('should create ForbiddenError with correct properties', () => {
      const error = new ForbiddenError();

      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('Forbidden');
      expect(error.statusCode).toBe(StatusCodes.FORBIDDEN);
    });

    it('should create NotFoundError with correct properties', () => {
      const error = new NotFoundError();

      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('Resource not found');
      expect(error.statusCode).toBe(StatusCodes.NOT_FOUND);
    });
  });

  describe('notFoundHandler', () => {
    it('should call next with NotFoundError', () => {
      notFoundHandler(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledTimes(1);
      expect(nextFunction.mock.calls[0][0]).toBeInstanceOf(NotFoundError);
      expect(nextFunction.mock.calls[0][0].message).toBe('Route not found');
    });
  });

  describe('errorHandler', () => {
    it('should handle AppError correctly', () => {
      const appError = new AppError('Test app error', StatusCodes.BAD_REQUEST);

      errorHandler(appError, mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Test app error',
      });
      expect(logger.warn).toHaveBeenCalled();
    });

    it('should handle generic Error correctly', () => {
      const genericError = new Error('Generic error');

      errorHandler(
        genericError,
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(StatusCodes.INTERNAL_SERVER_ERROR);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Generic error',
      });
      expect(logger.error).toHaveBeenCalled();
    });

    it('should handle validation errors', () => {
      const validationErrors = [
        {
          property: 'email',
          constraints: {
            isEmail: 'email must be a valid email',
            isNotEmpty: 'email should not be empty',
          },
        },
      ] as any; // Cast to any to bypass type checking since we're simulating a specific error structure

      errorHandler(
        validationErrors,
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'email must be a valid email, email should not be empty',
      });
    });

    it('should handle PostgreSQL unique constraint violation', () => {
      const pgError = new Error('Duplicate key value violates unique constraint');
      Object.assign(pgError, {
        code: '23505',
        detail: 'Key (email)=(test@test.com) already exists.',
      });

      errorHandler(pgError, mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(StatusCodes.CONFLICT);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Key (email)=(test@test.com) already exists.',
      });
    });

    it('should handle JWT errors - invalid token', () => {
      const jwtError = new Error('invalid token');
      Object.assign(jwtError, { name: 'JsonWebTokenError' });

      errorHandler(jwtError, mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(StatusCodes.UNAUTHORIZED);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid token',
      });
    });

    it('should handle JWT errors - token expired', () => {
      const jwtError = new Error('jwt expired');
      Object.assign(jwtError, { name: 'TokenExpiredError' });

      errorHandler(jwtError, mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(StatusCodes.UNAUTHORIZED);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Token expired',
      });
    });

    it('should log 500 errors as error level', () => {
      const serverError = new Error('Server error');
      Object.assign(serverError, { statusCode: StatusCodes.INTERNAL_SERVER_ERROR });

      errorHandler(serverError, mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(logger.error).toHaveBeenCalled();
      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('should log non-500 errors as warn level', () => {
      const clientError = new Error('Client error');
      Object.assign(clientError, { statusCode: StatusCodes.BAD_REQUEST });

      errorHandler(clientError, mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(logger.warn).toHaveBeenCalled();
      expect(logger.error).not.toHaveBeenCalled();
    });
  });
});
