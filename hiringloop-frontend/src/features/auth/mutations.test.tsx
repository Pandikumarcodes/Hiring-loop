import { QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import { ApiError } from '../../api/errors'
import { createTestQueryClient } from '../../test/query-client'

const apiMocks = vi.hoisted(() => ({
  changePassword: vi.fn(),
  forgotPassword: vi.fn(),
  getCsrfToken: vi.fn(),
  getCurrentUser: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  register: vi.fn(),
  resendVerification: vi.fn(),
  resetPassword: vi.fn(),
  revokeAllSessions: vi.fn(),
  verifyEmail: vi.fn(),
}))

vi.mock('./api', () => apiMocks)

import {
  useChangePassword,
  useForgotPassword,
  useLogin,
  useLogout,
  useRegister,
  useResendVerification,
  useResetPassword,
  useRevokeAllSessions,
  useVerifyEmail,
} from './mutations'
import { authKeys } from './query-keys'

const user = {
  id: 'user-1',
  email: 'person@example.test',
  emailVerified: false,
}

beforeEach(() => {
  Object.values(apiMocks).forEach((mock) => mock.mockReset())
})

function testContext() {
  const queryClient = createTestQueryClient()
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return { queryClient, wrapper }
}

describe('login and registration mutations', () => {
  test('login sets the safe user cache and clears a stale CSRF token', async () => {
    const storageWrite = vi.spyOn(Storage.prototype, 'setItem')
    apiMocks.login.mockResolvedValue({ user })
    const { queryClient, wrapper } = testContext()
    queryClient.setQueryData(authKeys.csrf(), 'old-csrf')
    const { result } = renderHook(() => useLogin(), { wrapper })

    await act(() =>
      result.current.mutateAsync({
        email: user.email,
        password: 'password',
      }),
    )

    expect(queryClient.getQueryData(authKeys.currentUser())).toEqual(user)
    expect(queryClient.getQueryData(authKeys.csrf())).toBeUndefined()
    expect(storageWrite).not.toHaveBeenCalled()
  })

  test.each([
    ['AUTHENTICATION_FAILED', 401],
    ['RATE_LIMITED', 429],
  ])(
    'login preserves structured %s errors without inventing auth state',
    async (code, status) => {
      const error = new ApiError({
        kind: 'http',
        status,
        code,
        message: 'Safe backend message',
        retryAfter: code === 'RATE_LIMITED' ? '60' : undefined,
      })
      apiMocks.login.mockRejectedValue(error)
      const { queryClient, wrapper } = testContext()
      const { result } = renderHook(() => useLogin(), { wrapper })

      await expect(
        act(() =>
          result.current.mutateAsync({
            email: user.email,
            password: 'wrong-password',
          }),
        ),
      ).rejects.toBe(error)

      expect(queryClient.getQueryData(authKeys.currentUser())).toBeUndefined()
      expect(error.code).toBe(code)
    },
  )

  test('registration returns the generic acknowledgement without authenticating', async () => {
    const acknowledgement = {
      status: 'accepted',
      message: 'If registration can be accepted, instructions will be sent.',
    }
    apiMocks.register.mockResolvedValue(acknowledgement)
    const { queryClient, wrapper } = testContext()
    const { result } = renderHook(() => useRegister(), { wrapper })

    await expect(
      act(() =>
        result.current.mutateAsync({
          email: user.email,
          password: 'new-long-password',
        }),
      ),
    ).resolves.toBe(acknowledgement)
    expect(queryClient.getQueryData(authKeys.currentUser())).toBeUndefined()
  })
})

describe('session-ending mutations', () => {
  test.each([
    ['logout', useLogout, apiMocks.logout],
    ['revoke all', useRevokeAllSessions, apiMocks.revokeAllSessions],
  ])(
    '%s lazily obtains CSRF then clears user and CSRF state',
    async (_name, useHook, requestMock) => {
      apiMocks.getCsrfToken.mockResolvedValue({ csrfToken: 'csrf-token' })
      requestMock.mockResolvedValue(undefined)
      const { queryClient, wrapper } = testContext()
      queryClient.setQueryData(authKeys.currentUser(), user)
      const { result } = renderHook(() => useHook(), { wrapper })

      await act(() => result.current.mutateAsync())

      expect(apiMocks.getCsrfToken).toHaveBeenCalledTimes(1)
      expect(requestMock).toHaveBeenCalledWith('csrf-token')
      expect(queryClient.getQueryData(authKeys.currentUser())).toBeNull()
      expect(queryClient.getQueryData(authKeys.csrf())).toBeUndefined()
    },
  )

  test('does not fetch CSRF when the cache already confirms unauthenticated', async () => {
    const { queryClient, wrapper } = testContext()
    queryClient.setQueryData(authKeys.currentUser(), null)
    const { result } = renderHook(() => useLogout(), { wrapper })

    await expect(act(() => result.current.mutateAsync())).rejects.toMatchObject(
      {
        code: 'UNAUTHENTICATED',
        status: 401,
      },
    )
    expect(apiMocks.getCsrfToken).not.toHaveBeenCalled()
    expect(apiMocks.logout).not.toHaveBeenCalled()
  })

  test('surfaces CSRF_INVALID without retrying and evicts the rejected token', async () => {
    const error = new ApiError({
      kind: 'http',
      status: 403,
      code: 'CSRF_INVALID',
      message: 'Invalid CSRF token',
    })
    apiMocks.logout.mockRejectedValue(error)
    const { queryClient, wrapper } = testContext()
    queryClient.setQueryData(authKeys.currentUser(), user)
    queryClient.setQueryData(authKeys.csrf(), 'rejected-csrf')
    const { result } = renderHook(() => useLogout(), { wrapper })

    await expect(act(() => result.current.mutateAsync())).rejects.toBe(error)
    expect(apiMocks.logout).toHaveBeenCalledTimes(1)
    expect(queryClient.getQueryData(authKeys.csrf())).toBeUndefined()
    expect(queryClient.getQueryData(authKeys.currentUser())).toEqual(user)
  })

  test.each([
    new ApiError({
      kind: 'network',
      code: 'NETWORK_ERROR',
      message: 'Offline',
    }),
    new ApiError({
      kind: 'http',
      status: 503,
      code: 'UNAVAILABLE',
      message: 'Unavailable',
    }),
  ])('logout failure preserves authenticated state', async (error) => {
    apiMocks.getCsrfToken.mockResolvedValue({ csrfToken: 'csrf-token' })
    apiMocks.logout.mockRejectedValue(error)
    const { queryClient, wrapper } = testContext()
    queryClient.setQueryData(authKeys.currentUser(), user)
    const { result } = renderHook(() => useLogout(), { wrapper })

    await expect(act(() => result.current.mutateAsync())).rejects.toBe(error)
    expect(queryClient.getQueryData(authKeys.currentUser())).toEqual(user)
  })

  test('revoke-all failure preserves authenticated state', async () => {
    const error = new ApiError({
      kind: 'http',
      status: 500,
      code: 'INTERNAL',
      message: 'Unavailable',
    })
    apiMocks.getCsrfToken.mockResolvedValue({ csrfToken: 'csrf-token' })
    apiMocks.revokeAllSessions.mockRejectedValue(error)
    const { queryClient, wrapper } = testContext()
    queryClient.setQueryData(authKeys.currentUser(), user)
    const { result } = renderHook(() => useRevokeAllSessions(), { wrapper })

    await expect(act(() => result.current.mutateAsync())).rejects.toBe(error)
    expect(queryClient.getQueryData(authKeys.currentUser())).toEqual(user)
  })

  test('a session-expired CSRF bootstrap clears stale authenticated state', async () => {
    const error = new ApiError({
      kind: 'http',
      status: 401,
      code: 'UNAUTHENTICATED',
      message: 'Authentication required',
    })
    apiMocks.getCsrfToken.mockRejectedValue(error)
    const { queryClient, wrapper } = testContext()
    queryClient.setQueryData(authKeys.currentUser(), user)
    const { result } = renderHook(() => useLogout(), { wrapper })

    await expect(act(() => result.current.mutateAsync())).rejects.toBe(error)
    expect(apiMocks.logout).not.toHaveBeenCalled()
    expect(queryClient.getQueryData(authKeys.currentUser())).toBeNull()
    expect(queryClient.getQueryData(authKeys.csrf())).toBeUndefined()
  })
})

describe('password lifecycle mutations', () => {
  test('failed password reset does not clear authenticated state', async () => {
    const error = new ApiError({
      kind: 'network',
      code: 'NETWORK_ERROR',
      message: 'Offline',
    })
    apiMocks.resetPassword.mockRejectedValue(error)
    const { queryClient, wrapper } = testContext()
    queryClient.setQueryData(authKeys.currentUser(), user)
    const { result } = renderHook(() => useResetPassword(), { wrapper })

    await expect(
      act(() =>
        result.current.mutateAsync({
          token: 'reset-token',
          newPassword: 'new-long-password',
        }),
      ),
    ).rejects.toBe(error)
    expect(queryClient.getQueryData(authKeys.currentUser())).toEqual(user)
  })

  test('forgot password passes through the enumeration-safe result', async () => {
    const acknowledgement = { status: 'accepted', message: 'Generic result' }
    apiMocks.forgotPassword.mockResolvedValue(acknowledgement)
    const { wrapper } = testContext()
    const { result } = renderHook(() => useForgotPassword(), { wrapper })

    await expect(
      act(() => result.current.mutateAsync({ email: user.email })),
    ).resolves.toBe(acknowledgement)
  })

  test('reset password clears current-user and CSRF cache without logging in', async () => {
    apiMocks.resetPassword.mockResolvedValue({ status: 'password_reset' })
    const { queryClient, wrapper } = testContext()
    queryClient.setQueryData(authKeys.currentUser(), user)
    queryClient.setQueryData(authKeys.csrf(), 'old-csrf')
    const { result } = renderHook(() => useResetPassword(), { wrapper })

    await act(() =>
      result.current.mutateAsync({
        token: 'reset-token',
        newPassword: 'new-long-password',
      }),
    )

    expect(queryClient.getQueryData(authKeys.currentUser())).toBeNull()
    expect(queryClient.getQueryData(authKeys.csrf())).toBeUndefined()
  })

  test('change password sends CSRF, installs returned user, and evicts old CSRF', async () => {
    const verifiedUser = { ...user, emailVerified: true }
    const input = {
      currentPassword: 'current-password',
      newPassword: 'new-long-password',
    }
    apiMocks.getCsrfToken.mockResolvedValue({ csrfToken: 'csrf-token' })
    apiMocks.changePassword.mockResolvedValue({ user: verifiedUser })
    const { queryClient, wrapper } = testContext()
    queryClient.setQueryData(authKeys.currentUser(), user)
    const { result } = renderHook(() => useChangePassword(), { wrapper })

    await act(() => result.current.mutateAsync(input))

    expect(apiMocks.changePassword).toHaveBeenCalledWith(input, 'csrf-token')
    expect(queryClient.getQueryData(authKeys.currentUser())).toEqual(
      verifiedUser,
    )
    expect(queryClient.getQueryData(authKeys.csrf())).toBeUndefined()
  })
})

describe('email verification mutations', () => {
  test('verification invalidates current user only when authenticated', async () => {
    apiMocks.verifyEmail.mockResolvedValue({
      status: 'verified',
      message: 'Verified',
    })
    const { queryClient, wrapper } = testContext()
    queryClient.setQueryData(authKeys.currentUser(), user)
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useVerifyEmail(), { wrapper })

    await act(() => result.current.mutateAsync({ token: 'token' }))

    expect(invalidate).toHaveBeenCalledWith({
      queryKey: authKeys.currentUser(),
      exact: true,
    })
  })

  test('resend passes through its result without creating current-user state', async () => {
    const acknowledgement = { status: 'accepted', message: 'Generic result' }
    apiMocks.resendVerification.mockResolvedValue(acknowledgement)
    const { queryClient, wrapper } = testContext()
    const { result } = renderHook(() => useResendVerification(), { wrapper })

    await expect(
      act(() => result.current.mutateAsync({ email: user.email })),
    ).resolves.toBe(acknowledgement)
    expect(queryClient.getQueryData(authKeys.currentUser())).toBeUndefined()
  })

  test('verification while unauthenticated does not invent auth state', async () => {
    apiMocks.verifyEmail.mockResolvedValue({
      status: 'verified',
      message: 'Verified',
    })
    const { queryClient, wrapper } = testContext()
    queryClient.setQueryData(authKeys.currentUser(), null)
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useVerifyEmail(), { wrapper })

    await act(() => result.current.mutateAsync({ token: 'token' }))

    expect(queryClient.getQueryData(authKeys.currentUser())).toBeNull()
    expect(invalidate).not.toHaveBeenCalled()
  })
})
