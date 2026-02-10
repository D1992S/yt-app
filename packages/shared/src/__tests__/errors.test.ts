import { describe, it, expect } from 'vitest';
import { AppError } from '../errors';

describe('AppError', () => {
  describe('constructor', () => {
    it('sets code, message, and defaults for isRetryable and details', () => {
      const error = new AppError('NETWORK_ERROR', 'Connection failed');
      expect(error.code).toBe('NETWORK_ERROR');
      expect(error.message).toBe('Connection failed');
      expect(error.isRetryable).toBe(false);
      expect(error.details).toBeUndefined();
    });

    it('sets isRetryable to true when explicitly provided', () => {
      const error = new AppError('NETWORK_ERROR', 'Connection failed', true);
      expect(error.isRetryable).toBe(true);
    });

    it('stores additional details', () => {
      const details = { endpoint: '/api/data', statusCode: 500 };
      const error = new AppError('UNKNOWN_ERROR', 'Server error', false, details);
      expect(error.details).toEqual(details);
    });

    it('sets the name property to "AppError"', () => {
      const error = new AppError('AUTH_ERROR', 'Unauthorized');
      expect(error.name).toBe('AppError');
    });

    it('is an instance of Error', () => {
      const error = new AppError('VALIDATION_ERROR', 'Invalid input');
      expect(error).toBeInstanceOf(Error);
    });

    it('is an instance of AppError', () => {
      const error = new AppError('VALIDATION_ERROR', 'Invalid input');
      expect(error).toBeInstanceOf(AppError);
    });

    it('supports all error codes', () => {
      const codes = [
        'UNKNOWN_ERROR',
        'NETWORK_ERROR',
        'AUTH_ERROR',
        'QUOTA_EXCEEDED',
        'DB_LOCKED',
        'VALIDATION_ERROR',
        'NOT_FOUND',
        'SYNC_FAILED',
      ] as const;

      for (const code of codes) {
        const error = new AppError(code, `Error: ${code}`);
        expect(error.code).toBe(code);
      }
    });
  });

  describe('static from()', () => {
    it('returns the same AppError if already an AppError', () => {
      const original = new AppError('AUTH_ERROR', 'Token expired', false);
      const result = AppError.from(original);
      expect(result).toBe(original);
    });

    it('maps fetch-related errors to NETWORK_ERROR', () => {
      const error = new Error('fetch failed: ECONNRESET');
      const result = AppError.from(error);
      expect(result.code).toBe('NETWORK_ERROR');
      expect(result.isRetryable).toBe(true);
    });

    it('maps "network" keyword to NETWORK_ERROR', () => {
      const error = new Error('network timeout');
      const result = AppError.from(error);
      expect(result.code).toBe('NETWORK_ERROR');
      expect(result.isRetryable).toBe(true);
    });

    it('maps ECONNREFUSED to NETWORK_ERROR', () => {
      const error = new Error('connect ECONNREFUSED 127.0.0.1:3000');
      const result = AppError.from(error);
      expect(result.code).toBe('NETWORK_ERROR');
      expect(result.isRetryable).toBe(true);
    });

    it('maps 401 status errors to AUTH_ERROR', () => {
      const error = new Error('Request failed with status 401');
      const result = AppError.from(error);
      expect(result.code).toBe('AUTH_ERROR');
      expect(result.isRetryable).toBe(false);
    });

    it('maps "auth" keyword to AUTH_ERROR', () => {
      const error = new Error('auth credentials invalid');
      const result = AppError.from(error);
      expect(result.code).toBe('AUTH_ERROR');
      expect(result.isRetryable).toBe(false);
    });

    it('maps "token" keyword to AUTH_ERROR', () => {
      const error = new Error('token has expired');
      const result = AppError.from(error);
      expect(result.code).toBe('AUTH_ERROR');
      expect(result.isRetryable).toBe(false);
    });

    it('maps 429 status errors to QUOTA_EXCEEDED', () => {
      const error = new Error('HTTP 429 Too Many Requests');
      const result = AppError.from(error);
      expect(result.code).toBe('QUOTA_EXCEEDED');
      expect(result.isRetryable).toBe(true);
    });

    it('maps "quota" keyword to QUOTA_EXCEEDED', () => {
      const error = new Error('API quota limit reached');
      const result = AppError.from(error);
      expect(result.code).toBe('QUOTA_EXCEEDED');
      expect(result.isRetryable).toBe(true);
    });

    it('maps "locked" keyword to DB_LOCKED', () => {
      const error = new Error('database is locked');
      const result = AppError.from(error);
      expect(result.code).toBe('DB_LOCKED');
      expect(result.isRetryable).toBe(true);
    });

    it('maps "busy" keyword to DB_LOCKED', () => {
      const error = new Error('database is busy');
      const result = AppError.from(error);
      expect(result.code).toBe('DB_LOCKED');
      expect(result.isRetryable).toBe(true);
    });

    it('maps "validation" keyword to VALIDATION_ERROR', () => {
      const error = new Error('validation failed for field "email"');
      const result = AppError.from(error);
      expect(result.code).toBe('VALIDATION_ERROR');
      expect(result.isRetryable).toBe(false);
    });

    it('maps "parse" keyword to VALIDATION_ERROR', () => {
      const error = new Error('failed to parse JSON response');
      const result = AppError.from(error);
      expect(result.code).toBe('VALIDATION_ERROR');
      expect(result.isRetryable).toBe(false);
    });

    it('maps unrecognized errors to UNKNOWN_ERROR', () => {
      const error = new Error('something completely unexpected');
      const result = AppError.from(error);
      expect(result.code).toBe('UNKNOWN_ERROR');
      expect(result.isRetryable).toBe(false);
      expect(result.message).toBe('something completely unexpected');
    });

    it('uses a default message when the error has no message', () => {
      const error = { message: undefined };
      const result = AppError.from(error);
      expect(result.message).toBe('An unexpected error occurred');
      expect(result.code).toBe('UNKNOWN_ERROR');
    });

    it('stores the original error message in details for mapped errors', () => {
      const error = new Error('fetch timed out');
      const result = AppError.from(error);
      expect(result.details).toBe('fetch timed out');
    });

    it('stores the original error object in details for unknown errors', () => {
      const error = new Error('something weird');
      const result = AppError.from(error);
      expect(result.details).toBe(error);
    });
  });

  describe('toJSON()', () => {
    it('returns an object with code, message, isRetryable, and details', () => {
      const error = new AppError('QUOTA_EXCEEDED', 'Rate limited', true, { retryAfter: 60 });
      const json = error.toJSON();

      expect(json).toEqual({
        code: 'QUOTA_EXCEEDED',
        message: 'Rate limited',
        isRetryable: true,
        details: { retryAfter: 60 },
      });
    });

    it('returns undefined details when none are provided', () => {
      const error = new AppError('NOT_FOUND', 'Resource not found');
      const json = error.toJSON();

      expect(json.code).toBe('NOT_FOUND');
      expect(json.message).toBe('Resource not found');
      expect(json.isRetryable).toBe(false);
      expect(json.details).toBeUndefined();
    });

    it('produces a JSON-serializable object', () => {
      const error = new AppError('SYNC_FAILED', 'Sync error', true, { attempt: 3 });
      const serialized = JSON.stringify(error.toJSON());
      const parsed = JSON.parse(serialized);

      expect(parsed.code).toBe('SYNC_FAILED');
      expect(parsed.message).toBe('Sync error');
      expect(parsed.isRetryable).toBe(true);
      expect(parsed.details).toEqual({ attempt: 3 });
    });

    it('does not include the stack trace', () => {
      const error = new AppError('UNKNOWN_ERROR', 'Oops');
      const json = error.toJSON();
      expect(json).not.toHaveProperty('stack');
    });

    it('does not include the name property', () => {
      const error = new AppError('UNKNOWN_ERROR', 'Oops');
      const json = error.toJSON();
      expect(json).not.toHaveProperty('name');
    });
  });
});
