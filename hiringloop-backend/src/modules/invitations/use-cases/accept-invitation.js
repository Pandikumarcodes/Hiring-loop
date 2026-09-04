import {
  forbiddenError,
  notFoundError,
  unauthenticatedError,
} from '../../../errors/application-error.js';
import { normalizeEmail } from '../../auth/domain/normalize-email.js';
import { toOrganizationDto } from '../../organizations/domain/organization-dto.js';

export function createAcceptInvitation({
  invitationRepository,
  authSecretHasher,
  clock = () => new Date(),
}) {
  return async function acceptInvitation({ token, auth }) {
    if (!auth?.userId || !auth.user?.email) throw unauthenticatedError();
    if (auth.user.emailVerified !== true) {
      throw forbiddenError();
    }

    const result = await invitationRepository.acceptInvitation({
      tokenHash: authSecretHasher.hash(token),
      userId: auth.userId,
      normalizedEmail: normalizeEmail(auth.user.email),
      now: clock(),
    });
    if (result.outcome === 'identity_mismatch') throw forbiddenError();
    if (result.outcome !== 'accepted' && result.outcome !== 'already_member') {
      throw notFoundError();
    }

    return {
      organization: toOrganizationDto(result.invitation.organization),
      membership: {
        id: result.membership.id,
        organizationId: result.membership.organizationId,
        role: result.membership.role,
      },
    };
  };
}
