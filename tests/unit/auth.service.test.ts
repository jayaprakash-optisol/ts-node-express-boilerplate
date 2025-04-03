import { AuthService } from '../../src/services/auth.service';
import { UserService } from '../../src/services/user.service';
import { db } from '../utils/setup';
import { users } from '../../src/models';

describe('AuthService', () => {
  let authService: AuthService;
  let userService: UserService;

  beforeAll(() => {
    userService = new UserService();
    authService = new AuthService(userService);
  });

  beforeEach(async () => {
    await db.delete(users);
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
      };

      const result = await authService.register(userData);

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('id');
      expect(result.data?.email).toBe(userData.email);
      expect(result.data?.firstName).toBe(userData.firstName);
      expect(result.data?.lastName).toBe(userData.lastName);
      expect(result.data).not.toHaveProperty('password');
    });

    it('should return error when email already exists', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
      };

      await authService.register(userData);
      const result = await authService.register(userData);

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(400);
    });
  });

  describe('login', () => {
    it('should login successfully with correct credentials', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
      };

      await authService.register(userData);
      const result = await authService.login(userData.email, userData.password);

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('token');
      expect(result.data?.user.email).toBe(userData.email);
    });

    it('should return error with incorrect password', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
      };

      await authService.register(userData);
      const result = await authService.login(userData.email, 'wrongpassword');

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(401);
    });
  });

  describe('refreshToken', () => {
    it('should refresh token successfully for existing user', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
      };

      const registerResult = await authService.register(userData);
      const userId = registerResult.data?.id as number;

      const result = await authService.refreshToken(userId);

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('token');
    });

    it('should return error when user not found', async () => {
      const result = await authService.refreshToken(9999);

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(404);
    });
  });
});
