import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, test, vi } from 'vitest'
const list = vi.hoisted(() => vi.fn())
const prefs = vi.hoisted(() => vi.fn())
vi.mock('./hooks/queries', () => ({
  useNotifications: list,
  useNotificationPreferences: prefs,
}))
vi.mock('./hooks/mutations', () => ({
  useNotificationMutations: () => ({
    all: { isPending: false, mutate: vi.fn() },
    read: { isPending: false, mutate: vi.fn() },
    preferences: { isPending: false, isError: false, mutate: vi.fn() },
  }),
}))
import { NotificationsPage } from './pages/NotificationsPage'
describe('notifications page', () => {
  afterEach(() => cleanup())
  test('renders ordered notification items, unread action, and mandatory preference', () => {
    list.mockReturnValue({
      isPending: false,
      isError: false,
      data: {
        data: [
          {
            id: 'n1',
            title: 'Candidate email failed',
            message: 'A candidate email could not be delivered.',
            type: 'CANDIDATE_COMMUNICATION_FAILED',
            applicationId: 'a1',
            interviewId: null,
            readAt: null,
            createdAt: '2026-09-01T10:00:00Z',
          },
        ],
        pagination: { page: 1, pageSize: 20 },
      },
    })
    prefs.mockReturnValue({
      data: [
        { notificationType: 'CANDIDATE_COMMUNICATION_FAILED', enabled: true },
      ],
    })
    render(
      <MemoryRouter initialEntries={['/app/organizations/org-1/notifications']}>
        <NotificationsPage />
      </MemoryRouter>,
    )
    expect(screen.getByRole('heading', { name: 'Notifications' })).toBeVisible()
    expect(screen.getByText('Candidate email failed')).toBeVisible()
    expect(
      screen.getByText('Candidate email failures (always enabled)'),
    ).toBeVisible()
    expect(screen.getByRole('checkbox')).toBeDisabled()
  })
  test('renders empty state', () => {
    list.mockReturnValue({
      isPending: false,
      isError: false,
      data: { data: [], pagination: { page: 1, pageSize: 20 } },
    })
    prefs.mockReturnValue({ data: [] })
    render(
      <MemoryRouter>
        <NotificationsPage />
      </MemoryRouter>,
    )
    expect(
      screen.getByRole('heading', { name: 'You’re all caught up' }),
    ).toBeVisible()
  })
})
