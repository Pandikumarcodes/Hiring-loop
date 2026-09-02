import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { errorHandler } from '../../src/middleware/error-handler.js';
import { requestCorrelationMiddleware } from '../../src/middleware/request-correlation.js';
import {
  AUTH_RATE_LIMIT_POLICIES,
  createAuthRateLimiters,
} from '../../src/middleware/rate-limit.js';
import { createAuthRouter } from '../../src/modules/auth/routes/auth-routes.js';

function testLimiters(limit = 1) {
  return createAuthRateLimiters({
    policyOverrides: Object.fromEntries(
      Object.keys(AUTH_RATE_LIMIT_POLICIES).map((name) => [
        name,
        { limit, windowMs: 60_000 },
      ]),
    ),
  });
}

function makeApp() {
  const calls = {
    register: vi.fn(async () => ({ status: 'accepted' })),
    resend: vi.fn(async () => ({ status: 'accepted' })),
    forgot: vi.fn(async () => ({ status: 'accepted' })),
    reset: vi.fn(async () => ({ status: 'reset' })),
    login: vi.fn(async () => ({
      rawSessionSecret: 'raw-session-secret',
      expiresAt: new Date('2026-09-09T00:00:00.000Z'),
      user: { id: 'user-1', email: 'user@example.com', emailVerified: true },
    })),
    googleStart: vi.fn(async () => ({
      url: 'https://accounts.google.com/auth',
      cookieValue: 'transaction-cookie',
    })),
    googleCallback: vi.fn(async () => ({
      providerSubject: 'google-sub',
      email: 'user@example.com',
      emailVerified: true,
    })),
    googleLogin: vi.fn(async () => ({
      rawSessionSecret: 'google-session-secret',
      expiresAt: new Date('2026-09-09T00:00:00.000Z'),
    })),
  };
  const app = express();
  app.set('trust proxy', false);
  app.use(requestCorrelationMiddleware);
  app.use(express.json());
  app.use(
    '/api/v1/auth',
    createAuthRouter({
      registerUser: calls.register,
      verifyEmail: vi.fn(async () => ({ status: 'verified' })),
      resendVerification: calls.resend,
      loginUser: calls.login,
      forgotPassword: calls.forgot,
      resetPassword: calls.reset,
      serializeSessionCookie: vi.fn(() => 'session=opaque; Path=/'),
      googleOidcProvider: {
        start: calls.googleStart,
        callback: calls.googleCallback,
      },
      loginWithGoogle: calls.googleLogin,
      googleRedirectUri: 'http://backend.test/api/v1/auth/google/callback',
      frontendOrigin: 'https://frontend.test',
      serializeGoogleTransactionCookie: vi.fn(() => 'transaction=opaque'),
      clearGoogleTransactionCookie: vi.fn(() => 'transaction=; Max-Age=0'),
      rateLimiters: testLimiters(),
    }),
  );
  app.use(errorHandler);
  return { app, calls };
}

describe('Phase 05K authentication rate limiting', () => {
  it('freezes the initial endpoint policies', () => {
    expect(AUTH_RATE_LIMIT_POLICIES).toEqual({
      login: { limit: 10, windowMs: 900_000 },
      register: { limit: 5, windowMs: 3_600_000 },
      verificationResend: { limit: 5, windowMs: 3_600_000 },
      forgotPassword: { limit: 5, windowMs: 3_600_000 },
      resetPassword: { limit: 10, windowMs: 900_000 },
      googleStart: { limit: 20, windowMs: 900_000 },
      googleCallback: { limit: 30, windowMs: 900_000 },
      passwordChange: { limit: 10, windowMs: 900_000 },
    });
  });

  it.each([
    [
      'register',
      '/register',
      { email: 'one@example.com', password: '123456789012' },
      'register',
    ],
    ['resend', '/verification/resend', { email: 'one@example.com' }, 'resend'],
    ['forgot', '/password/forgot', { email: 'one@example.com' }, 'forgot'],
    [
      'reset',
      '/password/reset',
      { token: 'opaque-reset-token', newPassword: '123456789012' },
      'reset',
    ],
    [
      'login',
      '/login',
      { email: 'one@example.com', password: 'wrong' },
      'login',
    ],
  ])(
    'allows the first %s request and returns structured 429 above threshold',
    async (_name, path, body, call) => {
      const { app, calls } = makeApp();
      const first = await request(app).post(`/api/v1/auth${path}`).send(body);
      const second = await request(app).post(`/api/v1/auth${path}`).send(body);

      expect(first.status).not.toBe(429);
      expect(second.status).toBe(429);
      expect(second.body).toEqual({
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many requests. Please try again later.',
          requestId: expect.any(String),
        },
      });
      expect(second.headers['ratelimit']).toBeTruthy();
      expect(second.headers['retry-after']).toBeTruthy();
      expect(calls[call]).toHaveBeenCalledTimes(1);
      expect(second.text).not.toContain('one@example.com');
      expect(second.text).not.toContain('opaque-reset-token');
    },
  );

  it('uses one shared IP counter even when an untrusted X-Forwarded-For changes', async () => {
    const { app, calls } = makeApp();
    const first = await request(app)
      .post('/api/v1/auth/register')
      .set('X-Forwarded-For', '203.0.113.10')
      .send({ email: 'one@example.com', password: '123456789012' });
    const second = await request(app)
      .post('/api/v1/auth/register')
      .set('X-Forwarded-For', '203.0.113.11')
      .send({ email: 'two@example.com', password: '123456789012' });

    expect(first.status).toBe(202);
    expect(second.status).toBe(429);
    expect(calls.register).toHaveBeenCalledTimes(1);
  });

  it('falls back safely to IP when the email field is unavailable', async () => {
    const { app } = makeApp();
    const response = await request(app)
      .post('/api/v1/auth/password/forgot')
      .send({ email: null });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rate-limits Google start/callback before provider or OIDC work', async () => {
    const { app, calls } = makeApp();
    const start = await request(app).get('/api/v1/auth/google/start');
    const blockedStart = await request(app).get('/api/v1/auth/google/start');
    const callback = await request(app).get(
      '/api/v1/auth/google/callback?code=opaque-code&state=opaque-state',
    );
    const blockedCallback = await request(app).get(
      '/api/v1/auth/google/callback?code=opaque-code&state=opaque-state',
    );

    expect(start.status).toBe(302);
    expect(blockedStart.status).toBe(429);
    expect(callback.status).toBe(302);
    expect(blockedCallback.status).toBe(429);
    expect(calls.googleStart).toHaveBeenCalledTimes(1);
    expect(calls.googleCallback).toHaveBeenCalledTimes(1);
    expect(blockedCallback.text).not.toContain('opaque-code');
    expect(blockedCallback.text).not.toContain('opaque-state');
  });
});
