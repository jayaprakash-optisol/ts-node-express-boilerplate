import { Request, Response } from 'express';
import { AuthRequest } from '../../src/types';
import { User } from '../../src/types';

// Mock user data
export const mockUsers: User[] = [
  {
    id: 1,
    email: 'test@example.com',
    password: '$2b$10$rGVKYWheQRbeWSgDS3S1OeKnpBF3T8MgWKIUVCXbDCl2t9MTrxKOa', // hashed 'password123'
    firstName: 'Test',
    lastName: 'User',
    role: 'user',
    isActive: true,
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01'),
  },
  {
    id: 2,
    email: 'admin@example.com',
    password: '$2b$10$rGVKYWheQRbeWSgDS3S1OeKnpBF3T8MgWKIUVCXbDCl2t9MTrxKOa', // hashed 'password123'
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin',
    isActive: true,
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01'),
  },
];

// Mock express request
export const mockRequest = () => {
  const req: Partial<Request> = {
    body: {},
    params: {},
    query: {},
    headers: {},
  };
  return req as Request;
};

// Mock express response
export const mockResponse = () => {
  const res: Partial<Response> = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
  };
  return res as Response;
};

// Mock next function
export const mockNext = jest.fn();

// Mock auth request with user
export const mockAuthRequest = (user?: Partial<User>) => {
  const req: Partial<AuthRequest> = {
    body: {},
    params: {},
    query: {},
    headers: {},
    user: user
      ? {
          id: String(user.id || 1),
          userId: user.id || 1,
          email: user.email || 'test@example.com',
          role: user.role || 'user',
        }
      : undefined,
  };
  return req as AuthRequest;
};

// Mock JWT token
export const mockToken =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNjE3MjkzNjE3LCJleHAiOjE2MTczOTM2MTd9.TYnP-JxmNQ3NBCtRzKyQ5iVnGUdUbRvILH5TfLtB_Eo';

// Mock service response
export const mockServiceResponse = <T>(
  success: boolean,
  data: T | null = null,
  error: string | null = null,
  statusCode = 200,
) => ({
  success,
  data,
  error,
  statusCode,
});
