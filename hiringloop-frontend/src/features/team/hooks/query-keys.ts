export const teamKeys = {
  members: (organizationId: string) =>
    ['organizations', organizationId, 'members'] as const,
  invitations: (organizationId: string) =>
    ['organizations', organizationId, 'invitations'] as const,
}
