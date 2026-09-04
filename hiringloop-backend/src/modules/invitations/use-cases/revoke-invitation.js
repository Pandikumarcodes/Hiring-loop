import {
  conflictError,
  notFoundError,
} from '../../../errors/application-error.js';
import { toInvitationDto } from '../domain/invitation-dto.js';

export function createRevokeInvitation({
  invitationRepository,
  clock = () => new Date(),
}) {
  return async function revokeInvitation({ organizationId, invitationId }) {
    const invitation = await invitationRepository.findInvitation({
      organizationId,
      invitationId,
    });
    if (!invitation) throw notFoundError();
    if (invitation.acceptedAt) {
      throw conflictError('An accepted invitation cannot be revoked');
    }
    if (invitation.revokedAt) return toInvitationDto(invitation);
    const now = clock();
    if (invitation.expiresAt <= now) {
      throw conflictError('An expired invitation cannot be revoked');
    }

    const revoked = await invitationRepository.revokeInvitation({
      organizationId,
      invitationId,
      now,
    });
    if (!revoked) throw conflictError('Invitation is no longer revocable');
    return toInvitationDto(revoked);
  };
}
