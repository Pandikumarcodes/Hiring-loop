import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { errorHandler } from '../../../src/middleware/error-handler.js';
import { createAuthenticateSession } from '../../../src/middleware/authenticate-session.js';
import { createAuthRouter } from '../../../src/modules/auth/routes/auth-routes.js';
import { createSessionCookieClearer } from '../../../src/modules/auth/http/session-cookie.js';

const cookieName = 'hiringloop_session';
const cookieConfig = {
  cookieName,
  cookieSecure: false,
  cookieSameSite: 'lax',
};

function identity({
  expiresAt = new Date('2026-09-10T00:00:00.000Z'),
  revokedAt = null,
} = {}) {
  return {
    id: 'session-1',
    userId: 'user-1',
    expiresAt,
    revokedAt,
    user: {
      id: 'user-1',
      email: 'user@example.com',
      emailVerifiedAt: null,
    },
  };
}

function fixture(session = identity()) {
  const repository = {
    findSessionIdentityByHash: vi.fn(async () => session),
  };
  const clearSessionCookie = createSessionCookieClearer(cookieConfig);
  const authenticateSession = createAuthenticateSession({
    authRepository: repository,
    authSecretHasher: { hash: vi.fn((secret) => `hash:${secret}`) },
    cookieName,
    clearSessionCookie,
    clock: () => new Date('2026-09-02T00:00:00.000Z'),
  });
  return { repository, authenticateSession };
}

function appFor(authenticateSession) {
  const app = express();
  app.use(express.json());
  app.use(
    '/api/v1/auth',
    createAuthRouter({
      registerUser: vi.fn(),
      verifyEmail: vi.fn(),
      resendVerification: vi.fn(),
      loginUser: vi.fn(),
      serializeSessionCookie: vi.fn(),
      authenticateSession,
    }),
  );
  app.use(errorHandler);
  return app;
}

describe('required opaque-session authentication', () => {
  it('hashes the raw cookie, establishes narrow auth context, and serves /me', async () => {
    const deps = fixture();
    const response = await request(appFor(deps.authenticateSession))
      .get('/api/v1/auth/me')
      .set('Cookie', `${cookieName}=raw-secret`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      data: {
        user: { id: 'user-1', email: 'user@example.com', emailVerified: false },
      },
    });
    expect(deps.repository.findSessionIdentityByHash).toHaveBeenCalledWith(
      'hash:raw-secret',
    );
    expect(response.text).not.toContain('raw-secret');
    expect(response.text).not.toContain('session-1');
  });

  it('maps verified users and does not load tenant data', async () => {
    const deps = fixture({
      ...identity(),
      user: { ...identity().user, emailVerifiedAt: new Date() },
    });
    const response = await request(appFor(deps.authenticateSession))
      .get('/api/v1/auth/me')
      .set('Cookie', `${cookieName}=secret`);

    expect(response.body.data.user.emailVerified).toBe(true);
    expect(deps.repository.findSessionIdentityByHash).toHaveBeenCalledTimes(1);
    expect(deps.repository).not.toHaveProperty('findMemberships');
  });

  it.each([
    ['missing cookie', undefined, false],
    ['unknown secret', null, true],
    [
      'expired session',
      identity({ expiresAt: new Date('2026-09-02T00:00:00.000Z') }),
      true,
    ],
    ['revoked session', identity({ revokedAt: new Date() }), true],
  ])(
    '%s returns generic 401 and never authenticates',
    async (_name, session, hasCookie) => {
      const deps = fixture(session);
      const response = await request(appFor(deps.authenticateSession))
        .get('/api/v1/auth/me')
        .set(
          ...(hasCookie ? ['Cookie', `${cookieName}=secret`] : ['X-Test', '1']),
        );

      expect(response.status).toBe(401);
      expect(response.body.error).toMatchObject({
        code: 'UNAUTHENTICATED',
        message: 'Authentication is required.',
      });
      if (!hasCookie)
        expect(
          deps.repository.findSessionIdentityByHash,
        ).not.toHaveBeenCalled();
      if (hasCookie)
        expect(response.headers['set-cookie'][0]).toContain('Max-Age=0');
    },
  );

  it('fails safely for an empty cookie and keeps infrastructure failures as 500', async () => {
    const deps = fixture();
    const empty = await request(appFor(deps.authenticateSession))
      .get('/api/v1/auth/me')
      .set('Cookie', `${cookieName}=`);
    expect(empty.status).toBe(401);
    expect(deps.repository.findSessionIdentityByHash).not.toHaveBeenCalled();

    const failing = fixture();
    failing.repository.findSessionIdentityByHash.mockRejectedValue(
      new Error('database down'),
    );
    const failed = await request(appFor(failing.authenticateSession))
      .get('/api/v1/auth/me')
      .set('Cookie', `${cookieName}=secret`);
    expect(failed.status).toBe(500);
    expect(failed.body.error.code).toBe('INTERNAL_ERROR');
  });
});
