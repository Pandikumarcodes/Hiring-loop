import { createHmac, timingSafeEqual } from 'node:crypto';

import { csrfInvalidError } from '../errors/application-error.js';

const TOKEN_VERSION = 'v1';

function digest(secret, sessionId) {
  return createHmac('sha256', secret)
    .update(`${TOKEN_VERSION}:${sessionId}`, 'utf8')
    .digest();
}

export function createCsrfToken({ secret, sessionId }) {
  if (!secret || !sessionId) throw new Error('CSRF token inputs are required');
  return `${TOKEN_VERSION}.${digest(secret, sessionId).toString('base64url')}`;
}

export function isValidCsrfToken({ token, secret, sessionId }) {
  if (typeof token !== 'string') return false;
  const [version, encoded] = token.split('.');
  if (
    version !== TOKEN_VERSION ||
    !encoded ||
    !/^[A-Za-z0-9_-]+$/.test(encoded)
  ) {
    return false;
  }
  const supplied = Buffer.from(encoded, 'base64url');
  const expected = digest(secret, sessionId);
  return (
    supplied.length === expected.length && timingSafeEqual(supplied, expected)
  );
}

export function createRequireCsrf({ secret, headerName = 'x-csrf-token' }) {
  return function requireCsrf(request, _response, next) {
    if (
      !isValidCsrfToken({
        token: request.get(headerName),
        secret,
        sessionId: request.auth?.sessionId,
      })
    ) {
      return next(csrfInvalidError());
    }
    return next();
  };
}
