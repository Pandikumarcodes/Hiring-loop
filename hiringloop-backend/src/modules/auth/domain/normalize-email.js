/**
 * Return the canonical email representation approved for account identity.
 * Syntax validation belongs at the request boundary; this function only
 * trims surrounding whitespace and lowercases the complete string.
 */
export function normalizeEmail(email) {
  if (typeof email !== 'string') {
    throw new TypeError('Email must be a string');
  }

  return email.trim().toLowerCase();
}
