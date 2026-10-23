import type { QueryClient } from '@tanstack/react-query'

import {
  cancelAndClearSessionScopedQueries,
  clearSessionScopedQueries,
} from '../../../app/providers/session-query-cleanup'
import { isApiError } from '../../../shared/lib/apiErrors'
import type { AuthUserDto } from '../types/auth.types'
import { authKeys } from './query-keys'

const expiryCleanupByClient = new WeakMap<QueryClient, Promise<void>>()

export function isAuthoritativeSessionExpiry(error: unknown): boolean {
  return (
    isApiError(error) &&
    error.kind === 'http' &&
    error.status === 401 &&
    error.code === 'UNAUTHENTICATED'
  )
}

/**
 * Atomically mark the session unauthenticated, discard CSRF state, and remove
 * protected data. A per-client promise coalesces concurrent 401 responses.
 */
export function expireAuthenticatedSession(
  queryClient: QueryClient,
): Promise<void> {
  const existing = expiryCleanupByClient.get(queryClient)
  if (existing) return existing

  // Set this first so protected routes stop rendering before asynchronous
  // cancellation/removal of protected queries completes.
  queryClient.setQueryData<AuthUserDto | null>(authKeys.currentUser(), null)
  queryClient.removeQueries({ queryKey: authKeys.csrf(), exact: true })

  const cleanup = cancelAndClearSessionScopedQueries(queryClient).finally(
    () => {
      expiryCleanupByClient.delete(queryClient)
    },
  )
  expiryCleanupByClient.set(queryClient, cleanup)
  return cleanup
}

/** Remove data tied to the old identity without changing the current-user key. */
export function clearAuthenticatedSessionData(queryClient: QueryClient): void {
  queryClient.removeQueries({ queryKey: authKeys.csrf(), exact: true })
  clearSessionScopedQueries(queryClient)
}
