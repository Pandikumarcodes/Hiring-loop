import { describe, expect, it, vi } from 'vitest';
import { createGoogleOidcProvider } from '../../../src/modules/auth/google/google-oidc-provider.js';
import { createLoginWithGoogle } from '../../../src/modules/auth/use-cases/login-with-google.js';

const config = {
  clientId: 'client-id',
  clientSecret: 'client-secret',
  redirectUri: 'http://backend.test/api/v1/auth/google/callback',
  transactionSecret: 'transaction-secret',
};

function makeProvider() {
  const grant = vi.fn(async (_configuration, _url, checks) => {
    expect(checks.expectedState).toBe('state-1');
    expect(checks.expectedNonce).toBe('nonce-1');
    expect(checks.pkceCodeVerifier).toBe('verifier-1');
    return {
      claims: () => ({
        sub: 'google-sub',
        email: 'User@Example.com',
        email_verified: true,
      }),
    };
  });
  const result = createGoogleOidcProvider({
    ...config,
    discovery: vi.fn(async () => ({})),
    authorizationUrl: vi.fn((_configuration, parameters) => {
      const url = new URL('https://accounts.google.com/auth');
      url.search = new URLSearchParams(parameters).toString();
      return url;
    }),
    authorizationCodeGrant: grant,
    generateState: () => 'state-1',
    generateNonce: () => 'nonce-1',
    generateCodeVerifier: () => 'verifier-1',
    calculateCodeChallenge: async () => 'challenge-1',
  });
  return { result, grant };
}

describe('Google OIDC adapter and identity resolution', () => {
  it('builds a minimal authorization request and validates the callback contract', async () => {
    const { result, grant } = makeProvider();
    const started = await result.start();
    expect(started.url).toContain('scope=openid+email');
    expect(started.url).toContain('code_challenge=challenge-1');
    expect(started.cookieValue).not.toContain('client-secret');
    await expect(
      result.callback({
        callbackUrl: `${config.redirectUri}?code=code-1&state=state-1`,
        cookieValue: started.cookieValue,
      }),
    ).resolves.toEqual({
      providerSubject: 'google-sub',
      email: 'User@Example.com',
      emailVerified: true,
    });
    expect(grant).toHaveBeenCalledTimes(1);
  });

  it('rejects missing or tampered transaction before code exchange', async () => {
    const { result, grant } = makeProvider();
    await expect(
      result.callback({
        callbackUrl: config.redirectUri,
        cookieValue: undefined,
      }),
    ).rejects.toThrow('transaction');
    await expect(
      result.callback({
        callbackUrl: config.redirectUri,
        cookieValue: 'tampered',
      }),
    ).rejects.toThrow('transaction');
    expect(grant).not.toHaveBeenCalled();
  });

  it('resolves provider subject before email and creates one shared session', async () => {
    const user = {
      id: 'user-1',
      email: 'user@example.com',
      emailVerifiedAt: null,
    };
    const repository = {
      findProviderIdentity: vi.fn(async () => ({ user })),
      findUserByEmail: vi.fn(),
      createGoogleIdentity: vi.fn(),
    };
    const createSession = vi.fn(async (value) => ({ user: value }));
    await createLoginWithGoogle({ authRepository: repository, createSession })({
      providerSubject: 'google-sub',
      email: 'other@example.com',
      emailVerified: true,
    });
    expect(createSession).toHaveBeenCalledWith(user);
    expect(repository.findUserByEmail).not.toHaveBeenCalled();
    expect(repository.createGoogleIdentity).not.toHaveBeenCalled();
  });

  it('does not silently link an overlapping email', async () => {
    const repository = {
      findProviderIdentity: vi.fn(async () => null),
      findUserByEmail: vi.fn(async () => ({ id: 'password-user' })),
      createGoogleIdentity: vi.fn(),
    };
    await expect(
      createLoginWithGoogle({
        authRepository: repository,
        createSession: vi.fn(),
      })({
        providerSubject: 'google-sub',
        email: 'USER@example.com',
        emailVerified: true,
      }),
    ).rejects.toMatchObject({
      code: 'CONFLICT',
      details: { reason: 'ACCOUNT_LINKING_REQUIRED' },
    });
    expect(repository.createGoogleIdentity).not.toHaveBeenCalled();
  });

  it('creates a verified global user and provider identity for a new email', async () => {
    const user = {
      id: 'new-user',
      email: 'user@example.com',
      emailVerifiedAt: new Date('2026-09-02T00:00:00.000Z'),
    };
    const repository = {
      findProviderIdentity: vi.fn(async () => null),
      findUserByEmail: vi.fn(async () => null),
      createGoogleIdentity: vi.fn(async (input) => {
        expect(input.email).toBe('user@example.com');
        expect(input.providerSubject).toBe('google-sub');
        expect(input.emailVerifiedAt).toEqual(user.emailVerifiedAt);
        return user;
      }),
    };
    const createSession = vi.fn(async (value) => ({ user: value }));
    await createLoginWithGoogle({
      authRepository: repository,
      createSession,
      clock: () => user.emailVerifiedAt,
    })({
      providerSubject: 'google-sub',
      email: ' USER@Example.COM ',
      emailVerified: true,
    });
    expect(repository.createGoogleIdentity).toHaveBeenCalledTimes(1);
    expect(createSession).toHaveBeenCalledWith(user);
  });
});
