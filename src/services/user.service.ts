import bcrypt from 'bcrypt';
import { eq, getTableColumns } from 'drizzle-orm';
import { StatusCodes } from 'http-status-codes';

import { db } from '../config/database.config';
import env from '../config/env.config';
import { users } from '../models';
import {
  type IUserService,
  type NewUser,
  type PaginatedResult,
  type PaginationParams,
  type ServiceResponse,
  type User,
} from '../types';
import { _error, _ok, createNotFoundError, createUnauthorizedError } from '../utils/response.util';

export class UserService implements IUserService {
  private static instance: UserService;

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): UserService {
    if (!UserService.instance) {
      UserService.instance = new UserService();
    }
    return UserService.instance;
  }

  /**
   * Create a new user
   */
  async createUser(
    userData: Omit<NewUser, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<ServiceResponse<User>> {
    try {
      // Hash password
      const hashedPassword = await bcrypt.hash(
        userData.password,
        parseInt(env.BCRYPT_SALT_ROUNDS.toString(), 10),
      );

      // Insert user into database with hashed password
      const result = await db
        .insert(users)
        .values({
          ...userData,
          password: hashedPassword,
        })
        .returning();

      if (!result.length) {
        throw new Error('Failed to create user');
      }

      return _ok(result[0], 'User created successfully', StatusCodes.CREATED);
    } catch (error) {
      return _error((error as Error).message, StatusCodes.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: number): Promise<ServiceResponse<User>> {
    try {
      const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);

      if (!result.length) {
        throw createNotFoundError(`User with ID ${userId} not found`);
      }

      return _ok(result[0], 'User found');
    } catch (error) {
      return _error((error as Error).message, StatusCodes.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<ServiceResponse<User>> {
    try {
      const result = await db.select().from(users).where(eq(users.email, email)).limit(1);

      if (!result.length) {
        throw createNotFoundError(`User with email ${email} not found`);
      }

      return _ok(result[0], 'User found');
    } catch (error) {
      return _error((error as Error).message, StatusCodes.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Get all users with pagination
   */
  async getAllUsers(
    pagination: PaginationParams,
  ): Promise<ServiceResponse<PaginatedResult<Omit<User, 'password'>>>> {
    try {
      const { page = 1, limit = 10 } = pagination;
      const offset = (page - 1) * limit;

      // Get total count
      const countResult = await db.select({ count: users.id }).from(users);
      const total = countResult.length;

      // Get users with pagination
      const { password: _password, ...rest } = getTableColumns(users);
      const result = await db.select(rest).from(users).limit(limit).offset(offset);

      // Calculate pagination metadata
      const totalPages = Math.ceil(total / limit);

      const paginatedResult: PaginatedResult<Omit<User, 'password'>> = {
        items: result,
        total,
        page,
        limit,
        totalPages,
      };

      return _ok(paginatedResult, 'Users retrieved successfully');
    } catch (error) {
      return _error((error as Error).message, StatusCodes.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Update user
   */
  async updateUser(
    userId: number,
    userData: Partial<Omit<User, 'id' | 'email' | 'createdAt' | 'updatedAt'>>,
  ): Promise<ServiceResponse<User>> {
    try {
      // Check if user exists
      const existingUser = await db.select().from(users).where(eq(users.id, userId)).limit(1);

      if (!existingUser.length) {
        throw createNotFoundError(`User with ID ${userId} not found`);
      }

      // If password is being updated, hash it
      let dataToUpdate = { ...userData };
      if (userData.password) {
        const hashedPassword = await bcrypt.hash(
          userData.password,
          parseInt(env.BCRYPT_SALT_ROUNDS.toString(), 10),
        );
        dataToUpdate = { ...dataToUpdate, password: hashedPassword };
      }

      // Update user
      const result = await db
        .update(users)
        .set({ ...dataToUpdate, updatedAt: new Date() })
        .where(eq(users.id, userId))
        .returning();

      return _ok(result[0], 'User updated successfully');
    } catch (error) {
      return _error((error as Error).message, StatusCodes.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Delete user
   */
  async deleteUser(userId: number): Promise<ServiceResponse<void>> {
    try {
      // Check if user exists
      const existingUser = await db.select().from(users).where(eq(users.id, userId)).limit(1);

      if (!existingUser.length) {
        throw createNotFoundError(`User with ID ${userId} not found`);
      }

      // Delete user
      await db.delete(users).where(eq(users.id, userId));

      return _ok(undefined, 'User deleted successfully', StatusCodes.NO_CONTENT);
    } catch (error) {
      return _error((error as Error).message, StatusCodes.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Verify user password
   */
  async verifyPassword(email: string, password: string): Promise<ServiceResponse<User>> {
    try {
      // Get user by email
      const userResult = await this.getUserByEmail(email);

      if (!userResult.success || !userResult.data) {
        throw createUnauthorizedError('Invalid Email');
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, userResult.data.password);

      if (!isPasswordValid) {
        throw createUnauthorizedError('Invalid Password');
      }

      return _ok(userResult.data, 'Password verified successfully');
    } catch (error) {
      return _error((error as Error).message, StatusCodes.INTERNAL_SERVER_ERROR);
    }
  }
}
