import { cleanup, render, screen, waitFor } from '@testing-library/react'
import {
  QueryClientProvider,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { afterEach, describe, expect, test, vi } from 'vitest'

import { ApiError } from '../../shared/lib/apiErrors'
import { createTestQueryClient } from '../../tests/query-client'
import { AppProviders } from './AppProviders'
import {
  appQueryClient,
  clearSessionScopedQueries,
  createAppQueryClient,
  queryRetryDelay,
  shouldRetryQuery,
} from './query-client'
import { authKeys } from '../../features/auth/hooks/query-keys'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

function QueryResult({
  queryKey,
  queryFn,
}: {
  queryKey: readonly unknown[]
  queryFn: () => Promise<string>
}) {
  const query = useQuery({ queryKey, queryFn })

  if (query.isPending) return <p>Loading</p>
  if (query.isError) return <p role="alert">{query.error.message}</p>

  return <p>{query.data}</p>
}

describe('application query foundation', () => {
  test('AppProviders supplies the application QueryClient context', () => {
    function QueryClientProbe() {
      const queryClient = useQueryClient()
      return (
        <p>{queryClient === appQueryClient ? 'provided' : 'wrong client'}</p>
      )
    }

    render(
      <AppProviders>
        <QueryClientProbe />
      </AppProviders>,
    )

    expect(screen.getByText('provided')).toBeVisible()
  })

  test('a test query resolves through an isolated QueryClient provider', async () => {
    const queryClient = createTestQueryClient()

    render(
      <QueryClientProvider client={queryClient}>
        <QueryResult
          queryKey={['test', 'success']}
          queryFn={async () => 'fixture resolved'}
        />
      </QueryClientProvider>,
    )

    expect(await screen.findByText('fixture resolved')).toBeVisible()
  })

  test('query errors remain available to consuming UI as ApiError', async () => {
    const queryClient = createTestQueryClient()
    const error = new ApiError({
      kind: 'http',
      status: 422,
      code: 'VALIDATION_ERROR',
      message: 'The fixture request was invalid.',
      requestId: 'req-query-test',
    })

    render(
      <QueryClientProvider client={queryClient}>
        <QueryResult
          queryKey={['test', 'error']}
          queryFn={async () => {
            throw error
          }}
        />
      </QueryClientProvider>,
    )

    expect(
      await screen.findByText('The fixture request was invalid.'),
    ).toBeVisible()
    expect(
      queryClient.getQueryCache().find({ queryKey: ['test', 'error'] })?.state
        .error,
    ).toBe(error)
  })
})

describe('query retry policy', () => {
  test('does not retry deterministic 4xx ApiError', () => {
    const error = new ApiError({
      kind: 'http',
      status: 404,
      code: 'NOT_FOUND',
      message: 'Not found',
    })

    expect(shouldRetryQuery(0, error)).toBe(false)
  })

  test('does not retry an unauthenticated response', () => {
    const error = new ApiError({
      kind: 'http',
      status: 401,
      code: 'UNAUTHENTICATED',
      message: 'Authentication required',
    })

    expect(shouldRetryQuery(0, error)).toBe(false)
  })

  test('retries transient and server failures only within the bound', () => {
    const networkError = new ApiError({
      kind: 'network',
      code: 'NETWORK_ERROR',
      message: 'Network unavailable',
    })
    const serverError = new ApiError({
      kind: 'http',
      status: 503,
      code: 'UNAVAILABLE',
      message: 'Unavailable',
    })

    expect(shouldRetryQuery(0, networkError)).toBe(true)
    expect(shouldRetryQuery(1, serverError)).toBe(true)
    expect(shouldRetryQuery(2, networkError)).toBe(false)
    expect(queryRetryDelay(0)).toBe(1000)
    expect(queryRetryDelay(10)).toBe(30_000)
  })

  test('does not retry cancellation', () => {
    const error = new ApiError({
      kind: 'aborted',
      code: 'REQUEST_ABORTED',
      message: 'The request was cancelled.',
    })

    expect(shouldRetryQuery(0, error)).toBe(false)
  })
})

describe('test QueryClient isolation', () => {
  test('separate clients do not share cached state', async () => {
    const firstClient = createTestQueryClient()
    const secondClient = createTestQueryClient()
    await firstClient.prefetchQuery({
      queryKey: ['test', 'isolated'],
      queryFn: async () => 'first cache',
    })

    expect(firstClient.getQueryData(['test', 'isolated'])).toBe('first cache')
    expect(secondClient.getQueryData(['test', 'isolated'])).toBeUndefined()

    expect(secondClient.getQueryCache().getAll()).toHaveLength(0)
  })

  test('clears only queries marked as session scoped', async () => {
    const queryClient = createTestQueryClient()
    await queryClient.prefetchQuery({
      queryKey: ['organizations'],
      queryFn: async () => ['organization-a'],
      meta: { clearOnAuthChange: true },
    })
    await queryClient.prefetchQuery({
      queryKey: ['public-content'],
      queryFn: async () => 'shared',
    })

    clearSessionScopedQueries(queryClient)

    expect(queryClient.getQueryData(['organizations'])).toBeUndefined()
    expect(queryClient.getQueryData(['public-content'])).toBe('shared')
  })
})

const user = {
  id: 'user-1',
  email: 'person@example.test',
  emailVerified: true,
}

const expiredSession = () =>
  new ApiError({
    kind: 'http',
    status: 401,
    code: 'UNAUTHENTICATED',
    message: 'Authentication required',
  })

describe('authoritative query session expiry', () => {
  test('clears authenticated and tenant-scoped data after a protected GET 401', async () => {
    const queryClient = createAppQueryClient()
    queryClient.setQueryData(authKeys.currentUser(), user)
    queryClient.setQueryData(authKeys.csrf(), 'csrf-token')
    await queryClient.fetchQuery({
      queryKey: ['organizations'],
      queryFn: async () => ['organization-a'],
      meta: { clearOnAuthChange: true },
    })

    await expect(
      queryClient.fetchQuery({
        queryKey: ['jobs', 'organization-a'],
        queryFn: async () => {
          throw expiredSession()
        },
        meta: { clearOnAuthChange: true },
      }),
    ).rejects.toMatchObject({ code: 'UNAUTHENTICATED', status: 401 })

    await waitFor(() => {
      expect(queryClient.getQueryData(authKeys.currentUser())).toBeNull()
      expect(queryClient.getQueryData(authKeys.csrf())).toBeUndefined()
      expect(queryClient.getQueryData(['organizations'])).toBeUndefined()
      expect(
        queryClient.getQueryData(['jobs', 'organization-a']),
      ).toBeUndefined()
    })
  })

  test('coalesces concurrent protected 401 responses into one cleanup', async () => {
    const queryClient = createAppQueryClient()
    queryClient.setQueryData(authKeys.currentUser(), user)
    const cancel = vi.spyOn(queryClient, 'cancelQueries')

    await Promise.all(
      ['jobs', 'candidates'].map((feature) =>
        queryClient
          .fetchQuery({
            queryKey: [feature, 'organization-a'],
            queryFn: async () => {
              throw expiredSession()
            },
            meta: { clearOnAuthChange: true },
          })
          .catch(() => undefined),
      ),
    )

    await waitFor(() =>
      expect(queryClient.getQueryData(authKeys.currentUser())).toBeNull(),
    )
    expect(cancel).toHaveBeenCalledTimes(1)
  })

  test('does not expire a session for public, forbidden, or server-error queries', async () => {
    const queryClient = createAppQueryClient()
    queryClient.setQueryData(authKeys.currentUser(), user)
    await queryClient.fetchQuery({
      queryKey: ['organizations'],
      queryFn: async () => ['organization-a'],
      meta: { clearOnAuthChange: true },
    })
    const errors = [
      expiredSession(),
      new ApiError({
        kind: 'http',
        status: 403,
        code: 'FORBIDDEN',
        message: 'Forbidden',
      }),
      new ApiError({
        kind: 'http',
        status: 500,
        code: 'INTERNAL',
        message: 'Unavailable',
      }),
    ]

    for (const [index, error] of errors.entries()) {
      await expect(
        queryClient.fetchQuery({
          queryKey: ['query', index],
          queryFn: async () => {
            throw error
          },
          meta: index === 0 ? undefined : { clearOnAuthChange: true },
        }),
      ).rejects.toBe(error)
    }

    expect(queryClient.getQueryData(authKeys.currentUser())).toEqual(user)
    expect(queryClient.getQueryData(['organizations'])).toEqual([
      'organization-a',
    ])
  })

  test('keeps authenticated workspace data available through a successful switch', async () => {
    const queryClient = createAppQueryClient()
    queryClient.setQueryData(authKeys.currentUser(), user)

    await queryClient.fetchQuery({
      queryKey: ['organizations', 'organization-a'],
      queryFn: async () => 'workspace a',
      meta: { clearOnAuthChange: true },
    })
    await queryClient.fetchQuery({
      queryKey: ['organizations', 'organization-b'],
      queryFn: async () => 'workspace b',
      meta: { clearOnAuthChange: true },
    })

    expect(queryClient.getQueryData(authKeys.currentUser())).toEqual(user)
    expect(queryClient.getQueryData(['organizations', 'organization-a'])).toBe(
      'workspace a',
    )
    expect(queryClient.getQueryData(['organizations', 'organization-b'])).toBe(
      'workspace b',
    )
  })

  test('cancels a late protected response so it cannot restore stale data', async () => {
    const queryClient = createAppQueryClient()
    queryClient.setQueryData(authKeys.currentUser(), user)
    let resolveLate: ((value: string) => void) | undefined
    const late = queryClient.fetchQuery({
      queryKey: ['jobs', 'organization-a'],
      queryFn: () =>
        new Promise<string>((resolve) => {
          resolveLate = resolve
        }),
      meta: { clearOnAuthChange: true },
    })
    const lateResult = late.catch((error: unknown) => error)

    await waitFor(() => expect(resolveLate).toBeDefined())
    await expect(
      queryClient.fetchQuery({
        queryKey: ['candidates', 'organization-a'],
        queryFn: async () => {
          throw expiredSession()
        },
        meta: { clearOnAuthChange: true },
      }),
    ).rejects.toMatchObject({ code: 'UNAUTHENTICATED' })
    await waitFor(() =>
      expect(queryClient.getQueryData(authKeys.currentUser())).toBeNull(),
    )

    resolveLate?.('stale tenant data')
    await expect(lateResult).resolves.toMatchObject({
      message: 'CancelledError',
    })
    expect(queryClient.getQueryData(['jobs', 'organization-a'])).toBeUndefined()
  })
})
