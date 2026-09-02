import { authenticationFailedError } from '../../../errors/application-error.js';
import { normalizeEmail } from '../domain/normalize-email.js';
import { DUMMY_PASSWORD_HASH } from '../password/dummy-password-hash.js';
import { createHiringLoopSession } from './create-hiringloop-session.js';

export function createLoginUser({
  authRepository,
  passwordHasher,
  authSecretGenerator,
  authSecretHasher,
  clock = () => new Date(),
}) {
  const createSession = createHiringLoopSession({
    authRepository,
    authSecretGenerator,
    authSecretHasher,
    clock,
  });
  return async function loginUser({ email, password }) {
    const identity = await authRepository.findLoginIdentityByEmail(
      normalizeEmail(email),
    );
    const passwordHash = identity?.passwordCredential?.passwordHash;
    const passwordMatches = await passwordHasher.verify(
      password,
      passwordHash ?? DUMMY_PASSWORD_HASH,
    );

    if (!identity || !passwordHash || !passwordMatches) {
      throw authenticationFailedError();
    }

    return createSession(identity);
  };
}
