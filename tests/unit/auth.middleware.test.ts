import { authenticate, authorize } from '../../src/middleware/auth.middleware';
import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../src/types';
import { jwtUtil } from '../../src/utils/jwt.util';
import { AppError } from '../../src/utils/error.util';

// Mock JWT util
jest.mock('../../src/utils/jwt.util', () => ({
  jwtUtil: {
    verifyToken: jest.fn(),
  },
}));

describe('Auth Middleware', () => {
  let mockRequest: Partial<AuthRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.Mock<NextFunction>;

  beforeEach(() => {
    mockRequest = {
      headers: {},
      user: undefined,
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('authenticate', () => {
    it('should call next() when valid token is provided', () => {
      const mockUser = { userId: 1, email: 'test@example.com', role: 'user' };
      mockRequest.headers = {
        authorization: 'Bearer valid-token',
      };

      (jwtUtil.verifyToken as jest.Mock).mockReturnValue(mockUser);

      authenticate(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(jwtUtil.verifyToken).toHaveBeenCalledWith('valid-token');
      expect(mockRequest.user).toEqual({
        id: '1',
        email: 'test@example.com',
        role: 'user',
      });
      expect(mockNext).toHaveBeenCalled();
    });

    it('should call next with error when no token is provided', () => {
      authenticate(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      const error = mockNext.mock.calls[0][0] as AppError;
      expect(error.message).toContain('Invalid token');
      expect(error.statusCode).toBe(401);
    });

    it('should call next with error when token verification fails', () => {
      mockRequest.headers = {
        authorization: 'Bearer invalid-token',
      };

      (jwtUtil.verifyToken as jest.Mock).mockImplementation(() => {
        throw new Error('Token verification failed');
      });

      authenticate(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(jwtUtil.verifyToken).toHaveBeenCalledWith('invalid-token');
      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      const error = mockNext.mock.calls[0][0] as AppError;
      expect(error.message).toBe('Invalid token');
      expect(error.statusCode).toBe(401);
    });
  });

  describe('authorize', () => {
    it('should call next() when user has required role', () => {
      mockRequest.user = {
        id: '1',
        email: 'admin@example.com',
        role: 'admin',
      };

      const middleware = authorize('admin');
      middleware(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalledWith(expect.any(Error));
    });

    it('should call next with error when user does not have required role', () => {
      mockRequest.user = {
        id: '1',
        email: 'user@example.com',
        role: 'user',
      };

      const middleware = authorize('admin');
      middleware(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      const error = mockNext.mock.calls[0][0] as AppError;
      expect(error.message).toBe('Insufficient permissions');
      expect(error.statusCode).toBe(403);
    });

    it('should handle multiple roles', async () => {
      mockRequest.user = {
        id: '1',
        email: 'user@example.com',
        role: 'user',
      };

      const middleware = authorize('admin', 'user');
      middleware(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalledWith(expect.any(Error));
    });

    it('should handle when user is not authenticated', () => {
      mockRequest.user = undefined;

      const middleware = authorize('admin');
      middleware(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      const error = mockNext.mock.calls[0][0] as AppError;
      expect(error.message).toBe('User not authenticated');
      expect(error.statusCode).toBe(401);
    });
  });
});
