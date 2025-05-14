import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StatusCodes } from 'http-status-codes';
import {
  _ok,
  _error,
  sendSuccess,
  sendError,
  createServiceResponse,
  serviceSuccess,
  serviceError,
} from '../../src/utils/response.util';
import { createMockResponse } from './test-utils';

// Mock encryption utility
vi.mock('../../src/utils/encryption.util', () => ({
  encrypt: vi.fn(data => data),
}));

// Mock logger
vi.mock('../../src/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock env config
vi.mock('../../src/config/env.config', () => ({
  default: {
    ENCRYPTION_ENABLED: false,
  },
}));

describe('Response Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createServiceResponse', () => {
    it('should create success response', () => {
      const response = createServiceResponse(true, { id: 1 });

      expect(response).toEqual({
        success: true,
        data: { id: 1 },
        error: undefined,
        statusCode: StatusCodes.OK,
        message: 'Operation successful',
      });
    });

    it('should create error response', () => {
      const response = createServiceResponse(
        false,
        null,
        'Error occurred',
        StatusCodes.BAD_REQUEST,
      );

      expect(response).toEqual({
        success: false,
        data: null,
        error: 'Error occurred',
        statusCode: StatusCodes.BAD_REQUEST,
        message: 'Error occurred',
      });
    });
  });

  describe('serviceSuccess / _ok', () => {
    it('should create a success response with default status code', () => {
      const result = _ok({ id: 1 }, 'Success message');

      expect(result).toEqual({
        success: true,
        data: { id: 1 },
        error: null,
        message: 'Success message',
        statusCode: StatusCodes.OK,
      });
    });

    it('should create a success response with custom status code', () => {
      const result = serviceSuccess({ id: 1 }, 'Created', StatusCodes.CREATED);

      expect(result).toEqual({
        success: true,
        data: { id: 1 },
        error: null,
        message: 'Created',
        statusCode: StatusCodes.CREATED,
      });
    });

    it('should handle undefined data', () => {
      const result = _ok(undefined, 'No content', StatusCodes.NO_CONTENT);

      expect(result).toEqual({
        success: true,
        data: undefined,
        error: null,
        message: 'No content',
        statusCode: StatusCodes.NO_CONTENT,
      });
    });
  });

  describe('serviceError / _error', () => {
    it('should create an error response with default status code', () => {
      const result = _error('Error message');

      expect(result).toEqual({
        success: false,
        error: 'Error message',
        message: 'Error message',
        data: undefined,
        statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      });
    });

    it('should create an error response with custom status code', () => {
      const result = serviceError('Not found', StatusCodes.NOT_FOUND);

      expect(result).toEqual({
        success: false,
        error: 'Not found',
        message: 'Not found',
        data: undefined,
        statusCode: StatusCodes.NOT_FOUND,
      });
    });

    it('should include data if provided', () => {
      const data = { additionalInfo: 'error details' };
      const result = _error('Error with data', StatusCodes.BAD_REQUEST, data);

      expect(result).toEqual({
        success: false,
        error: 'Error with data',
        message: 'Error with data',
        data,
        statusCode: StatusCodes.BAD_REQUEST,
      });
    });
  });

  describe('sendSuccess', () => {
    it('should send a success response with data and message', () => {
      const { res, statusSpy, jsonSpy } = createMockResponse();

      sendSuccess(res, { id: 1 }, 'Success message');

      expect(statusSpy).toHaveBeenCalledWith(StatusCodes.OK);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: true,
        data: { id: 1 },
        error: null,
        message: 'Success message',
        statusCode: StatusCodes.OK,
      });
    });

    it('should send a success response with custom status code', () => {
      const { res, statusSpy, jsonSpy } = createMockResponse();

      sendSuccess(res, { id: 1 }, 'Created', StatusCodes.CREATED);

      expect(statusSpy).toHaveBeenCalledWith(StatusCodes.CREATED);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: true,
        data: { id: 1 },
        error: null,
        message: 'Created',
        statusCode: StatusCodes.CREATED,
      });
    });

    it('should handle undefined data', () => {
      const { res, statusSpy, jsonSpy } = createMockResponse();

      sendSuccess(res, undefined, 'No content', StatusCodes.NO_CONTENT);

      expect(statusSpy).toHaveBeenCalledWith(StatusCodes.NO_CONTENT);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: true,
        data: undefined,
        error: null,
        message: 'No content',
        statusCode: StatusCodes.NO_CONTENT,
      });
    });
  });

  describe('sendError', () => {
    it('should send an error response with message', () => {
      const { res, statusSpy, jsonSpy } = createMockResponse();

      sendError(res, 'Error message');

      expect(statusSpy).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        message: 'Error message',
        error: 'Error message',
        data: undefined,
        statusCode: StatusCodes.BAD_REQUEST,
      });
    });

    it('should send an error response with custom status code', () => {
      const { res, statusSpy, jsonSpy } = createMockResponse();

      sendError(res, 'Not found', StatusCodes.NOT_FOUND);

      expect(statusSpy).toHaveBeenCalledWith(StatusCodes.NOT_FOUND);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        message: 'Not found',
        error: 'Not found',
        data: undefined,
        statusCode: StatusCodes.NOT_FOUND,
      });
    });

    it('should include data if provided', () => {
      const { res, statusSpy, jsonSpy } = createMockResponse();
      const errorData = { details: 'validation failed' };

      sendError(res, 'Error with data', StatusCodes.BAD_REQUEST, errorData);

      expect(statusSpy).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        message: 'Error with data',
        error: 'Error with data',
        data: errorData,
        statusCode: StatusCodes.BAD_REQUEST,
      });
    });
  });
});
