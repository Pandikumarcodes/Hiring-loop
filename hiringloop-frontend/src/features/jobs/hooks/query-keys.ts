import type { JobFilters } from '../types/job.types'
export const jobKeys = {
  all: (organizationId: string) => ['jobs', organizationId] as const,
  lists: (organizationId: string) =>
    [...jobKeys.all(organizationId), 'list'] as const,
  list: (organizationId: string, filters: JobFilters) =>
    [...jobKeys.lists(organizationId), filters] as const,
  details: (organizationId: string) =>
    [...jobKeys.all(organizationId), 'detail'] as const,
  detail: (organizationId: string, jobId: string) =>
    [...jobKeys.details(organizationId), jobId] as const,
}
