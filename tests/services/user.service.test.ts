import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StatusCodes } from 'http-status-codes';
import { mockUsers, mockNewUser } from '../mocks/data';

// Create mock functions
vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn().mockImplementation(password => Promise.resolve(`hashed_${password}`)),
    compare: vi.fn().mockImplementation(() => Promise.resolve(true)),
  },
}));

// Create a simple mock db object with jest functions
vi.mock('../../src/config/database.config', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

// Import the service (after mocks)
import { UserService } from '../../src/services/user.service';
import bcrypt from 'bcrypt';
import { db } from '../../src/config/database.config';
import {
  DatabaseError,
  NotFoundError,
  InternalServerError,
  UnauthorizedError,
} from '../../src/utils/error.util';

describe('UserService', () => {
  let userService: UserService;

  beforeEach(() => {
    vi.resetAllMocks();

    // Reset singleton
    // @ts-ignore
    UserService.instance = undefined;
    userService = UserService.getInstance();
  });

  describe('createUser', () => {
    it('should create a user successfully', async () => {
      // Setup mocks for this test
      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: 1, ...mockNewUser }]),
        }),
      } as any);

      const result = await userService.createUser(mockNewUser);

      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(StatusCodes.CREATED);
      expect(result.message).toContain('User created successfully');
      expect(db.insert).toHaveBeenCalled();
    });

    it('should throw DatabaseError when user creation fails', async () => {
      // Setup mocks for this test
      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      } as any);

      await expect(userService.createUser(mockNewUser)).rejects.toThrow(DatabaseError);
      await expect(userService.createUser(mockNewUser)).rejects.toThrow('Failed to create user');
    });

    it('should throw InternalServerError for database errors', async () => {
      // Setup mocks for this test
      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockRejectedValue(new Error('Database error')),
        }),
      } as any);

      await expect(userService.createUser(mockNewUser)).rejects.toThrow(InternalServerError);
    });
  });

  describe('getUserById', () => {
    it('should get a user by ID successfully', async () => {
      // Setup mocks for this test
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockUsers[0]]),
          }),
        }),
      } as any);

      const result = await userService.getUserById(1);

      expect(result.success).toBe(true);
      expect(result.message).toContain('User found');
      expect(db.select).toHaveBeenCalled();
    });

    it('should throw NotFoundError when user not found', async () => {
      // Setup mocks for this test
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as any);

      await expect(userService.getUserById(999)).rejects.toThrow(NotFoundError);
      await expect(userService.getUserById(999)).rejects.toThrow('User with ID 999 not found');
    });
  });

  describe('getUserByEmail', () => {
    it('should get a user by email successfully', async () => {
      // Setup mocks for this test
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockUsers[0]]),
          }),
        }),
      } as any);

      const result = await userService.getUserByEmail('test@example.com');

      expect(result.success).toBe(true);
      expect(result.message).toContain('User found');
      expect(db.select).toHaveBeenCalled();
    });

    it('should throw NotFoundError when user not found by email', async () => {
      // Setup mocks for this test
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as any);

      await expect(userService.getUserByEmail('nonexistent@example.com')).rejects.toThrow(
        NotFoundError,
      );
      await expect(userService.getUserByEmail('nonexistent@example.com')).rejects.toThrow(
        'User with email nonexistent@example.com not found',
      );
    });
  });

  describe('getAllUsers', () => {
    it('should get all users with pagination', async () => {
      // Setup mocks for this test - first for count, then for select
      vi.mocked(db.select)
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue([{ count: 2 }]),
        } as any)
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              offset: vi.fn().mockResolvedValue(mockUsers),
            }),
          }),
        } as any);

      const result = await userService.getAllUsers({ page: 1, limit: 10 });

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('users');
      expect(result.data).toHaveProperty('total');
      expect(result.message).toContain('Users retrieved successfully');
    });

    it('should throw InternalServerError for database errors', async () => {
      // Setup mocks for this test
      vi.mocked(db.select).mockImplementation(() => {
        throw new Error('Database error');
      });

      await expect(userService.getAllUsers({ page: 1, limit: 10 })).rejects.toThrow(
        InternalServerError,
      );
    });
  });

  describe('updateUser', () => {
    it('should update a user successfully', async () => {
      // Setup mocks for this test - first for finding user, then for update
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockUsers[0]]),
          }),
        }),
      } as any);

      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ ...mockUsers[0], firstName: 'Updated' }]),
          }),
        }),
      } as any);

      const result = await userService.updateUser(1, {
        firstName: 'Updated',
        lastName: 'User',
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('User updated successfully');
      expect(db.select).toHaveBeenCalled();
      expect(db.update).toHaveBeenCalled();
    });

    it('should hash password when updating password', async () => {
      // Setup mocks for this test
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockUsers[0]]),
          }),
        }),
      } as any);

      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi
              .fn()
              .mockResolvedValue([{ ...mockUsers[0], password: 'hashed_password' }]),
          }),
        }),
      } as any);

      await userService.updateUser(1, { password: 'NewPassword123!' });

      expect(bcrypt.hash).toHaveBeenCalled();
    });

    it('should throw NotFoundError when user not found for update', async () => {
      // Setup mocks for this test
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as any);

      await expect(userService.updateUser(999, { firstName: 'Updated' })).rejects.toThrow(
        NotFoundError,
      );
      await expect(userService.updateUser(999, { firstName: 'Updated' })).rejects.toThrow(
        'User with ID 999 not found',
      );
    });

    it('should throw DatabaseError when update fails', async () => {
      // Setup mocks for this test
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockUsers[0]]),
          }),
        }),
      } as any);

      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as any);

      await expect(userService.updateUser(1, { firstName: 'Updated' })).rejects.toThrow(
        DatabaseError,
      );
      await expect(userService.updateUser(1, { firstName: 'Updated' })).rejects.toThrow(
        'Failed to update user',
      );
    });

    it('should throw InternalServerError for database errors', async () => {
      // Setup mocks for this test
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockUsers[0]]),
          }),
        }),
      } as any);

      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockRejectedValue(new Error('Database error')),
          }),
        }),
      } as any);

      await expect(userService.updateUser(1, { firstName: 'Updated' })).rejects.toThrow(
        InternalServerError,
      );
    });
  });

  describe('deleteUser', () => {
    it('should delete a user successfully', async () => {
      // Setup mocks for this test
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockUsers[0]]),
          }),
        }),
      } as any);

      vi.mocked(db.delete).mockReturnValue({
        where: vi.fn().mockResolvedValue(1),
      } as any);

      const result = await userService.deleteUser(1);

      expect(result.success).toBe(true);
      expect(result.message).toContain('User deleted successfully');
      expect(db.select).toHaveBeenCalled();
      expect(db.delete).toHaveBeenCalled();
    });

    it('should throw NotFoundError when user not found for deletion', async () => {
      // Setup mocks for this test
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as any);

      await expect(userService.deleteUser(999)).rejects.toThrow(NotFoundError);
      await expect(userService.deleteUser(999)).rejects.toThrow('User with ID 999 not found');
    });

    it('should throw DatabaseError when deletion fails', async () => {
      // Setup mocks for this test
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockUsers[0]]),
          }),
        }),
      } as any);

      vi.mocked(db.delete).mockReturnValue({
        where: vi.fn().mockResolvedValue(null),
      } as any);

      await expect(userService.deleteUser(1)).rejects.toThrow(DatabaseError);
      await expect(userService.deleteUser(1)).rejects.toThrow('Failed to delete user');
    });

    it('should throw InternalServerError for database errors', async () => {
      // Setup mocks for this test
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockUsers[0]]),
          }),
        }),
      } as any);

      vi.mocked(db.delete).mockReturnValue({
        where: vi.fn().mockRejectedValue(new Error('Database error')),
      } as any);

      await expect(userService.deleteUser(1)).rejects.toThrow(InternalServerError);
    });
  });

  describe('verifyPassword', () => {
    it('should verify password successfully', async () => {
      // Setup mocks for this test
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockUsers[0]]),
          }),
        }),
      } as any);

      // Explicitly ensure bcrypt.compare returns true for this test
      vi.mocked(bcrypt.compare).mockImplementation(() => Promise.resolve(true));

      const result = await userService.verifyPassword('test@example.com', 'Password123!');

      expect(result.success).toBe(true);
      expect(result.message).toContain('Password verified successfully');
      expect(db.select).toHaveBeenCalled();
    });

    it('should throw UnauthorizedError for invalid password', async () => {
      // Setup mocks for this test
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockUsers[0]]),
          }),
        }),
      } as any);

      // Temporarily reassign compare to return false for this test
      const originalCompare = vi.mocked(bcrypt.compare);
      vi.mocked(bcrypt.compare).mockImplementation(() => Promise.resolve(false));

      await expect(userService.verifyPassword('test@example.com', 'WrongPassword')).rejects.toThrow(
        UnauthorizedError,
      );
      await expect(userService.verifyPassword('test@example.com', 'WrongPassword')).rejects.toThrow(
        'Invalid credentials',
      );

      // Restore the original mock
      vi.mocked(bcrypt.compare).mockImplementation(originalCompare);
    });

    it('should throw UnauthorizedError when user not found', async () => {
      // Setup mocks for this test
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as any);

      await expect(
        userService.verifyPassword('nonexistent@example.com', 'Password123!'),
      ).rejects.toThrow(UnauthorizedError);
      await expect(
        userService.verifyPassword('nonexistent@example.com', 'Password123!'),
      ).rejects.toThrow('Invalid credentials');
    });

    it('should throw InternalServerError for database errors', async () => {
      // Setup mocks for this test
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockRejectedValue(new Error('Database error')),
          }),
        }),
      } as any);

      await expect(userService.verifyPassword('test@example.com', 'Password123!')).rejects.toThrow(
        InternalServerError,
      );
    });
  });
});
