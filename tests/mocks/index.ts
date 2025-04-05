import { Request, Response } from 'express';
import { AuthRequest, User } from '../../src/types';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { logger } from '../../src/utils/logger';
import request from 'supertest';
import app from '../../src/app';

// ======= MOCK DATA =======

// Mock user data
export const mockUsers: User[] = [
  {
    id: 1,
    email: 'test@example.com',
    password: '$2b$10$rGVKYWheQRbeWSgDS3S1OeKnpBF3T8MgWKIUVCXbDCl2t9MTrxKOa',
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
    password: '$2b$10$rGVKYWheQRbeWSgDS3S1OeKnpBF3T8MgWKIUVCXbDCl2t9MTrxKOa',
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin',
    isActive: true,
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01'),
  },
];

// Mock JWT token
export const mockToken =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNjE3MjkzNjE3LCJleHAiOjE2MTczOTM2MTd9.TYnP-JxmNQ3NBCtRzKyQ5iVnGUdUbRvILH5TfLtB_Eo';

// Factory function to create mock user
export const createMockUser = (overrides = {}) => ({
  id: 1,
  email: 'test@example.com',
  password: 'hashedpassword',
  firstName: 'Test',
  lastName: 'User',
  role: 'user',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

// Create pagination data for tests
export const createPaginationData = (items: any[] = mockUsers, page = 1, limit = 10) => ({
  items,
  page,
  limit,
  total: items.length,
  totalPages: Math.ceil(items.length / limit),
});

// ======= REQUEST/RESPONSE MOCKS =======

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

// ======= DATABASE MOCKS =======

// Mock database connection
export const mockPool = {
  connect: jest.fn().mockImplementation(() => {
    return Promise.resolve({
      query: jest.fn(),
      release: jest.fn(),
    });
  }),
  end: jest.fn().mockResolvedValue(undefined),
  on: jest.fn(),
  query: jest.fn().mockImplementation(() => Promise.resolve({ rows: [] })),
};

// Mock db instance using Drizzle
export const db = drizzle(mockPool as unknown as Pool);

// Helper function for resetting database mocks
export const resetMocks = (): void => {
  mockPool.query.mockClear();
  mockPool.connect.mockClear();
  mockPool.end.mockClear();
};

// Setup database mocks
export const setupDatabaseMocks = () => {
  // Silence logger during tests
  jest.spyOn(logger, 'info').mockImplementation();
  jest.spyOn(logger, 'debug').mockImplementation();
  jest.spyOn(logger, 'warn').mockImplementation();
  jest.spyOn(logger, 'error').mockImplementation();
};

// Teardown database mocks
export const teardownDatabaseMocks = async () => {
  jest.restoreAllMocks();
  await mockPool.end();
};

// ======= INTEGRATION TEST MOCKS =======

// Export configured app and request agent
export const testApp = app;
export const agent = request(app);

// Helper function to create authenticated agent
export const createAuthAgent = (token: string, role = 'user', userId = '1') => {
  return {
    get: (url: string) =>
      agent
        .get(url)
        .set('Authorization', `Bearer ${token}`)
        .set('x-role', role)
        .set('x-user-id', userId),
    post: (url: string) =>
      agent
        .post(url)
        .set('Authorization', `Bearer ${token}`)
        .set('x-role', role)
        .set('x-user-id', userId),
    put: (url: string) =>
      agent
        .put(url)
        .set('Authorization', `Bearer ${token}`)
        .set('x-role', role)
        .set('x-user-id', userId),
    delete: (url: string) =>
      agent
        .delete(url)
        .set('Authorization', `Bearer ${token}`)
        .set('x-role', role)
        .set('x-user-id', userId),
  };
};

// Create service mock for integration tests
export const createServiceMock = (methodNames: string[]) => {
  const mockMethods: Record<string, jest.Mock> = {};
  methodNames.forEach(method => {
    mockMethods[method] = jest.fn();
  });

  return {
    getInstance: jest.fn(() => mockMethods),
    mockMethods,
  };
};
