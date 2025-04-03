import { UserService } from '../../src/services/user.service';
import { StatusCodes } from 'http-status-codes';

// Mock the database and other dependencies
jest.mock('../../src/config/database.config', () => ({
  db: {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    execute: jest.fn(),
    insert: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    returning: jest.fn(),
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
  },
}));

jest.mock('drizzle-orm', () => {
  return {
    eq: jest.fn(),
    getTableColumns: jest.fn().mockReturnValue({
      password: 'password',
      id: 'id',
      email: 'email',
      firstName: 'firstName',
      lastName: 'lastName',
      role: 'role',
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
    }),
  };
});

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashedPassword'),
  compare: jest.fn().mockResolvedValue(true),
}));

describe('UserService', () => {
  let userService: UserService;
  let mockDb: any;

  const mockUser = {
    id: 1,
    email: 'test@example.com',
    password: 'hashedPassword',
    firstName: 'Test',
    lastName: 'User',
    role: 'user' as const,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Use import instead of require to avoid linter errors
    mockDb = jest.requireMock('../../src/config/database.config').db;
    userService = new UserService();
  });

  describe('getUserById', () => {
    it('should get a user by id', async () => {
      mockDb.select().from().where().limit.mockResolvedValue([mockUser]);

      const result = await userService.getUserById(1);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockUser);
    });

    it('should return error if user not found', async () => {
      mockDb.select().from().where().limit.mockResolvedValue([]);

      const result = await userService.getUserById(999);

      expect(result.success).toBe(false);
      expect(result.message).toContain('not found');
    });
  });

  describe('getUserByEmail', () => {
    it('should get a user by email', async () => {
      mockDb.select().from().where().limit.mockResolvedValue([mockUser]);

      const result = await userService.getUserByEmail('test@example.com');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockUser);
    });

    it('should return error if email not found', async () => {
      mockDb.select().from().where().limit.mockResolvedValue([]);

      const result = await userService.getUserByEmail('notfound@example.com');

      expect(result.success).toBe(false);
      expect(result.message).toContain('not found');
    });
  });

  describe('createUser', () => {
    it('should create a user successfully', async () => {
      const newUser = {
        email: 'new@example.com',
        password: 'password',
        firstName: 'New',
        lastName: 'User',
        role: 'user' as const,
      };

      mockDb.returning.mockResolvedValue([
        { ...newUser, id: 2, createdAt: new Date(), updatedAt: new Date() },
      ]);

      const result = await userService.createUser(newUser);

      expect(result.success).toBe(true);
      expect(result.data?.id).toBeDefined();
      expect(result.statusCode).toBe(StatusCodes.CREATED);
    });

    it('should handle errors during user creation', async () => {
      const newUser = {
        email: 'new@example.com',
        password: 'password',
        firstName: 'New',
        lastName: 'User',
        role: 'user' as const,
      };

      mockDb.returning.mockResolvedValue([]);

      const result = await userService.createUser(newUser);

      expect(result.success).toBe(false);
      expect(result.message).toBeDefined();
    });
  });

  describe('updateUser', () => {
    it('should update a user successfully', async () => {
      mockDb.select().from().where().limit.mockResolvedValue([mockUser]);
      mockDb.returning.mockResolvedValue([{ ...mockUser, firstName: 'Updated' }]);

      const result = await userService.updateUser(1, { firstName: 'Updated' });

      expect(result.success).toBe(true);
      expect(result.data?.firstName).toBe('Updated');
    });

    it('should handle user not found during update', async () => {
      mockDb.select().from().where().limit.mockResolvedValue([]);

      const result = await userService.updateUser(999, { firstName: 'Updated' });

      expect(result.success).toBe(false);
      expect(result.message).toContain('not found');
    });
  });

  describe('deleteUser', () => {
    it('should delete a user successfully', async () => {
      mockDb.select().from().where().limit.mockResolvedValue([mockUser]);

      const result = await userService.deleteUser(1);

      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(StatusCodes.NO_CONTENT);
    });

    it('should handle user not found during deletion', async () => {
      mockDb.select().from().where().limit.mockResolvedValue([]);

      const result = await userService.deleteUser(999);

      expect(result.success).toBe(false);
      expect(result.message).toContain('not found');
    });
  });

  describe('getAllUsers', () => {
    it('should get all users with pagination', async () => {
      // Create mock users
      const mockUsers = [
        { id: 1, email: 'user1@example.com', firstName: 'User', lastName: 'One', role: 'user' },
        { id: 2, email: 'user2@example.com', firstName: 'User', lastName: 'Two', role: 'user' },
      ];

      // Mock count query - the function uses the length of this array for the total count
      const mockCountResult = [{ count: 1 }];

      // First mock for count query
      mockDb.select.mockImplementationOnce(() => {
        return { from: jest.fn().mockResolvedValue(mockCountResult) };
      });

      // Second mock for user query
      mockDb.select.mockImplementationOnce(() => {
        return {
          from: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              offset: jest.fn().mockResolvedValue(mockUsers),
            }),
          }),
        };
      });

      const result = await userService.getAllUsers({ page: 1, limit: 10 });

      expect(result.success).toBe(true);
      expect(result.data?.items).toEqual(mockUsers);
      expect(result.data?.total).toBe(1); // This is set to the length of mockCountResult
      expect(result.data?.page).toBe(1);
      expect(result.data?.limit).toBe(10);
      expect(result.data?.totalPages).toBe(1);
    });
  });

  describe('verifyPassword', () => {
    it('should verify password correctly', async () => {
      // Mock the getUserByEmail method to return a successful result
      mockDb.select().from().where().limit.mockResolvedValue([mockUser]);

      const result = await userService.verifyPassword('test@example.com', 'password');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockUser);
    });

    it('should return error for invalid credentials', async () => {
      // Mock the getUserByEmail method to return an unsuccessful result
      mockDb.select().from().where().limit.mockResolvedValue([]);

      const result = await userService.verifyPassword('wrong@example.com', 'password');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid credentials');
      expect(result.statusCode).toBe(StatusCodes.UNAUTHORIZED);
    });
  });
});
