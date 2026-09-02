import { parseCookie } from 'cookie';

import { unauthenticatedError } from '../errors/application-error.js';

export function createAuthenticateSession({
  authRepository,
  authSecretHasher,
  cookieName,
  clearSessionCookie,
  clock = () => new Date(),
}) {
  return async function authenticateSession(request, response, next) {
    let rawSecret;

    try {
      const cookies = parseCookie(request.headers.cookie ?? '');
      rawSecret = cookies[cookieName];
    } catch {
      return next(unauthenticatedError());
    }

    if (typeof rawSecret !== 'string' || rawSecret.length === 0) {
      return next(unauthenticatedError());
    }

    let session;
    try {
      session = await authRepository.findSessionIdentityByHash(
        authSecretHasher.hash(rawSecret),
      );
    } catch (error) {
      return next(error);
    }

    const valid =
      session &&
      session.user &&
      session.revokedAt === null &&
      session.expiresAt > clock();

    if (!valid) {
      if (clearSessionCookie) {
        response.append('Set-Cookie', clearSessionCookie());
      }
      return next(unauthenticatedError());
    }

    request.auth = {
      userId: session.user.id,
      sessionId: session.id,
      user: {
        id: session.user.id,
        email: session.user.email,
        emailVerified: session.user.emailVerifiedAt !== null,
      },
    };

    return next();
  };
}
