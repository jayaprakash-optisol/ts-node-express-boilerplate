import env from '../config/env.config';
import { logger } from '../utils/logger';
import { getHealthCheckRedis } from '../utils/redis.util';

interface HealthStatus {
  status: string;
  error?: string;
}

interface HealthComponent {
  redis: HealthStatus;
  api: HealthStatus;
}

interface HealthCheckResult {
  status: string;
  timestamp: string;
  environment: string;
  version: string;
  components: HealthComponent;
}

// Create Redis client for health checks
const redisClient = getHealthCheckRedis();

export class HealthService {
  /**
   * Check application health
   * @returns Health check data
   */
  async checkHealth(): Promise<HealthCheckResult> {
    const timestamp = new Date().toISOString();
    const status = 'UP';
    const version = process.env.npm_package_version || 'unknown';

    // Check components
    const components = {
      redis: await this.checkRedisHealth(),
      api: { status: 'UP' },
    };

    return {
      status,
      timestamp,
      environment: env.NODE_ENV,
      version,
      components,
    };
  }

  /**
   * Check Redis connectivity
   * @returns Redis health status
   */
  private async checkRedisHealth(): Promise<HealthStatus> {
    try {
      // Try to ping Redis
      const pong = await redisClient.ping();
      return {
        status: pong === 'PONG' ? 'UP' : 'DOWN',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Redis health check failed:', errorMessage);
      return {
        status: 'DOWN',
        error: 'Redis connection failed',
      };
    }
  }
}
