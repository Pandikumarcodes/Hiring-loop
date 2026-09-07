import { queryOptions, useQuery } from '@tanstack/react-query'
import { getApplicationForm } from '../api/application-form.api'
import { applicationFormKeys } from './query-keys'
export function applicationFormQueryOptions(
  organizationId: string,
  jobId: string,
  enabled = true,
) {
  return queryOptions({
    queryKey: applicationFormKeys.builder(organizationId, jobId),
    queryFn: ({ signal }) => getApplicationForm(organizationId, jobId, signal),
    enabled,
    meta: { clearOnAuthChange: true },
  })
}
export const useApplicationForm = (
  organizationId: string,
  jobId: string,
  enabled = true,
) => useQuery(applicationFormQueryOptions(organizationId, jobId, enabled))
