import { authTokenInvalidError } from '../../../errors/application-error.js';

export function createResetPassword({
  authRepository,
  passwordHasher,
  authSecretHasher,
  clock = () => new Date(),
}) {
  return async function resetPassword({ token, newPassword }) {
    const storedToken = await authRepository.findPasswordResetTokenByHash(
      authSecretHasher.hash(token),
    );
    const now = clock();
    if (
      !storedToken ||
      storedToken.purpose !== 'PASSWORD_RESET' ||
      storedToken.consumedAt ||
      storedToken.expiresAt <= now ||
      !storedToken.user?.passwordCredential
    ) {
      throw authTokenInvalidError();
    }

    const passwordHash = await passwordHasher.hash(newPassword);
    const consumed = await authRepository.consumePasswordResetAndChangePassword(
      {
        tokenId: storedToken.id,
        userId: storedToken.userId,
        passwordHash,
        now,
      },
    );
    if (!consumed) throw authTokenInvalidError();
    return { status: 'password_reset' };
  };
}
