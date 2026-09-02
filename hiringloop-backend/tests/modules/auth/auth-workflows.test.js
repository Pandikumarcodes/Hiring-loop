import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { createInMemoryEmailDelivery } from '../../../src/modules/auth/email/email-delivery.js';
import { errorHandler } from '../../../src/middleware/error-handler.js';
import { createAuthRouter } from '../../../src/modules/auth/routes/auth-routes.js';
import { createRegisterUser } from '../../../src/modules/auth/use-cases/register-user.js';
import { createVerifyEmail } from '../../../src/modules/auth/use-cases/verify-email.js';

function authDependencies() {
  const delivery = createInMemoryEmailDelivery();
  const users = new Map();
  const tokens = new Map();
  const repository = {
    findUserByEmail: vi.fn(async (email) => users.get(email) ?? null),
    createRegistrationIdentity: vi.fn(
      async ({ email, passwordHash, tokenHash, now, expiresAt }) => {
        const user = {
          id: `user-${users.size + 1}`,
          email,
          emailVerifiedAt: null,
        };
        users.set(email, user);
        tokens.set(tokenHash, {
          id: `token-${tokens.size + 1}`,
          userId: user.id,
          purpose: 'EMAIL_VERIFICATION',
          tokenHash,
          expiresAt,
          consumedAt: null,
          user,
          passwordHash,
          createdAt: now,
        });
        return { user, tokenHash };
      },
    ),
    findTokenByHash: vi.fn(async (hash) => tokens.get(hash) ?? null),
    consumeEmailVerificationToken: vi.fn(async ({ tokenId, userId, now }) => {
      const token = [...tokens.values()].find((item) => item.id === tokenId);
      if (!token || token.userId !== userId || token.consumedAt) return false;
      token.consumedAt = now;
      token.user.emailVerifiedAt = now;
      return true;
    }),
  };
  const rawTokens = ['raw-verification-token-1', 'raw-verification-token-2'];
  let tokenIndex = 0;
  const authSecretGenerator = { generate: () => rawTokens[tokenIndex++] };
  const authSecretHasher = { hash: (value) => `hash:${value}` };
  const passwordHasher = { hash: vi.fn(async (value) => `argon2id:${value}`) };
  const now = new Date('2026-09-02T00:00:00.000Z');

  return {
    delivery,
    repository,
    users,
    tokens,
    authSecretGenerator,
    authSecretHasher,
    passwordHasher,
    now,
  };
}

function register(deps) {
  return createRegisterUser({
    ...deps,
    authRepository: deps.repository,
    emailDelivery: deps.delivery,
    clock: () => deps.now,
    verificationUrlBase: 'https://frontend.test/verify-email',
  });
}

describe('registration and email verification use cases', () => {
  it('creates only global identity records and delivers the raw token', async () => {
    const deps = authDependencies();
    const result = await register(deps)({
      email: '  USER@Example.COM ',
      password: 'correct horse battery staple',
    });

    expect(result.status).toBe('accepted');
    expect(deps.users.get('user@example.com')).toBeTruthy();
    expect(deps.passwordHasher.hash).toHaveBeenCalledWith(
      'correct horse battery staple',
    );
    expect(deps.tokens.get('hash:raw-verification-token-1')).toMatchObject({
      tokenHash: 'hash:raw-verification-token-1',
      expiresAt: new Date(deps.now.getTime() + 86_400_000),
    });
    expect(deps.delivery.messages[0]).toMatchObject({
      email: 'user@example.com',
      verificationToken: 'raw-verification-token-1',
    });
    expect(deps.delivery.messages[0].verificationToken).not.toBe(
      'hash:raw-verification-token-1',
    );
  });

  it('uses generic acknowledgement for duplicate normalized email', async () => {
    const deps = authDependencies();
    await register(deps)({
      email: 'User@Example.com',
      password: 'correct horse battery staple',
    });
    const second = await register(deps)({
      email: ' user@example.COM ',
      password: 'different password',
    });

    expect(second.status).toBe('accepted');
    expect(deps.users.size).toBe(1);
    expect(deps.passwordHasher.hash).toHaveBeenCalledTimes(1);
    expect(deps.delivery.messages).toHaveLength(1);
  });

  it('verifies a valid token once and rejects replay', async () => {
    const deps = authDependencies();
    await register(deps)({
      email: 'user@example.com',
      password: 'correct horse battery staple',
    });
    const verify = createVerifyEmail({
      authRepository: deps.repository,
      authSecretHasher: deps.authSecretHasher,
      clock: () => deps.now,
    });

    await expect(
      verify({ token: 'raw-verification-token-1' }),
    ).resolves.toMatchObject({ status: 'verified' });
    await expect(
      verify({ token: 'raw-verification-token-1' }),
    ).rejects.toMatchObject({
      code: 'AUTH_TOKEN_INVALID',
    });
    expect(deps.users.get('user@example.com').emailVerifiedAt).toEqual(
      deps.now,
    );
  });

  it('allows only one concurrent verification transition', async () => {
    const deps = authDependencies();
    await register(deps)({
      email: 'user@example.com',
      password: 'correct horse battery staple',
    });
    const verify = createVerifyEmail({
      authRepository: deps.repository,
      authSecretHasher: deps.authSecretHasher,
      clock: () => deps.now,
    });

    const outcomes = await Promise.allSettled([
      verify({ token: 'raw-verification-token-1' }),
      verify({ token: 'raw-verification-token-1' }),
    ]);

    expect(
      outcomes.filter(({ status }) => status === 'fulfilled'),
    ).toHaveLength(1);
    expect(outcomes.filter(({ status }) => status === 'rejected')).toHaveLength(
      1,
    );
  });

  it('does not expose delivery failures as secret-bearing errors', async () => {
    const deps = authDependencies();
    const failingDelivery = {
      sendEmailVerification: vi.fn(async () => {
        throw new Error('provider secret');
      }),
    };
    await expect(
      createRegisterUser({
        ...deps,
        authRepository: deps.repository,
        emailDelivery: failingDelivery,
      })({
        email: 'user@example.com',
        password: 'correct horse battery staple',
      }),
    ).rejects.toMatchObject({ code: 'EMAIL_DELIVERY_FAILED', status: 503 });
    expect(JSON.stringify(await Promise.resolve({}))).not.toContain(
      'provider secret',
    );
    expect(deps.users.size).toBe(1);
  });

  it('mounts both endpoints with structured validation beneath /api/v1', async () => {
    const app = express();
    app.use(express.json());
    app.use(
      '/api/v1/auth',
      createAuthRouter({
        registerUser: vi.fn(async () => ({ status: 'accepted' })),
        verifyEmail: vi.fn(async () => ({ status: 'verified' })),
        resendVerification: vi.fn(async () => ({ status: 'accepted' })),
      }),
    );
    app.use(errorHandler);

    const registerResponse = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'user@example.com', password: 'short' });
    const verifyResponse = await request(app)
      .post('/api/v1/auth/verify-email')
      .send({ token: '' });
    const resendResponse = await request(app)
      .post('/api/v1/auth/verification/resend')
      .send({ email: 'user@example.com' });

    expect(registerResponse.status).toBe(400);
    expect(registerResponse.body.error.code).toBe('VALIDATION_ERROR');
    expect(verifyResponse.status).toBe(400);
    expect(verifyResponse.body.error.code).toBe('VALIDATION_ERROR');
    expect(resendResponse.status).toBe(202);
    expect(resendResponse.body.data.status).toBe('accepted');
  });
});
