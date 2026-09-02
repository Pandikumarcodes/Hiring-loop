import {
  isUniqueConstraintError,
  AUTH_SESSION_TTL_MS,
} from '../repositories/auth-repository.js';

const MAX_SESSION_CREATE_ATTEMPTS = 2;

export function createHiringLoopSession({
  authRepository,
  authSecretGenerator,
  authSecretHasher,
  clock = () => new Date(),
}) {
  return async function createSession(user) {
    const now = clock();
    const expiresAt = new Date(now.getTime() + AUTH_SESSION_TTL_MS);
    for (let attempt = 0; attempt < MAX_SESSION_CREATE_ATTEMPTS; attempt += 1) {
      const rawSessionSecret = authSecretGenerator.generate();
      try {
        await authRepository.createSession({
          userId: user.id,
          sessionSecretHash: authSecretHasher.hash(rawSessionSecret),
          expiresAt,
          now,
          revokedAt: null,
        });
        return {
          user: {
            id: user.id,
            email: user.email,
            emailVerified: user.emailVerifiedAt !== null,
          },
          rawSessionSecret,
          expiresAt,
        };
      } catch (error) {
        if (
          !isUniqueConstraintError(error) ||
          attempt === MAX_SESSION_CREATE_ATTEMPTS - 1
        )
          throw error;
      }
    }
    throw new Error('Session creation failed');
  };
}
