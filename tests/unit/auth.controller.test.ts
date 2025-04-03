import { Request, Response, NextFunction } from 'express';
import { AuthController } from '../../src/controllers/auth.controller';
import { AuthRequest } from '../../src/types';
import { IAuthService } from '../../src/types/interfaces';
import * as errorUtil from '../../src/utils/error.util';
import container from '../../src/di/container';

// Mock dependencies
jest.mock('../../src/di/container', () => {
  return {
    resolve: jest.fn(),
  };
});

jest.mock('../../src/utils/error.util', () => ({
  createBadRequestError: jest.fn(msg => new Error(msg)),
  createUnauthorizedError: jest.fn(msg => new Error(msg)),
}));

// For typing request with user property
interface RequestWithUser extends Request {
  user?: {
    id?: string;
    userId: string;
    email: string;
    role: string;
  };
}

describe('AuthController', () => {
  let authController: AuthController;
  let mockAuthService: Partial<IAuthService>;
  let req: Partial<RequestWithUser>;
  let res: Partial<Response>;
  let next: jest.Mock<NextFunction>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup mock auth service
    mockAuthService = {
      register: jest.fn(),
      login: jest.fn(),
      refreshToken: jest.fn(),
    };

    // Setup DI mock
    (container.resolve as jest.Mock).mockReturnValue(mockAuthService);

    // Setup request, response, next
    req = {
      body: {},
      user: {
        userId: '123',
        email: 'test@example.com',
        role: 'user',
      },
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    next = jest.fn();

    // Create auth controller
    authController = new AuthController();
  });

  describe('register', () => {
    it('should register a user successfully', async () => {
      // Arrange
      req.body = {
        email: 'user@example.com',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
        role: 'user',
      };

      (mockAuthService.register as jest.Mock).mockResolvedValue({
        success: true,
        statusCode: 201,
        data: {
          id: '123',
          email: 'user@example.com',
        },
      });

      // Act
      await authController.register(req as Request, res as Response, next);

      // Assert
      expect(mockAuthService.register).toHaveBeenCalledWith({
        email: 'user@example.com',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
        role: 'user',
      });

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'User registered successfully',
        data: {
          id: '123',
          email: 'user@example.com',
        },
      });
    });

    it('should handle missing required fields', async () => {
      // Arrange
      req.body = {
        firstName: 'Test',
        lastName: 'User',
      };

      // Act
      await authController.register(req as Request, res as Response, next);

      // Assert
      expect(errorUtil.createBadRequestError).toHaveBeenCalledWith(
        'Email and password are required',
      );
      expect(next).toHaveBeenCalled();
      expect(mockAuthService.register).not.toHaveBeenCalled();
    });

    it('should handle registration failure', async () => {
      // Arrange
      req.body = {
        email: 'user@example.com',
        password: 'Password123!',
      };

      (mockAuthService.register as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Email already exists',
      });

      // Act
      await authController.register(req as Request, res as Response, next);

      // Assert
      expect(errorUtil.createBadRequestError).toHaveBeenCalledWith('Email already exists');
      expect(next).toHaveBeenCalled();
    });

    it('should handle unexpected errors', async () => {
      // Arrange
      req.body = {
        email: 'user@example.com',
        password: 'Password123!',
      };

      const error = new Error('Unexpected error');
      (mockAuthService.register as jest.Mock).mockRejectedValue(error);

      // Act
      await authController.register(req as Request, res as Response, next);

      // Assert
      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('login', () => {
    it('should log in a user successfully', async () => {
      // Arrange
      req.body = {
        email: 'user@example.com',
        password: 'Password123!',
      };

      (mockAuthService.login as jest.Mock).mockResolvedValue({
        success: true,
        statusCode: 200,
        data: {
          token: 'jwt-token',
          user: {
            id: '123',
            email: 'user@example.com',
          },
        },
      });

      // Act
      await authController.login(req as Request, res as Response, next);

      // Assert
      expect(mockAuthService.login).toHaveBeenCalledWith('user@example.com', 'Password123!');

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Login successful',
        data: {
          token: 'jwt-token',
          user: {
            id: '123',
            email: 'user@example.com',
          },
        },
      });
    });

    it('should handle missing required fields', async () => {
      // Arrange
      req.body = {};

      // Act
      await authController.login(req as Request, res as Response, next);

      // Assert
      expect(errorUtil.createBadRequestError).toHaveBeenCalledWith(
        'Email and password are required',
      );
      expect(next).toHaveBeenCalled();
      expect(mockAuthService.login).not.toHaveBeenCalled();
    });

    it('should handle login failure', async () => {
      // Arrange
      req.body = {
        email: 'user@example.com',
        password: 'wrong-password',
      };

      (mockAuthService.login as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Invalid credentials',
      });

      // Act
      await authController.login(req as Request, res as Response, next);

      // Assert
      expect(errorUtil.createUnauthorizedError).toHaveBeenCalledWith('Invalid credentials');
      expect(next).toHaveBeenCalled();
    });
  });

  describe('getCurrentUser', () => {
    it('should return the current user', async () => {
      // Act
      await authController.getCurrentUser(req as AuthRequest, res as Response, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          userId: '123',
          email: 'test@example.com',
          role: 'user',
        },
      });
    });

    it('should handle unauthenticated user', async () => {
      // Arrange
      req.user = undefined;

      // Act
      await authController.getCurrentUser(req as AuthRequest, res as Response, next);

      // Assert
      expect(errorUtil.createBadRequestError).toHaveBeenCalledWith('User not authenticated');
      expect(next).toHaveBeenCalled();
    });
  });

  describe('refreshToken', () => {
    it('should refresh token successfully', async () => {
      // Arrange
      req.user = {
        id: '123',
        userId: '123',
        email: 'test@example.com',
        role: 'user',
      };

      (mockAuthService.refreshToken as jest.Mock).mockResolvedValue({
        success: true,
        statusCode: 200,
        data: {
          token: 'new-jwt-token',
        },
      });

      // Act
      await authController.refreshToken(req as AuthRequest, res as Response, next);

      // Assert
      expect(mockAuthService.refreshToken).toHaveBeenCalledWith(123);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          token: 'new-jwt-token',
        },
      });
    });

    it('should handle unauthenticated user', async () => {
      // Arrange
      req.user = undefined;

      // Act
      await authController.refreshToken(req as AuthRequest, res as Response, next);

      // Assert
      expect(errorUtil.createBadRequestError).toHaveBeenCalledWith('User not authenticated');
      expect(next).toHaveBeenCalled();
    });

    it('should handle token refresh failure', async () => {
      // Arrange
      req.user = {
        id: '123',
        userId: '123',
        email: 'test@example.com',
        role: 'user',
      };

      (mockAuthService.refreshToken as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Token refresh failed',
      });

      // Act
      await authController.refreshToken(req as AuthRequest, res as Response, next);

      // Assert
      expect(errorUtil.createBadRequestError).toHaveBeenCalledWith('Token refresh failed');
      expect(next).toHaveBeenCalled();
    });
  });
});
