import { describe, it, expect, vi, beforeEach } from 'vitest';
import { type Request, type Response, type NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import {
  errorHandler,
  notFoundHandler,
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
} from '../../src/middleware/error.middleware';
import { createMockRequest, createMockResponse, createMockNext } from '../utils/test-utils';
import { logger } from '../../src/utils/logger';

// Mock logger
vi.mock('../../src/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

// Mock env config
vi.mock('../../src/config/env.config', () => ({
  default: {
    NODE_ENV: 'test',
  },
}));

describe('Error Middleware', () => {
  let req: Request;
  let res: Response;
  let next: NextFunction;
  let jsonSpy: ReturnType<typeof vi.fn>;
  let statusSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetAllMocks();
    req = createMockRequest() as Request;
    const mockRes = createMockResponse();
    res = mockRes.res;
    jsonSpy = mockRes.jsonSpy;
    statusSpy = mockRes.statusSpy;
    next = createMockNext();
  });

  describe('notFoundHandler', () => {
    it('should create a NotFoundError and pass it to next', () => {
      notFoundHandler(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.any(NotFoundError));
      const error = (next as any).mock.calls[0][0];
      expect(error.message).toBe('Route not found');
      expect(error.statusCode).toBe(StatusCodes.NOT_FOUND);
    });
  });

  describe('errorHandler', () => {
    it('should handle generic errors with 500 status code', () => {
      const error = new Error('Something went wrong');
      errorHandler(error, req as any, res, next);

      expect(statusSpy).toHaveBeenCalledWith(StatusCodes.INTERNAL_SERVER_ERROR);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'Something went wrong',
      });
      expect(logger.error).toHaveBeenCalled();
    });

    it('should handle AppError with custom status code', () => {
      const error = new AppError('Custom error', StatusCodes.BAD_GATEWAY);
      errorHandler(error, req as any, res, next);

      expect(statusSpy).toHaveBeenCalledWith(StatusCodes.BAD_GATEWAY);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'Custom error',
      });
      expect(logger.error).toHaveBeenCalled();
    });

    it('should handle BadRequestError', () => {
      const error = new BadRequestError('Invalid input');
      errorHandler(error, req as any, res, next);

      expect(statusSpy).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid input',
      });
      expect(logger.warn).toHaveBeenCalled();
    });

    it('should handle UnauthorizedError', () => {
      const error = new UnauthorizedError();
      errorHandler(error, req as any, res, next);

      expect(statusSpy).toHaveBeenCalledWith(StatusCodes.UNAUTHORIZED);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'Unauthorized',
      });
      expect(logger.warn).toHaveBeenCalled();
    });

    it('should handle ForbiddenError', () => {
      const error = new ForbiddenError();
      errorHandler(error, req as any, res, next);

      expect(statusSpy).toHaveBeenCalledWith(StatusCodes.FORBIDDEN);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'Forbidden',
      });
      expect(logger.warn).toHaveBeenCalled();
    });

    it('should handle NotFoundError', () => {
      const error = new NotFoundError('User not found');
      errorHandler(error, req as any, res, next);

      expect(statusSpy).toHaveBeenCalledWith(StatusCodes.NOT_FOUND);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'User not found',
      });
      expect(logger.warn).toHaveBeenCalled();
    });

    it('should handle validation errors array', () => {
      const validationErrors = [
        {
          property: 'email',
          constraints: {
            isEmail: 'email must be a valid email',
            isNotEmpty: 'email should not be empty',
          },
        },
        {
          property: 'password',
          constraints: {
            minLength: 'password must be at least 8 characters',
          },
        },
      ];

      errorHandler(validationErrors as any, req as any, res, next);

      expect(statusSpy).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: expect.stringContaining(
          'email must be a valid email, email should not be empty; password must be at least 8 characters',
        ),
      });
      expect(logger.warn).toHaveBeenCalled();
    });

    it('should handle PostgreSQL unique constraint violation errors', () => {
      const pgError = {
        code: '23505',
        detail: 'Key (email)=(test@example.com) already exists.',
        message: 'duplicate key value violates unique constraint',
      };

      errorHandler(pgError as any, req as any, res, next);

      expect(statusSpy).toHaveBeenCalledWith(StatusCodes.CONFLICT);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'Key (email)=(test@example.com) already exists.',
      });
      expect(logger.warn).toHaveBeenCalled();
    });

    it('should handle PostgreSQL unique constraint without detail', () => {
      const pgError = {
        code: '23505',
        message: 'duplicate key value violates unique constraint',
      };

      errorHandler(pgError as any, req as any, res, next);

      expect(statusSpy).toHaveBeenCalledWith(StatusCodes.CONFLICT);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'Duplicate key value violates unique constraint',
      });
      expect(logger.warn).toHaveBeenCalled();
    });

    it('should handle JWT token errors', () => {
      const jwtError = {
        name: 'JsonWebTokenError',
        message: 'invalid signature',
      };

      errorHandler(jwtError as any, req as any, res, next);

      expect(statusSpy).toHaveBeenCalledWith(StatusCodes.UNAUTHORIZED);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid token',
      });
      expect(logger.warn).toHaveBeenCalled();
    });

    it('should handle JWT token expiration errors', () => {
      const jwtExpiredError = {
        name: 'TokenExpiredError',
        message: 'jwt expired',
        expiredAt: new Date(),
      };

      errorHandler(jwtExpiredError as any, req as any, res, next);

      expect(statusSpy).toHaveBeenCalledWith(StatusCodes.UNAUTHORIZED);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'Token expired',
      });
      expect(logger.warn).toHaveBeenCalled();
    });

    it('should log user ID if present in request', () => {
      const error = new Error('Something went wrong');
      const userReq = {
        ...req,
        user: { id: 123, email: 'test@example.com', role: 'user' },
        method: 'GET',
        path: '/api/users',
        headers: { 'x-request-id': 'test-request-id' },
        ip: '127.0.0.1',
      };

      errorHandler(error, userReq as any, res, next);

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 123,
          path: '/api/users',
          requestId: 'test-request-id',
          ip: '127.0.0.1',
        }),
      );
    });

    it('should handle errors without messages', () => {
      const error = new Error();
      errorHandler(error, req as any, res, next);

      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'Something went wrong',
      });
    });
  });

  describe('Custom Error Classes', () => {
    it('should create AppError with correct properties', () => {
      const error = new AppError('Test error', 418, true);
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(418);
      expect(error.isOperational).toBe(true);
      expect(error.stack).toBeDefined();
    });

    it('should create BadRequestError with correct status code', () => {
      const error = new BadRequestError('Bad request');
      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('Bad request');
      expect(error.statusCode).toBe(StatusCodes.BAD_REQUEST);
    });

    it('should create UnauthorizedError with default message', () => {
      const error = new UnauthorizedError();
      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('Unauthorized');
      expect(error.statusCode).toBe(StatusCodes.UNAUTHORIZED);
    });

    it('should create ForbiddenError with default message', () => {
      const error = new ForbiddenError();
      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('Forbidden');
      expect(error.statusCode).toBe(StatusCodes.FORBIDDEN);
    });

    it('should create NotFoundError with default message', () => {
      const error = new NotFoundError();
      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('Resource not found');
      expect(error.statusCode).toBe(StatusCodes.NOT_FOUND);
    });

    it('should create NotFoundError with custom message', () => {
      const error = new NotFoundError('Custom not found message');
      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('Custom not found message');
      expect(error.statusCode).toBe(StatusCodes.NOT_FOUND);
    });
  });
});
