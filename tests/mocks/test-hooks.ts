import { setupDatabaseMocks, teardownDatabaseMocks, db } from './index';

// Setup and teardown hooks for database tests
export const setupDatabaseTests = () => {
  beforeAll(setupDatabaseMocks);
  afterAll(teardownDatabaseMocks);
  return { db };
};

// Setup hook for tests that don't need full database mocking
export const setupBasicTests = () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
};
