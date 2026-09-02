import { emailDeliveryFailedError } from '../../../errors/application-error.js';
import { normalizeEmail } from '../domain/normalize-email.js';
import { EMAIL_VERIFICATION_TTL_MS } from '../repositories/auth-repository.js';

export const RESEND_VERIFICATION_ACKNOWLEDGEMENT = Object.freeze({
  status: 'accepted',
  message: 'If the account is eligible, a verification email will be sent.',
});

export function createResendVerification({
  authRepository,
  authSecretGenerator,
  authSecretHasher,
  emailDelivery,
  clock = () => new Date(),
}) {
  return async function resendVerification({ email }) {
    const normalizedEmail = normalizeEmail(email);
    const user = await authRepository.findUserByEmail(normalizedEmail);

    if (!user || user.emailVerifiedAt) {
      return RESEND_VERIFICATION_ACKNOWLEDGEMENT;
    }

    const rawToken = authSecretGenerator.generate();
    const now = clock();
    await authRepository.replaceEmailVerificationToken({
      userId: user.id,
      tokenHash: authSecretHasher.hash(rawToken),
      now,
      expiresAt: new Date(now.getTime() + EMAIL_VERIFICATION_TTL_MS),
    });

    try {
      await emailDelivery.sendEmailVerification({
        email: normalizedEmail,
        verificationToken: rawToken,
      });
    } catch (error) {
      throw emailDeliveryFailedError({ cause: error });
    }

    return RESEND_VERIFICATION_ACKNOWLEDGEMENT;
  };
}
