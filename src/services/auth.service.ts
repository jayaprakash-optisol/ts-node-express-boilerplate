import { StatusCodes } from 'http-status-codes';
import { JwtPayload, NewUser, ServiceResponse, User } from '../types';
import { IAuthService, IUserService } from '../types/interfaces';
import { createServiceResponse } from '../utils/error.util';
import { jwtUtil } from '../utils/jwt.util';
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
        return createServiceResponse<Omit<User, 'password'>>(
          false,
          undefined,
          'Email already in use',
          StatusCodes.BAD_REQUEST,
        );
      }

      // Create new user
      const result = await this.userService.createUser(userData);
      const { password: _password, ...userWithoutPassword } = result.data!;
      return createServiceResponse(true, userWithoutPassword, undefined, result.statusCode);
    } catch (error) {
      return createServiceResponse<Omit<User, 'password'>>(
        false,
        undefined,
        (error as Error).message,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
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
        return createServiceResponse<{ user: User; token: string }>(
          false,
          undefined,
          'Invalid credentials',
          StatusCodes.UNAUTHORIZED,
        );
      }

      // Generate JWT token
      const token = this.generateToken(verifyResult.data);

      return createServiceResponse(true, {
        user: verifyResult.data,
        token,
      });
    } catch (error) {
      return createServiceResponse<{ user: User; token: string }>(
        false,
        undefined,
        (error as Error).message,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
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
        return createServiceResponse<{ token: string }>(
          false,
          undefined,
          'User not found',
          StatusCodes.NOT_FOUND,
        );
      }

      // Generate new token
      const token = this.generateToken(userResult.data);

      return createServiceResponse(true, { token });
    } catch (error) {
      return createServiceResponse<{ token: string }>(
        false,
        undefined,
        (error as Error).message,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
