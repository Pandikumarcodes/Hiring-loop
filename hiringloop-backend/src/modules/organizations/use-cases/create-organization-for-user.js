import { conflictError } from '../../../errors/application-error.js';
import { toOrganizationDto } from '../domain/organization-dto.js';

export function createCreateOrganizationForUser({ organizationRepository }) {
  return async function createOrganizationForUser({
    userId,
    organizationInput,
  }) {
    try {
      const organization =
        await organizationRepository.createOrganizationWithAdminMembership({
          userId,
          ...organizationInput,
        });
      return toOrganizationDto(organization);
    } catch (error) {
      if (error?.code === 'P2002') {
        throw conflictError('Organization membership already exists.');
      }
      throw error;
    }
  };
}
