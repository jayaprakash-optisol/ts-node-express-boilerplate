import Redis from 'ioredis';
import env from './env.config';
import { logger } from '../utils/logger';

const redisConfig = {
  host: env.REDIS_HOST || 'localhost',
  port: parseInt(env.REDIS_PORT || '6379', 10),
  password: env.REDIS_PASSWORD,
  db: parseInt(env.REDIS_DB || '0', 10),
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
};

const redisClient = new Redis(redisConfig);

redisClient.on('error', error => {
  logger.error('Redis connection error:', error);
});

redisClient.on('connect', () => {
  logger.info('Successfully connected to Redis');
});

export default redisClient;
