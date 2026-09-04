import {
  conflictError,
  emailDeliveryFailedError,
} from '../../../errors/application-error.js';
import { normalizeEmail } from '../../auth/domain/normalize-email.js';
import { toInvitationDto } from '../domain/invitation-dto.js';

export const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function createCreateInvitation({
  invitationRepository,
  authSecretGenerator,
  authSecretHasher,
  deliverInvitation = async () => {},
  findOrganization = async () => null,
  clock = () => new Date(),
}) {
  return async function createInvitation({
    organizationId,
    inviterMembershipId,
    email,
    role,
  }) {
    const normalizedEmail = normalizeEmail(email);
    const existingMember = await invitationRepository.findMemberByEmail({
      organizationId,
      email: normalizedEmail,
    });
    if (existingMember) {
      throw conflictError('This email is already a member of the organization');
    }

    const organization = await findOrganization(organizationId);

    const rawToken = authSecretGenerator.generate();
    const now = clock();
    const invitation = await invitationRepository.createOrRotateInvitation({
      organizationId,
      email: normalizedEmail,
      role,
      tokenHash: authSecretHasher.hash(rawToken),
      expiresAt: new Date(now.getTime() + INVITATION_TTL_MS),
      inviterMembershipId,
      now,
    });

    // The raw token exists only at this transient delivery boundary. The
    // default no-op keeps Phase 07C from pretending email delivery is ready.
    try {
      await deliverInvitation({
        email: normalizedEmail,
        organizationName: organization?.name ?? 'HiringLoop workspace',
        role,
        expiresAt: invitation.expiresAt,
        rawToken,
      });
    } catch (error) {
      throw emailDeliveryFailedError({ operation: 'invitation', cause: error });
    }
    return toInvitationDto(invitation);
  };
}
