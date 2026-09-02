import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { errorHandler } from '../../../src/middleware/error-handler.js';
import { createAuthenticateSession } from '../../../src/middleware/authenticate-session.js';
import { createAuthRouter } from '../../../src/modules/auth/routes/auth-routes.js';
import { createSessionCookieClearer } from '../../../src/modules/auth/http/session-cookie.js';
import {
  createLogoutSession,
  createRevokeAllSessions,
} from '../../../src/modules/auth/use-cases/logout-session.js';

const cookieName = 'hiringloop_session';
const cookieConfig = {
  cookieName,
  cookieSecure: false,
  cookieSameSite: 'lax',
};
const now = new Date('2026-09-02T00:00:00.000Z');

function session(id, userId = 'user-1') {
  return {
    id,
    userId,
    expiresAt: new Date('2026-09-10T00:00:00.000Z'),
    revokedAt: null,
    user: {
      id: userId,
      email: `${userId}@example.com`,
      emailVerifiedAt: null,
    },
  };
}

function fixture({ withRevokeAll = false } = {}) {
  const sessions = new Map([
    ['hash:secret-1', session('session-1')],
    ['hash:secret-2', session('session-2')],
    ['hash:other-user', session('session-3', 'user-2')],
  ]);
  const repository = {
    findSessionIdentityByHash: vi.fn(
      async (hash) => sessions.get(hash) ?? null,
    ),
    revokeSessionById: vi.fn(async ({ sessionId, userId, revokedAt }) => {
      const item = [...sessions.values()].find(
        (candidate) =>
          candidate.id === sessionId && candidate.userId === userId,
      );
      if (item?.revokedAt === null) item.revokedAt = revokedAt;
      return { count: item ? 1 : 0 };
    }),
    revokeAllSessionsForUser: vi.fn(async ({ userId, revokedAt }) => {
      let count = 0;
      for (const item of sessions.values()) {
        if (item.userId === userId && item.revokedAt === null) {
          item.revokedAt = revokedAt;
          count += 1;
        }
      }
      return { count };
    }),
  };
  const clearSessionCookie = createSessionCookieClearer(cookieConfig);
  const authenticateSession = createAuthenticateSession({
    authRepository: repository,
    authSecretHasher: { hash: (secret) => `hash:${secret}` },
    cookieName,
    clearSessionCookie,
    clock: () => now,
  });
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
      clearSessionCookie,
      authenticateSession,
      logoutSession: createLogoutSession({
        authRepository: repository,
        clock: () => now,
      }),
      revokeAllSessions: withRevokeAll
        ? createRevokeAllSessions({
            authRepository: repository,
            clock: () => now,
          })
        : undefined,
    }),
  );
  app.use(errorHandler);
  return { app, repository, sessions };
}

describe('logout and session revocation lifecycle', () => {
  it('revokes only the current session, clears the cookie, and returns 204', async () => {
    const deps = fixture();
    const response = await request(deps.app)
      .post('/api/v1/auth/logout')
      .set('Cookie', `${cookieName}=secret-1`);

    expect(response.status).toBe(204);
    expect(deps.repository.revokeSessionById).toHaveBeenCalledWith({
      sessionId: 'session-1',
      userId: 'user-1',
      revokedAt: now,
    });
    expect(deps.sessions.get('hash:secret-1').revokedAt).toEqual(now);
    expect(deps.sessions.get('hash:secret-2').revokedAt).toBeNull();
    expect(response.headers['set-cookie'][0]).toMatch(
      new RegExp(`^${cookieName}=;`),
    );
    expect(response.headers['set-cookie'][0]).toContain('Max-Age=0');
    expect(response.headers['set-cookie'][0]).toContain('Path=/');
    expect(response.headers['set-cookie'][0]).toContain('HttpOnly');
    expect(response.headers['set-cookie'][0]).toContain('SameSite=Lax');
    expect(response.text).not.toContain('session-1');
    expect(response.text).not.toContain('secret-1');

    const subsequent = await request(deps.app)
      .get('/api/v1/auth/me')
      .set('Cookie', `${cookieName}=secret-1`);
    expect(subsequent.status).toBe(401);
    expect(deps.repository.revokeSessionById).toHaveBeenCalledTimes(1);
  });

  it('revokes all sessions for the current user and leaves other users unchanged', async () => {
    const deps = fixture({ withRevokeAll: true });
    const response = await request(deps.app)
      .post('/api/v1/auth/sessions/revoke-all')
      .set('Cookie', `${cookieName}=secret-1`);

    expect(response.status).toBe(204);
    expect(deps.repository.revokeAllSessionsForUser).toHaveBeenCalledWith({
      userId: 'user-1',
      revokedAt: now,
    });
    expect(deps.sessions.get('hash:secret-1').revokedAt).toEqual(now);
    expect(deps.sessions.get('hash:secret-2').revokedAt).toEqual(now);
    expect(deps.sessions.get('hash:other-user').revokedAt).toBeNull();
  });

  it('does not clear the cookie or claim success when revocation fails', async () => {
    const deps = fixture();
    deps.repository.revokeSessionById.mockRejectedValue(
      new Error('database down'),
    );

    const response = await request(deps.app)
      .post('/api/v1/auth/logout')
      .set('Cookie', `${cookieName}=secret-1`);

    expect(response.status).toBe(500);
    expect(response.body.error.code).toBe('INTERNAL_ERROR');
    expect(response.headers['set-cookie']).toBeUndefined();
  });

  it('requires an authenticated session and does not create or load tenant data', async () => {
    const deps = fixture();
    const response = await request(deps.app).post('/api/v1/auth/logout');

    expect(response.status).toBe(401);
    expect(deps.repository.revokeSessionById).not.toHaveBeenCalled();
    expect(deps.repository).not.toHaveProperty('findMemberships');
  });
});
