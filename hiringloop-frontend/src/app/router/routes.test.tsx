import { QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { createTestQueryClient } from '../../tests/query-client'
import type { AuthUserDto } from '../../features/auth/types/auth.types'

const useCurrentUserMock = vi.hoisted(() => vi.fn())
vi.mock('../../features/auth/hooks/queries', () => ({
  useCurrentUser: useCurrentUserMock,
}))

import { AppRoutes } from './routes'

const user = {
  id: 'user-1',
  email: 'person@example.test',
  emailVerified: true,
}

function renderRoutes(initialEntry: string) {
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <AppRoutes />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function routeState(
  overrides: Partial<ReturnType<typeof defaultRouteState>> = {},
) {
  return { ...defaultRouteState(), ...overrides }
}

function defaultRouteState() {
  return {
    isPending: false,
    isError: false,
    isAuthenticated: false,
    isUnauthenticated: true,
    user: null as AuthUserDto | null,
    refetch: vi.fn(),
  }
}

beforeEach(() => useCurrentUserMock.mockReset())
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('session route guards', () => {
  test('keeps protected content and login hidden while bootstrap is pending', () => {
    useCurrentUserMock.mockReturnValue(
      routeState({ isPending: true, isUnauthenticated: false }),
    )
    renderRoutes('/app')

    expect(
      screen.getByRole('heading', { name: 'Checking your session' }),
    ).toBeVisible()
    expect(
      screen.queryByRole('heading', { name: 'Neutral application layout' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'Welcome back' }),
    ).not.toBeInTheDocument()
  })

  test('renders the protected app for an authenticated user', async () => {
    useCurrentUserMock.mockReturnValue(
      routeState({ isAuthenticated: true, isUnauthenticated: false, user }),
    )
    renderRoutes('/app')

    expect(
      await screen.findByRole('heading', {
        name: 'Neutral application layout',
      }),
    ).toBeVisible()
  })

  test('redirects only confirmed unauthenticated sessions to login', async () => {
    useCurrentUserMock.mockReturnValue(routeState())
    renderRoutes('/app/jobs')

    expect(
      await screen.findByRole('heading', { name: 'Welcome back' }),
    ).toBeVisible()
  })

  test('shows a recoverable bootstrap error without rendering login', async () => {
    useCurrentUserMock.mockReturnValue(
      routeState({ isError: true, isUnauthenticated: false }),
    )
    renderRoutes('/app')

    expect(
      await screen.findByRole('heading', {
        name: 'Unable to verify your session',
      }),
    ).toBeVisible()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeVisible()
    expect(
      screen.queryByRole('heading', { name: 'Welcome back' }),
    ).not.toBeInTheDocument()
  })

  test('does not flash a public auth form while an authenticated session bootstraps', () => {
    useCurrentUserMock.mockReturnValue(
      routeState({ isPending: true, isUnauthenticated: false }),
    )
    renderRoutes('/login')

    expect(
      screen.getByRole('heading', { name: 'Checking your session' }),
    ).toBeVisible()
    expect(
      screen.queryByRole('heading', { name: 'Welcome back' }),
    ).not.toBeInTheDocument()
  })

  test('redirects an authenticated public route to the app', async () => {
    useCurrentUserMock.mockReturnValue(
      routeState({ isAuthenticated: true, isUnauthenticated: false, user }),
    )
    renderRoutes('/register')

    expect(
      await screen.findByRole('heading', {
        name: 'Neutral application layout',
      }),
    ).toBeVisible()
  })

  test('keeps verify-email and reset-password accessible with a session', async () => {
    useCurrentUserMock.mockReturnValue(
      routeState({ isAuthenticated: true, isUnauthenticated: false, user }),
    )
    renderRoutes('/reset-password?token=reset-token')

    expect(
      await screen.findByRole('heading', { name: 'Choose a new password' }),
    ).toBeVisible()
  })
})

describe('bootstrap retry', () => {
  test('refetches the authoritative current-user query', async () => {
    const refetch = vi.fn()
    useCurrentUserMock.mockReturnValue(
      routeState({ isError: true, isUnauthenticated: false, refetch }),
    )
    renderRoutes('/app')

    await screen.findByRole('heading', {
      name: 'Unable to verify your session',
    })
    screen.getByRole('button', { name: 'Try again' }).click()

    await waitFor(() => expect(refetch).toHaveBeenCalledTimes(1))
  })
})
