import { notFoundError } from '../../../errors/application-error.js';

export function createResolveTenantContext({ organizationRepository }) {
  return async function resolveTenantContext({ userId, organizationId }) {
    const membership =
      await organizationRepository.findMembershipForUserAndOrganization({
        userId,
        organizationId,
      });

    if (!membership) throw notFoundError();

    return {
      organizationId: membership.organizationId,
      membershipId: membership.id,
      role: membership.role,
    };
  };
}
