import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import {
  conflictError,
  validationError,
} from '../src/errors/application-error.js';
import { errorHandler } from '../src/middleware/error-handler.js';
import { notFoundMiddleware } from '../src/middleware/not-found.js';

function createErrorFixture() {
  const fixture = express();
  fixture.use(express.json());
  fixture.get('/known', () => {
    throw conflictError('A matching resource already exists', {
      field: 'name',
    });
  });
  fixture.get('/rejected', async () => {
    throw new Error('database password and stack should stay private');
  });
  fixture.post('/body', (_request, response) =>
    response.json({ status: 'ok' }),
  );
  fixture.use(notFoundMiddleware);
  fixture.use(errorHandler);
  return fixture;
}

describe('centralized error handling', () => {
  it('returns known application errors with their safe contract', async () => {
    const response = await request(createErrorFixture()).get('/known');

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      error: {
        code: 'CONFLICT',
        message: 'A matching resource already exists',
        details: { field: 'name' },
        requestId: null,
      },
    });
  });

  it('forwards rejected async handlers to the centralized handler', async () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    try {
      const response = await request(createErrorFixture()).get('/rejected');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
          requestId: null,
        },
      });
      expect(JSON.stringify(response.body)).not.toContain('database password');
      expect(JSON.stringify(response.body)).not.toContain('Error:');
      expect(consoleError).toHaveBeenCalledOnce();
    } finally {
      consoleError.mockRestore();
    }
  });

  it('maps malformed JSON to a safe validation response', async () => {
    const response = await request(createErrorFixture())
      .post('/body')
      .set('Content-Type', 'application/json')
      .send('{"incomplete":');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request body contains malformed JSON',
        requestId: null,
      },
    });
  });

  it('supports safe validation details without exposing raw errors', async () => {
    const fixture = express();
    fixture.get('/validation', () => {
      throw validationError(undefined, [
        { path: ['name'], message: 'Required' },
      ]);
    });
    fixture.use(errorHandler);

    const response = await request(fixture).get('/validation');

    expect(response.status).toBe(400);
    expect(response.body.error).toEqual({
      code: 'VALIDATION_ERROR',
      message: 'Request validation failed',
      details: [{ path: ['name'], message: 'Required' }],
      requestId: null,
    });
  });
});
