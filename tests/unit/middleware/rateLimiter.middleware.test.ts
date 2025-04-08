import { Request, Response, NextFunction } from 'express';
import { rateLimiter } from '../../../src/middleware/rateLimiter.middleware';
import redisClient from '../../../src/config/redis.config';
import { StatusCodes } from 'http-status-codes';
import { mockRequest, mockResponse, mockNext } from '../../mocks';
import env from '../../../src/config/env.config';

// Mock Redis client
jest.mock('../../../src/config/redis.config', () => ({
  __esModule: true,
  default: {
    incr: jest.fn(),
    pexpire: jest.fn(),
    pttl: jest.fn(),
  },
}));

// Mock environment variables
jest.mock('../../../src/config/env.config', () => ({
  __esModule: true,
  default: {
    NODE_ENV: 'test',
    RATE_LIMIT_ENABLED: 'true',
    RATE_LIMIT_WINDOW_MS: '60000',
    RATE_LIMIT_MAX: '100',
  },
}));

describe('Rate Limiter Middleware', () => {
  let req: Request;
  let res: Response;
  let next: NextFunction;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup request, response, and next function
    req = mockRequest();
    res = mockResponse();
    next = mockNext;

    // Mock IP address
    Object.defineProperty(req, 'ip', {
      value: '127.0.0.1',
      writable: true,
    });
  });

  it('should allow requests within rate limit', async () => {
    // Mock Redis responses
    (redisClient.incr as jest.Mock).mockResolvedValue(1);
    (redisClient.pexpire as jest.Mock).mockResolvedValue(1);
    (redisClient.pttl as jest.Mock).mockResolvedValue(900000); // 15 minutes in ms

    // Create middleware with custom options
    const middleware = rateLimiter({
      windowMs: 900000, // 15 minutes
      max: 100,
      keyPrefix: 'test-rate-limit',
    });

    // Call middleware and wait for it to complete
    await new Promise<void>(resolve => {
      middleware(req, res, () => {
        next();
        resolve();
      });
    });

    // Verify Redis calls
    expect(redisClient.incr).toHaveBeenCalledWith('test-rate-limit:127.0.0.1');
    expect(redisClient.pexpire).toHaveBeenCalledWith('test-rate-limit:127.0.0.1', 900000);
    expect(redisClient.pttl).toHaveBeenCalledWith('test-rate-limit:127.0.0.1');

    // Verify response headers
    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 100);
    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 99);
    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Reset', 900);

    // Verify next was called
    expect(next).toHaveBeenCalled();
  });

  it('should block requests exceeding rate limit', async () => {
    // Mock Redis responses
    (redisClient.incr as jest.Mock).mockResolvedValue(101); // Exceeds max of 100
    (redisClient.pttl as jest.Mock).mockResolvedValue(60000); // 1 minute in ms

    // Create middleware with custom options
    const middleware = rateLimiter({
      windowMs: 900000, // 15 minutes
      max: 100,
      keyPrefix: 'test-rate-limit',
    });

    // Call middleware and wait for it to complete
    await new Promise<void>(resolve => {
      res.json = jest.fn().mockImplementation(() => {
        resolve();
        return res;
      });
      middleware(req, res, next);
    });

    // Verify Redis calls
    expect(redisClient.incr).toHaveBeenCalledWith('test-rate-limit:127.0.0.1');
    expect(redisClient.pttl).toHaveBeenCalledWith('test-rate-limit:127.0.0.1');

    // Verify response headers
    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 100);
    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 0);
    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Reset', 60);

    // Verify response status and body
    expect(res.status).toHaveBeenCalledWith(StatusCodes.TOO_MANY_REQUESTS);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Too many requests, please try again later.',
      retryAfter: 60,
    });

    // Verify next was not called
    expect(next).not.toHaveBeenCalled();
  });

  it('should handle Redis errors gracefully', async () => {
    // Mock Redis error
    (redisClient.incr as jest.Mock).mockRejectedValue(new Error('Redis connection error'));

    // Create middleware with custom options
    const middleware = rateLimiter({
      windowMs: 900000, // 15 minutes
      max: 100,
      keyPrefix: 'test-rate-limit',
    });

    // Call middleware and wait for it to complete
    await new Promise<void>(resolve => {
      middleware(req, res, () => {
        next();
        resolve();
      });
    });

    // Verify Redis call
    expect(redisClient.incr).toHaveBeenCalledWith('test-rate-limit:127.0.0.1');

    // Verify next was called (allowing request to proceed despite Redis error)
    expect(next).toHaveBeenCalled();
  });

  it('should use default options when none provided', async () => {
    // Mock Redis responses
    (redisClient.incr as jest.Mock).mockResolvedValue(1);
    (redisClient.pexpire as jest.Mock).mockResolvedValue(1);
    (redisClient.pttl as jest.Mock).mockResolvedValue(60000); // 1 minute in ms

    // Create middleware with default options
    const middleware = rateLimiter();

    // Call middleware and wait for it to complete
    await new Promise<void>(resolve => {
      middleware(req, res, () => {
        next();
        resolve();
      });
    });

    // Verify Redis calls with default key prefix
    expect(redisClient.incr).toHaveBeenCalledWith('rate-limit:127.0.0.1');
    expect(redisClient.pexpire).toHaveBeenCalledWith('rate-limit:127.0.0.1', 60000);
    expect(redisClient.pttl).toHaveBeenCalledWith('rate-limit:127.0.0.1');

    // Verify next was called
    expect(next).toHaveBeenCalled();
  });

  it('should handle requests with no IP address', async () => {
    // Remove IP address
    Object.defineProperty(req, 'ip', {
      value: undefined,
      writable: true,
    });

    // Mock Redis responses
    (redisClient.incr as jest.Mock).mockResolvedValue(1);
    (redisClient.pexpire as jest.Mock).mockResolvedValue(1);
    (redisClient.pttl as jest.Mock).mockResolvedValue(900000); // 15 minutes in ms

    // Create middleware with custom options
    const middleware = rateLimiter({
      windowMs: 900000, // 15 minutes
      max: 100,
      keyPrefix: 'test-rate-limit',
    });

    // Call middleware and wait for it to complete
    await new Promise<void>(resolve => {
      middleware(req, res, () => {
        next();
        resolve();
      });
    });

    // Verify Redis calls with fallback IP
    expect(redisClient.incr).toHaveBeenCalledWith('test-rate-limit:undefined');
    expect(redisClient.pexpire).toHaveBeenCalledWith('test-rate-limit:undefined', 900000);
    expect(redisClient.pttl).toHaveBeenCalledWith('test-rate-limit:undefined');

    // Verify next was called
    expect(next).toHaveBeenCalled();
  });

  it('should skip rate limiting when disabled', async () => {
    // Mock environment to disable rate limiting
    (env as any).RATE_LIMIT_ENABLED = false;

    // Create middleware with custom options
    const middleware = rateLimiter({
      windowMs: 900000, // 15 minutes
      max: 100,
      keyPrefix: 'test-rate-limit',
    });

    // Call middleware and wait for it to complete
    await new Promise<void>(resolve => {
      middleware(req, res, () => {
        next();
        resolve();
      });
    });

    // Verify Redis was not called
    expect(redisClient.incr).not.toHaveBeenCalled();
    expect(redisClient.pexpire).not.toHaveBeenCalled();
    expect(redisClient.pttl).not.toHaveBeenCalled();

    // Verify next was called
    expect(next).toHaveBeenCalled();
  });
});
