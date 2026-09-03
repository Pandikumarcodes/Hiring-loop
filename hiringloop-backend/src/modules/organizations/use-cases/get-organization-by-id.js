import { toOrganizationDto } from '../domain/organization-dto.js';

export function createGetOrganizationById({ organizationRepository }) {
  return async function getOrganizationById(organizationId) {
    const organization =
      await organizationRepository.findOrganizationById(organizationId);
    return organization ? toOrganizationDto(organization) : null;
  };
}
