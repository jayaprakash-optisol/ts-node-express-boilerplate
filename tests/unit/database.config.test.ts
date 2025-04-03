import { logger } from '../../src/utils/logger';

// Mock functions
const mockConnect = jest.fn().mockResolvedValue({ release: jest.fn() });
const mockEnd = jest.fn().mockResolvedValue(undefined);

// Mock dependencies
jest.mock('pg', () => ({
  Pool: jest.fn().mockImplementation(() => ({
    connect: mockConnect,
    end: mockEnd,
  })),
}));

jest.mock('drizzle-orm/node-postgres', () => ({
  drizzle: jest.fn().mockReturnValue({}),
}));

jest.mock('../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

// Import the module after mocks
import { closePool } from '../../src/config/database.config';

describe('Database Configuration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('closePool', () => {
    it('should close the connection pool', async () => {
      await closePool();
      expect(mockEnd).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith('Database connection pool closed');
    });

    it('should handle errors when closing the pool', async () => {
      const error = new Error('Close error');
      mockEnd.mockRejectedValueOnce(error);

      await expect(closePool()).rejects.toThrow('Close error');
      expect(mockEnd).toHaveBeenCalled();
    });
  });
});
