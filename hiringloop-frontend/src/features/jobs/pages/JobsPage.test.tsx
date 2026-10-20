import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  useOrganization: vi.fn(),
  useJobs: vi.fn(),
  useTransitionJob: vi.fn(),
}))

vi.mock('../../organizations/hooks/queries', () => ({
  useOrganization: mocks.useOrganization,
}))
vi.mock('../hooks/queries', () => ({ useJobs: mocks.useJobs }))
vi.mock('../hooks/mutations', () => ({
  useTransitionJob: mocks.useTransitionJob,
}))

import { JobsPage } from './JobsPage'

const orgId = 'organization-1'
const job = {
  id: 'job-1',
  title: 'Senior Engineer',
  department: 'Engineering',
  employmentType: 'FULL_TIME' as const,
  workplaceType: 'REMOTE' as const,
  location: 'Remote',
  openings: 2,
  status: 'OPEN' as const,
  openedAt: '2026-08-01T00:00:00.000Z',
  closedAt: null,
  archivedAt: null,
  version: 1,
  createdAt: '2026-07-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
}

function result(overrides: Record<string, unknown> = {}) {
  return {
    data: {
      jobs: [job],
      pagination: { page: 1, limit: 20, totalItems: 31, totalPages: 2 },
    },
    isPending: false,
    isError: false,
    isPlaceholderData: false,
    error: null,
    isFetching: false,
    refetch: vi.fn(),
    ...overrides,
  }
}

function CurrentLocation() {
  const location = useLocation()
  return (
    <output data-testid="location">
      {location.pathname + location.search}
    </output>
  )
}

function renderJobs(path = `/app/organizations/${orgId}/jobs`) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="/app/organizations/:organizationId/jobs"
          element={<JobsPage />}
        />
      </Routes>
      <CurrentLocation />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.useOrganization.mockReturnValue({
    data: { permissions: ['job:list', 'job:create', 'job:update'] },
    isPending: false,
    isError: false,
  })
  mocks.useJobs.mockReturnValue(result())
  mocks.useTransitionJob.mockReturnValue({
    isPending: false,
    isError: false,
    error: null,
    mutateAsync: vi.fn(),
    reset: vi.fn(),
  })
})

afterEach(() => cleanup())

describe('jobs list page', () => {
  test('renders shared header, job table and mobile card using the same loaded page', () => {
    renderJobs()
    expect(screen.getByRole('heading', { name: 'Jobs' })).toBeVisible()
    expect(
      screen.getByText('Manage open roles and draft positions.'),
    ).toBeVisible()
    expect(screen.getByRole('button', { name: 'New job' })).toBeVisible()
    expect(screen.getByRole('group', { name: 'List filters' })).toBeVisible()
    expect(screen.getByRole('table', { name: 'Jobs' })).toBeInTheDocument()
    expect(
      screen.getAllByRole('link', { name: 'Senior Engineer' }),
    ).toHaveLength(2)
    expect(screen.getByText('Showing 1–20 of 31 · Page 1 of 2')).toBeVisible()
    expect(mocks.useJobs).toHaveBeenCalledOnce()
  })

  test('persists search and status filters in the URL and resets pagination', async () => {
    const user = userEvent.setup()
    renderJobs(`/app/organizations/${orgId}/jobs?page=2&sortBy=title`)
    await user.type(
      screen.getByRole('textbox', { name: 'Search jobs' }),
      'Engineer',
    )
    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent(
        'search=Engineer',
      ),
    )
    expect(screen.getByTestId('location')).not.toHaveTextContent('page=')
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Status' }),
      'OPEN',
    )
    expect(screen.getByTestId('location')).toHaveTextContent('status=OPEN')
    expect(mocks.useJobs).toHaveBeenLastCalledWith(
      orgId,
      expect.objectContaining({ search: 'Engineer', status: 'OPEN', page: 1 }),
      true,
    )
  })

  test('paginates using API totals and preserves the workspace route', async () => {
    const user = userEvent.setup()
    mocks.useJobs.mockReturnValue(
      result({
        data: {
          jobs: [job],
          pagination: { page: 1, limit: 20, totalItems: 31, totalPages: 2 },
        },
      }),
    )
    renderJobs()
    await user.click(screen.getByRole('button', { name: 'Next' }))
    await waitFor(() =>
      expect(mocks.useJobs).toHaveBeenLastCalledWith(
        orgId,
        expect.objectContaining({ page: 2 }),
        true,
      ),
    )
    expect(screen.getByTestId('location')).toHaveTextContent('page=2')
  })

  test('distinguishes a truly empty list from filtered results and retries API errors', async () => {
    const user = userEvent.setup()
    mocks.useJobs.mockReturnValue(
      result({
        data: {
          jobs: [],
          pagination: { page: 1, limit: 20, totalItems: 0, totalPages: 0 },
        },
      }),
    )
    const { unmount } = renderJobs()
    expect(screen.getByRole('heading', { name: 'No jobs yet' })).toBeVisible()
    unmount()
    renderJobs(`/app/organizations/${orgId}/jobs?search=missing`)
    expect(
      screen.getByRole('heading', { name: 'No jobs match your filters.' }),
    ).toBeVisible()

    cleanup()
    const refetch = vi.fn()
    mocks.useJobs.mockReturnValue(
      result({
        data: undefined,
        isError: true,
        error: new Error('offline'),
        refetch,
      }),
    )
    renderJobs()
    expect(screen.getByRole('alert')).toHaveTextContent(
      'We could not load jobs.',
    )
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(refetch).toHaveBeenCalledOnce()
  })

  test('hides create actions without permission and does not flash placeholder tenant rows', () => {
    mocks.useOrganization.mockReturnValue({
      data: { permissions: ['job:list'] },
      isPending: false,
      isError: false,
    })
    mocks.useJobs.mockReturnValue(result({ isPlaceholderData: true }))
    renderJobs()
    expect(
      screen.queryByRole('button', { name: 'New job' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: 'Senior Engineer' }),
    ).not.toBeInTheDocument()
    expect(screen.getByLabelText('Loading jobs')).toBeVisible()
  })
})
