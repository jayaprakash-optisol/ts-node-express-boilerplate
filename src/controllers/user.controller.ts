import { Request, Response, NextFunction } from 'express';
import { IUserService } from '../types/interfaces';
import { createBadRequestError } from '../utils/error.util';
import { UserService } from '../services/user.service';

export class UserController {
  private readonly userService: IUserService;

  constructor() {
    this.userService = UserService.getInstance();
  }

  /**
   * Get all users with pagination
   */
  getAllUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 10;

      if (page < 1 || limit < 1) {
        throw createBadRequestError('Page and limit must be positive integers');
      }

      const result = await this.userService.getAllUsers({ page, limit });

      if (!result.success) {
        throw new Error(result.error ?? 'Failed to retrieve users');
      }

      res.status(result.statusCode).json({
        success: true,
        ...result.data,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get user by ID
   */
  getUserById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = parseInt(req.params.id, 10);

      if (isNaN(userId)) {
        throw createBadRequestError('Invalid user ID');
      }

      const result = await this.userService.getUserById(userId);

      if (!result.success) {
        throw new Error(result.error ?? 'Failed to retrieve user');
      }

      res.status(result.statusCode).json({
        success: true,
        data: result.data,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Create a new user
   */
  createUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, password, firstName, lastName, role } = req.body;

      // Validate required fields
      if (!email || !password) {
        throw createBadRequestError('Email and password are required');
      }

      const result = await this.userService.createUser({
        email,
        password,
        firstName,
        lastName,
        role,
      });

      if (!result.success) {
        throw new Error(result.error ?? 'Failed to create user');
      }

      res.status(result.statusCode).json({
        success: true,
        message: 'User created successfully',
        data: result.data,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update user
   */
  updateUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = parseInt(req.params.id, 10);

      if (isNaN(userId)) {
        throw createBadRequestError('Invalid user ID');
      }

      const { firstName, lastName, password, role, isActive } = req.body;

      const result = await this.userService.updateUser(userId, {
        firstName,
        lastName,
        password,
        role,
        isActive,
      });

      if (!result.success) {
        throw new Error(result.error ?? 'Failed to update user');
      }

      res.status(result.statusCode).json({
        success: true,
        message: 'User updated successfully',
        data: result.data,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Delete user
   */
  deleteUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = parseInt(req.params.id, 10);

      if (isNaN(userId)) {
        throw createBadRequestError('Invalid user ID');
      }

      const result = await this.userService.deleteUser(userId);

      if (!result.success) {
        throw new Error(result.error ?? 'Failed to delete user');
      }

      res.status(result.statusCode).json({
        success: true,
        message: 'User deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  };
}
