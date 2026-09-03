import type { QueryClient } from '@tanstack/react-query'

import { ApiError, isApiError } from '../../../shared/lib/apiErrors'
import { authKeys } from './query-keys'
import { csrfQueryOptions } from './queries'
import type { AuthUserDto } from '../types/auth.types'

export async function runAuthenticatedAuthMutation<TResult>(
  queryClient: QueryClient,
  mutation: (csrfToken: string) => Promise<TResult>,
): Promise<TResult> {
  const currentUser = queryClient.getQueryData<AuthUserDto | null>(
    authKeys.currentUser(),
  )

  if (currentUser === null) {
    throw new ApiError({
      kind: 'http',
      status: 401,
      code: 'UNAUTHENTICATED',
      message: 'Authentication is required.',
    })
  }

  try {
    const csrfToken = await queryClient.ensureQueryData(csrfQueryOptions())
    return await mutation(csrfToken)
  } catch (error) {
    if (isApiError(error) && error.code === 'CSRF_INVALID') {
      queryClient.removeQueries({ queryKey: authKeys.csrf(), exact: true })
    }
    if (
      isApiError(error) &&
      error.status === 401 &&
      error.code === 'UNAUTHENTICATED'
    ) {
      queryClient.setQueryData<AuthUserDto | null>(authKeys.currentUser(), null)
      queryClient.removeQueries({ queryKey: authKeys.csrf(), exact: true })
    }

    throw error
  }
}
