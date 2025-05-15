import { type Redis } from 'ioredis';

import { getRedisClient } from '../config/redis.config';
import { logger } from '../utils/logger';

export interface CacheOptions {
  ttl: number; // Time to live in seconds
  keyPrefix?: string; // Prefix for Redis keys
}

export class CacheService {
  private static instance: CacheService;
  private readonly redis: Redis;
  private readonly defaultTTL = 300; // 5 minutes default TTL

  private constructor() {
    this.redis = getRedisClient();
  }

  /**
   * Get cache service singleton instance
   */
  public static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  /**
   * Generate a cache key from the provided base and parameters
   */
  public generateKey(baseKey: string, params: Record<string, unknown> = {}): string {
    // Create a stable cache key from the base and sorted parameters
    const paramString = Object.entries(params)
      .filter(([_, value]) => value !== undefined)
      .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
      .map(([key, value]) => `${key}:${JSON.stringify(value)}`)
      .join('|');

    return paramString ? `${baseKey}:${paramString}` : baseKey;
  }

  /**
   * Set data in cache
   */
  public async set(key: string, data: unknown, options: Partial<CacheOptions> = {}): Promise<void> {
    try {
      const ttl = options.ttl || this.defaultTTL;
      const cacheKey = options.keyPrefix ? `${options.keyPrefix}:${key}` : key;

      await this.redis.setex(cacheKey, ttl, JSON.stringify(data));
      logger.debug(`Cache set for key: ${cacheKey} with TTL: ${ttl}s`);
    } catch (error) {
      logger.error(`Error setting cache for key ${key}:`, error);
      // Don't fail the application if cache fails
    }
  }

  /**
   * Get data from cache
   */
  public async get<T>(key: string, options: Partial<CacheOptions> = {}): Promise<T | null> {
    try {
      const cacheKey = options.keyPrefix ? `${options.keyPrefix}:${key}` : key;
      const data = await this.redis.get(cacheKey);

      if (!data) {
        logger.debug(`Cache miss for key: ${cacheKey}`);
        return null;
      }

      logger.debug(`Cache hit for key: ${cacheKey}`);
      return JSON.parse(data) as T;
    } catch (error) {
      logger.error(`Error getting cache for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Delete a key from cache
   */
  public async del(key: string, options: Partial<CacheOptions> = {}): Promise<void> {
    try {
      const cacheKey = options.keyPrefix ? `${options.keyPrefix}:${key}` : key;
      await this.redis.del(cacheKey);
      logger.debug(`Cache deleted for key: ${cacheKey}`);
    } catch (error) {
      logger.error(`Error deleting cache for key ${key}:`, error);
    }
  }

  /**
   * Delete multiple keys by pattern
   */
  public async delByPattern(pattern: string): Promise<void> {
    try {
      const keys = await this.redis.keys(pattern);

      if (keys.length > 0) {
        await this.redis.del(...keys);
        logger.debug(`Deleted ${keys.length} cache entries matching pattern: ${pattern}`);
      }
    } catch (error) {
      logger.error(`Error deleting cache by pattern ${pattern}:`, error);
    }
  }

  /**
   * Cache or get data using a factory function
   */
  public async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    options: Partial<CacheOptions> = {},
  ): Promise<T> {
    // Try to get from cache first
    const cachedData = await this.get<T>(key, options);

    if (cachedData !== null) {
      return cachedData;
    }

    // If not in cache, get from factory function
    const data = await factory();

    // Store in cache
    await this.set(key, data, options);

    return data;
  }
}
