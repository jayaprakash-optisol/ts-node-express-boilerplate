import { Request, Response, NextFunction } from 'express';
import { RateLimiterRedis, RateLimiterRes } from 'rate-limiter-flexible';
import { StatusCodes } from 'http-status-codes';
import env from '../config/env.config';
import { logger } from '../utils/logger';
import { getRateLimiterRedis } from '../utils/redis.util';

// Create Redis client for rate limiting
const redisClient = getRateLimiterRedis();

// Create a single API rate limiter for all endpoints
const apiLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: 'api',
  points: env.NODE_ENV === 'test' ? 1000 : env.RATE_LIMIT_MAX, // 5 requests per duration
  duration: 15 * 60, // 15 minutes
  blockDuration: 30 * 60, // 30 minutes
});

// Log rate limiter configuration
logger.info(
  `API Rate Limiter - limit: ${apiLimiter.points} requests per ${apiLimiter.duration}s, block: ${30}s`,
);

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

      // Add route to key for better tracking
      const key = `${clientIp}:${req.method}:${req.baseUrl}${req.path}`;

      // Add debug logging to track rate limiting
      logger.debug(`Rate limit check for key: ${key}`);

      // Consume points
      await limiter.consume(key);

      // Log remaining points for debugging
      const res = await limiter.get(key);
      if (res) {
        // Use info level for standard rate limit logs
        logger.info(
          `RATE_LIMIT_CHECK | Key: ${key} | Remaining: ${res.remainingPoints}/${limiter.points} | Reset: ${Math.round(res.msBeforeNext / 1000)}s`,
          {
            type: 'rate_limit_check',
            clientIp: req.ip,
            path: `${req.method} ${req.baseUrl}${req.path}`,
            remaining: res.remainingPoints,
            limit: limiter.points,
            reset: Math.round(res.msBeforeNext / 1000),
          },
        );
      }

      next();
    } catch (error) {
      // The rate-limiter-flexible package throws errors as objects with these properties
      // rather than as proper Error instances, so we need to check for specific properties
      if (
        error &&
        typeof error === 'object' &&
        'remainingPoints' in error &&
        'msBeforeNext' in error &&
        'consumedPoints' in error
      ) {
        const rateLimiterRes = error as unknown as RateLimiterRes;
        const retryAfter = Math.round(rateLimiterRes.msBeforeNext / 1000) || 30;

        // Log rate limit errors as errors instead of warnings to ensure they're captured
        logger.error(
          `RATE_LIMIT_EXCEEDED | IP: ${req.ip} | Path: ${req.method} ${req.baseUrl}${req.path} | Retry: ${retryAfter}s | Consumed: ${rateLimiterRes.consumedPoints}/${limiter.points}`,
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
