import { cleanup, render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import {
  Link,
  MemoryRouter,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import type {
  NotificationDto,
  NotificationPreferenceDto,
} from './types/notifications.types'

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  prefs: vi.fn(),
  unread: vi.fn(),
  markAll: vi.fn(),
  read: vi.fn(),
  save: vi.fn(),
  mutationState: {
    isPending: false,
    isError: false,
    isSuccess: false,
    variables: undefined as NotificationPreferenceDto[] | undefined,
  },
}))

vi.mock('./hooks/queries', () => ({
  useNotifications: mocks.list,
  useNotificationPreferences: mocks.prefs,
  useUnreadCount: mocks.unread,
}))
vi.mock('./hooks/mutations', () => ({
  useNotificationMutations: () => ({
    all: { isPending: false, mutate: mocks.markAll },
    read: { isPending: false, mutate: mocks.read },
    preferences: { ...mocks.mutationState, mutate: mocks.save },
  }),
}))

import { NotificationBell } from './components/NotificationBell'
import { NotificationsPage } from './pages/NotificationsPage'

const preferences: NotificationPreferenceDto[] = [
  { notificationType: 'CANDIDATE_COMMUNICATION_FAILED', enabled: true },
  { notificationType: 'INTERVIEW_SCHEDULED', enabled: true },
  { notificationType: 'SCORECARD_SUBMITTED', enabled: false },
]

const notification: NotificationDto = {
  id: 'n1',
  title: 'Candidate email failed',
  message: 'A candidate email could not be delivered.',
  type: 'CANDIDATE_COMMUNICATION_FAILED',
  applicationId: 'a1',
  interviewId: null,
  readAt: null,
  createdAt: '2026-09-01T10:00:00Z',
}

function Location() {
  const location = useLocation()
  return <p data-testid="location">{location.pathname}</p>
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/app/organizations/org-1/notifications']}>
      <Routes>
        <Route
          path="/app/organizations/:organizationId/notifications"
          element={<NotificationsPage />}
        />
      </Routes>
    </MemoryRouter>,
  )
}

function renderBell() {
  return render(
    <MemoryRouter initialEntries={['/app/organizations/org-1']}>
      <NotificationBell />
      <Location />
    </MemoryRouter>,
  )
}

describe('notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.mutationState.isPending = false
    mocks.mutationState.isError = false
    mocks.mutationState.isSuccess = false
    mocks.mutationState.variables = undefined
    mocks.list.mockReturnValue({
      isPending: false,
      isError: false,
      data: { data: [notification], pagination: { page: 1, pageSize: 20 } },
    })
    mocks.prefs.mockReturnValue({
      isPending: false,
      isError: false,
      data: preferences,
      refetch: vi.fn(),
    })
    mocks.unread.mockReturnValue({ data: 1 })
  })

  afterEach(() => cleanup())

  test('renders notification actions and mandatory preference', async () => {
    const user = userEvent.setup()
    renderPage()
    expect(screen.getByRole('heading', { name: 'Notifications' })).toBeVisible()
    expect(screen.getByText('Candidate email failed')).toBeVisible()
    expect(
      screen.getByRole('checkbox', { name: /Candidate email failures/ }),
    ).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Mark all as read' }))
    expect(mocks.markAll).toHaveBeenCalledOnce()
    await user.click(
      screen.getByRole('button', { name: /Candidate email failed/ }),
    )
    expect(mocks.read).toHaveBeenCalledWith('n1')
  })

  test('hydrates preferences after asynchronous loading and saves the full list', async () => {
    const user = userEvent.setup()
    mocks.prefs.mockReturnValue({ isPending: true, data: undefined })
    const view = renderPage()
    expect(screen.getByText('Loading preferences…')).toBeVisible()
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
    expect(mocks.save).not.toHaveBeenCalled()

    mocks.prefs.mockReturnValue({
      isPending: false,
      isError: false,
      data: preferences,
    })
    view.rerender(
      <MemoryRouter initialEntries={['/app/organizations/org-1/notifications']}>
        <Routes>
          <Route
            path="/app/organizations/:organizationId/notifications"
            element={<NotificationsPage />}
          />
        </Routes>
      </MemoryRouter>,
    )
    const scheduled = screen.getByRole('checkbox', {
      name: /Interview scheduled/,
    })
    expect(scheduled).toBeChecked()
    expect(
      screen.getByRole('checkbox', { name: /Scorecard submitted/ }),
    ).not.toBeChecked()
    await user.click(scheduled)
    expect(mocks.save).toHaveBeenCalledWith([
      preferences[0],
      { notificationType: 'INTERVIEW_SCHEDULED', enabled: false },
      preferences[2],
    ])
    expect(mocks.save.mock.calls[0][0]).not.toHaveLength(0)
  })

  test('keeps a local edit through a background refetch', async () => {
    const user = userEvent.setup()
    const view = renderPage()
    const scheduled = screen.getByRole('checkbox', {
      name: /Interview scheduled/,
    })
    await user.click(scheduled)
    expect(scheduled).not.toBeChecked()

    mocks.prefs.mockReturnValue({
      isPending: false,
      isError: false,
      data: [...preferences],
    })
    view.rerender(
      <MemoryRouter initialEntries={['/app/organizations/org-1/notifications']}>
        <Routes>
          <Route
            path="/app/organizations/:organizationId/notifications"
            element={<NotificationsPage />}
          />
        </Routes>
      </MemoryRouter>,
    )
    expect(scheduled).not.toBeChecked()
  })

  test('disables toggles while saving and announces success', async () => {
    const user = userEvent.setup()
    const view = renderPage()
    await user.click(
      screen.getByRole('checkbox', { name: /Interview scheduled/ }),
    )
    mocks.mutationState.isPending = true
    view.rerender(
      <MemoryRouter initialEntries={['/app/organizations/org-1/notifications']}>
        <Routes>
          <Route
            path="/app/organizations/:organizationId/notifications"
            element={<NotificationsPage />}
          />
        </Routes>
      </MemoryRouter>,
    )
    expect(
      screen.getByRole('checkbox', { name: /Interview scheduled/ }),
    ).toBeDisabled()
    expect(screen.getByText('Saving preferences…')).toHaveAttribute(
      'role',
      'status',
    )
    mocks.mutationState.isPending = false
    mocks.mutationState.isSuccess = true
    view.rerender(
      <MemoryRouter initialEntries={['/app/organizations/org-1/notifications']}>
        <Routes>
          <Route
            path="/app/organizations/:organizationId/notifications"
            element={<NotificationsPage />}
          />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByText('Preferences saved.')).toHaveAttribute(
      'role',
      'status',
    )
  })

  test('keeps failed edits visible and offers a retry with the same payload', async () => {
    const user = userEvent.setup()
    const view = renderPage()
    await user.click(
      screen.getByRole('checkbox', { name: /Interview scheduled/ }),
    )
    const payload = mocks.save.mock.calls[0][0] as NotificationPreferenceDto[]
    mocks.mutationState.isError = true
    mocks.mutationState.variables = payload
    view.rerender(
      <MemoryRouter initialEntries={['/app/organizations/org-1/notifications']}>
        <Routes>
          <Route
            path="/app/organizations/:organizationId/notifications"
            element={<NotificationsPage />}
          />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('not saved')
    expect(
      screen.getByRole('checkbox', { name: /Interview scheduled/ }),
    ).not.toBeChecked()
    await user.click(screen.getByRole('button', { name: 'Retry save' }))
    expect(mocks.save).toHaveBeenLastCalledWith(payload)
  })

  test('does not save when preferences fail to load or the server returns none', () => {
    mocks.prefs.mockReturnValue({
      isPending: false,
      isError: true,
      data: undefined,
      refetch: vi.fn(),
    })
    const view = renderPage()
    expect(screen.getByRole('alert')).toHaveTextContent('could not load')
    expect(mocks.save).not.toHaveBeenCalled()
    mocks.prefs.mockReturnValue({ isPending: false, isError: false, data: [] })
    view.rerender(
      <MemoryRouter initialEntries={['/app/organizations/org-1/notifications']}>
        <Routes>
          <Route
            path="/app/organizations/:organizationId/notifications"
            element={<NotificationsPage />}
          />
        </Routes>
      </MemoryRouter>,
    )
    expect(
      screen.getByText('No notification preferences are available.'),
    ).toBeVisible()
    expect(mocks.save).not.toHaveBeenCalled()
  })

  test('does not carry local preference edits into another workspace', async () => {
    const user = userEvent.setup()
    mocks.prefs.mockImplementation((org: string) => ({
      isPending: false,
      isError: false,
      data:
        org === 'org-1'
          ? preferences
          : preferences.map((item) => ({ ...item, enabled: true })),
    }))
    render(
      <MemoryRouter initialEntries={['/app/organizations/org-1/notifications']}>
        <Link to="/app/organizations/org-2/notifications">
          Switch workspace
        </Link>
        <Routes>
          <Route
            path="/app/organizations/:organizationId/notifications"
            element={<NotificationsPage />}
          />
        </Routes>
      </MemoryRouter>,
    )
    const scheduled = screen.getByRole('checkbox', {
      name: /Interview scheduled/,
    })
    await user.click(scheduled)
    expect(scheduled).not.toBeChecked()
    mocks.mutationState.isSuccess = true
    await user.click(screen.getByRole('link', { name: 'Switch workspace' }))
    expect(
      screen.getByRole('checkbox', { name: /Interview scheduled/ }),
    ).toBeChecked()
    expect(screen.queryByText('Preferences saved.')).not.toBeInTheDocument()
    expect(mocks.prefs).toHaveBeenCalledWith('org-2')
  })

  test('bell supports keyboard dismissal, focus restoration, and workspace navigation', async () => {
    const user = userEvent.setup()
    renderBell()
    const trigger = screen.getByRole('button', {
      name: 'Notifications, 1 unread',
    })
    trigger.focus()
    await user.keyboard('{Enter}')
    expect(
      screen.getByRole('menu', { name: 'Recent notifications' }),
    ).toBeVisible()
    expect(
      screen.getByRole('menuitem', { name: /Candidate email failed/ }),
    ).toBeVisible()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()

    await user.click(trigger)
    await user.click(
      screen.getByRole('menuitem', { name: /Candidate email failed/ }),
    )
    expect(mocks.read).toHaveBeenCalledWith('n1')
    expect(screen.getByTestId('location')).toHaveTextContent(
      '/app/organizations/org-1/applications/a1',
    )
  })

  test('bell supports outside dismissal and keyboard navigation to the inbox', async () => {
    const user = userEvent.setup()
    renderBell()
    const trigger = screen.getByRole('button', {
      name: 'Notifications, 1 unread',
    })
    await user.click(trigger)
    expect(screen.getByRole('menu')).toBeVisible()
    await user.pointer({ target: document.body, keys: '[MouseLeft]' })
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()

    trigger.focus()
    await user.keyboard('{Enter}')
    await user.keyboard('{End}{Enter}')
    expect(screen.getByTestId('location')).toHaveTextContent(
      '/app/organizations/org-1/notifications',
    )
  })
})
