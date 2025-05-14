import { type NextFunction, type Request, type Response } from 'express';

import { AuthService } from '../services';
import { type AuthRequest, type IAuthService } from '../types';
import { sendError, sendSuccess } from '../utils/response.util';

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
        return sendError(res, 'Email and password are required');
      }

      const result = await this.authService.register({
        email,
        password,
        firstName,
        lastName,
        role,
      });

      if (!result.success) {
        return sendError(res, result.error ?? 'Registration failed');
      }

      sendSuccess(res, result.data, 'User registered successfully', result.statusCode);
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
        return sendError(res, 'Email and password are required');
      }

      const result = await this.authService.login(email, password);

      if (!result.success) {
        return sendError(res, result.error ?? 'Login failed', 401);
      }

      sendSuccess(res, result.data, 'Login successful');
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
        return sendError(res, 'User not authenticated');
      }

      sendSuccess(res, {
        userId: req.user.userId,
        email: req.user.email,
        role: req.user.role,
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
        return sendError(res, 'User not authenticated');
      }

      const result = await this.authService.refreshToken(Number(req.user?.id));

      if (!result.success) {
        return sendError(res, result.error ?? 'Token refresh failed');
      }

      sendSuccess(res, result.data, 'Token refreshed successfully');
    } catch (error) {
      next(error);
    }
  };
}
