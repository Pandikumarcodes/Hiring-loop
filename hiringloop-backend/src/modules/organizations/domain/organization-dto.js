export function toOrganizationDto(organization) {
  return {
    id: organization.id,
    name: organization.name,
    website: organization.website,
    description: organization.description,
    createdAt: organization.createdAt,
    updatedAt: organization.updatedAt,
  };
}
