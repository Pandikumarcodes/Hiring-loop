import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { errorHandler } from '../../../src/middleware/error-handler.js';
import {
  createCsrfToken,
  createRequireCsrf,
  isValidCsrfToken,
} from '../../../src/middleware/csrf.js';
import { createOriginValidationMiddleware } from '../../../src/middleware/origin-validation.js';
import { createAuthRouter } from '../../../src/modules/auth/routes/auth-routes.js';

const origin = 'https://frontend.example.test';
const secret = 'controlled-test-csrf-secret';
const sessionId = 'session-1';

function appFixture() {
  const app = express();
  const authenticate = (request, _response, next) => {
    request.auth = { sessionId, userId: 'user-1', user: { id: 'user-1' } };
    next();
  };
  app.use(express.json());
  app.use(createOriginValidationMiddleware({ allowedOrigin: origin }));
  app.use(
    '/api/v1/auth',
    createAuthRouter({
      registerUser: vi.fn(async () => ({ status: 'accepted' })),
      loginUser: vi.fn(async () => ({
        user: {},
        rawSessionSecret: 'raw',
        expiresAt: new Date(),
      })),
      authenticateSession: authenticate,
      requireCsrf: createRequireCsrf({ secret }),
      createCsrfToken: ({ sessionId: id }) =>
        createCsrfToken({ secret, sessionId: id }),
      serializeSessionCookie: vi.fn(() => 'session=raw'),
      clearSessionCookie: vi.fn(() => 'session=; Max-Age=0'),
      logoutSession: vi.fn(async () => {}),
    }),
  );
  app.use(errorHandler);
  return app;
}

describe('Phase 05J CORS and CSRF primitives', () => {
  it('creates an opaque, session-specific HMAC token and verifies it safely', () => {
    const token = createCsrfToken({ secret, sessionId });
    expect(token).toMatch(/^v1\.[A-Za-z0-9_-]+$/);
    expect(token).not.toContain(secret);
    expect(token).not.toContain(sessionId);
    expect(isValidCsrfToken({ token, secret, sessionId })).toBe(true);
    expect(isValidCsrfToken({ token, secret, sessionId: 'session-2' })).toBe(
      false,
    );
    expect(isValidCsrfToken({ token: `${token}x`, secret, sessionId })).toBe(
      false,
    );
  });

  it('serves csrf bootstrap only after authentication and does not require a header', async () => {
    const app = appFixture();
    const response = await request(app).get('/api/v1/auth/csrf');
    expect(response.status).toBe(200);
    expect(response.body.data.csrfToken).toMatch(/^v1\./);
  });

  it('requires exact Origin on unsafe requests and permits configured missing-origin mode', async () => {
    const app = appFixture();
    const wrong = await request(app)
      .post('/api/v1/auth/login')
      .set('Origin', 'https://attacker.example.test')
      .send({ email: 'x@example.test', password: 'password' });
    expect(wrong.status).toBe(403);
    expect(wrong.body.error.code).toBe('FORBIDDEN');

    const allowed = await request(app)
      .post('/api/v1/auth/login')
      .set('Origin', origin)
      .send({ email: 'x@example.test', password: 'password' });
    expect(allowed.status).toBe(200);
    const missing = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'x@example.test', password: 'password' });
    expect(missing.status).toBe(200);
  });

  it('requires the session-bound token on authenticated unsafe mutations', async () => {
    const app = appFixture();
    const token = createCsrfToken({ secret, sessionId });
    const missing = await request(app)
      .post('/api/v1/auth/logout')
      .set('Origin', origin);
    expect(missing.status).toBe(403);
    expect(missing.body.error.code).toBe('CSRF_INVALID');

    const success = await request(app)
      .post('/api/v1/auth/logout')
      .set('Origin', origin)
      .set('X-CSRF-Token', token);
    expect(success.status).toBe(204);
  });
});
