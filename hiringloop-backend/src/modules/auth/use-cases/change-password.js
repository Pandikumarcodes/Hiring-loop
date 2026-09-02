import {
  passwordChangeRejectedError,
  authenticationFailedError,
} from '../../../errors/application-error.js';
import { AUTH_SESSION_TTL_MS } from '../repositories/auth-repository.js';

export function createChangePassword({
  authRepository,
  passwordHasher,
  authSecretGenerator,
  authSecretHasher,
  clock = () => new Date(),
}) {
  return async function changePassword({
    userId,
    currentPassword,
    newPassword,
  }) {
    const credential =
      await authRepository.findPasswordCredentialByUserId(userId);
    if (!credential) throw authenticationFailedError();
    const matches = await passwordHasher.verify(
      currentPassword,
      credential.passwordHash,
    );
    if (!matches) throw authenticationFailedError();
    if (currentPassword === newPassword) throw passwordChangeRejectedError();

    const now = clock();
    const rawSessionSecret = authSecretGenerator.generate();
    const passwordHash = await passwordHasher.hash(newPassword);
    const sessionSecretHash = authSecretHasher.hash(rawSessionSecret);
    const expiresAt = new Date(now.getTime() + AUTH_SESSION_TTL_MS);
    await authRepository.changePasswordAndRotateSession({
      userId,
      passwordHash,
      sessionSecretHash,
      expiresAt,
      now,
    });
    return { rawSessionSecret, expiresAt };
  };
}
