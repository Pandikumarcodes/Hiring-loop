import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import app from '../src/app.js';
import { errorHandler } from '../src/middleware/error-handler.js';
import { requestCorrelationMiddleware } from '../src/middleware/request-correlation.js';
import { validateRequest } from '../src/middleware/validate-request.js';
import { z } from 'zod';
import express from 'express';

function createValidationFixture() {
  const fixture = express();
  fixture.use(requestCorrelationMiddleware);
  fixture.use(express.json());
  fixture.post(
    '/validated',
    validateRequest({ body: z.object({ name: z.string().min(1) }) }),
    (_request, response) => response.json({ status: 'ok' }),
  );
  fixture.use(errorHandler);
  return fixture;
}

describe('request correlation', () => {
  it('returns a server-generated request ID on successful health responses', async () => {
    const response = await request(app).get('/health');
    const requestId = response.headers['x-request-id'];

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
    expect(requestId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('generates unique IDs for separate requests', async () => {
    const first = await request(app).get('/health');
    const second = await request(app).get('/health');

    expect(first.headers['x-request-id']).not.toBe(
      second.headers['x-request-id'],
    );
  });

  it('correlates not-found response headers and bodies', async () => {
    const response = await request(app).get('/api/v1/unknown');

    expect(response.status).toBe(404);
    expect(response.headers['x-request-id']).toBe(
      response.body.error.requestId,
    );
  });

  it('correlates validation errors', async () => {
    const response = await request(createValidationFixture())
      .post('/validated')
      .send({ name: '' });

    expect(response.status).toBe(400);
    expect(response.headers['x-request-id']).toBe(
      response.body.error.requestId,
    );
  });

  it('correlates malformed JSON before parsing completes', async () => {
    const response = await request(app)
      .post('/api/v1')
      .set('Content-Type', 'application/json')
      .send('{"incomplete":');

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.headers['x-request-id']).toBe(
      response.body.error.requestId,
    );
  });

  it('rejects an oversized JSON body with a safe correlated error', async () => {
    const response = await request(app)
      .post('/api/v1')
      .set('Content-Type', 'application/json')
      .send({ value: 'x'.repeat(100 * 1024) });

    expect(response.status).toBe(413);
    expect(response.body).toEqual({
      error: {
        code: 'PAYLOAD_TOO_LARGE',
        message: 'Request body is too large',
        requestId: response.headers['x-request-id'],
      },
    });
  });

  it('does not adopt a client-provided request ID', async () => {
    const response = await request(app)
      .get('/health')
      .set('X-Request-Id', 'client-controlled-id');

    expect(response.headers['x-request-id']).not.toBe('client-controlled-id');
    expect(response.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('correlates unexpected async errors and logs only safe context', async () => {
    const fixture = express();
    fixture.use(requestCorrelationMiddleware);
    fixture.get('/rejected', async () => {
      throw new Error('secret request details');
    });
    fixture.use(errorHandler);
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    try {
      const response = await request(fixture).get('/rejected');

      expect(response.status).toBe(500);
      expect(response.body.error.code).toBe('INTERNAL_ERROR');
      expect(response.headers['x-request-id']).toBe(
        response.body.error.requestId,
      );
      expect(JSON.stringify(response.body)).not.toContain(
        'secret request details',
      );
      expect(consoleError).toHaveBeenCalledWith('Unhandled request error', {
        name: 'Error',
        requestId: response.headers['x-request-id'],
      });
    } finally {
      consoleError.mockRestore();
    }
  });
});
