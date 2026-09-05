import { ROLE_PERMISSIONS } from '../../../authorization/permissions.js';
import { toCurrentOrganizationDto } from '../domain/organization-dto.js';

export function createGetOrganizationById({ organizationRepository }) {
  return async function getOrganizationById({ organizationId, role }) {
    const organization =
      await organizationRepository.findOrganizationById(organizationId);
    return organization
      ? toCurrentOrganizationDto(organization, ROLE_PERMISSIONS[role] ?? [])
      : null;
  };
}
