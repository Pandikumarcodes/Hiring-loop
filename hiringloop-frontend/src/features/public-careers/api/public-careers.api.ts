import { ApiError } from '../../../shared/lib/apiErrors'
import { apiRequest } from '../../../shared/lib/apiClient'
import type {
  PublicCareerJob,
  PublicCareerPage,
} from '../types/public-career.types'

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null
const invalid = (): never => {
  throw new ApiError({
    kind: 'response',
    code: 'INVALID_API_RESPONSE',
    message: 'The server returned an invalid response.',
  })
}
const base = (slug: string) =>
  `/public/careers/${encodeURIComponent(slug)}/jobs`

export async function getPublicCareerJobs(
  slug: string,
  page: number,
  pageSize: number,
  signal?: AbortSignal,
): Promise<PublicCareerPage> {
  const response = await apiRequest(
    `${base(slug)}?${new URLSearchParams({ page: String(page), pageSize: String(pageSize) })}`,
    { signal },
  )
  if (
    !record(response) ||
    !record(response.data) ||
    !record(response.data.organization) ||
    !Array.isArray(response.data.jobs) ||
    !record(response.pagination)
  )
    return invalid()
  return {
    organization: response.data
      .organization as unknown as PublicCareerPage['organization'],
    jobs: response.data.jobs as unknown as PublicCareerPage['jobs'],
    pagination:
      response.pagination as unknown as PublicCareerPage['pagination'],
  }
}

export async function getPublicCareerJob(
  slug: string,
  jobId: string,
  signal?: AbortSignal,
): Promise<PublicCareerJob> {
  const response = await apiRequest(
    `${base(slug)}/${encodeURIComponent(jobId)}`,
    { signal },
  )
  if (
    !record(response) ||
    !record(response.data) ||
    !record(response.data.organization) ||
    !record(response.data.job)
  )
    return invalid()
  return response.data as unknown as PublicCareerJob
}
