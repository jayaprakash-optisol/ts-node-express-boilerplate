import { Request, Response, NextFunction } from 'express';
import {
  contentSecurityPolicy,
  noSniff,
  xssFilter,
  frameGuard,
  hsts,
  cacheControl,
  corsOptions,
} from '../../src/middleware/security.middleware';
import env from '../../src/config/env.config';

// Mock the express-rate-limit module with Jest to provide test values
jest.mock('express-rate-limit', () => {
  // Return a function that creates middleware functions with the correct properties
  return jest.fn().mockImplementation(options => {
    // Create a mock middleware function
    const mockMiddleware = jest.fn();
    // Add properties to the function object
    Object.defineProperties(mockMiddleware, {
      windowMs: { value: options.windowMs },
      max: { value: options.max },
    });
    return mockMiddleware;
  });
});

describe('Security Middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: jest.Mock<NextFunction>;

  beforeEach(() => {
    req = {
      method: 'GET',
      path: '/api/v1/users',
    };

    res = {
      setHeader: jest.fn(),
    };

    next = jest.fn();
  });

  describe('contentSecurityPolicy', () => {
    it('should set Content-Security-Policy header', () => {
      contentSecurityPolicy(req as Request, res as Response, next);

      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Security-Policy',
        expect.stringContaining("default-src 'self'"),
      );
      expect(next).toHaveBeenCalled();
    });
  });

  describe('noSniff', () => {
    it('should set X-Content-Type-Options header', () => {
      noSniff(req as Request, res as Response, next);

      expect(res.setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
      expect(next).toHaveBeenCalled();
    });
  });

  describe('xssFilter', () => {
    it('should set X-XSS-Protection header', () => {
      xssFilter(req as Request, res as Response, next);

      expect(res.setHeader).toHaveBeenCalledWith('X-XSS-Protection', '1; mode=block');
      expect(next).toHaveBeenCalled();
    });
  });

  describe('frameGuard', () => {
    it('should set X-Frame-Options header', () => {
      frameGuard(req as Request, res as Response, next);

      expect(res.setHeader).toHaveBeenCalledWith('X-Frame-Options', 'DENY');
      expect(next).toHaveBeenCalled();
    });
  });

  describe('hsts', () => {
    it('should set Strict-Transport-Security header', () => {
      hsts(req as Request, res as Response, next);

      expect(res.setHeader).toHaveBeenCalledWith(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains',
      );
      expect(next).toHaveBeenCalled();
    });
  });

  describe('cacheControl', () => {
    it('should set no-cache headers for default API paths', () => {
      cacheControl(req as Request, res as Response, next);

      expect(res.setHeader).toHaveBeenCalledWith(
        'Cache-Control',
        'no-store, no-cache, must-revalidate, proxy-revalidate',
      );
      expect(res.setHeader).toHaveBeenCalledWith('Pragma', 'no-cache');
      expect(res.setHeader).toHaveBeenCalledWith('Expires', '0');
      expect(next).toHaveBeenCalled();
    });

    it('should set cache headers for public paths', () => {
      const publicPathReq = {
        ...req,
        method: 'GET',
        path: '/api/v1/public/assets',
      };

      cacheControl(publicPathReq as Request, res as Response, next);

      expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'public, max-age=86400');
      expect(next).toHaveBeenCalled();
    });

    it('should not set cache headers for non-GET requests', () => {
      const postReq = {
        ...req,
        method: 'POST',
      };

      cacheControl(postReq as Request, res as Response, next);

      expect(res.setHeader).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
    });
  });

  describe('corsOptions', () => {
    const { origin } = corsOptions;

    it('should allow all origins in development', () => {
      const originalNodeEnv = env.NODE_ENV;
      env.NODE_ENV = 'development';

      const callback = jest.fn();
      origin('https://example.com', callback);

      expect(callback).toHaveBeenCalledWith(null, true);

      env.NODE_ENV = originalNodeEnv;
    });

    it('should block disallowed origins in production', () => {
      const originalNodeEnv = env.NODE_ENV;
      env.NODE_ENV = 'production';

      const callback = jest.fn();
      origin('https://example.com', callback);

      expect(callback).toHaveBeenCalledWith(expect.any(Error));

      env.NODE_ENV = originalNodeEnv;
    });

    it('should allow undefined origin in production', () => {
      const originalNodeEnv = env.NODE_ENV;
      env.NODE_ENV = 'production';

      const callback = jest.fn();
      origin(undefined, callback);

      expect(callback).toHaveBeenCalledWith(null, true);

      env.NODE_ENV = originalNodeEnv;
    });
  });

  describe('rate limiters', () => {
    it('should have rate limiters properly configured', async () => {
      // Reimport to ensure mocking is applied
      jest.resetModules();

      // Use dynamic import instead of require
      const securityModule = await import('../../src/middleware/security.middleware');
      const { authRateLimit, userCreationRateLimit } = securityModule;

      // Use type assertions to handle the windowMs and max properties
      const authLimiter = authRateLimit as any;
      const userCreationLimiter = userCreationRateLimit as any;

      expect(authRateLimit).toBeDefined();
      expect(authLimiter.windowMs).toBe(15 * 60 * 1000); // 15 minutes
      expect(authLimiter.max).toBe(10);

      expect(userCreationRateLimit).toBeDefined();
      expect(userCreationLimiter.windowMs).toBe(60 * 60 * 1000); // 1 hour
      expect(userCreationLimiter.max).toBe(5);
    });
  });
});
