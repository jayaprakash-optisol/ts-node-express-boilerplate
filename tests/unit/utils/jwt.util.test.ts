import { jwtUtil } from '../../../src/utils/jwt.util';
import jwt from 'jsonwebtoken';
import env from '../../../src/config/env.config';
import { logger } from '../../../src/utils/logger';

// Mock jsonwebtoken
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('mocked-token'),
  verify: jest.fn(),
  decode: jest.fn(),
}));

// Mock logger
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('JWT Utility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateToken', () => {
    it('should generate a JWT token with payload', () => {
      // Arrange
      const payload = {
        userId: 1,
        email: 'test@example.com',
        role: 'user',
      };

      // Act
      const token = jwtUtil.generateToken(payload);

      // Assert
      expect(token).toBe('mocked-token');
      expect(jwt.sign).toHaveBeenCalledWith(payload, env.JWT_SECRET, {
        expiresIn: env.JWT_EXPIRES_IN,
      });
    });

    it('should throw error when JWT_SECRET is not defined', () => {
      // Save original value
      const originalSecret = env.JWT_SECRET;

      // Modify for this test
      env.JWT_SECRET = '';

      // Arrange
      const payload = {
        userId: 1,
        email: 'test@example.com',
        role: 'user',
      };

      // Act & Assert
      expect(() => jwtUtil.generateToken(payload)).toThrow('JWT_SECRET is not defined');

      // Restore original value
      env.JWT_SECRET = originalSecret;
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid token and return the decoded payload', () => {
      // Arrange
      const token = 'valid-token';
      const payload = {
        userId: 1,
        email: 'test@example.com',
        role: 'user',
      };
      (jwt.verify as jest.Mock).mockReturnValue(payload);

      // Act
      const result = jwtUtil.verifyToken(token);

      // Assert
      expect(result).toEqual(
        expect.objectContaining({
          success: true,
          data: payload,
          statusCode: 200,
        }),
      );
      expect(jwt.verify).toHaveBeenCalledWith(token, env.JWT_SECRET);
    });

    it('should return error for an invalid token', () => {
      // Arrange
      const token = 'invalid-token';
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      // Act
      const result = jwtUtil.verifyToken(token);

      // Assert
      expect(result).toEqual(
        expect.objectContaining({
          success: false,
          error: 'Invalid token',
          statusCode: 401,
          data: expect.objectContaining({
            userId: 0,
            email: '',
            role: '',
          }),
        }),
      );
      expect(jwt.verify).toHaveBeenCalledWith(token, env.JWT_SECRET);
    });

    it('should return error for an expired token', () => {
      // Arrange
      const token = 'expired-token';
      (jwt.verify as jest.Mock).mockImplementation(() => {
        const error: any = new Error('Token expired');
        error.name = 'TokenExpiredError';
        throw error;
      });

      // Act
      const result = jwtUtil.verifyToken(token);

      // Assert
      expect(result).toEqual(
        expect.objectContaining({
          success: false,
          error: 'Token expired',
          statusCode: 401,
          data: expect.objectContaining({
            userId: 0,
            email: '',
            role: '',
          }),
        }),
      );
      expect(jwt.verify).toHaveBeenCalledWith(token, env.JWT_SECRET);
    });

    it('should throw error when JWT_SECRET is not defined', () => {
      // Save original value
      const originalSecret = env.JWT_SECRET;

      // Modify for this test
      env.JWT_SECRET = '';

      // Arrange
      const token = 'valid-token';

      // Act
      const result = jwtUtil.verifyToken(token);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('JWT_SECRET is not defined');
      expect(result.statusCode).toBe(401);

      // Restore original value
      env.JWT_SECRET = originalSecret;
    });
  });

  describe('decodeToken', () => {
    it('should decode a token successfully', () => {
      // Arrange
      const token = 'valid-token';
      const payload = {
        userId: 1,
        email: 'test@example.com',
        role: 'user',
      };
      (jwt.decode as jest.Mock).mockReturnValue(payload);

      // Act
      const result = jwtUtil.decodeToken(token);

      // Assert
      expect(result).toEqual(payload);
      expect(jwt.decode).toHaveBeenCalledWith(token);
    });

    it('should return null when decoding fails', () => {
      // Arrange
      const token = 'invalid-token';
      (jwt.decode as jest.Mock).mockImplementation(() => {
        throw new Error('Decoding error');
      });

      // Act
      const result = jwtUtil.decodeToken(token);

      // Assert
      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalled();
    });
  });
});
