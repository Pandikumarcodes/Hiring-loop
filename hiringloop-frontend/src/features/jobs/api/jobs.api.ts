import { apiRequest } from '../../../shared/lib/apiClient'
import { ApiError } from '../../../shared/lib/apiErrors'
import type {
  JobDetailDto,
  JobFilters,
  JobInput,
  JobPage,
} from '../types/job.types'
const record = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null
function invalid(): never {
  throw new ApiError({
    kind: 'response',
    code: 'INVALID_API_RESPONSE',
    message: 'The server returned an invalid response.',
  })
}
const base = (organizationId: string) =>
  `/organizations/${encodeURIComponent(organizationId)}/jobs`
function job(response: unknown): JobDetailDto {
  return record(response) && record(response.data) && record(response.data.job)
    ? (response.data.job as unknown as JobDetailDto)
    : invalid()
}
export async function createJob(
  organizationId: string,
  input: JobInput,
  csrf: string,
) {
  return job(
    await apiRequest(base(organizationId), {
      method: 'POST',
      body: { ...input },
      headers: { 'X-CSRF-Token': csrf },
    }),
  )
}
export async function listJobs(
  organizationId: string,
  filters: JobFilters,
  signal?: AbortSignal,
): Promise<JobPage> {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== '') params.set(key, String(value))
  })
  const response = await apiRequest(`${base(organizationId)}?${params}`, {
    signal,
  })
  if (
    !record(response) ||
    !record(response.data) ||
    !Array.isArray(response.data.jobs) ||
    !record(response.pagination)
  )
    return invalid()
  return {
    jobs: response.data.jobs as unknown as JobPage['jobs'],
    pagination: response.pagination as unknown as JobPage['pagination'],
  }
}
export async function getJob(
  organizationId: string,
  jobId: string,
  signal?: AbortSignal,
) {
  return job(
    await apiRequest(`${base(organizationId)}/${encodeURIComponent(jobId)}`, {
      signal,
    }),
  )
}
export async function updateJob(
  organizationId: string,
  jobId: string,
  input: JobInput & { expectedVersion: number },
  csrf: string,
) {
  return job(
    await apiRequest(`${base(organizationId)}/${encodeURIComponent(jobId)}`, {
      method: 'PATCH',
      body: { ...input },
      headers: { 'X-CSRF-Token': csrf },
    }),
  )
}
export type JobAction = 'open' | 'close' | 'reopen' | 'archive'
export async function transitionJob(
  organizationId: string,
  jobId: string,
  action: JobAction,
  expectedVersion: number,
  csrf: string,
) {
  return job(
    await apiRequest(
      `${base(organizationId)}/${encodeURIComponent(jobId)}/${action}`,
      {
        method: 'POST',
        body: { expectedVersion },
        headers: { 'X-CSRF-Token': csrf },
      },
    ),
  )
}
