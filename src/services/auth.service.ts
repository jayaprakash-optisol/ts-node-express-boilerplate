import { StatusCodes } from 'http-status-codes';

import {
  type IAuthService,
  type IUserService,
  type JwtPayload,
  type NewUser,
  type ServiceResponse,
  type User,
} from '../types';
import { jwtUtil } from '../utils/jwt.util';
import { _error, _ok } from '../utils/response.util';

import { UserService } from './user.service';

export class AuthService implements IAuthService {
  private readonly userService: IUserService;
  private static instance: AuthService;

  private constructor() {
    this.userService = UserService.getInstance();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Register a new user
   */
  async register(
    userData: Omit<NewUser, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<ServiceResponse<Omit<User, 'password'>>> {
    try {
      // Check if user already exists with the email
      const existingUserResult = await this.userService.getUserByEmail(userData.email);

      if (existingUserResult.success && existingUserResult.data) {
        return _error('Email already in use', StatusCodes.BAD_REQUEST);
      }

      // Create new user
      const result = await this.userService.createUser(userData);
      const { password: _password, ...userWithoutPassword } = result.data!;
      return _ok(userWithoutPassword, 'User registered successfully', result.statusCode);
    } catch (error) {
      return _error((error as Error).message, StatusCodes.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Login user
   */
  async login(
    email: string,
    password: string,
  ): Promise<ServiceResponse<{ user: User; token: string }>> {
    try {
      // Verify password
      const verifyResult = await this.userService.verifyPassword(email, password);

      if (!verifyResult.success || !verifyResult.data) {
        return _error('Invalid credentials', StatusCodes.UNAUTHORIZED);
      }

      // Generate JWT token
      const token = this.generateToken(verifyResult.data);

      return _ok(
        {
          user: verifyResult.data,
          token,
        },
        'Login successful',
      );
    } catch (error) {
      return _error((error as Error).message, StatusCodes.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Generate JWT token
   */
  private generateToken(user: User): string {
    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    return jwtUtil.generateToken(payload);
  }

  /**
   * Refresh token
   */
  async refreshToken(userId: number): Promise<ServiceResponse<{ token: string }>> {
    try {
      // Get user by ID
      const userResult = await this.userService.getUserById(userId);

      if (!userResult.success || !userResult.data) {
        return _error('User not found', StatusCodes.NOT_FOUND);
      }

      // Generate new token
      const token = this.generateToken(userResult.data);

      return _ok({ token }, 'Token refreshed successfully');
    } catch (error) {
      return _error((error as Error).message, StatusCodes.INTERNAL_SERVER_ERROR);
    }
  }
}
