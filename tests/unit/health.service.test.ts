import { HealthService } from '../../src/services/health.service';
import * as redisUtil from '../../src/utils/redis.util';
import env from '../../src/config/env.config';

// Mock Redis utils
jest.mock('../../src/utils/redis.util', () => ({
  getHealthCheckRedis: jest.fn().mockReturnValue({
    ping: jest.fn(),
  }),
}));

// Mock env config
jest.mock('../../src/config/env.config', () => ({
  NODE_ENV: 'test',
  LOG_FILE_PATH: 'logs/test/app.log',
}));

describe('HealthService', () => {
  let healthService: HealthService;

  beforeEach(() => {
    jest.clearAllMocks();
    // Get the mocked redis client
    const redisClient = redisUtil.getHealthCheckRedis();
    // Update the mock implementation
    (redisClient.ping as jest.Mock).mockReset();
    healthService = new HealthService();
  });

  describe('checkHealth', () => {
    it('should return UP status when Redis is healthy', async () => {
      // Setup Redis ping to return success
      const redisClient = redisUtil.getHealthCheckRedis();
      (redisClient.ping as jest.Mock).mockResolvedValue('PONG');

      const result = await healthService.checkHealth();

      expect(redisClient.ping).toHaveBeenCalled();
      expect(result.status).toBe('UP');
      expect(result.environment).toBe(env.NODE_ENV);
      expect(result.components.redis.status).toBe('UP');
      expect(result.components.api.status).toBe('UP');
    });

    it('should return DOWN status for Redis when Redis check fails', async () => {
      // Setup Redis ping to fail
      const redisClient = redisUtil.getHealthCheckRedis();
      (redisClient.ping as jest.Mock).mockRejectedValue(new Error('Redis connection failed'));

      const result = await healthService.checkHealth();

      expect(redisClient.ping).toHaveBeenCalled();
      expect(result.status).toBe('UP'); // Overall status is still UP because API is UP
      expect(result.components.redis.status).toBe('DOWN');
      expect(result.components.redis.error).toBe('Redis connection failed');
      expect(result.components.api.status).toBe('UP');
    });

    it('should handle Redis returning non-PONG value', async () => {
      // Setup Redis ping to return something unexpected
      const redisClient = redisUtil.getHealthCheckRedis();
      (redisClient.ping as jest.Mock).mockResolvedValue('Something else');

      const result = await healthService.checkHealth();

      expect(redisClient.ping).toHaveBeenCalled();
      expect(result.status).toBe('UP'); // Overall status is still UP because API is UP
      expect(result.components.redis.status).toBe('DOWN');
      expect(result.components.redis.error).toBeUndefined(); // No error message when it's a non-PONG response
      expect(result.components.api.status).toBe('UP');
    });
  });
});
