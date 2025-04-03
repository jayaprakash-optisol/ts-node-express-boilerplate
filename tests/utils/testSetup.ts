// Global test setup for Jest

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { beforeAll, afterAll } from '@jest/globals';
import { logger } from '../../src/utils/logger';

// Mock database connection
const mockPool = {
  connect: jest.fn().mockImplementation(() => {
    return Promise.resolve({
      query: jest.fn(),
      release: jest.fn(),
    });
  }),
  end: jest.fn().mockResolvedValue(undefined),
  on: jest.fn(),
  query: jest.fn().mockImplementation(() => Promise.resolve({ rows: [] })),
};

// Mock db instance using Drizzle
export const db = drizzle(mockPool as unknown as Pool);

// Global test setup
beforeAll(() => {
  // Silence logger during tests
  jest.spyOn(logger, 'info').mockImplementation();
  jest.spyOn(logger, 'debug').mockImplementation();
  jest.spyOn(logger, 'warn').mockImplementation();
  jest.spyOn(logger, 'error').mockImplementation();
});

// Global test teardown
afterAll(async () => {
  // Clean up mocks
  jest.restoreAllMocks();

  // Close mock pool
  await mockPool.end();
});

// Helper functions for tests
export const resetMocks = (): void => {
  mockPool.query.mockClear();
  mockPool.connect.mockClear();
  mockPool.end.mockClear();
};

// Mock data factory
export const createMockUser = (overrides = {}) => ({
  id: 1,
  email: 'test@example.com',
  password: 'hashedpassword',
  firstName: 'Test',
  lastName: 'User',
  role: 'user',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

// This file is imported automatically by Jest via the setupFilesAfterEnv configuration
