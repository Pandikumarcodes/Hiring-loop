import type { QueryClient } from '@tanstack/react-query'

export function isSessionScopedQuery(query: {
  readonly meta?: Record<string, unknown>
}): boolean {
  return query.meta?.clearOnAuthChange === true
}

/**
 * Remove data whose authorization is tied to the authenticated identity.
 * Feature query options opt in through metadata so this remains independent
 * of product-specific query keys.
 */
export function clearSessionScopedQueries(queryClient: QueryClient): void {
  queryClient.removeQueries({ predicate: isSessionScopedQuery })
}

/**
 * Abort active protected requests before their cache entries are removed.
 * This prevents a late response from restoring data after session expiry.
 */
export async function cancelAndClearSessionScopedQueries(
  queryClient: QueryClient,
): Promise<void> {
  await queryClient.cancelQueries({ predicate: isSessionScopedQuery })
  clearSessionScopedQueries(queryClient)
}
