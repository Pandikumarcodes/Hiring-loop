import { emailDeliveryFailedError } from '../../../errors/application-error.js';
import { normalizeEmail } from '../domain/normalize-email.js';
import {
  EMAIL_VERIFICATION_TTL_MS,
  isUniqueConstraintError,
} from '../repositories/auth-repository.js';

export const REGISTRATION_ACKNOWLEDGEMENT = Object.freeze({
  status: 'accepted',
  message:
    'If registration can be accepted, verification instructions will be sent.',
});

export function createRegisterUser({
  authRepository,
  passwordHasher,
  authSecretGenerator,
  authSecretHasher,
  emailDelivery,
  clock = () => new Date(),
}) {
  return async function registerUser({ email, password }) {
    const normalizedEmail = normalizeEmail(email);
    const existing = await authRepository.findUserByEmail(normalizedEmail);

    if (existing) return REGISTRATION_ACKNOWLEDGEMENT;

    const passwordHash = await passwordHasher.hash(password);
    const rawToken = authSecretGenerator.generate();
    const tokenHash = authSecretHasher.hash(rawToken);
    const now = clock();

    try {
      await authRepository.createRegistrationIdentity({
        email: normalizedEmail,
        passwordHash,
        tokenHash,
        now,
        expiresAt: new Date(now.getTime() + EMAIL_VERIFICATION_TTL_MS),
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) return REGISTRATION_ACKNOWLEDGEMENT;
      throw error;
    }

    try {
      await emailDelivery.sendEmailVerification({
        email: normalizedEmail,
        verificationToken: rawToken,
      });
    } catch (error) {
      throw emailDeliveryFailedError({ cause: error });
    }

    return REGISTRATION_ACKNOWLEDGEMENT;
  };
}
