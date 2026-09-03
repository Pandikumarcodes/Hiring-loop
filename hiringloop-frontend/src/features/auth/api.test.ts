import { beforeEach, describe, expect, test, vi } from 'vitest'

const { apiRequestMock, buildApiUrlMock } = vi.hoisted(() => ({
  apiRequestMock: vi.fn(),
  buildApiUrlMock: vi.fn(),
}))

vi.mock('../../api/client', () => ({
  apiRequest: apiRequestMock,
  buildApiUrl: buildApiUrlMock,
}))

import {
  changePassword,
  forgotPassword,
  getCsrfToken,
  getCurrentUser,
  getGoogleAuthStartUrl,
  login,
  logout,
  register,
  resendVerification,
  resetPassword,
  revokeAllSessions,
  verifyEmail,
} from './api'
import { ApiError } from '../../api/errors'
import { readAuthOAuthStatus } from './url-state'

beforeEach(() => {
  apiRequestMock.mockReset()
  buildApiUrlMock.mockReset()
})

describe('auth API', () => {
  test('rejects malformed current-user payloads with a controlled response error', async () => {
    apiRequestMock.mockResolvedValue({ data: { user: null } })

    await expect(getCurrentUser()).rejects.toMatchObject({
      kind: 'response',
      code: 'INVALID_API_RESPONSE',
    })
  })

  test.each([
    [
      'register',
      register,
      '/auth/register',
      { email: 'a@example.test', password: 'long-password' },
    ],
    [
      'login',
      login,
      '/auth/login',
      { email: 'a@example.test', password: 'password' },
    ],
    [
      'resend verification',
      resendVerification,
      '/auth/verification/resend',
      { email: 'a@example.test' },
    ],
    [
      'verify email',
      verifyEmail,
      '/auth/verify-email',
      { token: 'verification-token' },
    ],
    [
      'forgot password',
      forgotPassword,
      '/auth/password/forgot',
      { email: 'a@example.test' },
    ],
    [
      'reset password',
      resetPassword,
      '/auth/password/reset',
      { token: 'reset-token', newPassword: 'new-long-password' },
    ],
  ])(
    'sends the %s DTO through shared apiRequest',
    async (_name, request, path, body) => {
      apiRequestMock.mockResolvedValue(
        path === '/auth/login'
          ? {
              data: {
                user: {
                  id: 'user-1',
                  email: 'person@example.test',
                  emailVerified: true,
                },
              },
            }
          : { data: { status: 'accepted' } },
      )

      await request(body as never)

      expect(apiRequestMock).toHaveBeenCalledWith(path, {
        method: 'POST',
        body,
      })
    },
  )

  test('gets current user and CSRF through shared apiRequest with abort support', async () => {
    const controller = new AbortController()
    apiRequestMock
      .mockResolvedValueOnce({
        data: {
          user: {
            id: 'user-1',
            email: 'person@example.test',
            emailVerified: true,
          },
        },
      })
      .mockResolvedValueOnce({ data: { csrfToken: 'csrf-token' } })

    await getCurrentUser(controller.signal)
    await getCsrfToken(controller.signal)

    expect(apiRequestMock).toHaveBeenNthCalledWith(1, '/auth/me', {
      signal: controller.signal,
    })
    expect(apiRequestMock).toHaveBeenNthCalledWith(2, '/auth/csrf', {
      signal: controller.signal,
    })
  })

  test('supports empty 204 logout/revoke responses and sends CSRF', async () => {
    apiRequestMock.mockResolvedValue(undefined)

    await expect(logout('csrf-one')).resolves.toBeUndefined()
    await expect(revokeAllSessions('csrf-two')).resolves.toBeUndefined()

    expect(apiRequestMock).toHaveBeenNthCalledWith(1, '/auth/logout', {
      method: 'POST',
      headers: { 'X-CSRF-Token': 'csrf-one' },
    })
    expect(apiRequestMock).toHaveBeenNthCalledWith(
      2,
      '/auth/sessions/revoke-all',
      {
        method: 'POST',
        headers: { 'X-CSRF-Token': 'csrf-two' },
      },
    )
  })

  test('sends password change with its DTO and CSRF token', async () => {
    const input = {
      currentPassword: 'current-password',
      newPassword: 'new-long-password',
    }
    apiRequestMock.mockResolvedValue({
      data: {
        user: {
          id: 'user-1',
          email: 'person@example.test',
          emailVerified: true,
        },
      },
    })

    await changePassword(input, 'csrf-token')

    expect(apiRequestMock).toHaveBeenCalledWith('/auth/password/change', {
      method: 'POST',
      body: input,
      headers: { 'X-CSRF-Token': 'csrf-token' },
    })
  })

  test('rejects a missing data envelope as a structured response error', async () => {
    apiRequestMock.mockResolvedValue(undefined)

    await expect(
      register({ email: 'a@example.test', password: 'password' }),
    ).rejects.toMatchObject({
      kind: 'response',
      code: 'INVALID_API_RESPONSE',
    })
  })
})

describe('Google navigation and OAuth URL state', () => {
  test('derives the fixed Google start endpoint from shared API configuration', () => {
    buildApiUrlMock.mockReturnValue(
      'https://api.example.test/api/v1/auth/google/start',
    )

    expect(getGoogleAuthStartUrl()).toBe(
      'https://api.example.test/api/v1/auth/google/start',
    )
    expect(buildApiUrlMock).toHaveBeenCalledWith('/auth/google/start')
    expect(apiRequestMock).not.toHaveBeenCalled()
  })

  test('accepts only the backend-approved OAuth status values', () => {
    expect(readAuthOAuthStatus('?oauth=account-linking-required')).toBe(
      'account-linking-required',
    )
    expect(readAuthOAuthStatus('?oauth=authentication-failed')).toBe(
      'authentication-failed',
    )
    expect(readAuthOAuthStatus('?oauth=https://attacker.example')).toBeNull()
  })

  test('does not turn arbitrary callback state into an API error or redirect', () => {
    const error = new ApiError({
      kind: 'http',
      status: 409,
      code: 'ACCOUNT_LINKING_REQUIRED',
      message: 'Linking required',
    })

    expect(error.code).toBe('ACCOUNT_LINKING_REQUIRED')
    expect(readAuthOAuthStatus('')).toBeNull()
  })
})
