import type { AnalyticsFilters } from '../types/analytics.types'

export const analyticsKeys = {
  all: (organizationId: string) => ['analytics', organizationId] as const,
  overview: (organizationId: string, filters: AnalyticsFilters) =>
    [...analyticsKeys.all(organizationId), 'overview', filters] as const,
  funnel: (organizationId: string, filters: AnalyticsFilters) =>
    [...analyticsKeys.all(organizationId), 'funnel', filters] as const,
  pipeline: (organizationId: string, filters: AnalyticsFilters) =>
    [...analyticsKeys.all(organizationId), 'pipeline', filters] as const,
  interviews: (organizationId: string, filters: AnalyticsFilters) =>
    [...analyticsKeys.all(organizationId), 'interviews', filters] as const,
  communications: (organizationId: string, filters: AnalyticsFilters) =>
    [...analyticsKeys.all(organizationId), 'communications', filters] as const,
  outcomes: (organizationId: string, filters: AnalyticsFilters) =>
    [...analyticsKeys.all(organizationId), 'outcomes', filters] as const,
  jobs: (
    organizationId: string,
    filters: AnalyticsFilters,
    page: number,
    pageSize: number,
  ) =>
    [
      ...analyticsKeys.all(organizationId),
      'jobs',
      filters,
      { page, pageSize },
    ] as const,
}
