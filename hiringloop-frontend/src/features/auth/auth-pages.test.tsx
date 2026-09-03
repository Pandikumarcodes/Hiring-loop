import { QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { ApiError } from '../../shared/lib/apiErrors'
import { AppRoutes } from '../../app/router/routes'
import { createTestQueryClient } from '../../tests/query-client'
import { authKeys } from './hooks/query-keys'
import { GoogleButton } from './components/GoogleButton'
import { startGoogleAuthentication } from './utils/google-navigation'
import { organizationKeys } from '../organizations/hooks/query-keys'

const apiMocks = vi.hoisted(() => ({
  changePassword: vi.fn(),
  forgotPassword: vi.fn(),
  getCsrfToken: vi.fn(),
  getCurrentUser: vi.fn(),
  getGoogleAuthStartUrl: vi.fn(() => '/api/v1/auth/google/start'),
  login: vi.fn(),
  logout: vi.fn(),
  register: vi.fn(),
  resendVerification: vi.fn(),
  resetPassword: vi.fn(),
  revokeAllSessions: vi.fn(),
  verifyEmail: vi.fn(),
}))

vi.mock('./api/auth.api', () => apiMocks)

function renderRoute(entry: string) {
  const queryClient = createTestQueryClient()
  queryClient.setQueryData(authKeys.currentUser(), null)
  queryClient.setQueryData(organizationKeys.list(), [])
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[entry]}>
        <AppRoutes />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function httpError(code: string, status: number, retryAfter?: string) {
  return new ApiError({
    code,
    kind: 'http',
    message: 'Backend detail must not be shown',
    retryAfter,
    status,
  })
}

async function fillLogin(user: ReturnType<typeof userEvent.setup>) {
  await user.type(
    screen.getByRole('textbox', { name: 'Email' }),
    'person@example.test',
  )
  await user.type(
    screen.getByLabelText(/^Password/, { selector: 'input' }),
    'correct horse battery',
  )
}

async function fillRegistration(user: ReturnType<typeof userEvent.setup>) {
  await user.type(
    screen.getByRole('textbox', { name: 'Work email' }),
    'person@example.test',
  )
  await user.type(
    screen.getByLabelText(/^Password/, { selector: 'input' }),
    'correct horse battery',
  )
}

beforeEach(() => {
  Object.values(apiMocks).forEach((mock) => mock.mockReset())
  apiMocks.getGoogleAuthStartUrl.mockReturnValue('/api/v1/auth/google/start')
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('login UI', () => {
  test('renders accessible fields and auth navigation', () => {
    renderRoute('/login')
    expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeVisible()
    expect(screen.getByRole('textbox', { name: 'Email' })).toHaveAttribute(
      'autocomplete',
      'email',
    )
    expect(
      screen.getByLabelText(/^Password/, { selector: 'input' }),
    ).toHaveAttribute('autocomplete', 'current-password')
    expect(
      screen.getByRole('button', { name: 'Show password' }),
    ).toHaveAttribute('type', 'button')
    expect(
      screen.getByRole('link', { name: 'Forgot password?' }),
    ).toHaveAttribute('href', '/forgot-password')
    expect(
      screen.getByRole('link', { name: 'Create an account' }),
    ).toHaveAttribute('href', '/register')
  })

  test('submits credentials once, exposes pending state, and navigates on success', async () => {
    const user = userEvent.setup()
    let resolveLogin: (value: unknown) => void = () => undefined
    apiMocks.login.mockReturnValue(
      new Promise((resolve) => {
        resolveLogin = resolve
      }),
    )
    renderRoute('/login')
    await fillLogin(user)
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(apiMocks.login.mock.calls[0]?.[0]).toEqual({
      email: 'person@example.test',
      password: 'correct horse battery',
    })
    expect(screen.getByRole('button', { name: 'Signing in…' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Signing in…' }))
    expect(apiMocks.login).toHaveBeenCalledOnce()
    resolveLogin({
      user: { id: 'u1', email: 'person@example.test', emailVerified: true },
    })
    await waitFor(() =>
      expect(
        screen.getByRole('heading', { name: 'Create your first organization' }),
      ).toBeVisible(),
    )
  })

  test.each([
    [
      'AUTHENTICATION_FAILED',
      401,
      'The email or password you entered is incorrect.',
    ],
    [
      'RATE_LIMITED',
      429,
      'Too many attempts. Please try again later. Try again in about 1 minute.',
    ],
    [
      'SERVER_ERROR',
      500,
      "We couldn't complete that request right now. Please try again.",
    ],
  ])('maps %s safely', async (code, status, expected) => {
    const user = userEvent.setup()
    apiMocks.login.mockRejectedValue(
      httpError(code, status, code === 'RATE_LIMITED' ? '60' : undefined),
    )
    renderRoute('/login')
    await fillLogin(user)
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(expected)
    expect(
      screen.queryByText('Backend detail must not be shown'),
    ).not.toBeInTheDocument()
  })

  test('shows only allowlisted OAuth state and starts Google through the backend URL helper', () => {
    renderRoute('/login?oauth=account-linking-required&private=raw-value')
    expect(screen.getByRole('alert')).toHaveTextContent(
      'An account with this email already exists',
    )
    expect(screen.queryByText('raw-value')).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Continue with Google' }),
    ).toBeEnabled()
    const navigate = vi.fn()
    startGoogleAuthentication(navigate)
    expect(apiMocks.getGoogleAuthStartUrl).toHaveBeenCalledOnce()
    expect(navigate).toHaveBeenCalledWith('/api/v1/auth/google/start')
  })

  test('shows a generic OAuth failure while keeping password login and Google retry available', () => {
    renderRoute('/login?oauth=authentication-failed')
    expect(screen.getByRole('alert')).toHaveTextContent(
      "We couldn't complete Google sign-in. Please try again.",
    )
    expect(screen.getByRole('textbox', { name: 'Email' })).toBeEnabled()
    expect(
      screen.getByRole('button', { name: 'Continue with Google' }),
    ).toBeEnabled()
  })

  test('ignores unknown OAuth state without rendering its raw value', () => {
    renderRoute('/login?oauth=provider-secret&error_description=private-detail')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.queryByText('provider-secret')).not.toBeInTheDocument()
    expect(screen.queryByText('private-detail')).not.toBeInTheDocument()
  })

  test('Google action is keyboard-usable and invokes its navigation action', async () => {
    const user = userEvent.setup()
    const onStart = vi.fn()
    render(<GoogleButton onStart={onStart} />)
    const button = screen.getByRole('button', { name: 'Continue with Google' })
    button.focus()
    await user.keyboard('{Enter}')
    expect(onStart).toHaveBeenCalledOnce()
  })

  test('prevents repeated Google activation while navigation is starting', async () => {
    const user = userEvent.setup()
    const onStart = vi.fn()
    render(<GoogleButton onStart={onStart} />)
    const button = screen.getByRole('button', { name: 'Continue with Google' })
    await user.click(button)
    expect(button).toBeDisabled()
    await user.click(button)
    expect(onStart).toHaveBeenCalledOnce()
  })
})

describe('registration UI', () => {
  test('renders the same backend Google action as login', () => {
    renderRoute('/register')
    expect(
      screen.getByRole('button', { name: 'Continue with Google' }),
    ).toBeEnabled()
  })

  test('validates required fields, email format, and password minimum', async () => {
    const user = userEvent.setup()
    renderRoute('/register')
    await user.click(screen.getByRole('button', { name: 'Create account' }))
    expect(screen.getByText('Enter your email address.')).toBeVisible()
    expect(screen.getByText('Enter your password.')).toBeVisible()
    await user.type(
      screen.getByRole('textbox', { name: 'Work email' }),
      'bad-email',
    )
    await user.type(
      screen.getByLabelText(/^Password/, { selector: 'input' }),
      'short',
    )
    await user.click(screen.getByRole('button', { name: 'Create account' }))
    expect(screen.getByText('Enter a valid email address.')).toBeVisible()
    expect(
      screen.getByText('Password must be at least 12 characters.'),
    ).toBeVisible()
    expect(apiMocks.register).not.toHaveBeenCalled()
  })

  test('submits and shows generic check-email success without authenticating', async () => {
    const user = userEvent.setup()
    const storageWrite = vi.spyOn(Storage.prototype, 'setItem')
    apiMocks.register.mockResolvedValue({
      status: 'accepted',
      message: 'generic',
    })
    renderRoute('/register')
    await fillRegistration(user)
    await user.click(screen.getByRole('button', { name: 'Create account' }))
    expect(
      await screen.findByRole('heading', { name: 'Check your inbox' }),
    ).toBeVisible()
    expect(
      screen.getByText(/same whether or not an account already exists/),
    ).toBeVisible()
    expect(storageWrite).not.toHaveBeenCalled()
  })

  test('supports delivery failure resend and rate-limit UX', async () => {
    const user = userEvent.setup()
    apiMocks.register.mockRejectedValueOnce(
      httpError('EMAIL_DELIVERY_FAILED', 503),
    )
    renderRoute('/register')
    await fillRegistration(user)
    await user.click(screen.getByRole('button', { name: 'Create account' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      "account was created, but we couldn't send",
    )
    expect(
      screen.getByRole('button', { name: 'Resend verification email' }),
    ).toBeVisible()
  })

  test('shows a calm registration rate-limit error', async () => {
    const user = userEvent.setup()
    apiMocks.register.mockRejectedValue(httpError('RATE_LIMITED', 429, '120'))
    renderRoute('/register')
    await fillRegistration(user)
    await user.click(screen.getByRole('button', { name: 'Create account' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Too many attempts. Please try again later. Try again in about 2 minutes.',
    )
  })
})

describe('email verification UI', () => {
  test('handles a missing token without making a request', () => {
    renderRoute('/verify-email')
    expect(
      screen.getByRole('heading', { name: 'Invalid verification link' }),
    ).toBeVisible()
    expect(apiMocks.verifyEmail).not.toHaveBeenCalled()
  })

  test('verifies only after an explicit action and never persists the URL token', async () => {
    const user = userEvent.setup()
    const storageWrite = vi.spyOn(Storage.prototype, 'setItem')
    apiMocks.verifyEmail.mockResolvedValue({
      status: 'verified',
      message: 'done',
    })
    renderRoute('/verify-email?token=private-verification-token')
    expect(apiMocks.verifyEmail).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Verify email' }))
    expect(apiMocks.verifyEmail.mock.calls[0]?.[0]).toEqual({
      token: 'private-verification-token',
    })
    expect(
      await screen.findByRole('heading', { name: 'Email verified' }),
    ).toBeVisible()
    expect(storageWrite).not.toHaveBeenCalled()
  })

  test('shows an invalid-link state and enumeration-safe resend result', async () => {
    const user = userEvent.setup()
    apiMocks.verifyEmail.mockRejectedValue(
      httpError('VERIFICATION_TOKEN_INVALID', 400),
    )
    apiMocks.resendVerification.mockResolvedValue({
      status: 'accepted',
      message: 'generic',
    })
    renderRoute('/verify-email?token=bad')
    await user.click(screen.getByRole('button', { name: 'Verify email' }))
    expect(
      await screen.findByRole('heading', {
        name: 'Verification link unavailable',
      }),
    ).toBeVisible()
    await user.type(
      screen.getByRole('textbox', { name: 'Email' }),
      'person@example.test',
    )
    await user.click(
      screen.getByRole('button', { name: 'Resend verification email' }),
    )
    expect(await screen.findByRole('status')).toHaveTextContent(
      'If the account is eligible',
    )
  })
})

describe('forgot-password UI', () => {
  test('validates email then shows the same generic success for every eligible result', async () => {
    const user = userEvent.setup()
    apiMocks.forgotPassword.mockResolvedValue({
      status: 'accepted',
      message: 'do not render',
    })
    renderRoute('/forgot-password')
    await user.click(
      screen.getByRole('button', { name: 'Send reset instructions' }),
    )
    expect(screen.getByText('Enter your email address.')).toBeVisible()
    await user.type(
      screen.getByRole('textbox', { name: 'Email' }),
      'person@example.test',
    )
    await user.click(
      screen.getByRole('button', { name: 'Send reset instructions' }),
    )
    expect(
      await screen.findByRole('heading', { name: 'Check your email' }),
    ).toBeVisible()
    expect(screen.getByText(/If an account is eligible/)).toBeVisible()
  })

  test.each([
    ['RATE_LIMITED', 429, 'Too many attempts'],
    ['SERVER_ERROR', 500, "We couldn't complete that request"],
  ])('maps %s without account leakage', async (code, status, expected) => {
    const user = userEvent.setup()
    apiMocks.forgotPassword.mockRejectedValue(httpError(code, status))
    renderRoute('/forgot-password')
    await user.type(
      screen.getByRole('textbox', { name: 'Email' }),
      'none@example.test',
    )
    await user.click(
      screen.getByRole('button', { name: 'Send reset instructions' }),
    )
    expect(await screen.findByRole('alert')).toHaveTextContent(expected)
  })
})

describe('reset-password UI', () => {
  test('handles a missing token without a mutation', () => {
    renderRoute('/reset-password')
    expect(
      screen.getByRole('heading', { name: 'Invalid reset link' }),
    ).toBeVisible()
    expect(apiMocks.resetPassword).not.toHaveBeenCalled()
  })

  test('validates length and matching confirmation before submit', async () => {
    const user = userEvent.setup()
    renderRoute('/reset-password?token=reset-token')
    await user.type(
      screen.getByLabelText(/^New password/, { selector: 'input' }),
      'short',
    )
    await user.type(
      screen.getByLabelText(/^Confirm password/, { selector: 'input' }),
      'different',
    )
    await user.click(screen.getByRole('button', { name: 'Update password' }))
    expect(
      screen.getByText('Password must be at least 12 characters.'),
    ).toBeVisible()
    expect(screen.getByText('Passwords do not match.')).toBeVisible()
    expect(apiMocks.resetPassword).not.toHaveBeenCalled()
  })

  test('submits an unmodified password and shows sign-in success without persisting token', async () => {
    const user = userEvent.setup()
    const storageWrite = vi.spyOn(Storage.prototype, 'setItem')
    apiMocks.resetPassword.mockResolvedValue({ status: 'password_reset' })
    renderRoute('/reset-password?token=private-reset-token')
    await user.type(
      screen.getByLabelText(/^New password/, { selector: 'input' }),
      '  padded password  ',
    )
    await user.type(
      screen.getByLabelText(/^Confirm password/, { selector: 'input' }),
      '  padded password  ',
    )
    await user.click(screen.getByRole('button', { name: 'Update password' }))
    expect(apiMocks.resetPassword.mock.calls[0]?.[0]).toEqual({
      token: 'private-reset-token',
      newPassword: '  padded password  ',
    })
    expect(
      await screen.findByRole('heading', { name: 'Password updated' }),
    ).toBeVisible()
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute(
      'href',
      '/login',
    )
    expect(storageWrite).not.toHaveBeenCalled()
  })

  test.each([
    ['RESET_TOKEN_INVALID', 400, 'Reset link unavailable'],
    ['RATE_LIMITED', 429, 'Too many attempts'],
  ])('maps %s safely', async (code, status, expected) => {
    const user = userEvent.setup()
    apiMocks.resetPassword.mockRejectedValue(httpError(code, status))
    renderRoute('/reset-password?token=bad')
    await user.type(
      screen.getByLabelText(/^New password/, { selector: 'input' }),
      'correct horse battery',
    )
    await user.type(
      screen.getByLabelText(/^Confirm password/, { selector: 'input' }),
      'correct horse battery',
    )
    await user.click(screen.getByRole('button', { name: 'Update password' }))
    if (code === 'RESET_TOKEN_INVALID') {
      expect(
        await screen.findByRole('heading', { name: expected }),
      ).toBeVisible()
    } else {
      expect(await screen.findByRole('alert')).toHaveTextContent(expected)
    }
  })
})
