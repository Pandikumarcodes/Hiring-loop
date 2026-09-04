import { queryOptions, useQuery } from '@tanstack/react-query'
import { listInvitations, listMembers } from '../api/team.api'
import { teamKeys } from './query-keys'
export function membersQueryOptions(organizationId: string, enabled = true) {
  return queryOptions({
    queryKey: teamKeys.members(organizationId),
    queryFn: ({ signal }) => listMembers(organizationId, signal),
    enabled,
    meta: { clearOnAuthChange: true },
  })
}
export function invitationsQueryOptions(
  organizationId: string,
  enabled = true,
) {
  return queryOptions({
    queryKey: teamKeys.invitations(organizationId),
    queryFn: ({ signal }) => listInvitations(organizationId, signal),
    enabled,
    meta: { clearOnAuthChange: true },
  })
}
export function useMembers(organizationId: string, enabled = true) {
  return useQuery(membersQueryOptions(organizationId, enabled))
}
export function useInvitations(organizationId: string, enabled = true) {
  return useQuery(invitationsQueryOptions(organizationId, enabled))
}
