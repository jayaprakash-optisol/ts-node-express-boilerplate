import { AuthController } from '../../../src/controllers/auth.controller';
import { AuthService } from '../../../src/services/auth.service';
import {
  mockRequest,
  mockResponse,
  mockNext,
  mockUsers,
  mockAuthRequest,
  mockToken,
} from '../../mocks/mocks';

// Mock the AuthService
jest.mock('../../../src/services/auth.service', () => {
  // Create mock functions for each method
  const register = jest.fn();
  const login = jest.fn();
  const refreshToken = jest.fn();

  return {
    AuthService: {
      getInstance: jest.fn(() => ({
        register,
        login,
        refreshToken,
      })),
    },
  };
});

// Mock the environment configuration
jest.mock('../../../src/config/env.config', () => {
  const originalModule = jest.requireActual('../../../src/config/env.config');
  return {
    __esModule: true,
    default: {
      ...originalModule.default,
      ENCRYPTION_ENABLED: false,
    },
  };
});

describe('AuthController', () => {
  let authController: AuthController;
  let mockAuthService: any;

  beforeEach(() => {
    // Clear mocks
    jest.clearAllMocks();

    // Get instance of controller
    authController = new AuthController();

    // Get mocked auth service
    mockAuthService = AuthService.getInstance();
  });

  describe('register', () => {
    it('should register a user successfully', async () => {
      // Arrange
      const req = mockRequest();
      const res = mockResponse();
      req.body = {
        email: 'new@example.com',
        password: 'password123',
        firstName: 'New',
        lastName: 'User',
        role: 'user',
      };

      mockAuthService.register.mockResolvedValue({
        success: true,
        data: { id: 3, email: 'new@example.com', role: 'user' },
        statusCode: 201,
      });

      // Act
      await authController.register(req, res, mockNext);

      // Assert
      expect(mockAuthService.register).toHaveBeenCalledWith({
        email: 'new@example.com',
        password: 'password123',
        firstName: 'New',
        lastName: 'User',
        role: 'user',
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'User registered successfully',
        data: { id: 3, email: 'new@example.com', role: 'user' },
        error: undefined,
        statusCode: 201,
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 400 if email or password is missing', async () => {
      // Arrange
      const req = mockRequest();
      const res = mockResponse();
      req.body = {
        firstName: 'New',
        lastName: 'User',
      };

      // Act
      await authController.register(req, res, mockNext);

      // Assert
      expect(mockAuthService.register).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Operation failed',
        error: 'Email and password are required',
        statusCode: 400,
      });
    });

    it('should handle registration failure', async () => {
      // Arrange
      const req = mockRequest();
      const res = mockResponse();
      req.body = {
        email: 'existing@example.com',
        password: 'password123',
      };

      mockAuthService.register.mockResolvedValue({
        success: false,
        error: 'Email already in use',
        statusCode: 400,
      });

      // Act
      await authController.register(req, res, mockNext);

      // Assert
      expect(mockAuthService.register).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Operation failed',
        error: 'Email already in use',
        statusCode: 400,
      });
    });

    it('should handle service errors', async () => {
      // Arrange
      const req = mockRequest();
      const res = mockResponse();
      req.body = {
        email: 'test@example.com',
        password: 'password123',
      };

      mockAuthService.register.mockRejectedValue(new Error('Database error'));

      // Act
      await authController.register(req, res, mockNext);

      // Assert
      expect(mockAuthService.register).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('login', () => {
    it('should login a user successfully', async () => {
      // Arrange
      const req = mockRequest();
      const res = mockResponse();
      req.body = {
        email: 'test@example.com',
        password: 'password123',
      };

      mockAuthService.login.mockResolvedValue({
        success: true,
        data: {
          user: mockUsers[0],
          token: mockToken,
        },
        statusCode: 200,
      });

      // Act
      await authController.login(req, res, mockNext);

      // Assert
      expect(mockAuthService.login).toHaveBeenCalledWith('test@example.com', 'password123');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Login successful',
        data: {
          user: mockUsers[0],
          token: mockToken,
        },
        error: undefined,
        statusCode: 200,
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 400 if email or password is missing', async () => {
      // Arrange
      const req = mockRequest();
      const res = mockResponse();
      req.body = {};

      // Act
      await authController.login(req, res, mockNext);

      // Assert
      expect(mockAuthService.login).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Operation failed',
        error: 'Email and password are required',
        statusCode: 400,
      });
    });

    it('should handle login failure', async () => {
      // Arrange
      const req = mockRequest();
      const res = mockResponse();
      req.body = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      mockAuthService.login.mockResolvedValue({
        success: false,
        error: 'Invalid credentials',
        statusCode: 401,
      });

      // Act
      await authController.login(req, res, mockNext);

      // Assert
      expect(mockAuthService.login).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Operation failed',
        error: 'Invalid credentials',
        statusCode: 401,
      });
    });

    it('should handle service errors', async () => {
      // Arrange
      const req = mockRequest();
      const res = mockResponse();
      req.body = {
        email: 'test@example.com',
        password: 'password123',
      };

      mockAuthService.login.mockRejectedValue(new Error('Database error'));

      // Act
      await authController.login(req, res, mockNext);

      // Assert
      expect(mockAuthService.login).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('getCurrentUser', () => {
    it('should return current user information', async () => {
      // Arrange
      const req = mockAuthRequest(mockUsers[0]);
      const res = mockResponse();

      // Act
      await authController.getCurrentUser(req, res, mockNext);

      // Assert
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          userId: req.user!.userId || req.user!.id,
          email: req.user!.email,
          role: req.user!.role,
        },
        error: undefined,
        message: 'Operation successful',
        statusCode: 200,
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 400 if user is not authenticated', async () => {
      // Arrange
      const req = mockAuthRequest();
      const res = mockResponse();

      // Act
      await authController.getCurrentUser(req, res, mockNext);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Operation failed',
        error: 'User not authenticated',
        statusCode: 400,
      });
    });

    it('should handle errors', async () => {
      // Arrange
      const req = mockAuthRequest(mockUsers[0]);
      const res = mockResponse();
      res.status = jest.fn().mockImplementation(() => {
        throw new Error('Response error');
      });

      // Act
      await authController.getCurrentUser(req, res, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('refreshToken', () => {
    it('should refresh token successfully', async () => {
      // Arrange
      const req = mockAuthRequest(mockUsers[0]);
      const res = mockResponse();

      mockAuthService.refreshToken.mockResolvedValue({
        success: true,
        data: { token: mockToken },
        statusCode: 200,
      });

      // Act
      await authController.refreshToken(req, res, mockNext);

      // Assert
      expect(mockAuthService.refreshToken).toHaveBeenCalledWith(Number(req.user!.id));
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Token refreshed successfully',
        data: { token: mockToken },
        error: undefined,
        statusCode: 200,
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 400 if user is not authenticated', async () => {
      // Arrange
      const req = mockAuthRequest();
      const res = mockResponse();

      // Act
      await authController.refreshToken(req, res, mockNext);

      // Assert
      expect(mockAuthService.refreshToken).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Operation failed',
        error: 'User not authenticated',
        statusCode: 400,
      });
    });

    it('should handle token refresh failure', async () => {
      // Arrange
      const req = mockAuthRequest(mockUsers[0]);
      const res = mockResponse();

      mockAuthService.refreshToken.mockResolvedValue({
        success: false,
        error: 'Token refresh failed',
        statusCode: 400,
      });

      // Act
      await authController.refreshToken(req, res, mockNext);

      // Assert
      expect(mockAuthService.refreshToken).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Operation failed',
        error: 'Token refresh failed',
        statusCode: 400,
      });
    });

    it('should handle service errors', async () => {
      // Arrange
      const req = mockAuthRequest(mockUsers[0]);
      const res = mockResponse();

      mockAuthService.refreshToken.mockRejectedValue(new Error('Database error'));

      // Act
      await authController.refreshToken(req, res, mockNext);

      // Assert
      expect(mockAuthService.refreshToken).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});
