import { emailDeliveryFailedError } from '../../../errors/application-error.js';
import { normalizeEmail } from '../domain/normalize-email.js';
import { passwordResetUrl } from '../email/email-delivery.js';
import { PASSWORD_RESET_TTL_MS } from '../repositories/auth-repository.js';

export const FORGOT_PASSWORD_ACKNOWLEDGEMENT = Object.freeze({
  status: 'accepted',
  message:
    'If the account is eligible, password reset instructions will be sent.',
});

export function createForgotPassword({
  authRepository,
  authSecretGenerator,
  authSecretHasher,
  emailDelivery,
  frontendOrigin,
  clock = () => new Date(),
}) {
  return async function forgotPassword({ email }) {
    const user = await authRepository.findPasswordResetIdentityByEmail(
      normalizeEmail(email),
    );
    if (!user?.passwordCredential) return FORGOT_PASSWORD_ACKNOWLEDGEMENT;

    const rawToken = authSecretGenerator.generate();
    const now = clock();
    await authRepository.replacePasswordResetToken({
      userId: user.id,
      tokenHash: authSecretHasher.hash(rawToken),
      now,
      expiresAt: new Date(now.getTime() + PASSWORD_RESET_TTL_MS),
    });

    try {
      await emailDelivery.sendPasswordReset({
        email: user.email,
        resetToken: rawToken,
        resetUrl: frontendOrigin
          ? passwordResetUrl(frontendOrigin, rawToken)
          : undefined,
      });
    } catch (error) {
      throw emailDeliveryFailedError({ cause: error });
    }
    return FORGOT_PASSWORD_ACKNOWLEDGEMENT;
  };
}
