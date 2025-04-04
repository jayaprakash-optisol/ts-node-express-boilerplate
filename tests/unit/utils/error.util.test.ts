import {
  createServiceResponse,
  createBadRequestError,
  createNotFoundError,
  createUnauthorizedError,
  createForbiddenError,
  createInternalServerError,
} from '../../../src/utils/error.util';
import { StatusCodes } from 'http-status-codes';

describe('Error Utilities', () => {
  describe('createServiceResponse', () => {
    it('should create a success response with data', () => {
      // Act
      const result = createServiceResponse(true, { id: 1 });

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ id: 1 });
      expect(result.statusCode).toBe(StatusCodes.OK);
    });

    it('should create an error response', () => {
      // Act
      const result = createServiceResponse(false, null, 'Error message', StatusCodes.BAD_REQUEST);

      // Assert
      expect(result.success).toBe(false);
      expect(result.data).toBeNull();
      expect(result.error).toBe('Error message');
      expect(result.statusCode).toBe(StatusCodes.BAD_REQUEST);
    });

    it('should use default status code if not provided', () => {
      // Act
      const result = createServiceResponse(true, { id: 1 });

      // Assert
      expect(result.statusCode).toBe(StatusCodes.OK);
    });
  });

  describe('createBadRequestError', () => {
    it('should create a BadRequestError with message', () => {
      // Act
      const error = createBadRequestError('Invalid input');

      // Assert
      expect(error.message).toBe('Invalid input');
      expect(error.statusCode).toBe(StatusCodes.BAD_REQUEST);
    });
  });

  describe('createNotFoundError', () => {
    it('should create a NotFoundError with message', () => {
      // Act
      const error = createNotFoundError('Resource not found');

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
    });
  });

  describe('createForbiddenError', () => {
    it('should create a ForbiddenError with message', () => {
      // Act
      const error = createForbiddenError('Access forbidden');

      // Assert
      expect(error.message).toBe('Access forbidden');
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
    });

    it('should use default message if not provided', () => {
      // Act
      const error = createInternalServerError();

      // Assert
      expect(error.message).toMatch(/internal server error/i);
      expect(error.statusCode).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
    });
  });
});
