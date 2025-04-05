import { Request, Response } from 'express';
import {
  corsOptions,
  contentSecurityPolicy,
  noSniff,
  xssFilter,
  frameGuard,
  hsts,
  cacheControl,
} from '../../../src/middleware/security.middleware';
import env from '../../../src/config/env.config';

// Mock env
jest.mock('../../../src/config/env.config', () => ({
  NODE_ENV: 'test',
  CLIENT_URL: 'http://localhost:3000',
}));

describe('Security Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: jest.Mock;

  beforeEach(() => {
    mockRequest = {
      method: 'GET',
      path: '/test',
      ip: '127.0.0.1',
      headers: {},
    };

    mockResponse = {
      setHeader: jest.fn(),
    };

    nextFunction = jest.fn();
    jest.clearAllMocks();
  });

  describe('corsOptions', () => {
    it('should allow requests in development mode', () => {
      const callback = jest.fn();
      const originalEnv = env.NODE_ENV;
      env.NODE_ENV = 'development';

      corsOptions.origin('http://example.com', callback);

      expect(callback).toHaveBeenCalledWith(null, true);

      // Restore env
      env.NODE_ENV = originalEnv;
    });

    it('should allow allowed origins in production mode', () => {
      const callback = jest.fn();
      const originalEnv = env.NODE_ENV;
      env.NODE_ENV = 'production';

      // Test with allowed origin (no origin is allowed in the current implementation)
      corsOptions.origin(undefined, callback);

      expect(callback).toHaveBeenCalledWith(null, true);

      // Restore env
      env.NODE_ENV = originalEnv;
    });

    it('should reject disallowed origins in production mode', () => {
      const callback = jest.fn();
      const originalEnv = env.NODE_ENV;
      env.NODE_ENV = 'production';

      // Example.com should be blocked as it's not in the allowed list
      corsOptions.origin('http://example.com', callback);

      expect(callback).toHaveBeenCalledWith(expect.any(Error));

      // Restore env
      env.NODE_ENV = originalEnv;
    });
  });

  describe('contentSecurityPolicy', () => {
    it('should set CSP header', () => {
      contentSecurityPolicy(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Content-Security-Policy',
        expect.any(String),
      );
      expect(nextFunction).toHaveBeenCalled();
    });
  });

  describe('noSniff', () => {
    it('should set X-Content-Type-Options header', () => {
      noSniff(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
      expect(nextFunction).toHaveBeenCalled();
    });
  });

  describe('xssFilter', () => {
    it('should set X-XSS-Protection header', () => {
      xssFilter(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-XSS-Protection', '1; mode=block');
      expect(nextFunction).toHaveBeenCalled();
    });
  });

  describe('frameGuard', () => {
    it('should set X-Frame-Options header', () => {
      frameGuard(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Frame-Options', 'DENY');
      expect(nextFunction).toHaveBeenCalled();
    });
  });

  describe('hsts', () => {
    it('should set Strict-Transport-Security header', () => {
      hsts(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains',
      );
      expect(nextFunction).toHaveBeenCalled();
    });
  });

  describe('cacheControl', () => {
    it('should set Cache-Control headers for regular API endpoints', () => {
      cacheControl(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Cache-Control',
        'no-store, no-cache, must-revalidate, proxy-revalidate',
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Pragma', 'no-cache');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Expires', '0');
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should set different cache headers for public resources', () => {
      const publicPathRequest = {
        ...mockRequest,
        path: '/api/v1/public/something',
      };

      cacheControl(publicPathRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.setHeader).toHaveBeenCalledWith('Cache-Control', 'public, max-age=86400');
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should not set cache headers for non-GET requests', () => {
      const postRequest = {
        ...mockRequest,
        method: 'POST',
      };

      cacheControl(postRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.setHeader).not.toHaveBeenCalled();
      expect(nextFunction).toHaveBeenCalled();
    });
  });
});
