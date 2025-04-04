import { UserController } from '../../../src/controllers/user.controller';
import { UserService } from '../../../src/services/user.service';
import { mockRequest, mockNext, mockUsers, mockAuthRequest } from '../../utils/mocks';

// Mock the UserService
jest.mock('../../../src/services/user.service', () => {
  // Create mock functions for each method
  const getAllUsers = jest.fn();
  const getUserById = jest.fn();
  const updateUser = jest.fn();
  const deleteUser = jest.fn();
  const getUserByEmail = jest.fn();
  const createUser = jest.fn();

  return {
    UserService: {
      getInstance: jest.fn(() => ({
        getAllUsers,
        getUserById,
        updateUser,
        deleteUser,
        getUserByEmail,
        createUser,
      })),
    },
  };
});

// Define our own mockResponse to ensure chainable methods
const mockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
};

describe('UserController', () => {
  let userController: UserController;
  let mockUserService: any;

  beforeEach(() => {
    // Clear mocks
    jest.clearAllMocks();

    // Get instance of controller
    userController = new UserController();

    // Get mocked user service
    mockUserService = UserService.getInstance();
  });

  describe('getAllUsers', () => {
    it('should return all users with pagination', async () => {
      // Arrange
      const req = mockRequest();
      const res = mockResponse();
      req.query = { page: '1', limit: '10' };

      const paginatedData = {
        items: mockUsers,
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1,
      };

      mockUserService.getAllUsers.mockResolvedValue({
        success: true,
        statusCode: 200,
        data: paginatedData,
      });

      // Act
      await userController.getAllUsers(req, res, mockNext);

      // Assert
      expect(mockUserService.getAllUsers).toHaveBeenCalledWith({ page: 1, limit: 10 });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        ...paginatedData,
      });
    });

    it('should use default pagination if not provided', async () => {
      // Arrange
      const req = mockRequest();
      const res = mockResponse();
      req.query = {};

      mockUserService.getAllUsers.mockResolvedValue({
        success: true,
        data: {
          items: mockUsers,
          total: 2,
          page: 1,
          limit: 10,
          totalPages: 1,
        },
        statusCode: 200,
        message: 'Users retrieved successfully',
      });

      // Act
      await userController.getAllUsers(req, res, mockNext);

      // Assert
      expect(mockUserService.getAllUsers).toHaveBeenCalledWith({ page: 1, limit: 10 });
    });

    it('should handle errors', async () => {
      // Arrange
      const req = mockRequest();
      const res = mockResponse();

      mockUserService.getAllUsers.mockRejectedValue(new Error('Database error'));

      // Act
      await userController.getAllUsers(req, res, mockNext);

      // Assert
      expect(mockUserService.getAllUsers).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should return list of users', async () => {
      // Arrange
      const req = mockRequest();
      const res = mockResponse();
      const paginatedData = {
        items: mockUsers,
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1,
      };

      mockUserService.getAllUsers.mockResolvedValue({
        success: true,
        statusCode: 200,
        data: paginatedData,
      });

      // Act
      await userController.getAllUsers(req, res, mockNext);

      // Assert
      expect(mockUserService.getAllUsers).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        ...paginatedData,
      });
    });
  });

  describe('getUserById', () => {
    it('should return user by id', async () => {
      // Arrange
      const req = mockRequest();
      const res = mockResponse();
      req.params = { id: '1' };

      mockUserService.getUserById.mockResolvedValue({
        success: true,
        data: mockUsers[0],
        statusCode: 200,
        message: 'User retrieved successfully',
      });

      // Act
      await userController.getUserById(req, res, mockNext);

      // Assert
      expect(mockUserService.getUserById).toHaveBeenCalledWith(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockUsers[0],
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 404 if user not found', async () => {
      // Arrange
      const req = mockRequest();
      const res = mockResponse();
      req.params = { id: '999' };

      const error = new Error('User not found') as any;
      error.statusCode = 404;
      mockUserService.getUserById.mockRejectedValue(error);

      // Act
      await userController.getUserById(req, res, mockNext);

      // Assert
      expect(mockUserService.getUserById).toHaveBeenCalledWith(999);
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 404,
          message: 'User not found',
        }),
      );
    });

    it('should handle invalid id parameter', async () => {
      // Arrange
      const req = mockRequest();
      const res = mockResponse();
      req.params = { id: 'invalid' };

      // Act
      await userController.getUserById(req, res, mockNext);

      // Assert
      expect(mockUserService.getUserById).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should handle service errors', async () => {
      // Arrange
      const req = mockRequest();
      const res = mockResponse();
      req.params = { id: '1' };

      mockUserService.getUserById.mockRejectedValue(new Error('Database error'));

      // Act
      await userController.getUserById(req, res, mockNext);

      // Assert
      expect(mockUserService.getUserById).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should handle user not found for getUserById', async () => {
      // Arrange
      const req = mockRequest();
      const res = mockResponse();
      req.params = { id: '999' }; // Non-existent user

      mockUserService.getUserById.mockImplementation(() => {
        const error = new Error('User not found');
        (error as any).statusCode = 404;
        throw error;
      });

      // Act
      await userController.getUserById(req, res, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 404,
          message: 'User not found',
        }),
      );
    });
  });

  describe('updateUser', () => {
    it('should update user successfully', async () => {
      // Arrange
      const req = mockAuthRequest(mockUsers[0]);
      const res = mockResponse();
      req.params = { id: '1' };
      req.body = {
        firstName: 'Updated',
        lastName: 'User',
      };

      mockUserService.updateUser.mockResolvedValue({
        success: true,
        data: {
          ...mockUsers[0],
          firstName: 'Updated',
          lastName: 'User',
        },
        statusCode: 200,
        message: 'User updated successfully',
      });

      // Act
      await userController.updateUser(req, res, mockNext);

      // Assert
      expect(mockUserService.updateUser).toHaveBeenCalledWith(1, {
        firstName: 'Updated',
        lastName: 'User',
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'User updated successfully',
        data: expect.objectContaining({
          firstName: 'Updated',
          lastName: 'User',
        }),
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 404 if user not found', async () => {
      // Arrange
      const req = mockAuthRequest(mockUsers[0]);
      const res = mockResponse();
      req.params = { id: '1' };
      req.body = {
        firstName: 'Updated',
      };

      const error = { statusCode: 404, message: 'User not found' };
      mockUserService.updateUser.mockRejectedValue(error);

      // Act
      await userController.updateUser(req, res, mockNext);

      // Assert
      expect(mockUserService.updateUser).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it('should handle unauthorized update attempt', async () => {
      // Arrange
      const req = mockAuthRequest(mockUsers[0]); // Regular user
      const res = mockResponse();
      req.params = { id: '2' }; // Trying to update another user
      req.body = {
        firstName: 'Hacked',
      };

      // Mock to prevent actual service call
      mockUserService.updateUser.mockImplementation(() => {
        throw { statusCode: 403, message: 'Forbidden' };
      });

      // Act
      await userController.updateUser(req, res, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 403,
          message: 'Forbidden',
        }),
      );
    });

    it('should handle invalid id parameter', async () => {
      // Arrange
      const req = mockAuthRequest(mockUsers[0]);
      const res = mockResponse();
      req.params = { id: 'invalid' };
      req.body = {
        firstName: 'Updated',
      };

      // Act
      await userController.updateUser(req, res, mockNext);

      // Assert
      expect(mockUserService.updateUser).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Invalid user ID',
        }),
      );
    });

    it('should handle service errors', async () => {
      // Arrange
      const req = mockAuthRequest(mockUsers[0]);
      const res = mockResponse();
      req.params = { id: '1' };
      req.body = {
        firstName: 'Updated',
      };

      const error = new Error('Database error');
      mockUserService.updateUser.mockRejectedValue(error);

      // Act
      await userController.updateUser(req, res, mockNext);

      // Assert
      expect(mockUserService.updateUser).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it('should handle user not found for update', async () => {
      // Arrange
      const req = mockAuthRequest(mockUsers[0]);
      const res = mockResponse();
      req.params = { id: '1' }; // Same user, but not found in database
      req.body = {
        firstName: 'Updated',
      };

      const error = { statusCode: 404, message: 'User not found' };
      mockUserService.updateUser.mockRejectedValue(error);

      // Act
      await userController.updateUser(req, res, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('deleteUser', () => {
    it('should delete user successfully', async () => {
      // Arrange
      const req = mockAuthRequest(mockUsers[1]); // Admin user
      const res = mockResponse();
      req.params = { id: '1' };

      mockUserService.deleteUser.mockResolvedValue({
        success: true,
        data: null,
        statusCode: 200,
        message: 'User deleted successfully',
      });

      // Act
      await userController.deleteUser(req, res, mockNext);

      // Assert
      expect(mockUserService.deleteUser).toHaveBeenCalledWith(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'User deleted successfully',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 404 if user not found', async () => {
      // Arrange
      const req = mockAuthRequest(mockUsers[0]);
      const res = mockResponse();
      req.params = { id: '1' };

      const error = { statusCode: 404, message: 'User not found' };
      mockUserService.deleteUser.mockRejectedValue(error);

      // Act
      await userController.deleteUser(req, res, mockNext);

      // Assert
      expect(mockUserService.deleteUser).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it('should handle unauthorized delete attempt', async () => {
      // Arrange
      const req = mockAuthRequest(mockUsers[0]); // Regular user
      const res = mockResponse();
      req.params = { id: '2' }; // Trying to delete another user

      // Mock to prevent actual service call
      mockUserService.deleteUser.mockImplementation(() => {
        throw { statusCode: 403, message: 'Forbidden' };
      });

      // Act
      await userController.deleteUser(req, res, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 403,
          message: 'Forbidden',
        }),
      );
    });

    it('should handle invalid id parameter', async () => {
      // Arrange
      const req = mockAuthRequest(mockUsers[0]);
      const res = mockResponse();
      req.params = { id: 'invalid' };

      // Act
      await userController.deleteUser(req, res, mockNext);

      // Assert
      expect(mockUserService.deleteUser).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Invalid user ID',
        }),
      );
    });

    it('should handle service errors', async () => {
      // Arrange
      const req = mockAuthRequest(mockUsers[0]);
      const res = mockResponse();
      req.params = { id: '1' };

      const error = new Error('Database error');
      mockUserService.deleteUser.mockRejectedValue(error);

      // Act
      await userController.deleteUser(req, res, mockNext);

      // Assert
      expect(mockUserService.deleteUser).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it('should handle user not found for delete', async () => {
      // Arrange
      const req = mockAuthRequest(mockUsers[0]);
      const res = mockResponse();
      req.params = { id: '1' }; // Same user, but not found in database

      const error = { statusCode: 404, message: 'User not found' };
      mockUserService.deleteUser.mockRejectedValue(error);

      // Act
      await userController.deleteUser(req, res, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});
