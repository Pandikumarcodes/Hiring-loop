import { QueryClient } from '@tanstack/react-query'

/** Creates a fresh, deterministic cache for each test case. */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        // Keep unobserved cache entries available for deterministic assertions.
        // Every test still receives a fresh QueryClient, so no state is shared.
        gcTime: Infinity,
      },
      mutations: {
        retry: false,
      },
    },
  })
}
