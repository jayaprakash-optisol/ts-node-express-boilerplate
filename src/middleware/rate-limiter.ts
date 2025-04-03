import { Request, Response, NextFunction } from 'express';
import { RateLimiterRedis, RateLimiterRes } from 'rate-limiter-flexible';
import { StatusCodes } from 'http-status-codes';
import env from '../config/env.config';
import { logger } from '../utils/logger';
import { getRateLimiterRedis } from '../utils/redis.util';

// Create Redis client for rate limiting
const redisClient = getRateLimiterRedis();

// Create a general API rate limiter
const apiLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: 'api',
  points: env.NODE_ENV === 'test' ? 1000 : env.RATE_LIMIT_MAX,
  duration: env.RATE_LIMIT_WINDOW_MS / 1000, // Convert from ms to seconds
  blockDuration: 60, // Block for 1 minute if exceeds points
});

// Create a more strict auth rate limiter
const authLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: 'auth',
  points: env.NODE_ENV === 'test' ? 1000 : 10, // 10 attempts
  duration: 15 * 60, // 15 minutes
  blockDuration: 60 * 30, // Block for 30 minutes if exceeds points
});

// Create a user creation rate limiter
const userCreationLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: 'user:creation',
  points: env.NODE_ENV === 'test' ? 1000 : 5, // 5 attempts
  duration: 60 * 60, // 1 hour
  blockDuration: 60 * 60 * 24, // Block for 24 hours if exceeds points
});

/**
 * Middleware factory that creates rate limiters
 * @param limiter The rate limiter to use
 * @returns Express middleware
 */
const createRateLimiterMiddleware = (
  limiter: RateLimiterRedis,
): ((req: Request, res: Response, next: NextFunction) => Promise<void>) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Get client IP
      const clientIp = req.ip ?? req.socket.remoteAddress ?? '0.0.0.0';

      // Consume points
      await limiter.consume(clientIp);
      next();
    } catch (error) {
      // Check if it's a rate limiter error
      if (error instanceof Error && 'remainingPoints' in error) {
        const rateLimiterRes = error as unknown as RateLimiterRes;
        const retryAfter = Math.round(rateLimiterRes.msBeforeNext / 1000) || 60;

        logger.warn(
          `Rate limit exceeded for IP: ${req.ip}, path: ${req.path}, retry after: ${retryAfter}s`,
        );

        // Set rate limiting headers
        res.setHeader('Retry-After', String(retryAfter));
        res.setHeader('X-RateLimit-Limit', String(limiter.points));
        res.setHeader('X-RateLimit-Remaining', String(rateLimiterRes.remainingPoints));
        res.setHeader(
          'X-RateLimit-Reset',
          new Date(Date.now() + rateLimiterRes.msBeforeNext).toISOString(),
        );

        // Send rate limit error
        res.status(StatusCodes.TOO_MANY_REQUESTS).json({
          success: false,
          error: 'Too many requests, please try again later',
          retryAfter,
        });
      } else {
        logger.error('Unexpected rate limiter error:', error);
        next(error);
      }
    }
  };
};

// Export middleware
export const apiRateLimiter = createRateLimiterMiddleware(apiLimiter);
export const authRateLimiter = createRateLimiterMiddleware(authLimiter);
export const userCreationRateLimiter = createRateLimiterMiddleware(userCreationLimiter);
