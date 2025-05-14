import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthController } from '../../src/controllers/auth.controller';
import { AuthService } from '../../src/services/auth.service';
import { mockLoginRequest, mockRegisterRequest, mockJwtPayload } from '../mocks/data';
import { StatusCodes } from 'http-status-codes';
import {
  createMockRequest,
  createMockResponse,
  createMockNext,
  generateOrthogonalTestCases,
} from '../utils/test-utils';
import { type AuthRequest } from '../../src/types';

// Mock the service layer
vi.mock('../../src/services/auth.service', () => {
  const authServiceMock = {
    register: vi.fn(),
    login: vi.fn(),
    refreshToken: vi.fn(),
  };

  return {
    AuthService: {
      getInstance: vi.fn(() => authServiceMock),
    },
  };
});

describe('AuthController', () => {
  let controller: AuthController;
  let authService: any;

  beforeEach(() => {
    vi.resetAllMocks();
    authService = AuthService.getInstance();
    controller = new AuthController();
  });

  describe('register', () => {
    it('should register a user successfully', async () => {
      // Setup mocks
      const req = createMockRequest({ body: mockRegisterRequest });
      const { res, statusSpy, jsonSpy } = createMockResponse();
      const next = createMockNext();

      // Mock service response
      authService.register.mockResolvedValueOnce({
        success: true,
        statusCode: StatusCodes.CREATED,
        data: {
          id: 1,
          email: mockRegisterRequest.email,
          firstName: mockRegisterRequest.firstName,
          lastName: mockRegisterRequest.lastName,
          role: mockRegisterRequest.role,
        },
        message: 'User registered successfully',
      });

      // Call the controller method
      await controller.register(req, res, next);

      // Verify service was called
      expect(authService.register).toHaveBeenCalledWith(mockRegisterRequest);

      // Verify response
      expect(statusSpy).toHaveBeenCalledWith(StatusCodes.CREATED);
      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.any(Object),
          message: 'User registered successfully',
        }),
      );
    });

    it('should return error if registration fails', async () => {
      // Setup mocks
      const req = createMockRequest({ body: mockRegisterRequest });
      const { res, jsonSpy } = createMockResponse();
      const next = createMockNext();

      // Mock service response
      authService.register.mockResolvedValueOnce({
        success: false,
        statusCode: StatusCodes.BAD_REQUEST,
        error: 'Email already in use',
      });

      // Call the controller method
      await controller.register(req, res, next);

      // Verify service was called
      expect(authService.register).toHaveBeenCalledWith(mockRegisterRequest);

      // Verify response
      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Email already in use',
        }),
      );
    });

    it('should return default error message if error is undefined', async () => {
      // Setup mocks
      const req = createMockRequest({ body: mockRegisterRequest });
      const { res, jsonSpy } = createMockResponse();
      const next = createMockNext();

      // Mock service response with undefined error
      authService.register.mockResolvedValueOnce({
        success: false,
        statusCode: StatusCodes.BAD_REQUEST,
        error: undefined,
      });

      // Call the controller method
      await controller.register(req, res, next);

      // Verify response shows default error message
      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Registration failed',
        }),
      );
    });

    // Using orthogonal array testing to test missing fields
    const registerFactors = {
      email: [undefined, 'test@example.com'],
      password: [undefined, 'Password123!'],
    };

    const registerTestCases = generateOrthogonalTestCases<{
      email: string | undefined;
      password: string | undefined;
    }>(registerFactors);

    registerTestCases.forEach(testCase => {
      if (!testCase.email || !testCase.password) {
        it(`should validate required fields: email=${testCase.email}, password=${testCase.password}`, async () => {
          // Setup mocks
          const req = createMockRequest({
            body: {
              email: testCase.email,
              password: testCase.password,
              firstName: 'Test',
              lastName: 'User',
            },
          });
          const { res, jsonSpy } = createMockResponse();
          const next = createMockNext();

          // Call the controller method
          await controller.register(req, res, next);

          // Should not call service if validation fails
          expect(authService.register).not.toHaveBeenCalled();

          // Should return validation error
          expect(jsonSpy).toHaveBeenCalledWith(
            expect.objectContaining({
              success: false,
              message: 'Email and password are required',
            }),
          );
        });
      }
    });

    it('should handle unexpected errors', async () => {
      // Setup mocks
      const req = createMockRequest({ body: mockRegisterRequest });
      const { res } = createMockResponse();
      const next = createMockNext();

      // Mock service to throw error
      authService.register.mockRejectedValueOnce(new Error('Unexpected error'));

      // Call the controller method
      await controller.register(req, res, next);

      // Verify next was called with error
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('login', () => {
    it('should login user successfully', async () => {
      // Setup mocks
      const req = createMockRequest({ body: mockLoginRequest });
      const { res, jsonSpy } = createMockResponse();
      const next = createMockNext();

      // Mock service response
      authService.login.mockResolvedValueOnce({
        success: true,
        data: {
          user: {
            id: 1,
            email: mockLoginRequest.email,
            role: 'user',
          },
          token: 'jwt_token',
        },
        message: 'Login successful',
      });

      // Call the controller method
      await controller.login(req, res, next);

      // Verify service was called
      expect(authService.login).toHaveBeenCalledWith(
        mockLoginRequest.email,
        mockLoginRequest.password,
      );

      // Verify response
      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            token: 'jwt_token',
          }),
          message: 'Login successful',
        }),
      );
    });

    it('should return error for invalid credentials', async () => {
      // Setup mocks
      const req = createMockRequest({ body: mockLoginRequest });
      const { res, jsonSpy } = createMockResponse();
      const next = createMockNext();

      // Mock service response
      authService.login.mockResolvedValueOnce({
        success: false,
        statusCode: StatusCodes.UNAUTHORIZED,
        error: 'Invalid credentials',
      });

      // Call the controller method
      await controller.login(req, res, next);

      // Verify service was called
      expect(authService.login).toHaveBeenCalledWith(
        mockLoginRequest.email,
        mockLoginRequest.password,
      );

      // Verify response
      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Invalid credentials',
        }),
      );
    });

    it('should return default error message if error is undefined', async () => {
      // Setup mocks
      const req = createMockRequest({ body: mockLoginRequest });
      const { res, jsonSpy } = createMockResponse();
      const next = createMockNext();

      // Mock service response with undefined error
      authService.login.mockResolvedValueOnce({
        success: false,
        statusCode: StatusCodes.UNAUTHORIZED,
        error: undefined,
      });

      // Call the controller method
      await controller.login(req, res, next);

      // Verify response shows default error message
      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Login failed',
        }),
      );
    });

    // Validate required fields using orthogonal testing
    const loginFactors = {
      email: [undefined, 'test@example.com'],
      password: [undefined, 'Password123!'],
    };

    const loginTestCases = generateOrthogonalTestCases<{
      email: string | undefined;
      password: string | undefined;
    }>(loginFactors);

    loginTestCases.forEach(testCase => {
      if (!testCase.email || !testCase.password) {
        it(`should validate required fields: email=${testCase.email}, password=${testCase.password}`, async () => {
          // Setup mocks
          const req = createMockRequest({
            body: {
              email: testCase.email,
              password: testCase.password,
            },
          });
          const { res, jsonSpy } = createMockResponse();
          const next = createMockNext();

          // Call the controller method
          await controller.login(req, res, next);

          // Should not call service if validation fails
          expect(authService.login).not.toHaveBeenCalled();

          // Should return validation error
          expect(jsonSpy).toHaveBeenCalledWith(
            expect.objectContaining({
              success: false,
              message: 'Email and password are required',
            }),
          );
        });
      }
    });

    it('should handle unexpected errors', async () => {
      // Setup mocks
      const req = createMockRequest({ body: mockLoginRequest });
      const { res } = createMockResponse();
      const next = createMockNext();

      // Mock service to throw error
      authService.login.mockRejectedValueOnce(new Error('Unexpected error'));

      // Call the controller method
      await controller.login(req, res, next);

      // Verify next was called with error
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('getCurrentUser', () => {
    it('should return current authenticated user', async () => {
      // Setup mocks with user in request
      const req = createMockRequest({}) as AuthRequest;
      req.user = mockJwtPayload;
      const { res, jsonSpy } = createMockResponse();
      const next = createMockNext();

      // Call the controller method
      await controller.getCurrentUser(req, res, next);

      // Verify response
      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: {
            userId: mockJwtPayload.userId,
            email: mockJwtPayload.email,
            role: mockJwtPayload.role,
          },
        }),
      );
    });

    it('should return error if user not authenticated', async () => {
      // Setup mocks without user in request
      const req = createMockRequest({}) as AuthRequest;
      const { res, jsonSpy } = createMockResponse();
      const next = createMockNext();

      // Call the controller method
      await controller.getCurrentUser(req, res, next);

      // Verify response
      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'User not authenticated',
        }),
      );
    });

    it('should handle unexpected errors in getCurrentUser', async () => {
      // Setup mocks with user in request
      const req = createMockRequest({}) as AuthRequest;
      req.user = mockJwtPayload;
      const { res } = createMockResponse();
      const next = createMockNext();

      // Mock a thrown error in the response handling
      vi.spyOn(res, 'json').mockImplementationOnce(() => {
        throw new Error('Unexpected error');
      });

      // Call the controller method
      await controller.getCurrentUser(req, res, next);

      // Verify next was called with error
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('refreshToken', () => {
    it('should refresh token successfully', async () => {
      // Setup mocks
      const req = createMockRequest({}) as AuthRequest;
      req.user = {
        ...mockJwtPayload,
      };
      const { res, jsonSpy } = createMockResponse();
      const next = createMockNext();

      // Mock service response
      authService.refreshToken.mockResolvedValueOnce({
        success: true,
        data: {
          token: 'new_jwt_token',
        },
        message: 'Token refreshed successfully',
      });

      // Call the controller method
      await controller.refreshToken(req, res, next);

      // Verify service was called with numeric ID
      expect(authService.refreshToken).toHaveBeenCalledWith(Number(req.user.id));

      // Verify response
      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: {
            token: 'new_jwt_token',
          },
          message: 'Token refreshed successfully',
        }),
      );
    });

    it('should return error if token refresh fails', async () => {
      // Setup mocks
      const req = createMockRequest({}) as AuthRequest;
      req.user = {
        ...mockJwtPayload,
      };
      const { res, jsonSpy } = createMockResponse();
      const next = createMockNext();

      // Mock service response
      authService.refreshToken.mockResolvedValueOnce({
        success: false,
        statusCode: StatusCodes.NOT_FOUND,
        error: 'User not found',
      });

      // Call the controller method
      await controller.refreshToken(req, res, next);

      // Verify response
      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'User not found',
        }),
      );
    });

    it('should return default error message if token refresh error is undefined', async () => {
      // Setup mocks
      const req = createMockRequest({}) as AuthRequest;
      req.user = {
        ...mockJwtPayload,
      };
      const { res, jsonSpy } = createMockResponse();
      const next = createMockNext();

      // Mock service response with undefined error
      authService.refreshToken.mockResolvedValueOnce({
        success: false,
        statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
        error: undefined,
      });

      // Call the controller method
      await controller.refreshToken(req, res, next);

      // Verify response shows default error message
      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Token refresh failed',
        }),
      );
    });

    it('should return error if user not authenticated', async () => {
      // Setup mocks without user in request
      const req = createMockRequest({}) as AuthRequest;
      const { res, jsonSpy } = createMockResponse();
      const next = createMockNext();

      // Call the controller method
      await controller.refreshToken(req, res, next);

      // Verify response
      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'User not authenticated',
        }),
      );

      // Service should not be called
      expect(authService.refreshToken).not.toHaveBeenCalled();
    });

    it('should handle unexpected errors in refreshToken', async () => {
      // Setup mocks
      const req = createMockRequest({}) as AuthRequest;
      req.user = {
        ...mockJwtPayload,
      };
      const { res } = createMockResponse();
      const next = createMockNext();

      // Mock service to throw error
      authService.refreshToken.mockRejectedValueOnce(new Error('Unexpected error'));

      // Call the controller method
      await controller.refreshToken(req, res, next);

      // Verify next was called with error
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});
