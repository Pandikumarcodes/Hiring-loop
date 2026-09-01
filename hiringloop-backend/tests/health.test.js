import request from 'supertest';
import { describe, expect, it } from 'vitest';

import app from '../src/app.js';

describe('GET /health', () => {
  it('returns a healthy application status', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });
});

describe('API v1 route composition', () => {
  it('mounts the empty product API namespace without adding an endpoint', async () => {
    const response = await request(app).get('/api/v1');

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });

  it('does not resolve an unknown path as the health endpoint', async () => {
    const response = await request(app).get('/not-a-real-route');

    expect(response.status).toBe(404);
    expect(response.body.error).toEqual({
      code: 'NOT_FOUND',
      message: 'Route not found',
      requestId: response.headers['x-request-id'],
    });
  });

  it('returns the same structured error for an unknown versioned path', async () => {
    const response = await request(app).get('/api/v1/does-not-exist');

    expect(response.status).toBe(404);
    expect(response.body.error).toEqual({
      code: 'NOT_FOUND',
      message: 'Route not found',
      requestId: response.headers['x-request-id'],
    });
  });
});
