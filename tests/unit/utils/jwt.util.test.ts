import { jwtUtil } from '../../../src/utils/jwt.util';
import jwt from 'jsonwebtoken';
import env from '../../../src/config/env.config';

// Mock jsonwebtoken
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('mocked-token'),
  verify: jest.fn(),
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
  });
});
