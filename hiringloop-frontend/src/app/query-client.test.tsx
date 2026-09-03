import { cleanup, render, screen } from '@testing-library/react'
import {
  QueryClientProvider,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { afterEach, describe, expect, test, vi } from 'vitest'

import { ApiError } from '../api/errors'
import { createTestQueryClient } from '../test/query-client'
import { AppProviders } from './AppProviders'
import {
  appQueryClient,
  queryRetryDelay,
  shouldRetryQuery,
} from './query-client'

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
})
