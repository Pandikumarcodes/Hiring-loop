import {
  QueryCache,
  QueryClient,
  type DefaultOptions,
} from '@tanstack/react-query'

import { isSessionScopedQuery } from './session-query-cleanup'
import {
  expireAuthenticatedSession,
  isAuthoritativeSessionExpiry,
} from '../../features/auth/hooks/session-expiry'
import { isApiError } from '../../shared/lib/apiErrors'

export { clearSessionScopedQueries } from './session-query-cleanup'

const MAX_QUERY_RETRIES = 2

/**
 * Retry only failures that may succeed without changing the request.
 * Deterministic client/configuration failures and cancellations are terminal.
 */
export function shouldRetryQuery(
  failureCount: number,
  error: unknown,
): boolean {
  if (failureCount >= MAX_QUERY_RETRIES) {
    return false
  }

  if (isApiError(error)) {
    if (error.kind === 'aborted' || error.kind === 'configuration') {
      return false
    }

    if (error.kind === 'http') {
      return error.status !== undefined && error.status >= 500
    }

    return error.kind === 'network'
  }

  // A non-ApiError is treated as a possible transient/network failure.
  return true
}

export function queryRetryDelay(attemptIndex: number): number {
  return Math.min(1000 * 2 ** attemptIndex, 30_000)
}

const queryDefaults: DefaultOptions = {
  queries: {
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    retry: shouldRetryQuery,
    retryDelay: queryRetryDelay,
  },
  mutations: {
    retry: false,
  },
}

export function createAppQueryClient(): QueryClient {
  let queryClient: QueryClient
  const queryCache = new QueryCache({
    onError: (error, query) => {
      if (isSessionScopedQuery(query) && isAuthoritativeSessionExpiry(error)) {
        void expireAuthenticatedSession(queryClient)
      }
    },
  })
  queryClient = new QueryClient({
    defaultOptions: queryDefaults,
    queryCache,
  })
  return queryClient
}

/** One in-memory QueryClient for the running application. */
export const appQueryClient = createAppQueryClient()
