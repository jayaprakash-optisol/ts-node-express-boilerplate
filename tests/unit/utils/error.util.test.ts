import {
  AppError,
  createServiceResponse,
  createBadRequestError,
  createNotFoundError,
  createUnauthorizedError,
  createForbiddenError,
  createInternalServerError,
  formatZodError,
} from '../../../src/utils/error.util';
import { StatusCodes } from 'http-status-codes';
import { ZodError, z } from 'zod';

describe('Error Utilities', () => {
  describe('AppError', () => {
    it('should create an error with the correct properties', () => {
      // Act
      const error = new AppError('Test error', 400, true);

      // Assert
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(400);
      expect(error.isOperational).toBe(true);
    });

    it('should set isOperational to true by default', () => {
      // Act
      const error = new AppError('Test error', 400);

      // Assert
      expect(error.isOperational).toBe(true);
    });

    it('should capture stack trace', () => {
      // Act
      const error = new AppError('Test error', 400);

      // Assert
      expect(error.stack).toBeDefined();
    });
  });

  describe('createServiceResponse', () => {
    it('should create a success response with data', () => {
      // Act
      const result = createServiceResponse(true, { id: 1 });

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ id: 1 });
      expect(result.statusCode).toBe(StatusCodes.OK);
      expect(result.message).toBe('Operation successful');
    });

    it('should create an error response with custom error message', () => {
      // Act
      const result = createServiceResponse(false, null, 'Error message', StatusCodes.BAD_REQUEST);

      // Assert
      expect(result.success).toBe(false);
      expect(result.data).toBeNull();
      expect(result.error).toBe('Error message');
      expect(result.statusCode).toBe(StatusCodes.BAD_REQUEST);
      expect(result.message).toBe('Error message');
    });

    it('should use default status code if not provided', () => {
      // Act
      const result = createServiceResponse(true, { id: 1 });

      // Assert
      expect(result.statusCode).toBe(StatusCodes.OK);
    });

    it('should use default failure message when error is not provided', () => {
      // Act
      const result = createServiceResponse(false, null);

      // Assert
      expect(result.message).toBe('Operation failed');
    });
  });

  describe('formatZodError', () => {
    it('should format a ZodError into a readable string', () => {
      // Create a Zod error
      const schema = z.object({
        name: z.string().min(3),
        email: z.string().email(),
      });

      try {
        schema.parse({ name: 'a', email: 'not-an-email' });
        fail('Should have thrown a ZodError');
      } catch (error) {
        // Act
        const formatted = formatZodError(error as ZodError);

        // Assert
        expect(formatted).toContain('name');
        expect(formatted).toContain('email');
        expect(formatted.split(',').length).toBe(2);
      }
    });

    it('should handle nested paths in errors', () => {
      // Create a Zod error with nested paths
      const schema = z.object({
        user: z.object({
          name: z.string().min(3),
          contact: z.object({
            email: z.string().email(),
          }),
        }),
      });

      try {
        schema.parse({
          user: {
            name: 'a',
            contact: {
              email: 'not-an-email',
            },
          },
        });
        fail('Should have thrown a ZodError');
      } catch (error) {
        // Act
        const formatted = formatZodError(error as ZodError);

        // Assert
        expect(formatted).toContain('user.name');
        expect(formatted).toContain('user.contact.email');
      }
    });

    it('should handle array paths in errors', () => {
      // Create a Zod error with array paths
      const schema = z.object({
        users: z.array(
          z.object({
            name: z.string().min(3),
            email: z.string().email(),
          }),
        ),
      });

      try {
        schema.parse({
          users: [
            { name: 'a', email: 'not-an-email' },
            { name: 'valid', email: 'invalid' },
          ],
        });
        fail('Should have thrown a ZodError');
      } catch (error) {
        // Act
        const formatted = formatZodError(error as ZodError);

        // Assert
        expect(formatted).toContain('users.0.name');
        expect(formatted).toContain('users.0.email');
        expect(formatted).toContain('users.1.email');
      }
    });
  });

  describe('createBadRequestError', () => {
    it('should create a BadRequestError with message', () => {
      // Act
      const error = createBadRequestError('Invalid input');

      // Assert
      expect(error.message).toBe('Invalid input');
      expect(error.statusCode).toBe(StatusCodes.BAD_REQUEST);
      expect(error.isOperational).toBe(true);
    });
  });

  describe('createNotFoundError', () => {
    it('should create a NotFoundError with message', () => {
      // Act
      const error = createNotFoundError('Resource not found');

      // Assert
      expect(error.message).toBe('Resource not found');
      expect(error.statusCode).toBe(StatusCodes.NOT_FOUND);
      expect(error.isOperational).toBe(true);
    });

    it('should use default message if not provided', () => {
      // Act
      const error = createNotFoundError();

      // Assert
      expect(error.message).toBe('Resource not found');
      expect(error.statusCode).toBe(StatusCodes.NOT_FOUND);
    });
  });

  describe('createUnauthorizedError', () => {
    it('should create an UnauthorizedError with message', () => {
      // Act
      const error = createUnauthorizedError('Unauthorized access');

      // Assert
      expect(error.message).toBe('Unauthorized access');
      expect(error.statusCode).toBe(StatusCodes.UNAUTHORIZED);
      expect(error.isOperational).toBe(true);
    });

    it('should use default message if not provided', () => {
      // Act
      const error = createUnauthorizedError();

      // Assert
      expect(error.message).toBe('Unauthorized');
      expect(error.statusCode).toBe(StatusCodes.UNAUTHORIZED);
    });
  });

  describe('createForbiddenError', () => {
    it('should create a ForbiddenError with message', () => {
      // Act
      const error = createForbiddenError('Access forbidden');

      // Assert
      expect(error.message).toBe('Access forbidden');
      expect(error.statusCode).toBe(StatusCodes.FORBIDDEN);
      expect(error.isOperational).toBe(true);
    });

    it('should use default message if not provided', () => {
      // Act
      const error = createForbiddenError();

      // Assert
      expect(error.message).toBe('Forbidden');
      expect(error.statusCode).toBe(StatusCodes.FORBIDDEN);
    });
  });

  describe('createInternalServerError', () => {
    it('should create an InternalServerError with message', () => {
      // Act
      const error = createInternalServerError('Server error');

      // Assert
      expect(error.message).toBe('Server error');
      expect(error.statusCode).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
      expect(error.isOperational).toBe(false); // non-operational error
    });

    it('should use default message if not provided', () => {
      // Act
      const error = createInternalServerError();

      // Assert
      expect(error.message).toBe('Internal server error');
      expect(error.statusCode).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
      expect(error.isOperational).toBe(false);
    });
  });
});
