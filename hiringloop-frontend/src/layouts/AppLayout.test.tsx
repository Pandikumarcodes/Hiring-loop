import { cleanup, render, screen, within } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import type { OrganizationDto } from '../features/organizations/types/organization.types'

const mocks = vi.hoisted(() => ({
  useOrganization: vi.fn(),
  useOrganizations: vi.fn(),
  useCurrentUser: vi.fn(),
  useLogout: vi.fn(),
  useNotifications: vi.fn(),
  useUnreadCount: vi.fn(),
  markRead: vi.fn(),
  markAll: vi.fn(),
}))

vi.mock('../features/organizations/hooks/queries', () => ({
  useOrganization: mocks.useOrganization,
  useOrganizations: mocks.useOrganizations,
}))
vi.mock('../features/auth/hooks/queries', () => ({
  useCurrentUser: mocks.useCurrentUser,
}))
vi.mock('../features/auth/hooks/mutations', () => ({
  useLogout: mocks.useLogout,
}))
vi.mock('../features/notifications/hooks/queries', () => ({
  useNotifications: mocks.useNotifications,
  useUnreadCount: mocks.useUnreadCount,
}))
vi.mock('../features/notifications/hooks/mutations', () => ({
  useNotificationMutations: () => ({
    read: { mutate: mocks.markRead },
    all: { mutate: mocks.markAll },
  }),
}))

import { AppLayout } from './AppLayout'

const firstId = '123e4567-e89b-12d3-a456-426614174000'
const secondId = '123e4567-e89b-12d3-a456-426614174001'
const allPermissions: NonNullable<OrganizationDto['permissions']> = [
  'job:list',
  'candidate:list',
  'interview:view-assigned',
  'talent-pool:view',
  'analytics:view',
  'audit:view',
  'member:role-change',
  'notification:view-own',
]

const first: OrganizationDto = {
  id: firstId,
  name: 'Acme Hiring',
  slug: 'acme-hiring',
  website: null,
  description: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  permissions: allPermissions,
}
const second: OrganizationDto = {
  ...first,
  id: secondId,
  name: 'Second Workspace',
}

function CurrentPath() {
  return <output data-testid="current-path">{useLocation().pathname}</output>
}

function renderShell(path = `/app/organizations/${firstId}`) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/app/*" element={<AppLayout />}>
          <Route path="*" element={<p>Workspace page content</p>} />
        </Route>
        <Route path="/login" element={<p>Login destination</p>} />
      </Routes>
      <CurrentPath />
    </MemoryRouter>,
  )
}

function desktopNavigation() {
  return within(
    screen.getByRole('complementary', { name: 'Workspace sidebar' }),
  ).getByRole('navigation', { name: 'Application shell navigation' })
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.useOrganization.mockImplementation((id: string) => ({
    isPending: false,
    isSuccess: true,
    isError: false,
    data: id === secondId ? second : first,
  }))
  mocks.useOrganizations.mockReturnValue({
    isPending: false,
    isError: false,
    data: [first, second],
  })
  mocks.useCurrentUser.mockReturnValue({
    user: { id: 'user-1', email: 'person@example.test' },
  })
  mocks.useLogout.mockReturnValue({
    isPending: false,
    isError: false,
    mutateAsync: vi.fn().mockResolvedValue(undefined),
  })
  mocks.useNotifications.mockReturnValue({
    isPending: false,
    isError: false,
    data: { data: [], pagination: { page: 1, pageSize: 20 } },
  })
  mocks.useUnreadCount.mockReturnValue({ data: 2 })
})

afterEach(() => cleanup())

describe('authenticated application shell', () => {
  test('disables the existing sign-out action while logout is pending', async () => {
    const logout = vi.fn()
    mocks.useLogout.mockReturnValue({
      isPending: true,
      isError: false,
      mutateAsync: logout,
    })
    renderShell()
    await userEvent.click(
      screen.getByRole('button', { name: /Open account menu/ }),
    )
    const action = screen.getByRole('menuitem', { name: /Signing out/ })
    expect(action).toHaveAttribute('aria-disabled', 'true')
    await userEvent.click(action)
    expect(logout).not.toHaveBeenCalled()
  })
  test('has one compact account entry in the sidebar and none in the header', () => {
    renderShell()
    expect(
      screen.getAllByRole('button', { name: /Open account menu/ }),
    ).toHaveLength(1)
    expect(
      within(screen.getByRole('banner')).queryByRole('button', {
        name: /Open account menu/,
      }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /Sign out/ }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: 'Create workspace' }),
    ).not.toBeInTheDocument()
  })

  test('account menu exposes the full long email and restores keyboard focus', async () => {
    const user = userEvent.setup()
    const email = `${'long.account.'.repeat(12)}@example.test`
    mocks.useCurrentUser.mockReturnValue({ user: { id: 'user-1', email } })
    renderShell()
    const trigger = screen.getByRole('button', {
      name: `Open account menu for ${email}`,
    })
    trigger.focus()
    await user.keyboard('{Enter}')
    const menu = screen.getByRole('menu', { name: 'Account menu' })
    expect(within(menu).getByText(email)).toBeVisible()
    expect(within(menu).getByText(email)).not.toHaveClass('truncate')
    expect(within(menu).getAllByRole('menuitem')).toHaveLength(1)
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  test('workspace menu supports keyboard opening, Escape and outside dismissal', async () => {
    const user = userEvent.setup()
    renderShell(`/app/organizations/${firstId}/jobs/job-1/pipeline`)
    const trigger = screen.getByRole('button', { name: /Switch workspace:/ })
    trigger.focus()
    await user.keyboard('{Enter}')
    expect(
      screen.getByRole('menuitem', { name: /Acme Hiring/ }),
    ).toHaveAttribute('aria-current', 'true')
    await user.keyboard('{Escape}')
    expect(trigger).toHaveFocus()
    await user.click(trigger)
    await user.pointer({ target: document.body, keys: '[MouseLeft]' })
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  test('workspace creation is reachable by keyboard from a nested page', async () => {
    const user = userEvent.setup()
    renderShell(`/app/organizations/${firstId}/jobs/job-1/pipeline`)
    screen.getByRole('button', { name: /Switch workspace:/ }).focus()
    await user.keyboard('{Enter}{End}{Enter}')
    expect(screen.getByTestId('current-path')).toHaveTextContent(
      '/app/organizations/new',
    )
  })

  test('account menu inside the mobile drawer dismisses before the drawer and signs out', async () => {
    const user = userEvent.setup()
    const logout = vi.fn().mockResolvedValue(undefined)
    mocks.useLogout.mockReturnValue({
      isPending: false,
      isError: false,
      mutateAsync: logout,
    })
    renderShell()
    await user.click(screen.getByRole('button', { name: 'Open navigation' }))
    const drawer = screen.getByRole('dialog')
    const trigger = within(drawer).getByRole('button', {
      name: /Open account menu/,
    })
    expect(
      screen.getAllByRole('button', { name: /Open account menu/ }),
    ).toHaveLength(1)
    await user.click(trigger)
    await user.keyboard('{Escape}')
    expect(drawer).toBeVisible()
    expect(trigger).toHaveFocus()
    await user.click(trigger)
    await user.click(screen.getByRole('menuitem', { name: 'Sign out' }))
    expect(logout).toHaveBeenCalledOnce()
    expect(screen.getByTestId('current-path')).toHaveTextContent('/login')
  })

  test('failed sign out keeps the shell and exposes the existing retry feedback', async () => {
    const user = userEvent.setup()
    mocks.useLogout.mockReturnValue({
      isPending: false,
      isError: true,
      error: new Error('Failed'),
      mutateAsync: vi.fn().mockRejectedValue(new Error('Failed')),
    })
    renderShell()
    await user.click(screen.getByRole('button', { name: /Open account menu/ }))
    await user.click(screen.getByRole('menuitem', { name: 'Sign out' }))
    expect(screen.getByTestId('current-path')).not.toHaveTextContent('/login')
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Please try signing out again',
    )
  })
  test('renders ordered workspace navigation with scoped links and active dashboard', () => {
    renderShell()
    const nav = desktopNavigation()
    expect(
      within(nav)
        .getAllByRole('link')
        .map((link) => link.textContent),
    ).toEqual([
      'Dashboard',
      'Jobs',
      'Candidates',
      'Interviews',
      'Talent Pools',
      'Analytics',
      'Audit Log',
      'Team',
      'Notifications',
    ])
    expect(within(nav).getByRole('link', { name: 'Jobs' })).toHaveAttribute(
      'href',
      `/app/organizations/${firstId}/jobs`,
    )
    expect(
      within(nav).getByRole('link', { name: 'Dashboard' }),
    ).toHaveAttribute('aria-current', 'page')
    expect(
      screen.getByRole('link', { name: 'HiringLoop home' }),
    ).toHaveAttribute('href', `/app/organizations/${firstId}`)
    expect(screen.getByRole('main')).toHaveTextContent('Workspace page content')
  })

  test.each([
    ['jobs/job-1/pipeline', 'Jobs'],
    ['jobs/job-1/application-form', 'Jobs'],
    ['jobs/job-1/scorecard', 'Jobs'],
    ['candidates/candidate-1', 'Candidates'],
    ['applications/application-1', 'Candidates'],
    ['interviews/interview-1/scorecard', 'Interviews'],
    ['talent-pools/pool-1', 'Talent Pools'],
  ])('highlights the %s section for nested routes', (path, label) => {
    renderShell(`/app/organizations/${firstId}/${path}`)
    const link = within(desktopNavigation()).getByRole('link', { name: label })
    expect(link).toHaveAttribute('data-active', 'true')
    expect(link).not.toHaveAttribute('aria-current', 'page')
  })

  test('hides unauthorized items and does not flash links while permissions load', () => {
    mocks.useOrganization.mockReturnValue({
      isPending: true,
      isSuccess: false,
      isError: false,
      data: undefined,
    })
    const view = renderShell()
    expect(within(desktopNavigation()).queryAllByRole('link')).toHaveLength(0)
    expect(
      screen.queryByRole('button', { name: /Notifications, 2 unread/ }),
    ).not.toBeInTheDocument()

    mocks.useOrganization.mockReturnValue({
      isPending: false,
      isSuccess: true,
      isError: false,
      data: {
        ...first,
        permissions: ['interview:view-assigned', 'notification:view-own'],
      },
    })
    view.rerender(
      <MemoryRouter initialEntries={[`/app/organizations/${firstId}`]}>
        <Routes>
          <Route path="/app/*" element={<AppLayout />}>
            <Route path="*" element={<p>Workspace page content</p>} />
          </Route>
        </Routes>
        <CurrentPath />
      </MemoryRouter>,
    )
    expect(
      within(desktopNavigation())
        .getAllByRole('link')
        .map((link) => link.textContent),
    ).toEqual(['Dashboard', 'Interviews', 'Notifications'])
    expect(
      within(desktopNavigation()).queryByRole('link', { name: 'Team' }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Notifications, 2 unread' }),
    ).toBeVisible()
  })

  test('switches workspaces from the sidebar without retaining old scoped links', async () => {
    const user = userEvent.setup()
    renderShell(`/app/organizations/${firstId}/jobs/job-1`)
    const sidebar = screen.getByRole('complementary', {
      name: 'Workspace sidebar',
    })
    await user.click(
      within(sidebar).getByRole('button', { name: /Switch workspace:/ }),
    )
    await user.click(screen.getByRole('menuitem', { name: 'Second Workspace' }))
    expect(screen.getByTestId('current-path')).toHaveTextContent(
      `/app/organizations/${secondId}`,
    )
    expect(
      within(desktopNavigation()).getByRole('link', { name: 'Jobs' }),
    ).toHaveAttribute('href', `/app/organizations/${secondId}/jobs`)
    expect(
      screen.getByRole('link', { name: 'HiringLoop home' }),
    ).toHaveAttribute('href', `/app/organizations/${secondId}`)
    expect(screen.getByRole('link', { name: 'Second Workspace' })).toBeVisible()
  })

  test('mobile drawer closes on Escape and restores focus', async () => {
    const user = userEvent.setup()
    renderShell()
    const trigger = screen.getByRole('button', { name: 'Open navigation' })
    trigger.focus()
    await user.keyboard('{Enter}')
    const drawer = screen.getByRole('dialog', { name: 'Workspace navigation' })
    expect(drawer).toBeVisible()
    expect(within(drawer).getByRole('link', { name: 'Jobs' })).toBeVisible()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  test('mobile drawer closes after page navigation and workspace switching', async () => {
    const user = userEvent.setup()
    renderShell()
    await user.click(screen.getByRole('button', { name: 'Open navigation' }))
    await user.click(
      within(screen.getByRole('dialog')).getByRole('link', { name: 'Jobs' }),
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByTestId('current-path')).toHaveTextContent(
      `/app/organizations/${firstId}/jobs`,
    )
    await user.click(screen.getByRole('button', { name: 'Open navigation' }))
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: /Switch workspace:/,
      }),
    )
    await user.click(screen.getByRole('menuitem', { name: 'Second Workspace' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByTestId('current-path')).toHaveTextContent(
      `/app/organizations/${secondId}`,
    )
  })

  test('integrates notification bell and preserves account sign-out', async () => {
    const user = userEvent.setup()
    const logout = vi.fn().mockResolvedValue(undefined)
    mocks.useLogout.mockReturnValue({
      isPending: false,
      isError: false,
      mutateAsync: logout,
    })
    renderShell()
    await user.click(
      screen.getByRole('button', { name: 'Notifications, 2 unread' }),
    )
    expect(
      screen.getByRole('menu', { name: 'Recent notifications' }),
    ).toBeVisible()
    await user.keyboard('{Escape}')
    await user.click(
      screen.getByRole('button', {
        name: /Open account menu for person@example.test/,
      }),
    )
    await user.click(screen.getByRole('menuitem', { name: 'Sign out' }))
    expect(logout).toHaveBeenCalledOnce()
    expect(screen.getByTestId('current-path')).toHaveTextContent('/login')
  })
})
