import { AuthService } from '../../../src/services/auth.service';
import { UserService } from '../../../src/services/user.service';
import { mockUsers } from '../../utils/mocks';
import { jwtUtil } from '../../../src/utils/jwt.util';
import { StatusCodes } from 'http-status-codes';

// Fix the UserService mock implementation
jest.mock('../../../src/services/user.service', () => {
  // Create mock instances for the methods
  const getUserByEmail = jest.fn();
  const createUser = jest.fn();
  const verifyPassword = jest.fn();
  const getUserById = jest.fn();

  return {
    UserService: {
      getInstance: jest.fn(() => ({
        getUserByEmail,
        createUser,
        verifyPassword,
        getUserById,
      })),
    },
  };
});

// Fix the JWT mock implementation
jest.mock('../../../src/utils/jwt.util', () => {
  const generateToken = jest.fn(() => 'mock-token');

  return {
    jwtUtil: {
      generateToken,
    },
  };
});

describe('AuthService', () => {
  let authService: AuthService;
  let mockUserService: any;

  beforeEach(() => {
    // Clear mocks
    jest.clearAllMocks();

    // Get instance of service
    authService = AuthService.getInstance();

    // Get mocked user service
    mockUserService = UserService.getInstance();
  });

  describe('getInstance', () => {
    it('should return the same instance on multiple calls', () => {
      // Act
      const instance1 = AuthService.getInstance();
      const instance2 = AuthService.getInstance();

      // Assert
      expect(instance1).toBe(instance2);
    });
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      // Arrange
      const userData = {
        email: 'new@example.com',
        password: 'password123',
        firstName: 'New',
        lastName: 'User',
        role: 'user' as const,
      };

      mockUserService.getUserByEmail.mockResolvedValue({
        success: false,
        error: 'User not found',
        statusCode: 404,
      });

      mockUserService.createUser.mockResolvedValue({
        success: true,
        data: {
          id: 3,
          email: userData.email,
          password: 'hashed_password',
          firstName: userData.firstName,
          lastName: userData.lastName,
          role: userData.role,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        statusCode: 201,
      });

      // Act
      const result = await authService.register(userData);

      // Assert
      expect(mockUserService.getUserByEmail).toHaveBeenCalledWith(userData.email);
      expect(mockUserService.createUser).toHaveBeenCalledWith(userData);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(
        expect.objectContaining({
          id: 3,
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          role: userData.role,
        }),
      );
      expect(result.data).not.toHaveProperty('password');
    });

    it('should return error if email already exists', async () => {
      // Arrange
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
        role: 'user' as const,
      };

      mockUserService.getUserByEmail.mockResolvedValue({
        success: true,
        data: mockUsers[0],
      });

      // Act
      const result = await authService.register(userData);

      // Assert
      expect(mockUserService.getUserByEmail).toHaveBeenCalledWith(userData.email);
      expect(mockUserService.createUser).not.toHaveBeenCalled();
      expect(result.success).toBe(false);
      expect(result.error).toBe('Email already in use');
      expect(result.statusCode).toBe(StatusCodes.BAD_REQUEST);
    });

    it('should handle service errors', async () => {
      // Arrange
      const userData = {
        email: 'new@example.com',
        password: 'password123',
        firstName: 'New',
        lastName: 'User',
        role: 'user' as const,
      };

      mockUserService.getUserByEmail.mockRejectedValue(new Error('Database error'));

      // Act
      const result = await authService.register(userData);

      // Assert
      expect(mockUserService.getUserByEmail).toHaveBeenCalledWith(userData.email);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
      expect(result.statusCode).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
    });
  });

  describe('login', () => {
    it('should login user successfully', async () => {
      // Arrange
      const email = 'test@example.com';
      const password = 'password123';

      mockUserService.verifyPassword.mockResolvedValue({
        success: true,
        data: mockUsers[0],
      });

      // Act
      const result = await authService.login(email, password);

      // Assert
      expect(mockUserService.verifyPassword).toHaveBeenCalledWith(email, password);
      expect(jwtUtil.generateToken).toHaveBeenCalledWith({
        userId: mockUsers[0].id,
        email: mockUsers[0].email,
        role: mockUsers[0].role,
      });
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        user: mockUsers[0],
        token: 'mock-token',
      });
    });

    it('should return error for invalid credentials', async () => {
      // Arrange
      const email = 'test@example.com';
      const password = 'wrongpassword';

      mockUserService.verifyPassword.mockResolvedValue({
        success: false,
        error: 'Invalid credentials',
        statusCode: 401,
      });

      // Act
      const result = await authService.login(email, password);

      // Assert
      expect(mockUserService.verifyPassword).toHaveBeenCalledWith(email, password);
      expect(jwtUtil.generateToken).not.toHaveBeenCalled();
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid credentials');
      expect(result.statusCode).toBe(StatusCodes.UNAUTHORIZED);
    });

    it('should handle service errors', async () => {
      // Arrange
      const email = 'test@example.com';
      const password = 'password123';

      mockUserService.verifyPassword.mockRejectedValue(new Error('Database error'));

      // Act
      const result = await authService.login(email, password);

      // Assert
      expect(mockUserService.verifyPassword).toHaveBeenCalledWith(email, password);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
      expect(result.statusCode).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
    });
  });

  describe('refreshToken', () => {
    it('should refresh token successfully', async () => {
      // Arrange
      const userId = 1;

      mockUserService.getUserById.mockResolvedValue({
        success: true,
        data: mockUsers[0],
      });

      // Act
      const result = await authService.refreshToken(userId);

      // Assert
      expect(mockUserService.getUserById).toHaveBeenCalledWith(userId);
      expect(jwtUtil.generateToken).toHaveBeenCalledWith({
        userId: mockUsers[0].id,
        email: mockUsers[0].email,
        role: mockUsers[0].role,
      });
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        token: 'mock-token',
      });
    });

    it('should return error if user not found', async () => {
      // Arrange
      const userId = 999;

      mockUserService.getUserById.mockResolvedValue({
        success: false,
        error: 'User not found',
        statusCode: 404,
      });

      // Act
      const result = await authService.refreshToken(userId);

      // Assert
      expect(mockUserService.getUserById).toHaveBeenCalledWith(userId);
      expect(jwtUtil.generateToken).not.toHaveBeenCalled();
      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found');
      expect(result.statusCode).toBe(StatusCodes.NOT_FOUND);
    });

    it('should handle service errors', async () => {
      // Arrange
      const userId = 1;

      mockUserService.getUserById.mockRejectedValue(new Error('Database error'));

      // Act
      const result = await authService.refreshToken(userId);

      // Assert
      expect(mockUserService.getUserById).toHaveBeenCalledWith(userId);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
      expect(result.statusCode).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
    });
  });
});
