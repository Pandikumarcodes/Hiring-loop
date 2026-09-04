import { useMutation, useQueryClient } from '@tanstack/react-query'
import { runAuthenticatedAuthMutation } from '../../auth/hooks/authenticated-mutation'
import { authKeys } from '../../auth/hooks/query-keys'
import {
  createInvitation,
  removeMember,
  revokeInvitation,
  updateMemberRole,
  acceptInvitation,
} from '../api/team.api'
import type { TeamRole } from '../types/team.types'
import { teamKeys } from './query-keys'
import { organizationKeys } from '../../organizations/hooks/query-keys'
import { isApiError } from '../../../shared/lib/apiErrors'
export function useInviteMember(organizationId: string) {
  const c = useQueryClient()
  return useMutation({
    mutationFn: (input: { email: string; role: TeamRole }) =>
      runAuthenticatedAuthMutation(c, (token) =>
        createInvitation(organizationId, input, token),
      ),
    onSuccess: () =>
      c.invalidateQueries({
        queryKey: teamKeys.invitations(organizationId),
        exact: true,
      }),
    onError: (error) => {
      if (isApiError(error) && error.code === 'EMAIL_DELIVERY_FAILED') {
        return c.invalidateQueries({
          queryKey: teamKeys.invitations(organizationId),
          exact: true,
        })
      }
    },
  })
}
export function useChangeMemberRole(organizationId: string) {
  const c = useQueryClient()
  return useMutation({
    mutationFn: (input: { membershipId: string; role: TeamRole }) =>
      runAuthenticatedAuthMutation(c, (token) =>
        updateMemberRole(organizationId, input.membershipId, input.role, token),
      ),
    onSuccess: async () => {
      await c.invalidateQueries({
        queryKey: teamKeys.members(organizationId),
        exact: true,
      })
      await c.invalidateQueries({
        queryKey: organizationKeys.list(),
        exact: true,
      })
      c.invalidateQueries({ queryKey: authKeys.currentUser(), exact: true })
    },
  })
}
export function useRemoveMember(organizationId: string) {
  const c = useQueryClient()
  return useMutation({
    mutationFn: (membershipId: string) =>
      runAuthenticatedAuthMutation(c, (token) =>
        removeMember(organizationId, membershipId, token),
      ),
    onSuccess: async () => {
      await c.invalidateQueries({
        queryKey: teamKeys.members(organizationId),
        exact: true,
      })
      await c.invalidateQueries({
        queryKey: organizationKeys.list(),
        exact: true,
      })
    },
  })
}
export function useRevokeInvitation(organizationId: string) {
  const c = useQueryClient()
  return useMutation({
    mutationFn: (invitationId: string) =>
      runAuthenticatedAuthMutation(c, (token) =>
        revokeInvitation(organizationId, invitationId, token),
      ),
    onSuccess: () =>
      c.invalidateQueries({
        queryKey: teamKeys.invitations(organizationId),
        exact: true,
      }),
  })
}
export function useAcceptInvitation() {
  const c = useQueryClient()
  return useMutation({
    mutationFn: (token: string) =>
      runAuthenticatedAuthMutation(c, (csrf) => acceptInvitation(token, csrf)),
    onSuccess: async (result) => {
      await c.invalidateQueries({
        queryKey: organizationKeys.list(),
        exact: true,
      })
      await c.invalidateQueries({
        queryKey: organizationKeys.detail(result.organization.id),
        exact: true,
      })
    },
  })
}
