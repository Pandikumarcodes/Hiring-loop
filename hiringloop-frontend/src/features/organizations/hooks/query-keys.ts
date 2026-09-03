export const organizationKeys = {
  all: ['organizations'] as const,
  list: () => [...organizationKeys.all] as const,
  detail: (organizationId: string) =>
    [...organizationKeys.all, organizationId] as const,
}
