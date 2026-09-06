export const pipelineKeys = {
  all: (organizationId: string, jobId: string) =>
    ['pipeline', organizationId, jobId] as const,
  detail: (organizationId: string, jobId: string) =>
    [...pipelineKeys.all(organizationId, jobId), 'detail'] as const,
}
