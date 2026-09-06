export function toOrganizationDto(organization) {
  return {
    id: organization.id,
    name: organization.name,
    slug: organization.slug,
    website: organization.website,
    description: organization.description,
    createdAt: organization.createdAt,
    updatedAt: organization.updatedAt,
  };
}

export function toCurrentOrganizationDto(organization, permissions) {
  return {
    ...toOrganizationDto(organization),
    permissions: [...permissions],
  };
}
