import { useQuery } from '@tanstack/react-query'
import {
  getAnalyticsCommunications,
  getAnalyticsFunnel,
  getAnalyticsInterviews,
  getAnalyticsJobs,
  getAnalyticsOutcomes,
  getAnalyticsOverview,
  getAnalyticsPipeline,
} from '../api/analytics.api'
import type { AnalyticsFilters } from '../types/analytics.types'
import { analyticsKeys } from './query-keys'

const options = { meta: { clearOnAuthChange: true }, staleTime: 60_000 }

export function useAnalyticsOverview(
  o: string,
  f: AnalyticsFilters,
  enabled = true,
) {
  return useQuery({
    ...options,
    queryKey: analyticsKeys.overview(o, f),
    queryFn: ({ signal }) => getAnalyticsOverview(o, f, signal),
    enabled,
  })
}
export function useAnalyticsFunnel(
  o: string,
  f: AnalyticsFilters,
  enabled = true,
) {
  return useQuery({
    ...options,
    queryKey: analyticsKeys.funnel(o, f),
    queryFn: ({ signal }) => getAnalyticsFunnel(o, f, signal),
    enabled,
  })
}
export function useAnalyticsPipeline(
  o: string,
  f: AnalyticsFilters,
  enabled = true,
) {
  return useQuery({
    ...options,
    queryKey: analyticsKeys.pipeline(o, f),
    queryFn: ({ signal }) => getAnalyticsPipeline(o, f, signal),
    enabled,
  })
}
export function useAnalyticsInterviews(
  o: string,
  f: AnalyticsFilters,
  enabled = true,
) {
  return useQuery({
    ...options,
    queryKey: analyticsKeys.interviews(o, f),
    queryFn: ({ signal }) => getAnalyticsInterviews(o, f, signal),
    enabled,
  })
}
export function useAnalyticsCommunications(
  o: string,
  f: AnalyticsFilters,
  enabled = true,
) {
  return useQuery({
    ...options,
    queryKey: analyticsKeys.communications(o, f),
    queryFn: ({ signal }) => getAnalyticsCommunications(o, f, signal),
    enabled,
  })
}
export function useAnalyticsOutcomes(
  o: string,
  f: AnalyticsFilters,
  enabled = true,
) {
  return useQuery({
    ...options,
    queryKey: analyticsKeys.outcomes(o, f),
    queryFn: ({ signal }) => getAnalyticsOutcomes(o, f, signal),
    enabled,
  })
}
export function useAnalyticsJobs(
  o: string,
  f: AnalyticsFilters,
  page = 1,
  pageSize = 10,
  enabled = true,
) {
  return useQuery({
    ...options,
    queryKey: analyticsKeys.jobs(o, f, page, pageSize),
    queryFn: ({ signal }) => getAnalyticsJobs(o, f, page, pageSize, signal),
    enabled,
    placeholderData: (previous) => previous,
  })
}
