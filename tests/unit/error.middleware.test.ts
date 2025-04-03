import { Request, Response, NextFunction } from 'express';
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
import env from '../../src/config/env.config';

// Define user interface for request matching the one in error.middleware.ts
interface RequestWithUser extends Request {
  user?: {
    id: string;
    [key: string]: unknown;
  };
}

describe('Error Middleware', () => {
  // Mock objects
  let req: Partial<RequestWithUser>;
  let res: Partial<Response>;
  let next: jest.Mock<NextFunction>;

  beforeEach(() => {
    req = {
      method: 'GET',
      path: '/test',
      headers: { 'x-request-id': 'test-id' },
      ip: '127.0.0.1',
      user: { id: 'test-user-id' },
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    next = jest.fn();
  });

  describe('Custom Error Classes', () => {
    test('AppError should set properties correctly', () => {
      const error = new AppError('Test error', 400);
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(400);
      expect(error.isOperational).toBe(true);
    });

    test('BadRequestError should extend AppError with status 400', () => {
      const error = new BadRequestError('Bad request');
      expect(error).toBeInstanceOf(AppError);
      expect(error.statusCode).toBe(StatusCodes.BAD_REQUEST);
      expect(error.message).toBe('Bad request');
    });

    test('UnauthorizedError should set default message', () => {
      const error = new UnauthorizedError();
      expect(error.message).toBe('Unauthorized');
      expect(error.statusCode).toBe(StatusCodes.UNAUTHORIZED);
    });

    test('ForbiddenError should set default message', () => {
      const error = new ForbiddenError();
      expect(error.message).toBe('Forbidden');
      expect(error.statusCode).toBe(StatusCodes.FORBIDDEN);
    });

    test('NotFoundError should set default message', () => {
      const error = new NotFoundError();
      expect(error.message).toBe('Resource not found');
      expect(error.statusCode).toBe(StatusCodes.NOT_FOUND);
    });
  });

  describe('notFoundHandler', () => {
    test('should call next with NotFoundError', () => {
      notFoundHandler(req as Request, res as Response, next);
      expect(next).toHaveBeenCalledWith(expect.any(NotFoundError));
      expect(next.mock.calls[0][0].message).toBe('Route not found');
    });
  });

  describe('errorHandler', () => {
    test('should handle generic errors', () => {
      const err = new Error('Generic error');
      errorHandler(err, req as any, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(StatusCodes.INTERNAL_SERVER_ERROR);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Generic error',
        ...(env.NODE_ENV === 'development' && { stack: expect.any(String) }),
      });
    });

    test('should handle AppError with custom status code', () => {
      const err = new AppError('Custom error', StatusCodes.BAD_GATEWAY);
      errorHandler(err, req as any, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_GATEWAY);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Custom error',
        ...(env.NODE_ENV === 'development' && { stack: expect.any(String) }),
      });
    });

    test('should handle validation errors array', () => {
      const validationErrors = [
        { property: 'email', constraints: { isEmail: 'must be an email' } },
        { property: 'name', constraints: { isString: 'must be a string' } },
      ];

      errorHandler(validationErrors as any, req as any, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'must be an email; must be a string',
        ...(env.NODE_ENV === 'development' && { stack: expect.any(String) }),
      });
    });

    test('should handle PostgreSQL unique constraint violation', () => {
      const pgError = {
        code: '23505',
        detail: 'Key (email)=(test@example.com) already exists.',
        message: 'duplicate key value violates unique constraint',
      };

      errorHandler(pgError as any, req as any, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(StatusCodes.CONFLICT);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Key (email)=(test@example.com) already exists.',
        ...(env.NODE_ENV === 'development' && { stack: expect.any(String) }),
      });
    });

    test('should handle PostgreSQL unique constraint violation without detail', () => {
      const pgError = {
        code: '23505',
        message: 'duplicate key value violates unique constraint',
      };

      errorHandler(pgError as any, req as any, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(StatusCodes.CONFLICT);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Duplicate key value violates unique constraint',
        ...(env.NODE_ENV === 'development' && { stack: expect.any(String) }),
      });
    });

    test('should handle JWT invalid token error', () => {
      const jwtError = {
        name: 'JsonWebTokenError',
        message: 'invalid signature',
      };

      errorHandler(jwtError as any, req as any, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(StatusCodes.UNAUTHORIZED);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid token',
        ...(env.NODE_ENV === 'development' && { stack: expect.any(String) }),
      });
    });

    test('should handle JWT expired token error', () => {
      const jwtError = {
        name: 'TokenExpiredError',
        message: 'jwt expired',
      };

      errorHandler(jwtError as any, req as any, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(StatusCodes.UNAUTHORIZED);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Token expired',
        ...(env.NODE_ENV === 'development' && { stack: expect.any(String) }),
      });
    });

    test('should handle request without user object', () => {
      const reqWithoutUser = { ...req };
      delete reqWithoutUser.user;

      const err = new Error('Test error');
      errorHandler(err, reqWithoutUser as any, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(StatusCodes.INTERNAL_SERVER_ERROR);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Test error',
        ...(env.NODE_ENV === 'development' && { stack: expect.any(String) }),
      });
    });
  });
});
