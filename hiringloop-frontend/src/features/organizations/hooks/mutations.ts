import { useMutation, useQueryClient } from '@tanstack/react-query'

import { createOrganization } from '../api/organizations.api'
import type { CreateOrganizationInput } from '../types/organization.types'
import { runAuthenticatedAuthMutation } from '../../auth/hooks/authenticated-mutation'
import { organizationKeys } from './query-keys'

export function useCreateOrganization() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateOrganizationInput) =>
      runAuthenticatedAuthMutation(queryClient, (csrfToken) =>
        createOrganization(input, csrfToken),
      ),
    onSuccess: async (organization) => {
      queryClient.setQueryData<readonly (typeof organization)[]>(
        organizationKeys.list(),
        (current) => (current ? [...current, organization] : [organization]),
      )
      queryClient.setQueryData(
        organizationKeys.detail(organization.id),
        organization,
      )
      await queryClient.invalidateQueries({
        queryKey: organizationKeys.list(),
        exact: true,
      })
    },
  })
}
