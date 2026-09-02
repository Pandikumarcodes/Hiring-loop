import { describe, expect, it, vi } from 'vitest';

import { createInMemoryEmailDelivery } from '../../../src/modules/auth/email/email-delivery.js';
import { createResendVerification } from '../../../src/modules/auth/use-cases/resend-verification.js';

function dependencies(user = null) {
  const delivery = createInMemoryEmailDelivery();
  const tokens = [];
  const repository = {
    findUserByEmail: vi.fn(async () => user),
    replaceEmailVerificationToken: vi.fn(async (token) => {
      for (const previous of tokens) {
        if (!previous.consumedAt) previous.consumedAt = token.now;
      }
      const created = { ...token, consumedAt: null };
      tokens.push(created);
      return created;
    }),
  };
  const authSecretGenerator = {
    generate: vi.fn(() => `fresh-token-${tokens.length + 1}`),
  };
  const authSecretHasher = { hash: vi.fn((value) => `hash:${value}`) };
  const now = new Date('2026-09-02T00:00:00.000Z');
  const resend = createResendVerification({
    authRepository: repository,
    authSecretGenerator,
    authSecretHasher,
    emailDelivery: delivery,
    clock: () => now,
  });
  return { delivery, repository, tokens, authSecretGenerator, resend, now };
}

const generic = {
  status: 'accepted',
  message: 'If the account is eligible, a verification email will be sent.',
};

describe('verification resend', () => {
  it.each([
    ['unknown', null],
    [
      'already verified',
      { id: 'user-1', email: 'user@example.com', emailVerifiedAt: new Date() },
    ],
  ])(
    'returns the same generic acknowledgement for %s email',
    async (_label, user) => {
      const deps = dependencies(user);
      await expect(
        deps.resend({ email: ' USER@Example.COM ' }),
      ).resolves.toEqual(generic);
      expect(deps.repository.findUserByEmail).toHaveBeenCalledWith(
        'user@example.com',
      );
      expect(
        deps.repository.replaceEmailVerificationToken,
      ).not.toHaveBeenCalled();
      expect(deps.delivery.messages).toHaveLength(0);
    },
  );

  it('replaces active token transactionally before delivering the fresh raw token', async () => {
    const deps = dependencies({
      id: 'user-1',
      email: 'user@example.com',
      emailVerifiedAt: null,
    });
    await deps.resend({ email: 'user@example.com' });
    await deps.resend({ email: 'user@example.com' });

    expect(deps.repository.replaceEmailVerificationToken).toHaveBeenCalledTimes(
      2,
    );
    expect(deps.tokens).toHaveLength(2);
    expect(deps.tokens[0].consumedAt).toEqual(deps.now);
    expect(deps.tokens[1]).toMatchObject({
      userId: 'user-1',
      tokenHash: 'hash:fresh-token-2',
      expiresAt: new Date(deps.now.getTime() + 86_400_000),
    });
    expect(deps.tokens[1]).not.toHaveProperty('verificationToken');
    expect(deps.delivery.messages).toEqual([
      { email: 'user@example.com', verificationToken: 'fresh-token-1' },
      { email: 'user@example.com', verificationToken: 'fresh-token-2' },
    ]);
  });

  it('leaves the replacement token in place when delivery fails', async () => {
    const deps = dependencies({
      id: 'user-1',
      email: 'user@example.com',
      emailVerifiedAt: null,
    });
    const emailDelivery = {
      sendEmailVerification: vi.fn(async () => {
        throw new Error('provider internals');
      }),
    };
    const resend = createResendVerification({
      authRepository: deps.repository,
      authSecretGenerator: deps.authSecretGenerator,
      authSecretHasher: { hash: (value) => `hash:${value}` },
      emailDelivery,
      clock: () => deps.now,
    });

    await expect(resend({ email: 'user@example.com' })).rejects.toMatchObject({
      code: 'EMAIL_DELIVERY_FAILED',
      status: 503,
      message: 'Verification email could not be sent',
    });
    expect(deps.tokens[0].consumedAt).toBeNull();
    expect(JSON.stringify(await Promise.resolve({}))).not.toContain(
      'provider internals',
    );
  });
});
