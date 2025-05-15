import { type NextFunction, type Request, type Response } from 'express';

import { CacheService, type CacheOptions } from '../services/cache.service';
import { logger } from '../utils/logger';

export interface CacheMiddlewareOptions extends Partial<CacheOptions> {
  /**
   * Function to generate a custom cache key from the request
   */
  keyGenerator?: (req: Request) => string;
  /**
   * Whether to cache the response based on the request
   */
  shouldCache?: (req: Request) => boolean;
}

/**
 * Create a middleware that caches responses
 * @param baseKey The base key for the cache
 * @param options Cache options
 */
export const cacheMiddleware = (baseKey: string, options: CacheMiddlewareOptions = {}) => {
  const cacheService = CacheService.getInstance();
  const keyPrefix = options.keyPrefix || 'api';
  const ttl = options.ttl || 300; // Default 5 minutes

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Check if we should cache this request
      if (options.shouldCache && !options.shouldCache(req)) {
        return next();
      }

      // Skip caching for non-GET requests
      if (req.method !== 'GET') {
        return next();
      }

      // Generate cache key
      let cacheKey: string;
      if (options.keyGenerator) {
        cacheKey = options.keyGenerator(req);
      } else {
        // Default key generation based on URL and query params
        const params = {
          ...req.query,
          ...req.params,
        };
        cacheKey = cacheService.generateKey(baseKey, params);
      }

      // Try to get from cache
      const cachedData = await cacheService.get(cacheKey, { keyPrefix, ttl });

      if (cachedData !== null) {
        logger.debug(`Cache hit for key: ${keyPrefix}:${cacheKey}`);
        res.json(cachedData);
        return;
      }

      // If not in cache, continue to the controller
      // Save the original res.json method
      const originalJson = res.json;

      // Override res.json to cache the response before sending
      res.json = function (body): Response {
        // Restore the original json method to avoid double caching
        res.json = originalJson;

        // Only cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          cacheService.set(cacheKey, body, { keyPrefix, ttl }).catch(error => {
            logger.error('Error setting cache:', error);
          });
        }

        // Continue with the original response
        return originalJson.call(this, body);
      };

      next();
    } catch (error) {
      // If caching fails, just continue to the controller
      logger.error('Cache middleware error:', error);
      next();
    }
  };
};

/**
 * Clear cache with a specific pattern
 * @param pattern Pattern to match cache keys
 */
export const clearCache = (pattern: string) => {
  return async (_req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const cacheService = CacheService.getInstance();
      await cacheService.delByPattern(pattern);
      next();
    } catch (error) {
      logger.error('Clear cache middleware error:', error);
      next();
    }
  };
};
