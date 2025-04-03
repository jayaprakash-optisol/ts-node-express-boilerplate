import { Redis } from 'ioredis';
import * as redisUtil from '../../src/utils/redis.util';
import { logger } from '../../src/utils/logger';

// Mock environment variables
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';

// Clear any Redis clients that might have been created in other tests
beforeEach(() => {
  // Access and reset the internal redisClients array
  const redisUtilModule = redisUtil as unknown;
  if ((redisUtilModule as Record<string, unknown[]>).redisClients) {
    (redisUtilModule as Record<string, unknown[]>).redisClients.length = 0;
  }
});

// Mock ioredis and logger
jest.mock('ioredis', () => {
  // Create a mock Redis class constructor
  const MockRedis = jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    quit: jest.fn().mockResolvedValue('OK'),
    disconnect: jest.fn(),
  }));
  return { Redis: MockRedis };
});

jest.mock('../../src/utils/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('Redis Utility', () => {
  // Use a more specific type to avoid TypeScript warnings
  let mockRedisInstance: Record<string, jest.Mock>;
  let mockOnMethod: jest.Mock;
  let mockQuitMethod: jest.Mock;
  let mockDisconnectMethod: jest.Mock;

  beforeEach(() => {
    // Reset all mocks
    jest.resetAllMocks();

    // Setup Redis mock
    mockOnMethod = jest.fn();
    mockQuitMethod = jest.fn().mockResolvedValue('OK');
    mockDisconnectMethod = jest.fn();

    mockRedisInstance = {
      on: mockOnMethod,
      quit: mockQuitMethod,
      disconnect: mockDisconnectMethod,
    };

    // Update the mock implementation for this test
    const MockRedis = Redis as jest.MockedClass<typeof Redis>;
    MockRedis.mockImplementation(() => mockRedisInstance as unknown as Redis);
  });

  describe('createRedisClient', () => {
    it('should create a Redis client with default options', () => {
      const redisClient = redisUtil.createRedisClient();

      expect(Redis).toHaveBeenCalledWith(
        expect.objectContaining({
          enableOfflineQueue: false,
        }),
      );
      expect(redisClient).toBe(mockRedisInstance);
      expect(mockOnMethod).toHaveBeenCalledWith('error', expect.any(Function));
    });

    it('should handle Redis connection errors', () => {
      redisUtil.createRedisClient();

      // Get the error handler function
      const errorHandler = mockOnMethod.mock.calls[0][1];

      // Simulate an error
      const testError = new Error('Redis test error');
      errorHandler(testError);

      expect(logger.error).toHaveBeenCalledWith('Redis client error:', testError);
    });
  });

  describe('getRateLimiterRedis', () => {
    it('should create a Redis client with rate limiter specific options', () => {
      const client = redisUtil.getRateLimiterRedis();

      expect(Redis).toHaveBeenCalledWith(
        expect.objectContaining({
          keyPrefix: 'ratelimit:',
          retryStrategy: expect.any(Function),
        }),
      );
      expect(client).toBe(mockRedisInstance);
    });

    it('should have a valid retry strategy', () => {
      redisUtil.getRateLimiterRedis();

      // Extract retry strategy function for testing
      const redisMock = Redis as unknown as jest.Mock;
      const options = redisMock.mock.calls[0][0];
      const retryStrategy = options.retryStrategy;

      // Test retry logic
      expect(retryStrategy(1)).toBe(50); // 1 * 50 = 50
      expect(retryStrategy(10)).toBe(500); // 10 * 50 = 500
      expect(retryStrategy(100)).toBe(2000); // Min cap at 2000
    });
  });

  describe('getHealthCheckRedis', () => {
    it('should create a Redis client with health check specific options', () => {
      const client = redisUtil.getHealthCheckRedis();

      expect(Redis).toHaveBeenCalledWith(
        expect.objectContaining({
          connectTimeout: 5000,
          maxRetriesPerRequest: 1,
        }),
      );
      expect(client).toBe(mockRedisInstance);
    });
  });

  describe('closeRedisConnections', () => {
    it('should close all Redis connections successfully', async () => {
      // Reset mocks and clear Redis clients array before this test
      jest.clearAllMocks();
      const redisUtilModule = redisUtil as unknown;
      (redisUtilModule as Record<string, unknown[]>).redisClients = [];

      // Create a few Redis clients to populate the internal array
      mockQuitMethod.mockResolvedValue('OK');

      redisUtil.createRedisClient();
      redisUtil.createRedisClient();
      redisUtil.createRedisClient();

      await redisUtil.closeRedisConnections();

      expect(mockQuitMethod).toHaveBeenCalledTimes(3);
    
    });

    it('should handle errors when closing connections', async () => {
      // Reset mocks and clear Redis clients array before this test
      jest.clearAllMocks();
      const redisUtilModule = redisUtil as unknown;
      (redisUtilModule as Record<string, unknown[]>).redisClients = [];

      // Create Redis clients where quit will fail
      mockQuitMethod.mockRejectedValue(new Error('Failed to quit'));

      redisUtil.createRedisClient();
      redisUtil.createRedisClient();

      await redisUtil.closeRedisConnections();

      expect(mockQuitMethod).toHaveBeenCalledTimes(2);
      expect(mockDisconnectMethod).toHaveBeenCalledTimes(2);
    });

    it('should handle errors when force disconnecting', async () => {
      // Reset mocks and clear Redis clients array before this test
      jest.clearAllMocks();
      const redisUtilModule = redisUtil as unknown;
      (redisUtilModule as Record<string, unknown[]>).redisClients = [];

      // Create Redis clients where both quit and disconnect will fail
      mockQuitMethod.mockRejectedValue(new Error('Failed to quit'));
      mockDisconnectMethod.mockImplementation(() => {
        throw new Error('Failed to disconnect');
      });

      redisUtil.createRedisClient();

      await redisUtil.closeRedisConnections();

      expect(mockQuitMethod).toHaveBeenCalledTimes(1);
      expect(mockDisconnectMethod).toHaveBeenCalledTimes(1);     
    });
  });
});
