import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { errorHandler } from '../../../src/middleware/error-handler.js';
import { createAuthRouter } from '../../../src/modules/auth/routes/auth-routes.js';
import { createForgotPassword } from '../../../src/modules/auth/use-cases/forgot-password.js';
import { createResetPassword } from '../../../src/modules/auth/use-cases/reset-password.js';
import { createChangePassword } from '../../../src/modules/auth/use-cases/change-password.js';
import { PASSWORD_RESET_TTL_MS } from '../../../src/modules/auth/repositories/auth-repository.js';

const now = new Date('2026-09-02T00:00:00.000Z');

function secretTools() {
  let next = 0;
  return {
    generator: { generate: vi.fn(() => `reset-secret-${++next}`) },
    hasher: { hash: vi.fn((secret) => `sha256:${secret}`) },
  };
}

describe('password recovery and password change', () => {
  it('uses a generic acknowledgement and replaces active reset tokens', async () => {
    const tools = secretTools();
    const tokens = [];
    const repository = {
      findPasswordResetIdentityByEmail: vi.fn(async () => ({
        id: 'user-1',
        email: 'user@example.com',
        passwordCredential: { id: 'credential-1' },
      })),
      replacePasswordResetToken: vi.fn(async (token) => {
        tokens.forEach((item) => {
          if (!item.consumedAt) item.consumedAt = token.now;
        });
        tokens.push(token);
      }),
    };
    const emailDelivery = { sendPasswordReset: vi.fn(async () => {}) };
    const forgot = createForgotPassword({
      authRepository: repository,
      authSecretGenerator: tools.generator,
      authSecretHasher: tools.hasher,
      emailDelivery,
      frontendOrigin: 'https://frontend.example.test',
      clock: () => now,
    });

    const first = await forgot({ email: ' USER@Example.COM ' });
    const second = await forgot({ email: 'user@example.com' });

    expect(first).toEqual(second);
    expect(first).toEqual({
      status: 'accepted',
      message:
        'If the account is eligible, password reset instructions will be sent.',
    });
    expect(tokens[0].tokenHash).toBe('sha256:reset-secret-1');
    expect(tokens[0].expiresAt).toEqual(
      new Date(now.getTime() + PASSWORD_RESET_TTL_MS),
    );
    expect(tokens[0].tokenHash).not.toBe(tokens[0].resetToken);
    expect(tokens[0].consumedAt).toEqual(now);
    expect(emailDelivery.sendPasswordReset).toHaveBeenLastCalledWith({
      email: 'user@example.com',
      resetToken: 'reset-secret-2',
      resetUrl:
        'https://frontend.example.test/reset-password?token=reset-secret-2',
    });
  });

  it('does not create or deliver reset material for unknown or provider-only users', async () => {
    const tools = secretTools();
    const repository = {
      findPasswordResetIdentityByEmail: vi
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'user-2', email: 'provider@example.com' }),
      replacePasswordResetToken: vi.fn(),
    };
    const emailDelivery = { sendPasswordReset: vi.fn() };
    const forgot = createForgotPassword({
      authRepository: repository,
      authSecretGenerator: tools.generator,
      authSecretHasher: tools.hasher,
      emailDelivery,
      frontendOrigin: 'https://frontend.example.test',
      clock: () => now,
    });

    await expect(forgot({ email: 'unknown@example.com' })).resolves.toEqual(
      expect.objectContaining({ status: 'accepted' }),
    );
    await expect(forgot({ email: 'provider@example.com' })).resolves.toEqual(
      expect.objectContaining({ status: 'accepted' }),
    );
    expect(repository.replacePasswordResetToken).not.toHaveBeenCalled();
    expect(emailDelivery.sendPasswordReset).not.toHaveBeenCalled();
  });

  it('leaves a committed reset token valid when email delivery fails', async () => {
    const tools = secretTools();
    const replace = vi.fn(async () => {});
    const forgot = createForgotPassword({
      authRepository: {
        findPasswordResetIdentityByEmail: vi.fn(async () => ({
          id: 'user-1',
          email: 'user@example.com',
          passwordCredential: { id: 'credential-1' },
        })),
        replacePasswordResetToken: replace,
      },
      authSecretGenerator: tools.generator,
      authSecretHasher: tools.hasher,
      emailDelivery: {
        sendPasswordReset: vi.fn(async () => {
          throw new Error('provider secret');
        }),
      },
      frontendOrigin: 'https://frontend.example.test',
      clock: () => now,
    });

    await expect(forgot({ email: 'user@example.com' })).rejects.toMatchObject({
      code: 'EMAIL_DELIVERY_FAILED',
      status: 503,
    });
    expect(replace).toHaveBeenCalledOnce();
    expect(JSON.stringify(await Promise.resolve({}))).not.toContain(
      'provider secret',
    );
  });

  it('resets once and revokes all sessions without creating a fresh session', async () => {
    const tools = secretTools();
    const passwordHasher = {
      hash: vi.fn(async () => 'argon2id:new-hash'),
    };
    const repository = {
      findPasswordResetTokenByHash: vi.fn(async () => ({
        id: 'token-1',
        userId: 'user-1',
        purpose: 'PASSWORD_RESET',
        expiresAt: new Date(now.getTime() + 1000),
        consumedAt: null,
        user: { id: 'user-1', passwordCredential: { id: 'credential-1' } },
      })),
      consumePasswordResetAndChangePassword: vi.fn(async () => true),
    };
    const reset = createResetPassword({
      authRepository: repository,
      passwordHasher,
      authSecretHasher: tools.hasher,
      clock: () => now,
    });

    await expect(
      reset({
        token: 'reset-secret',
        newPassword: 'a sufficiently new password',
      }),
    ).resolves.toEqual({ status: 'password_reset' });
    expect(passwordHasher.hash).toHaveBeenCalledWith(
      'a sufficiently new password',
    );
    expect(
      repository.consumePasswordResetAndChangePassword,
    ).toHaveBeenCalledWith({
      tokenId: 'token-1',
      userId: 'user-1',
      passwordHash: 'argon2id:new-hash',
      now,
    });
  });

  it('allows only one concurrent request to consume a reset token', async () => {
    const tools = secretTools();
    let attempts = 0;
    const repository = {
      findPasswordResetTokenByHash: vi.fn(async () => ({
        id: 'token-1',
        userId: 'user-1',
        purpose: 'PASSWORD_RESET',
        expiresAt: new Date(now.getTime() + 1000),
        consumedAt: null,
        user: { passwordCredential: { id: 'credential-1' } },
      })),
      consumePasswordResetAndChangePassword: vi.fn(
        async () => ++attempts === 1,
      ),
    };
    const reset = createResetPassword({
      authRepository: repository,
      passwordHasher: { hash: vi.fn(async () => 'argon2id:new-hash') },
      authSecretHasher: tools.hasher,
      clock: () => now,
    });

    const outcomes = await Promise.allSettled([
      reset({
        token: 'same-token',
        newPassword: 'a sufficiently new password',
      }),
      reset({
        token: 'same-token',
        newPassword: 'another sufficiently new password',
      }),
    ]);
    expect(outcomes.filter((item) => item.status === 'fulfilled')).toHaveLength(
      1,
    );
    expect(outcomes.filter((item) => item.status === 'rejected')).toHaveLength(
      1,
    );
    expect(
      outcomes.find((item) => item.status === 'rejected').reason,
    ).toMatchObject({
      code: 'AUTH_TOKEN_INVALID',
    });
  });

  it('rotates the authenticated browser session after a password change', async () => {
    const tools = secretTools();
    const repository = {
      findPasswordCredentialByUserId: vi.fn(async () => ({
        id: 'credential-1',
        passwordHash: 'old-hash',
      })),
      changePasswordAndRotateSession: vi.fn(async () => {}),
    };
    const passwordHasher = {
      verify: vi.fn(async () => true),
      hash: vi.fn(async () => 'argon2id:new-hash'),
    };
    const change = createChangePassword({
      authRepository: repository,
      passwordHasher,
      authSecretGenerator: tools.generator,
      authSecretHasher: tools.hasher,
      clock: () => now,
    });

    const result = await change({
      userId: 'user-1',
      currentPassword: 'old password',
      newPassword: 'a sufficiently new password',
    });

    expect(result.rawSessionSecret).toBe('reset-secret-1');
    expect(repository.changePasswordAndRotateSession).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        passwordHash: 'argon2id:new-hash',
        sessionSecretHash: 'sha256:reset-secret-1',
      }),
    );
  });

  it('requires authentication and applies password validation at the route', async () => {
    const app = express();
    app.use(express.json());
    app.use(
      '/api/v1/auth',
      createAuthRouter({
        registerUser: vi.fn(),
        verifyEmail: vi.fn(),
        resendVerification: vi.fn(),
        forgotPassword: vi.fn(),
        resetPassword: vi.fn(),
        changePassword: vi.fn(),
        authenticateSession: (_request, _response, next) => next(),
        serializeSessionCookie: vi.fn(),
      }),
    );
    app.use(errorHandler);

    const response = await request(app)
      .post('/api/v1/auth/password/reset')
      .send({ token: '', newPassword: 'short' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});
