import { StatusCodes } from 'http-status-codes';
import { agent } from '../utils/setup-integration';
import { mockUsers, mockToken } from '../utils/mocks';
import { UserService } from '../../src/services/user.service';
import { Request, Response, NextFunction } from 'express';

import 'express';

// Extend Request type to include user property
declare module 'express' {
  interface Request {
    user?: {
      id: string;
      userId?: number;
      email: string;
      role: string;
    };
  }
}

// Mock UserService
jest.mock('../../src/services/user.service', () => {
  const getAllUsers = jest.fn();
  const getUserById = jest.fn();
  const updateUser = jest.fn();
  const deleteUser = jest.fn();

  return {
    UserService: {
      getInstance: jest.fn(() => ({
        getAllUsers,
        getUserById,
        updateUser,
        deleteUser,
      })),
    },
  };
});

// Convert dates to strings to match JSON serialization in API responses
const serializedMockUsers = mockUsers.map(user => ({
  ...user,
  createdAt: user.createdAt.toISOString(),
  updatedAt: user.updatedAt.toISOString(),
}));

// Mock JWT verification
jest.mock('../../src/middleware/auth.middleware', () => {
  return {
    authenticate: (req: Request, _res: Response, next: NextFunction) => {
      if (req.headers.authorization) {
        // Simulate authenticated user based on headers
        const role = typeof req.headers['x-role'] === 'string' ? req.headers['x-role'] : 'user';
        const id = typeof req.headers['x-user-id'] === 'string' ? req.headers['x-user-id'] : '1';
        req.user = { id, email: 'test@example.com', role };
      }
      next();
    },
    authorize: (roles: string[]) => (req: Request, res: Response, next: NextFunction) => {
      if (!req.user) {
        return res.status(StatusCodes.UNAUTHORIZED).json({
          success: false,
          error: 'Unauthorized',
        });
      }

      if (roles && !roles.includes(req.user.role)) {
        return res.status(StatusCodes.FORBIDDEN).json({
          success: false,
          error: 'Forbidden',
        });
      }

      next();
    },
  };
});

// Define API prefix to match app configuration
const API_PREFIX = '/api';

describe('User Routes', () => {
  let userService: any;

  beforeAll(() => {
    userService = UserService.getInstance();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/users', () => {
    it('should return all users with pagination', async () => {
      // Arrange
      userService.getAllUsers.mockResolvedValue({
        success: true,
        data: {
          items: serializedMockUsers,
          total: 2,
          page: 1,
          limit: 10,
          totalPages: 1,
        },
        statusCode: StatusCodes.OK,
      });

      // Act
      const response = await agent
        .get(`${API_PREFIX}/users`)
        .set('Authorization', `Bearer ${mockToken}`)
        .set('x-role', 'admin');

      // Assert
      expect(response.status).toBe(StatusCodes.OK);
      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('items');
      expect(response.body.items.length).toBe(2);
      expect(userService.getAllUsers).toHaveBeenCalled();
    });

    it('should return 401 if not authenticated', async () => {
      // Act
      const response = await agent.get(`${API_PREFIX}/users`);

      // Assert
      expect(response.status).toBe(StatusCodes.UNAUTHORIZED);
      expect(response.body.success).toBe(false);
      expect(userService.getAllUsers).not.toHaveBeenCalled();
    });

    it('should apply pagination parameters', async () => {
      // Arrange
      userService.getAllUsers.mockResolvedValue({
        success: true,
        data: {
          items: [serializedMockUsers[0]],
          total: 2,
          page: 2,
          limit: 1,
          totalPages: 2,
        },
        statusCode: StatusCodes.OK,
      });

      // Act
      const response = await agent
        .get(`${API_PREFIX}/users?page=2&limit=1`)
        .set('Authorization', `Bearer ${mockToken}`)
        .set('x-role', 'admin');

      // Assert
      expect(response.status).toBe(StatusCodes.OK);
      expect(response.body.page).toBe(2);
      expect(response.body.limit).toBe(1);
      expect(userService.getAllUsers).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 2,
          limit: 1,
        }),
      );
    });
  });

  describe('GET /api/users/:id', () => {
    it('should return a user by id', async () => {
      // Arrange
      userService.getUserById.mockResolvedValue({
        success: true,
        data: serializedMockUsers[0],
        statusCode: StatusCodes.OK,
      });

      // Act
      const response = await agent
        .get(`${API_PREFIX}/users/1`)
        .set('Authorization', `Bearer ${mockToken}`)
        .set('x-role', 'admin');

      // Assert
      expect(response.status).toBe(StatusCodes.OK);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(serializedMockUsers[0]);
      expect(userService.getUserById).toHaveBeenCalledWith(1);
    });
  });
});
