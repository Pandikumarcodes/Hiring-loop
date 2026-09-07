import { queryOptions, useQuery } from '@tanstack/react-query'
import { getPublicApplicationForm } from '../../public-careers/api/public-application.api'
import { publicCareerKeys } from '../../public-careers/hooks/query-keys'

export function publicApplicationFormQueryOptions(
  organizationSlug: string,
  jobId: string,
) {
  return queryOptions({
    queryKey: publicCareerKeys.applicationForm(organizationSlug, jobId),
    queryFn: ({ signal }) =>
      getPublicApplicationForm(organizationSlug, jobId, signal),
    enabled: Boolean(organizationSlug && jobId),
    staleTime: 5 * 60_000,
  })
}

export function usePublicApplicationForm(
  organizationSlug: string,
  jobId: string,
) {
  return useQuery(publicApplicationFormQueryOptions(organizationSlug, jobId))
}
