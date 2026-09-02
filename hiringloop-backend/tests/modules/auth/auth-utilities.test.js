import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { normalizeEmail } from '../../../src/modules/auth/domain/normalize-email.js';
import {
  ARGON2ID_OPTIONS,
  PasswordHashError,
  passwordHasher,
} from '../../../src/modules/auth/password/argon2-password-hasher.js';
import {
  AUTH_SECRET_BYTE_LENGTH,
  authSecretGenerator,
  authSecretHasher,
} from '../../../src/modules/auth/secrets/auth-secret.js';

describe('normalizeEmail', () => {
  it('trims surrounding whitespace and lowercases the complete email', () => {
    expect(normalizeEmail(' USER@Example.COM ')).toBe('user@example.com');
  });

  it('preserves plus addressing', () => {
    expect(normalizeEmail('person+jobs@gmail.com')).toBe(
      'person+jobs@gmail.com',
    );
  });

  it('is deterministic', () => {
    expect(normalizeEmail('  A@Example.com ')).toBe(
      normalizeEmail('  A@Example.com '),
    );
  });

  it('rejects programmer misuse instead of coercing non-strings', () => {
    expect(() => normalizeEmail(null)).toThrow(TypeError);
  });
});

describe('passwordHasher', () => {
  it('uses explicit Argon2id parameters', () => {
    expect(ARGON2ID_OPTIONS).toMatchObject({
      type: 2,
      memoryCost: 19_456,
      timeCost: 2,
      parallelism: 1,
      hashLength: 32,
    });
  });

  it('hashes and verifies passwords without exposing plaintext', async () => {
    const password = 'correct horse battery staple';
    const passwordHash = await passwordHasher.hash(password);

    expect(passwordHash).not.toBe(password);
    expect(passwordHash.startsWith('$argon2id$')).toBe(true);
    await expect(passwordHasher.verify(password, passwordHash)).resolves.toBe(
      true,
    );
    await expect(
      passwordHasher.verify('wrong password', passwordHash),
    ).resolves.toBe(false);
  });

  it('uses a fresh salt for the same password', async () => {
    const firstHash = await passwordHasher.hash('same password');
    const secondHash = await passwordHasher.hash('same password');

    expect(firstHash).not.toBe(secondHash);
  });

  it('reports malformed stored hashes as integrity errors', async () => {
    await expect(
      passwordHasher.verify('password', 'not-an-argon2-hash'),
    ).rejects.toBeInstanceOf(PasswordHashError);
  });
});

describe('authentication secrets', () => {
  it('generates URL-safe 256-bit secrets', () => {
    const secret = authSecretGenerator.generate();

    expect(secret).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(Buffer.from(secret, 'base64url')).toHaveLength(
      AUTH_SECRET_BYTE_LENGTH,
    );
  });

  it('does not generate deterministic secrets', () => {
    expect(authSecretGenerator.generate()).not.toBe(
      authSecretGenerator.generate(),
    );
  });

  it('hashes secrets deterministically as SHA-256 hex', () => {
    const secret = authSecretGenerator.generate();
    const expected = createHash('sha256').update(secret, 'utf8').digest('hex');
    const hash = authSecretHasher.hash(secret);

    expect(authSecretHasher.hash(secret)).toBe(hash);
    expect(hash).toBe(expected);
    expect(hash).toHaveLength(64);
    expect(hash).not.toBe(secret);
    expect(authSecretHasher.hash(`${secret}x`)).not.toBe(hash);
  });
});
