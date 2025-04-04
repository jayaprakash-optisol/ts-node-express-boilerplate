import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { IAuthService } from '../types/interfaces';
import { createBadRequestError, createUnauthorizedError } from '../utils/error.util';
import { AuthService } from '../services/auth.service';

export class AuthController {
  private readonly authService: IAuthService;

  constructor() {
    this.authService = AuthService.getInstance();
  }

  /**
   * Register a new user
   */
  register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, password, firstName, lastName, role } = req.body;

      // Validate required fields
      if (!email || !password) {
        throw createBadRequestError('Email and password are required');
      }

      const result = await this.authService.register({
        email,
        password,
        firstName,
        lastName,
        role,
      });

      if (!result.success) {
        throw createBadRequestError(result.error ?? 'Registration failed');
      }

      res.status(result.statusCode || 200).json({
        success: true,
        message: 'User registered successfully',
        data: result.data,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Login user
   */
  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, password } = req.body;

      // Validate required fields
      if (!email || !password) {
        throw createBadRequestError('Email and password are required');
      }

      const result = await this.authService.login(email, password);

      if (!result.success) {
        throw createUnauthorizedError(result.error ?? 'Login failed');
      }

      res.status(result.statusCode || 200).json({
        success: true,
        message: 'Login successful',
        data: result.data,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get current user
   */
  getCurrentUser = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw createBadRequestError('User not authenticated');
      }

      res.status(200).json({
        success: true,
        data: {
          userId: req.user.userId,
          email: req.user.email,
          role: req.user.role,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Refresh token
   */
  refreshToken = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw createBadRequestError('User not authenticated');
      }

      const result = await this.authService.refreshToken(Number(req.user?.id));

      if (!result.success) {
        throw createBadRequestError(result.error ?? 'Token refresh failed');
      }

      res.status(result.statusCode || 200).json({
        success: true,
        message: 'Token refreshed successfully',
        data: result.data,
      });
    } catch (error) {
      next(error);
    }
  };
}
