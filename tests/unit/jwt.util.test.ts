import { jwtUtil } from '../../src/utils/jwt.util';
import jwt from 'jsonwebtoken';
import env from '../../src/config/env.config';
import { logger } from '../../src/utils/logger';

// Mock jwt library
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(),
  verify: jest.fn(),
  decode: jest.fn(),
}));

// Mock logger
jest.mock('../../src/utils/logger', () => ({
  logger: {
    error: jest.fn(),
  },
}));

// Mock env config
jest.mock('../../src/config/env.config', () => ({
  JWT_SECRET: 'test-secret',
  JWT_EXPIRES_IN: '1h',
}));

describe('JwtUtil', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateToken', () => {
    it('should generate a token successfully', () => {
      const payload = { userId: 1, email: 'test@example.com', role: 'user' };
      (jwt.sign as jest.Mock).mockReturnValue('generated-token');

      const result = jwtUtil.generateToken(payload);

      expect(jwt.sign).toHaveBeenCalledWith(payload, env.JWT_SECRET, {
        expiresIn: env.JWT_EXPIRES_IN,
      });
      expect(result).toBe('generated-token');
    });

    it('should throw error when JWT_SECRET is undefined', () => {
      const originalSecret = env.JWT_SECRET;
      Object.defineProperty(env, 'JWT_SECRET', { value: undefined });

      const payload = { userId: 1, email: 'test@example.com', role: 'user' };

      try {
        expect(() => jwtUtil.generateToken(payload)).toThrow('JWT_SECRET is not defined');
        expect(logger.error).toHaveBeenCalled();
      } finally {
        // Restore env
        Object.defineProperty(env, 'JWT_SECRET', { value: originalSecret });
      }
    });

    it('should log and rethrow any error', () => {
      const payload = { userId: 1, email: 'test@example.com', role: 'user' };
      const error = new Error('JWT sign error');
      (jwt.sign as jest.Mock).mockImplementation(() => {
        throw error;
      });

      expect(() => jwtUtil.generateToken(payload)).toThrow('JWT sign error');
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('verifyToken', () => {
    it('should verify a token successfully', () => {
      const decodedToken = { userId: 1, email: 'test@example.com', role: 'user' };
      (jwt.verify as jest.Mock).mockReturnValue(decodedToken);

      const result = jwtUtil.verifyToken('valid-token');

      expect(jwt.verify).toHaveBeenCalledWith('valid-token', env.JWT_SECRET);
      expect(result).toEqual(decodedToken);
    });

    it('should throw error when JWT_SECRET is undefined', () => {
      const originalSecret = env.JWT_SECRET;
      Object.defineProperty(env, 'JWT_SECRET', { value: undefined });

      try {
        expect(() => jwtUtil.verifyToken('token')).toThrow('JWT_SECRET is not defined');
        expect(logger.error).toHaveBeenCalled();
      } finally {
        // Restore env
        Object.defineProperty(env, 'JWT_SECRET', { value: originalSecret });
      }
    });

    it('should log and rethrow verification errors', () => {
      const error = new Error('Invalid token');
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw error;
      });

      expect(() => jwtUtil.verifyToken('invalid-token')).toThrow('Invalid token');
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('decodeToken', () => {
    it('should decode a token successfully', () => {
      const decodedToken = { userId: 1, email: 'test@example.com', role: 'user' };
      (jwt.decode as jest.Mock).mockReturnValue(decodedToken);

      const result = jwtUtil.decodeToken('token');

      expect(jwt.decode).toHaveBeenCalledWith('token');
      expect(result).toEqual(decodedToken);
    });

    it('should return null when decoding fails', () => {
      (jwt.decode as jest.Mock).mockImplementation(() => {
        throw new Error('Decode error');
      });

      const result = jwtUtil.decodeToken('invalid-token');

      expect(jwt.decode).toHaveBeenCalledWith('invalid-token');
      expect(logger.error).toHaveBeenCalled();
      expect(result).toBeNull();
    });
  });
});
