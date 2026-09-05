import { queryOptions, useQuery } from '@tanstack/react-query'
import { getJob, listJobs } from '../api/jobs.api'
import type { JobFilters } from '../types/job.types'
import { jobKeys } from './query-keys'
export function jobsQueryOptions(
  organizationId: string,
  filters: JobFilters,
  enabled = true,
) {
  return queryOptions({
    queryKey: jobKeys.list(organizationId, filters),
    queryFn: ({ signal }) => listJobs(organizationId, filters, signal),
    enabled,
    placeholderData: (old) => old,
    meta: { clearOnAuthChange: true },
  })
}
export function jobQueryOptions(
  organizationId: string,
  jobId: string,
  enabled = true,
) {
  return queryOptions({
    queryKey: jobKeys.detail(organizationId, jobId),
    queryFn: ({ signal }) => getJob(organizationId, jobId, signal),
    enabled,
    meta: { clearOnAuthChange: true },
  })
}
export const useJobs = (
  organizationId: string,
  filters: JobFilters,
  enabled = true,
) => useQuery(jobsQueryOptions(organizationId, filters, enabled))
export const useJob = (organizationId: string, jobId: string, enabled = true) =>
  useQuery(jobQueryOptions(organizationId, jobId, enabled))
