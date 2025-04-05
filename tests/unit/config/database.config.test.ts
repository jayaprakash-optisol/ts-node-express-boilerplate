import { closePool } from '../../../src/config/database.config';
import { logger } from '../../../src/utils/logger';

// Mock pg Pool with a factory function that creates the mock implementation inside
jest.mock('pg', () => {
  // Create mock client and pool implementation inside the factory
  const mockClient = {
    release: jest.fn(),
  };

  const mockPoolImplementation = {
    connect: jest.fn().mockResolvedValue(mockClient),
    end: jest.fn().mockResolvedValue(undefined),
  };

  // Make both accessible for our tests
  (jest as any).mockPoolImpl = mockPoolImplementation;
  (jest as any).mockClient = mockClient;

  return {
    Pool: jest.fn(() => mockPoolImplementation),
  };
});

// Mock drizzle-orm
jest.mock('drizzle-orm/node-postgres', () => ({
  drizzle: jest.fn(() => ({})),
}));

// Mock logger
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock env config
jest.mock('../../../src/config/env.config', () => ({
  DATABASE_URL: 'postgres://test:test@localhost:5432/testdb',
}));

// Get references to the mock implementations from jest's cache
const mockPoolImplementation = (jest as any).mockPoolImpl;
const mockClient = (jest as any).mockClient;

describe('Database Configuration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should log success when connection is successful', async () => {
    // Create a delayed resolution to simulate connection
    mockPoolImplementation.connect.mockResolvedValueOnce(mockClient);

    // Load the module to trigger the connection test
    jest.isolateModules(() => {
      require('../../../src/config/database.config');
    });

    // Wait for the connect promise to resolve
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify that success was logged
    expect(mockPoolImplementation.connect).toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('PostgreSQL connected successfully'),
    );
    expect(mockClient.release).toHaveBeenCalled();
  });

  it('should log error when connection fails', async () => {
    // Setup the error
    const mockError = new Error('Connection error');
    mockPoolImplementation.connect.mockRejectedValueOnce(mockError);

    // Load the module to trigger the connection test
    jest.isolateModules(() => {
      require('../../../src/config/database.config');
    });

    // Wait for the connect promise to reject
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify that error was logged
    expect(mockPoolImplementation.connect).toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('PostgreSQL connection error: Connection error'),
    );
  });

  it('should close pool when closePool is called', async () => {
    await closePool();

    expect(mockPoolImplementation.end).toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith('Database connection pool closed');
  });
});
