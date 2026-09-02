import { QueryClient, type DefaultOptions } from '@tanstack/react-query'

import { isApiError } from '../api/errors'

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

/** One in-memory QueryClient for the running application. */
export const appQueryClient = new QueryClient({
  defaultOptions: queryDefaults,
})
