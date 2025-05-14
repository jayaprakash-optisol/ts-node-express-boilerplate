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

    it('should handle failure when user creation fails', async () => {
      // Setup mocks for this test
      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      } as any);

      const result = await userService.createUser(mockNewUser);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to create user');
    });

    it('should handle database errors', async () => {
      // Setup mocks for this test
      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockRejectedValue(new Error('Database error')),
        }),
      } as any);

      const result = await userService.createUser(mockNewUser);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
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

    it('should return error when user not found', async () => {
      // Setup mocks for this test
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as any);

      const result = await userService.getUserById(999);

      expect(result.success).toBe(false);
      expect(result.error).toContain('User with ID 999 not found');
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

    it('should return error when user not found by email', async () => {
      // Setup mocks for this test
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as any);

      const result = await userService.getUserByEmail('nonexistent@example.com');

      expect(result.success).toBe(false);
      expect(result.error).toContain('User with email nonexistent@example.com not found');
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
      expect(result.data).toHaveProperty('items');
      expect(result.data).toHaveProperty('total');
      expect(result.message).toContain('Users retrieved successfully');
    });

    it('should handle database errors', async () => {
      // Setup mocks for this test
      vi.mocked(db.select).mockImplementation(() => {
        throw new Error('Database error');
      });

      const result = await userService.getAllUsers({ page: 1, limit: 10 });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
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

    it('should return error when user not found for update', async () => {
      // Setup mocks for this test
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as any);

      const result = await userService.updateUser(999, { firstName: 'Updated' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('User with ID 999 not found');
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
        where: vi.fn().mockResolvedValue(undefined),
      } as any);

      const result = await userService.deleteUser(1);

      expect(result.success).toBe(true);
      expect(result.message).toContain('User deleted successfully');
      expect(result.statusCode).toBe(StatusCodes.NO_CONTENT);
      expect(db.select).toHaveBeenCalled();
      expect(db.delete).toHaveBeenCalled();
    });

    it('should return error when user not found for deletion', async () => {
      // Setup mocks for this test
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as any);

      const result = await userService.deleteUser(999);

      expect(result.success).toBe(false);
      expect(result.error).toContain('User with ID 999 not found');
    });
  });

  describe('verifyPassword', () => {
    it('should verify password successfully', async () => {
      // Explicitly set up bcrypt mock for this test
      vi.mocked(bcrypt.compare).mockResolvedValueOnce(true);

      // Spy on getUserByEmail
      const getUserByEmailSpy = vi.spyOn(userService, 'getUserByEmail');
      getUserByEmailSpy.mockResolvedValue({
        success: true,
        statusCode: StatusCodes.OK,
        message: 'User found',
        data: mockUsers[0],
        error: null,
      });

      const result = await userService.verifyPassword('test@example.com', 'Password123!');

      expect(result.success).toBe(true);
      expect(result.message).toContain('Password verified successfully');
      expect(getUserByEmailSpy).toHaveBeenCalledWith('test@example.com');
      expect(bcrypt.compare).toHaveBeenCalled();
    });

    it('should return error for invalid email', async () => {
      // Spy on getUserByEmail
      const getUserByEmailSpy = vi.spyOn(userService, 'getUserByEmail');
      getUserByEmailSpy.mockResolvedValue({
        success: false,
        statusCode: StatusCodes.NOT_FOUND,
        message: 'User not found',
        data: null,
        error: 'User not found',
      });

      const result = await userService.verifyPassword('nonexistent@example.com', 'Password123!');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid Email');
    });

    it('should return error for invalid password', async () => {
      // Set up bcrypt to return false for this test
      vi.mocked(bcrypt.compare).mockResolvedValueOnce(false);

      // Spy on getUserByEmail and mock bcrypt
      const getUserByEmailSpy = vi.spyOn(userService, 'getUserByEmail');
      getUserByEmailSpy.mockResolvedValue({
        success: true,
        statusCode: StatusCodes.OK,
        message: 'User found',
        data: mockUsers[0],
        error: null,
      });

      const result = await userService.verifyPassword('test@example.com', 'WrongPassword');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid Password');
    });

    it('should handle unexpected errors during verification', async () => {
      // Spy on getUserByEmail
      const getUserByEmailSpy = vi.spyOn(userService, 'getUserByEmail');
      getUserByEmailSpy.mockRejectedValue(new Error('Database error'));

      const result = await userService.verifyPassword('test@example.com', 'Password123!');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
    });
  });
});
