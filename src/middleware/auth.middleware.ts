import { type NextFunction, type Response } from 'express';

import { type AuthRequest } from '../types';
import { jwtUtil } from '../utils/jwt.util';
import { AppError } from '../utils/response.util';

// Verify JWT token from Authorization header
export const authenticate = (req: AuthRequest, _res: Response, next: NextFunction): void => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      throw new AppError('No token provided', 401);
    }

    const decoded = jwtUtil.verifyToken(token);

    if (!decoded.success || !decoded.data) {
      throw new AppError('Invalid token', 401);
    }

    req.user = {
      id: decoded.data.userId.toString(),
      email: decoded.data.email,
      role: decoded.data.role,
    };
    next();
  } catch {
    next(new AppError('Invalid token', 401));
  }
};

// Check if user has required role
export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, _res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw new AppError('User not authenticated', 401);
      }

      if (!roles.includes(req.user.role)) {
        throw new AppError('Insufficient permissions', 403);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
