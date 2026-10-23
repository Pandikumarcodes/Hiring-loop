import { QueryClientProvider } from '@tanstack/react-query'
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { createTestQueryClient } from '../../tests/query-client'
import type { AuthUserDto } from '../../features/auth/types/auth.types'
import { organizationKeys } from '../../features/organizations/hooks/query-keys'

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

function renderRoutes(
  initialEntry: string,
  organization?: { id: string; name: string; permissions: string[] },
  memberships: { id: string; name: string }[] = [],
) {
  const queryClient = createTestQueryClient()
  queryClient.setDefaultOptions({
    queries: { retry: false, staleTime: Infinity },
  })
  queryClient.setQueryData(organizationKeys.list(), memberships)
  if (organization) {
    queryClient.setQueryData(
      organizationKeys.detail(organization.id),
      organization,
    )
  }
  return render(
    <QueryClientProvider client={queryClient}>
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
  test('enforces organization permissions after loading a real protected page', async () => {
    useCurrentUserMock.mockReturnValue(
      routeState({ isAuthenticated: true, isUnauthenticated: false, user }),
    )
    renderRoutes(
      '/app/organizations/123e4567-e89b-12d3-a456-426614174000/jobs',
      {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Restricted workspace',
        permissions: [],
      },
    )

    expect(
      await screen.findByText(
        'You do not have permission to view jobs in this workspace.',
        {},
        { timeout: 5000 },
      ),
    ).toBeVisible()
    expect(
      screen.queryByRole('link', { name: 'Create job' }),
    ).not.toBeInTheDocument()
  })

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
        name: 'Create your first organization',
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
        name: 'Create your first organization',
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

describe('public landing and recovery', () => {
  test('introduces the ATS and provides public account links', () => {
    useCurrentUserMock.mockReturnValue(routeState())
    const { container } = renderRoutes('/')

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('heading', { name: 'HiringLoop' })).toBeVisible()
    expect(screen.getAllByRole('main')).toHaveLength(1)
    expect(screen.getAllByText(/Applicant tracking system/i)).toHaveLength(2)
    expect(screen.getByText(/Manage jobs, track candidates/)).toHaveTextContent(
      /application pipelines.*interviews and scorecards.*analytics/,
    )
    const actions = within(
      screen.getByRole('navigation', { name: 'Get started' }),
    )
    expect(
      actions.getByRole('link', { name: 'Create an account' }),
    ).toHaveAttribute('href', '/register')
    expect(actions.getByRole('link', { name: 'Log in' })).toHaveAttribute(
      'href',
      '/login',
    )
    expect(container).not.toHaveTextContent(
      /foundation|app shell|no product workflows|neutral application/i,
    )
  })

  test('offers authenticated entry without exposing cached tenant or account data', async () => {
    useCurrentUserMock.mockReturnValue(
      routeState({ isAuthenticated: true, isUnauthenticated: false, user }),
    )
    renderRoutes('/', undefined, [
      { id: 'private-tenant', name: 'Private tenant name' },
      { id: 'second-tenant', name: 'Another private tenant' },
    ])
    expect(
      screen.queryByText(/Private tenant name|person@example.test/),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: 'Log in' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: 'Register' }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Open workspace' }),
    ).toHaveAttribute('href', '/app')
    await userEvent.click(screen.getByRole('link', { name: 'Open workspace' }))
    expect(
      await screen.findByRole('heading', { name: 'Choose an organization' }),
    ).toBeVisible()
  })

  test.each([
    { isPending: true, isUnauthenticated: false },
    { isError: true, isUnauthenticated: false },
  ])(
    'keeps public content available while session state is unresolved: %j',
    (state) => {
      useCurrentUserMock.mockReturnValue(routeState(state))
      renderRoutes('/')
      expect(screen.getByRole('heading', { name: 'HiringLoop' })).toBeVisible()
      expect(
        screen.getByRole('link', { name: 'Continue to HiringLoop' }),
      ).toHaveAttribute('href', '/app')
      expect(
        screen.queryByRole('link', { name: 'Log in' }),
      ).not.toBeInTheDocument()
    },
  )

  test.each([
    '/missing',
    '/careers/acme/unknown',
    '/application/unknown',
    '/app-like/unknown',
  ])('uses public recovery for %s', (path) => {
    useCurrentUserMock.mockReturnValue(routeState())
    const { container } = renderRoutes(path)
    const recovery = within(
      screen.getByRole('navigation', { name: 'Page recovery' }),
    )
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getAllByRole('main')).toHaveLength(1)
    expect(
      recovery.getByRole('link', { name: 'Return to home' }),
    ).toHaveAttribute('href', '/')
    expect(recovery.getByRole('link', { name: 'Log in' })).toHaveAttribute(
      'href',
      '/login',
    )
    expect(container).not.toHaveTextContent(/foundation|app shell/)
    expect(container).not.toHaveTextContent(path)
  })

  test('offers workspace recovery on an authenticated public 404', async () => {
    useCurrentUserMock.mockReturnValue(
      routeState({ isAuthenticated: true, isUnauthenticated: false, user }),
    )
    renderRoutes('/missing')
    const recovery = within(
      screen.getByRole('navigation', { name: 'Page recovery' }),
    )
    expect(
      recovery.getByRole('link', { name: 'Return to home' }),
    ).toHaveAttribute('href', '/')
    await userEvent.click(
      recovery.getByRole('link', { name: 'Open workspace' }),
    )
    expect(
      await screen.findByRole('heading', {
        name: 'Create your first organization',
      }),
    ).toBeVisible()
  })
})

describe('protected not-found recovery', () => {
  test.each([
    '/app/missing',
    '/app/jobs',
    '/app/organizations/org-unknown/missing',
    '/app/organizations/org-unknown/jobs/job-unknown/unknown',
  ])('keeps %s inside the guarded application', async (path) => {
    useCurrentUserMock.mockReturnValue(
      routeState({ isAuthenticated: true, isUnauthenticated: false, user }),
    )
    renderRoutes(path)
    expect(
      screen.getByRole('heading', { name: 'Page not found' }),
    ).toBeVisible()
    expect(screen.getAllByRole('main')).toHaveLength(1)
    const recovery = within(
      screen.getByRole('navigation', { name: 'Page recovery' }),
    )
    expect(recovery.getAllByRole('link')).toHaveLength(1)
    expect(
      recovery.getByRole('link', { name: 'Return to workspace' }),
    ).toHaveAttribute('href', '/app')
    expect(
      screen.queryByRole('navigation', { name: 'Public navigation' }),
    ).not.toBeInTheDocument()
    await userEvent.click(
      recovery.getByRole('link', { name: 'Return to workspace' }),
    )
    // No membership is required: the existing landing flow loads lazy onboarding.
    expect(
      await screen.findByRole('heading', {
        name: 'Create your first organization',
      }),
    ).toBeVisible()
  })

  test('returns to the existing organization chooser when multiple memberships exist', async () => {
    useCurrentUserMock.mockReturnValue(
      routeState({ isAuthenticated: true, isUnauthenticated: false, user }),
    )
    renderRoutes('/app/missing', undefined, [
      { id: 'org-1', name: 'First workspace' },
      { id: 'org-2', name: 'Second workspace' },
    ])
    await userEvent.click(
      screen.getByRole('link', { name: 'Return to workspace' }),
    )
    expect(
      await screen.findByRole('heading', { name: 'Choose an organization' }),
    ).toBeVisible()
    expect(
      screen.getByRole('link', { name: /First workspace/ }),
    ).toHaveAttribute('href', '/app/organizations/org-1')
  })

  test('does not expose protected recovery before session verification', () => {
    useCurrentUserMock.mockReturnValue(
      routeState({ isPending: true, isUnauthenticated: false }),
    )
    renderRoutes('/app/missing')
    expect(
      screen.getByRole('heading', { name: 'Checking your session' }),
    ).toBeVisible()
    expect(
      screen.queryByRole('navigation', { name: 'Page recovery' }),
    ).not.toBeInTheDocument()
  })

  test('sends unauthenticated protected misses through the existing login guard', async () => {
    useCurrentUserMock.mockReturnValue(routeState())
    renderRoutes('/app/organizations/unknown/missing')
    expect(
      await screen.findByRole('heading', { name: 'Welcome back' }),
    ).toBeVisible()
    expect(
      screen.queryByRole('heading', { name: 'Page not found' }),
    ).not.toBeInTheDocument()
  })
})
