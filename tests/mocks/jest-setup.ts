import dotenv from 'dotenv';
import { closePool } from '../../src/config/database.config';
import redisClient from '../../src/config/redis.config';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set global timeout for tests
jest.setTimeout(10000);

// Mock console methods to avoid polluting test output
global.console = {
  ...console,
  // Don't log in tests unless explicitly testing logs
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Flag to track if the pool has been closed
let poolClosed = false;
// Flag to track if Redis has been closed
let redisClosed = false;

// Reset all mocks after each test
afterEach(() => {
  jest.clearAllMocks();
});

// Close database pool and Redis connections after all tests complete
afterAll(async () => {
  if (!poolClosed) {
    poolClosed = true;
    await closePool();
  }

  if (!redisClosed) {
    redisClosed = true;
    await redisClient.quit();
  }
});
