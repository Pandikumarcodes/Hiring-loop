import { QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import { ApiError } from '../../api/errors'
import { createTestQueryClient } from '../../test/query-client'

const { getCurrentUserMock, getCsrfTokenMock } = vi.hoisted(() => ({
  getCurrentUserMock: vi.fn(),
  getCsrfTokenMock: vi.fn(),
}))

vi.mock('./api', () => ({
  getCurrentUser: getCurrentUserMock,
  getCsrfToken: getCsrfTokenMock,
}))

import { authKeys } from './query-keys'
import { useCsrfToken, useCurrentUser } from './queries'

const user = {
  id: 'user-1',
  email: 'person@example.test',
  emailVerified: true,
}

beforeEach(() => {
  getCurrentUserMock.mockReset()
  getCsrfTokenMock.mockReset()
})

function testContext() {
  const queryClient = createTestQueryClient()
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return { queryClient, wrapper }
}

describe('useCurrentUser', () => {
  test('represents a 200 response as authenticated server state', async () => {
    getCurrentUserMock.mockResolvedValue({ user })
    const { wrapper } = testContext()
    const { result } = renderHook(() => useCurrentUser(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.user).toEqual(user)
    expect(result.current.isAuthenticated).toBe(true)
    expect(result.current.isUnauthenticated).toBe(false)
    expect(result.current.isError).toBe(false)
    expect(getCsrfTokenMock).not.toHaveBeenCalled()
  })

  test('represents only 401 UNAUTHENTICATED as deliberate unauthenticated state', async () => {
    getCurrentUserMock.mockRejectedValue(
      new ApiError({
        kind: 'http',
        status: 401,
        code: 'UNAUTHENTICATED',
        message: 'Authentication required',
      }),
    )
    const { wrapper } = testContext()
    const { result } = renderHook(() => useCurrentUser(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.user).toBeNull()
    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.isUnauthenticated).toBe(true)
    expect(result.current.isError).toBe(false)
  })

  test.each([
    new ApiError({
      kind: 'http',
      status: 500,
      code: 'INTERNAL',
      message: 'Server unavailable',
    }),
    new ApiError({
      kind: 'network',
      code: 'NETWORK_ERROR',
      message: 'Network unavailable',
    }),
  ])(
    'keeps backend/network failure as an error, not logged out',
    async (error) => {
      getCurrentUserMock.mockRejectedValue(error)
      const { wrapper } = testContext()
      const { result } = renderHook(() => useCurrentUser(), { wrapper })

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(result.current.error).toBe(error)
      expect(result.current.isAuthenticated).toBe(false)
      expect(result.current.isUnauthenticated).toBe(false)
    },
  )

  test('never writes auth state to browser storage', async () => {
    const storageWrite = vi.spyOn(Storage.prototype, 'setItem')
    getCurrentUserMock.mockResolvedValue({ user })
    const { wrapper } = testContext()
    const { result } = renderHook(() => useCurrentUser(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(storageWrite).not.toHaveBeenCalled()
  })
})

describe('useCsrfToken', () => {
  test('is disabled by default and keeps the token only in query memory', () => {
    const { queryClient, wrapper } = testContext()
    const { result } = renderHook(() => useCsrfToken(), { wrapper })

    expect(result.current.fetchStatus).toBe('idle')
    expect(getCsrfTokenMock).not.toHaveBeenCalled()
    expect(queryClient.getQueryData(authKeys.csrf())).toBeUndefined()
  })

  test('stays disabled when current-user state is known unauthenticated', () => {
    const { queryClient, wrapper } = testContext()
    queryClient.setQueryData(authKeys.currentUser(), null)
    const { result } = renderHook(() => useCsrfToken(true), { wrapper })

    expect(result.current.fetchStatus).toBe('idle')
    expect(getCsrfTokenMock).not.toHaveBeenCalled()
  })
})
