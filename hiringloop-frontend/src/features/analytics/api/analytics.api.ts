import { apiRequest } from '../../../shared/lib/apiClient'
import { ApiError } from '../../../shared/lib/apiErrors'
import type {
  AnalyticsCommunications,
  AnalyticsFilters,
  AnalyticsFunnel,
  AnalyticsInterviews,
  AnalyticsJobsPage,
  AnalyticsOutcomes,
  AnalyticsOverview,
  AnalyticsPipeline,
} from '../types/analytics.types'

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

function invalid(): never {
  throw new ApiError({
    kind: 'response',
    code: 'INVALID_API_RESPONSE',
    message: 'The server returned an invalid analytics response.',
  })
}

function base(organizationId: string) {
  return `/organizations/${encodeURIComponent(organizationId)}/analytics`
}

function query(filters: AnalyticsFilters, page?: number, pageSize?: number) {
  const params = new URLSearchParams({ from: filters.from, to: filters.to })
  if (filters.jobId) params.set('jobId', filters.jobId)
  if (page !== undefined) params.set('page', String(page))
  if (pageSize !== undefined) params.set('pageSize', String(pageSize))
  return params
}

async function data(path: string, signal?: AbortSignal): Promise<unknown> {
  const response = await apiRequest<unknown>(path, { signal })
  if (!record(response) || !('data' in response)) return invalid()
  return response.data
}

function objectData<T>(value: unknown): T {
  return record(value) ? (value as T) : invalid()
}

export const getAnalyticsOverview = async (
  organizationId: string,
  filters: AnalyticsFilters,
  signal?: AbortSignal,
) =>
  objectData<AnalyticsOverview>(
    await data(`${base(organizationId)}/overview?${query(filters)}`, signal),
  )

export const getAnalyticsFunnel = async (
  organizationId: string,
  filters: AnalyticsFilters,
  signal?: AbortSignal,
) =>
  objectData<AnalyticsFunnel>(
    await data(`${base(organizationId)}/funnel?${query(filters)}`, signal),
  )

export const getAnalyticsPipeline = async (
  organizationId: string,
  filters: AnalyticsFilters,
  signal?: AbortSignal,
) =>
  objectData<AnalyticsPipeline>(
    await data(`${base(organizationId)}/pipeline?${query(filters)}`, signal),
  )

export const getAnalyticsInterviews = async (
  organizationId: string,
  filters: AnalyticsFilters,
  signal?: AbortSignal,
) =>
  objectData<AnalyticsInterviews>(
    await data(`${base(organizationId)}/interviews?${query(filters)}`, signal),
  )

export const getAnalyticsCommunications = async (
  organizationId: string,
  filters: AnalyticsFilters,
  signal?: AbortSignal,
) =>
  objectData<AnalyticsCommunications>(
    await data(
      `${base(organizationId)}/communications?${query(filters)}`,
      signal,
    ),
  )

export const getAnalyticsOutcomes = async (
  organizationId: string,
  filters: AnalyticsFilters,
  signal?: AbortSignal,
) =>
  objectData<AnalyticsOutcomes>(
    await data(`${base(organizationId)}/outcomes?${query(filters)}`, signal),
  )

export const getAnalyticsJobs = async (
  organizationId: string,
  filters: AnalyticsFilters,
  page: number,
  pageSize: number,
  signal?: AbortSignal,
) =>
  objectData<AnalyticsJobsPage>(
    await data(
      `${base(organizationId)}/jobs?${query(filters, page, pageSize)}`,
      signal,
    ),
  )
