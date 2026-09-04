import { toInvitationDto } from '../domain/invitation-dto.js';

export function createListInvitations({ invitationRepository }) {
  return async function listInvitations({ organizationId }) {
    const invitations = await invitationRepository.listInvitations({
      organizationId,
    });
    return invitations.map(toInvitationDto);
  };
}
