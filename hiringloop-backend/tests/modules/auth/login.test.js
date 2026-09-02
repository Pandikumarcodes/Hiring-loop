import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { errorHandler } from '../../../src/middleware/error-handler.js';
import { createAuthRouter } from '../../../src/modules/auth/routes/auth-routes.js';
import { createLoginUser } from '../../../src/modules/auth/use-cases/login-user.js';
import { createSessionCookieSerializer } from '../../../src/modules/auth/http/session-cookie.js';
import { PasswordHashError } from '../../../src/modules/auth/password/argon2-password-hasher.js';
import { AUTH_SESSION_TTL_MS } from '../../../src/modules/auth/repositories/auth-repository.js';

function dependencies({ identity = null } = {}) {
  const sessions = [];
  const generator = {
    generate: vi.fn(() => `raw-secret-${sessions.length + 1}`),
  };
  const repository = {
    findLoginIdentityByEmail: vi.fn(async () => identity),
    createSession: vi.fn(async (session) => {
      sessions.push(session);
      return session;
    }),
  };
  const passwordHasher = { verify: vi.fn(async () => true) };
  const loginUser = createLoginUser({
    authRepository: repository,
    passwordHasher,
    authSecretGenerator: generator,
    authSecretHasher: { hash: (value) => `hash:${value}` },
    clock: () => new Date('2026-09-02T00:00:00.000Z'),
  });
  return { repository, passwordHasher, sessions, loginUser };
}

describe('login and opaque session creation', () => {
  it('serializes the production host-only cookie policy', () => {
    const cookie = createSessionCookieSerializer({
      cookieName: '__Host-hiringloop_session',
      cookieSecure: true,
      cookieSameSite: 'none',
      ttlSeconds: AUTH_SESSION_TTL_MS / 1000,
    })('raw-secret', new Date('2026-09-09T00:00:00.000Z'));

    expect(cookie).toContain('__Host-hiringloop_session=raw-secret');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('Secure');
    expect(cookie).toContain('SameSite=None');
    expect(cookie).toContain('Path=/');
    expect(cookie).toContain('Max-Age=604800');
    expect(cookie).toContain('Expires=Wed, 09 Sep 2026 00:00:00 GMT');
    expect(cookie).not.toContain('Domain=');
  });

  it('normalizes email, verifies once, and creates a seven-day fresh session', async () => {
    const deps = dependencies({
      identity: {
        id: 'user-1',
        email: 'user@example.com',
        emailVerifiedAt: null,
        passwordCredential: { passwordHash: 'stored-argon2-hash' },
      },
    });

    const result = await deps.loginUser({
      email: '  USER@Example.COM ',
      password: 'short-but-previously-valid',
    });

    expect(deps.repository.findLoginIdentityByEmail).toHaveBeenCalledWith(
      'user@example.com',
    );
    expect(deps.passwordHasher.verify).toHaveBeenCalledWith(
      'short-but-previously-valid',
      'stored-argon2-hash',
    );
    expect(result.user).toEqual({
      id: 'user-1',
      email: 'user@example.com',
      emailVerified: false,
    });
    expect(deps.sessions[0]).toMatchObject({
      userId: 'user-1',
      sessionSecretHash: 'hash:raw-secret-1',
      revokedAt: null,
      expiresAt: new Date(
        new Date('2026-09-02T00:00:00.000Z').getTime() + AUTH_SESSION_TTL_MS,
      ),
    });
    expect(deps.sessions[0].sessionSecretHash).not.toBe(
      result.rawSessionSecret,
    );
  });

  it('uses the dummy hash and the same public failure for unknown users', async () => {
    const deps = dependencies();
    deps.passwordHasher.verify.mockResolvedValue(false);

    await expect(
      deps.loginUser({ email: 'unknown@example.com', password: 'password' }),
    ).rejects.toMatchObject({
      status: 401,
      code: 'AUTHENTICATION_FAILED',
      message: 'Invalid email or password.',
    });
    expect(deps.passwordHasher.verify).toHaveBeenCalledTimes(1);
    expect(deps.sessions).toHaveLength(0);
  });

  it('does not translate a malformed stored password hash into bad credentials', async () => {
    const deps = dependencies({
      identity: {
        id: 'user-1',
        email: 'user@example.com',
        emailVerifiedAt: new Date(),
        passwordCredential: { passwordHash: 'corrupt' },
      },
    });
    deps.passwordHasher.verify.mockRejectedValue(new PasswordHashError());

    await expect(
      deps.loginUser({ email: 'user@example.com', password: 'password' }),
    ).rejects.toBeInstanceOf(PasswordHashError);
    expect(deps.sessions).toHaveLength(0);
  });

  it('mounts login, issues only the raw secret, and returns the safe DTO', async () => {
    const deps = dependencies({
      identity: {
        id: 'user-1',
        email: 'user@example.com',
        emailVerifiedAt: new Date(),
        passwordCredential: { passwordHash: 'stored' },
      },
    });
    const app = express();
    app.use(express.json());
    app.use(
      '/api/v1/auth',
      createAuthRouter({
        registerUser: vi.fn(),
        verifyEmail: vi.fn(),
        resendVerification: vi.fn(),
        loginUser: deps.loginUser,
        serializeSessionCookie: createSessionCookieSerializer({
          cookieName: 'hiringloop_session',
          cookieSecure: false,
          cookieSameSite: 'lax',
          ttlSeconds: AUTH_SESSION_TTL_MS / 1000,
        }),
      }),
    );
    app.use(errorHandler);

    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: ' USER@EXAMPLE.COM ', password: 'password' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      data: {
        user: { id: 'user-1', email: 'user@example.com', emailVerified: true },
      },
    });
    expect(response.headers['set-cookie'][0]).toContain(
      'hiringloop_session=raw-secret-1',
    );
    expect(response.headers['set-cookie'][0]).toContain('HttpOnly');
    expect(response.headers['set-cookie'][0]).toContain('Path=/');
    expect(response.headers['set-cookie'][0]).toContain('SameSite=Lax');
    expect(response.text).not.toContain('stored');
    expect(response.text).not.toContain('raw-secret');
  });

  it('rejects invalid input without invoking the use case', async () => {
    const loginUser = vi.fn();
    const app = express();
    app.use(express.json());
    app.use(
      '/api/v1/auth',
      createAuthRouter({
        registerUser: vi.fn(),
        verifyEmail: vi.fn(),
        resendVerification: vi.fn(),
        loginUser,
        serializeSessionCookie: vi.fn(),
      }),
    );
    app.use(errorHandler);

    const response = await request(app).post('/api/v1/auth/login').send({
      email: 'not-an-email',
      password: 'do-not-reflect-me',
    });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(JSON.stringify(response.body)).not.toContain('do-not-reflect-me');
    expect(loginUser).not.toHaveBeenCalled();
  });
});
