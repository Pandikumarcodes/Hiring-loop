import { QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, describe, expect, test, vi } from 'vitest'

import { createTestQueryClient } from '../../../tests/query-client'
import type { AuthUserDto } from '../../auth/types/auth.types'
import { ApiError } from '../../../shared/lib/apiErrors'

const useCurrentUserMock = vi.hoisted(() => vi.fn())
const useAcceptInvitationMock = vi.hoisted(() => vi.fn())
vi.mock('../../auth/hooks/queries', () => ({
  useCurrentUser: useCurrentUserMock,
}))
vi.mock('../hooks/mutations', () => ({
  useAcceptInvitation: useAcceptInvitationMock,
}))

import { InvitationAcceptancePage } from './InvitationAcceptancePage'
import { AppRoutes } from '../../../app/router/routes'

const user: AuthUserDto = {
  id: 'user-1',
  email: 'recruiter.test@example.com',
  emailVerified: true,
}

function state(overrides: Partial<ReturnType<typeof defaultState>> = {}) {
  return { ...defaultState(), ...overrides }
}

function defaultState() {
  return {
    isPending: false,
    isError: false,
    isAuthenticated: false,
    isUnauthenticated: true,
    user: null as AuthUserDto | null,
  }
}

function renderPage(initialEntry: string) {
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route
            path="/invitations/accept"
            element={<InvitationAcceptancePage />}
          />
          <Route path="/login" element={<LocationState />} />
          <Route path="/verify-email" element={<LocationState />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function LocationState() {
  const location = useLocation()
  return (
    <output data-testid="location-state">
      {JSON.stringify(location.state)}
    </output>
  )
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('invitation acceptance route', () => {
  test('renders for an authenticated verified user with zero organizations', () => {
    useCurrentUserMock.mockReturnValue(
      state({ isAuthenticated: true, isUnauthenticated: false, user }),
    )
    useAcceptInvitationMock.mockReturnValue({
      isPending: true,
      isSuccess: false,
      isError: false,
      mutateAsync: vi.fn(),
      reset: vi.fn(),
    })

    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <MemoryRouter
          initialEntries={['/invitations/accept?token=VALID_TOKEN']}
        >
          <AppRoutes />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(
      screen.getByRole('heading', { name: 'Accepting invitation' }),
    ).toBeVisible()
    expect(screen.queryByTestId('location-state')).not.toBeInTheDocument()
    expect(window.localStorage.length).toBe(0)
    expect(window.sessionStorage.length).toBe(0)
  })

  test('redirects unauthenticated users while preserving the token safely', async () => {
    useCurrentUserMock.mockReturnValue(state())
    useAcceptInvitationMock.mockReturnValue({
      isPending: false,
      isSuccess: false,
      isError: false,
      mutateAsync: vi.fn(),
      reset: vi.fn(),
    })

    renderPage('/invitations/accept?token=VALID_TOKEN')

    await waitFor(() =>
      expect(screen.getByTestId('location-state')).toHaveTextContent(
        'invitations/accept',
      ),
    )
    expect(screen.getByTestId('location-state')).toHaveTextContent(
      'token=VALID_TOKEN',
    )
    expect(window.localStorage.length).toBe(0)
    expect(window.sessionStorage.length).toBe(0)
  })

  test('preserves the invitation location through email verification', async () => {
    useCurrentUserMock.mockReturnValue(
      state({
        isAuthenticated: true,
        isUnauthenticated: false,
        user: { ...user, emailVerified: false },
      }),
    )
    useAcceptInvitationMock.mockReturnValue({
      isPending: false,
      isSuccess: false,
      isError: false,
      mutateAsync: vi.fn(),
      reset: vi.fn(),
    })

    await userEvent.setup().click(
      renderPage('/invitations/accept?token=VALID_TOKEN').getByRole('button', {
        name: 'Go to email verification',
      }),
    )

    expect(screen.getByTestId('location-state')).toHaveTextContent(
      'invitations/accept',
    )
    expect(screen.getByTestId('location-state')).toHaveTextContent(
      'token=VALID_TOKEN',
    )
  })

  test('sends one acceptance request and settles on a safe 404 error', async () => {
    useCurrentUserMock.mockReturnValue(
      state({ isAuthenticated: true, isUnauthenticated: false, user }),
    )
    const mutateAsync = vi.fn().mockRejectedValue(
      new ApiError({
        kind: 'http',
        status: 404,
        code: 'NOT_FOUND',
        message: 'The requested resource was not found.',
      }),
    )
    useAcceptInvitationMock.mockReturnValue({
      isPending: false,
      isSuccess: false,
      isError: true,
      error: new ApiError({
        kind: 'http',
        status: 404,
        code: 'NOT_FOUND',
        message: 'The requested resource was not found.',
      }),
      mutateAsync,
      reset: vi.fn(),
    })

    renderPage('/invitations/accept?token=RAW_TOKEN')

    expect(
      await screen.findByRole('heading', { name: 'Invitation unavailable' }),
    ).toBeVisible()
    expect(mutateAsync).toHaveBeenCalledOnce()
    expect(mutateAsync).toHaveBeenCalledWith('RAW_TOKEN')
  })

  test('navigates to the invited organization after success', async () => {
    useCurrentUserMock.mockReturnValue(
      state({ isAuthenticated: true, isUnauthenticated: false, user }),
    )
    const mutateAsync = vi.fn().mockResolvedValue({
      organization: { id: 'organization-1' },
      membership: {
        id: 'membership-1',
        organizationId: 'organization-1',
        role: 'RECRUITER',
      },
    })
    useAcceptInvitationMock.mockReturnValue({
      isPending: false,
      isSuccess: false,
      isError: false,
      mutateAsync,
      reset: vi.fn(),
    })

    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <MemoryRouter initialEntries={['/invitations/accept?token=RAW_TOKEN']}>
          <Routes>
            <Route
              path="/invitations/accept"
              element={<InvitationAcceptancePage />}
            />
            <Route
              path="/app/organizations/:organizationId"
              element={<LocationState />}
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(await screen.findByTestId('location-state')).toBeInTheDocument()
    expect(mutateAsync).toHaveBeenCalledOnce()
  })
})
