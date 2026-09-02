import argon2 from 'argon2';

import { createPasswordHasher } from './password-hasher.js';

// OWASP-aligned Argon2id baseline: 19 MiB, two iterations, one lane.
// These are intentionally explicit policy values, not library defaults.
export const ARGON2ID_OPTIONS = Object.freeze({
  type: argon2.argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
  hashLength: 32,
});

export class PasswordHashError extends Error {
  constructor() {
    super('Stored password hash could not be verified');
    this.name = 'PasswordHashError';
  }
}

function assertPasswordInput(value, name) {
  if (typeof value !== 'string') {
    throw new TypeError(`${name} must be a string`);
  }
}

async function hashPassword(password) {
  assertPasswordInput(password, 'Password');
  return argon2.hash(password, ARGON2ID_OPTIONS);
}

async function verifyPassword(password, passwordHash) {
  assertPasswordInput(password, 'Password');
  assertPasswordInput(passwordHash, 'Password hash');

  try {
    return await argon2.verify(passwordHash, password);
  } catch {
    // A malformed/corrupt persisted hash is an integrity/infrastructure
    // failure. Keep it distinct from a normal incorrect-password result.
    throw new PasswordHashError();
  }
}

export const passwordHasher = createPasswordHasher({
  hash: hashPassword,
  verify: verifyPassword,
});
