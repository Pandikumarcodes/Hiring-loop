/**
 * Stable password-hasher contract for auth use cases.
 * Implementations must accept plaintext only for the duration of an
 * operation and must never persist or log either input.
 */
export function createPasswordHasher({ hash, verify }) {
  if (typeof hash !== 'function' || typeof verify !== 'function') {
    throw new TypeError('Password hasher requires hash and verify functions');
  }

  return Object.freeze({ hash, verify });
}
