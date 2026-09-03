import { queryOptions, useQuery, useQueryClient } from '@tanstack/react-query'

import { isApiError } from '../../../shared/lib/apiErrors'
import { getCsrfToken, getCurrentUser } from '../api/auth.api'
import { authKeys } from './query-keys'
import type { AuthUserDto } from '../types/auth.types'

export function currentUserQueryOptions() {
  return queryOptions({
    queryKey: authKeys.currentUser(),
    queryFn: async ({ signal }): Promise<AuthUserDto | null> => {
      try {
        return (await getCurrentUser(signal)).user
      } catch (error) {
        if (
          isApiError(error) &&
          error.status === 401 &&
          error.code === 'UNAUTHENTICATED'
        ) {
          return null
        }

        throw error
      }
    },
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  })
}

export function csrfQueryOptions() {
  return queryOptions({
    queryKey: authKeys.csrf(),
    queryFn: async ({ signal }) => (await getCsrfToken(signal)).csrfToken,
    staleTime: Infinity,
    gcTime: 5 * 60_000,
  })
}

/**
 * Server-state contract:
 * - authenticated: `user` is an AuthUserDto
 * - confirmed unauthenticated: `isUnauthenticated` is true and `user` is null
 * - backend/network failure: `isError` is true, never unauthenticated
 */
export function useCurrentUser() {
  const query = useQuery(currentUserQueryOptions())
  const isAuthenticated = query.isSuccess && query.data !== null
  const isUnauthenticated = query.isSuccess && query.data === null

  return {
    ...query,
    user: query.data ?? null,
    isAuthenticated,
    isUnauthenticated,
  }
}

/** CSRF remains opt-in so application bootstrap performs only `/auth/me`. */
export function useCsrfToken(enabled = false) {
  const queryClient = useQueryClient()
  const currentUser = queryClient.getQueryData<AuthUserDto | null>(
    authKeys.currentUser(),
  )

  return useQuery({
    ...csrfQueryOptions(),
    enabled: enabled && currentUser !== null && currentUser !== undefined,
  })
}
