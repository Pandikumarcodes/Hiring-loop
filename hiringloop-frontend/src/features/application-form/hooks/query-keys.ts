export const applicationFormKeys = {
  all: (organizationId: string, jobId: string) =>
    ['application-form', organizationId, jobId] as const,
  builder: (organizationId: string, jobId: string) =>
    [...applicationFormKeys.all(organizationId, jobId), 'builder'] as const,
}
