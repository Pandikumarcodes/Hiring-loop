import { queryOptions, useQuery } from '@tanstack/react-query'

import { getOrganization, listOrganizations } from '../api/organizations.api'
import { organizationKeys } from './query-keys'

export function organizationsQueryOptions() {
  return queryOptions({
    queryKey: organizationKeys.list(),
    queryFn: ({ signal }) => listOrganizations(signal),
    meta: { clearOnAuthChange: true },
    staleTime: 30_000,
  })
}

export function organizationQueryOptions(
  organizationId: string,
  enabled = true,
) {
  return queryOptions({
    queryKey: organizationKeys.detail(organizationId),
    queryFn: ({ signal }) => getOrganization(organizationId, signal),
    enabled,
    meta: { clearOnAuthChange: true },
  })
}

export function useOrganizations() {
  return useQuery(organizationsQueryOptions())
}

export function useOrganization(organizationId: string, enabled = true) {
  return useQuery(organizationQueryOptions(organizationId, enabled))
}
