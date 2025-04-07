// Mock path and fs modules first
jest.mock('path', () => ({
  dirname: jest.fn().mockReturnValue('logs'),
}));

jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
  mkdirSync: jest.fn(),
}));

// Mock database.config first, before it's imported
jest.mock('../../../src/config/database.config', () => {
  const mockDb = {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    returning: jest.fn(),
    delete: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
  };
  return { db: mockDb };
});

// Mock env config
jest.mock('../../../src/config/env.config', () => ({
  LOG_FILE_PATH: 'logs/app.log',
  BCRYPT_SALT_ROUNDS: 10,
}));

// Mock drizzle-orm
jest.mock('drizzle-orm', () => ({
  eq: jest.fn().mockReturnValue({ field: 'id', value: 1 }),
  getTableColumns: jest.fn().mockReturnValue({
    password: 'password',
    id: 'id',
    firstName: 'firstName',
    lastName: 'lastName',
    email: 'email',
    role: 'role',
    isActive: 'isActive',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
  }),
}));

// Mock models
jest.mock('../../../src/models', () => ({
  users: { id: 'id', email: 'email' },
}));

// Mock error utilities
jest.mock('../../../src/utils/response.util', () => ({
  createServiceResponse: jest.fn((success, data, message, statusCode) => ({
    success,
    data,
    message,
    statusCode,
  })),
  createNotFoundError: jest.fn(message => {
    const error = new Error(message);
    Object.defineProperty(error, 'statusCode', { value: 404 });
    return error;
  }),
}));

// Mock bcrypt
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashedPassword'),
  compare: jest.fn().mockResolvedValue(true),
}));

// Now import everything after mocks are set up
import { StatusCodes } from 'http-status-codes';
import { UserService } from '../../../src/services/user.service';
import { NewUser, User } from '../../../src/types';
import bcrypt from 'bcrypt';

// Access the mockDb through the mock module
const mockDb = jest.requireMock('../../../src/config/database.config').db;

// More direct approach to mocking the service
describe('UserService', () => {
  let userService: UserService;

  const mockUser: User = {
    id: 1,
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    password: 'hashedPassword',
    role: 'user',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockNewUser: Omit<NewUser, 'id' | 'createdAt' | 'updatedAt'> = {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    password: 'password123',
    role: 'user',
    isActive: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    userService = UserService.getInstance();

    // Reset mocks
    mockDb.select.mockImplementation(() => mockDb);
    mockDb.from.mockImplementation(() => mockDb);
    mockDb.where.mockImplementation(() => mockDb);
    mockDb.limit.mockImplementation(() => mockDb);
    mockDb.offset.mockImplementation(() => mockDb);
    mockDb.update.mockImplementation(() => mockDb);
    mockDb.set.mockImplementation(() => mockDb);
    mockDb.delete.mockImplementation(() => mockDb);
    mockDb.insert.mockImplementation(() => mockDb);
    mockDb.values.mockImplementation(() => mockDb);
  });

  describe('getInstance', () => {
    it('should return the singleton instance', () => {
      const instance1 = UserService.getInstance();
      const instance2 = UserService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('createUser', () => {
    it('should create a user successfully', async () => {
      // Setup
      mockDb.returning.mockResolvedValueOnce([mockUser]);

      // Execute
      const result = await userService.createUser(mockNewUser);

      // Verify
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockUser);
      expect(result.statusCode).toBe(StatusCodes.CREATED);
    });

    it('should handle errors when creating a user', async () => {
      // Setup
      mockDb.returning.mockResolvedValueOnce([]);

      // Execute
      const result = await userService.createUser(mockNewUser);

      // Verify
      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to create user');
    });

    it('should handle database errors', async () => {
      // Setup
      const dbError = new Error('Database error');
      mockDb.returning.mockRejectedValueOnce(dbError);

      // Execute
      const result = await userService.createUser(mockNewUser);

      // Verify
      expect(result.success).toBe(false);
      expect(result.message).toBe('Database error');
    });
  });

  describe('getUserById', () => {
    it('should get a user by ID successfully', async () => {
      // Setup - simulate the DB operations that occur within getUserById
      mockDb.limit.mockResolvedValueOnce([mockUser]);

      // Execute
      const result = await userService.getUserById(1);

      // Verify
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockUser);
    });

    it('should handle user not found', async () => {
      // Setup
      mockDb.limit.mockResolvedValueOnce([]);

      // Execute
      const result = await userService.getUserById(1);

      // Verify
      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(StatusCodes.NOT_FOUND);
    });

    it('should handle database errors', async () => {
      // Setup
      const dbError = new Error('Database error');
      mockDb.where.mockImplementationOnce(() => {
        throw dbError;
      });

      // Execute
      const result = await userService.getUserById(1);

      // Verify
      expect(result.success).toBe(false);
      expect(result.message).toBe('Database error');
    });
  });

  describe('getUserByEmail', () => {
    it('should get a user by email successfully', async () => {
      // Setup
      mockDb.limit.mockResolvedValueOnce([mockUser]);

      // Execute
      const result = await userService.getUserByEmail('john@example.com');

      // Verify
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockUser);
    });

    it('should handle user not found by email', async () => {
      // Setup
      mockDb.limit.mockResolvedValueOnce([]);

      // Execute
      const result = await userService.getUserByEmail('john@example.com');

      // Verify
      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(StatusCodes.NOT_FOUND);
    });
  });

  describe('getAllUsers', () => {
    it('should get all users with pagination', async () => {
      // Setup
      const countResult = [{ count: 2 }];
      const userResult = [{ ...mockUser, password: undefined }];

      // Mock the results for the two database calls in getAllUsers
      // First call for count query
      mockDb.from.mockImplementationOnce(() => mockDb);
      mockDb.select.mockImplementationOnce(() => ({
        from: jest.fn().mockReturnValue(countResult),
      }));

      // Second call for data query
      mockDb.select.mockImplementationOnce(() => mockDb);
      mockDb.offset.mockResolvedValueOnce(userResult);

      // Execute
      const result = await userService.getAllUsers({ page: 1, limit: 10 });

      // Verify
      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        items: userResult,
        page: 1,
        limit: 10,
      });
      if (result.data) {
        expect(result.data.total).toBeDefined();
        expect(result.data.totalPages).toBeDefined();
      }
    });

    it('should handle errors when getting all users', async () => {
      // Setup - make the first query throw an error
      const dbError = new Error('Database error');
      mockDb.from.mockImplementationOnce(() => {
        throw dbError;
      });

      // Execute
      const result = await userService.getAllUsers({ page: 1, limit: 10 });

      // Verify
      expect(result.success).toBe(false);
      expect(result.message).toBe('Database error');
    });
  });

  describe('updateUser', () => {
    const updateData = {
      firstName: 'Updated',
      lastName: 'User',
    };

    it('should update a user successfully', async () => {
      // Setup
      // First mock for checking if user exists
      mockDb.limit.mockResolvedValueOnce([mockUser]);

      // Then mock for the actual update
      const updatedUser = { ...mockUser, ...updateData };
      mockDb.returning.mockResolvedValueOnce([updatedUser]);

      // Execute
      const result = await userService.updateUser(1, updateData);

      // Verify
      expect(result.success).toBe(true);
      expect(result.data).toEqual(updatedUser);
    });

    it('should update user password if provided', async () => {
      // Setup
      // First mock for checking if user exists
      mockDb.limit.mockResolvedValueOnce([mockUser]);

      // Mock bcrypt hash
      (bcrypt.hash as jest.Mock).mockResolvedValueOnce('newHashedPassword');

      // Then mock for the actual update
      const updatedUser = { ...mockUser, password: 'newHashedPassword' };
      mockDb.returning.mockResolvedValueOnce([updatedUser]);

      // Execute
      const result = await userService.updateUser(1, { password: 'newPassword' });

      // Verify
      expect(bcrypt.hash).toHaveBeenCalledWith('newPassword', 10);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(updatedUser);
    });

    it('should handle user not found during update', async () => {
      // Setup
      mockDb.limit.mockResolvedValueOnce([]);

      // Execute
      const result = await userService.updateUser(1, updateData);

      // Verify
      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(StatusCodes.NOT_FOUND);
    });
  });

  describe('deleteUser', () => {
    it('should delete a user successfully', async () => {
      // Setup
      // First mock for checking if user exists
      mockDb.limit.mockResolvedValueOnce([mockUser]);

      // Execute
      const result = await userService.deleteUser(1);

      // Verify
      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(StatusCodes.NO_CONTENT);
    });

    it('should handle user not found during delete', async () => {
      // Setup
      mockDb.limit.mockResolvedValueOnce([]);

      // Execute
      const result = await userService.deleteUser(1);

      // Verify
      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(StatusCodes.NOT_FOUND);
    });
  });

  describe('verifyPassword', () => {
    it('should verify user password successfully', async () => {
      // Setup
      // First mock for getUserByEmail
      mockDb.limit.mockResolvedValueOnce([mockUser]);

      // Then mock bcrypt.compare
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);

      // Execute
      const result = await userService.verifyPassword('john@example.com', 'password123');

      // Verify
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockUser);
    });

    it('should handle invalid password', async () => {
      // Setup
      // First mock for getUserByEmail
      mockDb.limit.mockResolvedValueOnce([mockUser]);

      // Then mock bcrypt.compare to return false
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);

      // Execute
      const result = await userService.verifyPassword('john@example.com', 'wrongPassword');

      // Verify
      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid credentials');
    });

    it('should handle user not found during verification', async () => {
      // Setup
      mockDb.limit.mockResolvedValueOnce([]);

      // Execute
      const result = await userService.verifyPassword('nonexistent@example.com', 'password123');

      // Verify
      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid credentials');
    });
  });
});
