import { createHash, randomBytes } from 'node:crypto';

// 32 random bytes provide 256 bits of entropy. base64url avoids cookie and
// link encoding surprises while preserving the full entropy of the bytes.
export const AUTH_SECRET_BYTE_LENGTH = 32;

export function generateAuthSecret() {
  return randomBytes(AUTH_SECRET_BYTE_LENGTH).toString('base64url');
}

export function hashAuthSecret(secret) {
  if (typeof secret !== 'string') {
    throw new TypeError('Authentication secret must be a string');
  }

  return createHash('sha256').update(secret, 'utf8').digest('hex');
}

export const authSecretGenerator = Object.freeze({
  generate: generateAuthSecret,
});

export const authSecretHasher = Object.freeze({
  hash: hashAuthSecret,
});
