import { users } from '../models';
import { Request } from 'express';

// Database model types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

// Auth request type with user property
export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    [key: string]: unknown;
  };
}

// JWT payload type
export interface JwtPayload {
  userId: number;
  email: string;
  role: string;
  [key: string]: unknown;
}

// Service response wrapper type
export interface ServiceResponse<T = null> {
  success: boolean;
  message: string;
  data?: T | null;
  error?: string | null;
  statusCode: number;
}

// Pagination parameters
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Paginated result interface
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
