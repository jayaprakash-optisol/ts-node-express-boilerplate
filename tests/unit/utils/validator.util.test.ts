import { formatZodError, createValidator } from '../../../src/utils/validator.util';
import { z } from 'zod';
import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { logger } from '../../../src/utils/logger';

// Mock logger to prevent actual logging
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    warn: jest.fn(),
  },
}));

describe('Validator Utilities', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockRequest = {
      path: '/test',
      method: 'GET',
      body: {},
      query: {},
      params: {},
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  describe('formatZodError', () => {
    it('should format a ZodError into a user-friendly string', () => {
      // Create a ZodError
      const schema = z.object({
        name: z.string().min(3),
        email: z.string().email(),
      });

      let zodError: z.ZodError;
      try {
        schema.parse({ name: 'a', email: 'invalid' });
      } catch (error) {
        zodError = error as z.ZodError;

        // Now format the error
        const formattedError = formatZodError(zodError);

        // Assert
        expect(formattedError).toContain('name');
        expect(formattedError).toContain('email');
      }
    });

    it('should handle nested paths in ZodError', () => {
      // Create a ZodError with nested paths
      const schema = z.object({
        user: z.object({
          name: z.string().min(3),
          address: z.object({
            street: z.string().min(5),
          }),
        }),
      });

      let zodError: z.ZodError;
      try {
        schema.parse({ user: { name: 'a', address: { street: 'abc' } } });
      } catch (error) {
        zodError = error as z.ZodError;

        // Format the error
        const formattedError = formatZodError(zodError);

        // Assert
        expect(formattedError).toContain('user.name');
        expect(formattedError).toContain('user.address.street');
      }
    });

    it('should join multiple errors with commas', () => {
      // Create a ZodError with multiple validation issues
      const schema = z.object({
        name: z.string().min(3),
        age: z.number().min(18),
        email: z.string().email(),
      });

      let zodError: z.ZodError;
      try {
        schema.parse({ name: 'a', age: 17, email: 'invalid' });
      } catch (error) {
        zodError = error as z.ZodError;

        // Format the error
        const formattedError = formatZodError(zodError);

        // Assert
        expect(formattedError.split(',').length).toBeGreaterThan(1);
        expect(formattedError).toContain('name');
        expect(formattedError).toContain('age');
        expect(formattedError).toContain('email');
      }
    });
  });

  describe('createValidator', () => {
    it('should pass validation when data is valid', () => {
      // Arrange
      const schema = z.object({
        name: z.string().min(3),
        email: z.string().email(),
      });

      mockRequest.body = {
        name: 'John Doe',
        email: 'john@example.com',
      };

      const validator = createValidator(schema);

      // Act
      validator(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should return 400 when body validation fails', () => {
      // Arrange
      const schema = z.object({
        name: z.string().min(3),
        email: z.string().email(),
      });

      mockRequest.body = {
        name: 'Jo',
        email: 'not-an-email',
      };

      const validator = createValidator(schema);

      // Act
      validator(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringContaining('Validation error'),
        }),
      );
      expect(logger.warn).toHaveBeenCalled();
    });

    it('should validate query parameters when specified', () => {
      // Arrange
      const schema = z.object({
        search: z.string().min(3).optional(),
        page: z.coerce.number().optional(),
      });

      mockRequest.query = {
        search: 'test',
        page: '1',
      };

      const validator = createValidator(schema, 'query');

      // Act
      validator(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalled();
    });

    it('should validate route parameters when specified', () => {
      // Arrange
      const schema = z.object({
        id: z.string().uuid(),
      });

      mockRequest.params = {
        id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const validator = createValidator(schema, 'params');

      // Act
      validator(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalled();
    });

    it('should include user ID in warning logs if available', () => {
      // Arrange
      const schema = z.object({
        name: z.string().min(5),
      });

      mockRequest.body = {
        name: 'test',
      };

      // Add user to request
      (mockRequest as any).user = {
        id: '123',
        email: 'test@example.com',
        role: 'user',
      };

      const validator = createValidator(schema);

      // Act
      validator(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(logger.warn).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          userId: '123',
        }),
      );
    });

    it('should pass non-ZodErrors to next middleware', () => {
      // Arrange
      const schema = z.object({
        name: z.string(),
      });

      // Mock the schema to throw a non-ZodError
      jest.spyOn(schema, 'parse').mockImplementation(() => {
        throw new Error('Some unexpected error');
      });

      mockRequest.body = {
        name: 'test',
      };

      const validator = createValidator(schema);

      // Act
      validator(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      expect(mockResponse.status).not.toHaveBeenCalled();
    });
  });
});
