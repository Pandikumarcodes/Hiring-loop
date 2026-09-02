import { authTokenInvalidError } from '../../../errors/application-error.js';

export function createVerifyEmail({
  authRepository,
  authSecretHasher,
  clock = () => new Date(),
}) {
  return async function verifyEmail({ token }) {
    const tokenHash = authSecretHasher.hash(token);
    const storedToken = await authRepository.findTokenByHash(tokenHash);
    const now = clock();

    if (
      !storedToken ||
      storedToken.purpose !== 'EMAIL_VERIFICATION' ||
      storedToken.consumedAt ||
      storedToken.expiresAt <= now
    ) {
      throw authTokenInvalidError();
    }

    const consumed = await authRepository.consumeEmailVerificationToken({
      tokenId: storedToken.id,
      userId: storedToken.userId,
      now,
    });

    if (!consumed) throw authTokenInvalidError();

    return {
      status: 'verified',
      message: 'Email address verified successfully',
    };
  };
}
