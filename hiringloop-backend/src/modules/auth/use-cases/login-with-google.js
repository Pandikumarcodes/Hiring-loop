import { normalizeEmail } from '../domain/normalize-email.js';
import {
  GOOGLE_PROVIDER,
  isUniqueConstraintError,
} from '../repositories/auth-repository.js';
import { conflictError } from '../../../errors/application-error.js';

export const ACCOUNT_LINKING_REQUIRED = 'ACCOUNT_LINKING_REQUIRED';

export function createLoginWithGoogle({
  authRepository,
  createSession,
  clock = () => new Date(),
}) {
  return async function loginWithGoogle(identity) {
    const providerSubject = identity.providerSubject;
    const existing = await authRepository.findProviderIdentity({
      provider: GOOGLE_PROVIDER,
      providerSubject,
    });
    if (existing) return createSession(existing.user);

    const email = normalizeEmail(identity.email);
    const emailUser = await authRepository.findUserByEmail(email);
    if (emailUser)
      throw conflictError(
        'This Google account requires explicit account linking.',
        { reason: ACCOUNT_LINKING_REQUIRED },
      );

    let user;
    try {
      user = await authRepository.createGoogleIdentity({
        email,
        providerSubject,
        emailVerifiedAt: identity.emailVerified ? clock() : null,
        now: clock(),
      });
    } catch (error) {
      if (!isUniqueConstraintError(error)) throw error;
      const raced = await authRepository.findProviderIdentity({
        provider: GOOGLE_PROVIDER,
        providerSubject,
      });
      if (raced) return createSession(raced.user);
      throw error;
    }
    return createSession(user);
  };
}
