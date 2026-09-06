import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { ApiError } from '../../../shared/lib/apiErrors'

const mocks = vi.hoisted(() => ({
  organization: vi.fn(),
  job: vi.fn(),
}))

vi.mock('../../organizations/hooks/queries', () => ({
  useOrganization: mocks.organization,
}))
vi.mock('../hooks/queries', () => ({ useJob: mocks.job }))
vi.mock('../hooks/mutations', () => ({
  useTransitionJob: () => ({
    isError: false,
    isPending: false,
    error: null,
    mutateAsync: vi.fn(),
    reset: vi.fn(),
  }),
}))

import { JobDetailPage } from './JobDetailPage'

function renderPage() {
  return render(
    <MemoryRouter
      initialEntries={['/app/organizations/org-1/jobs/missing-job']}
    >
      <Routes>
        <Route
          path="/app/organizations/:organizationId/jobs/:jobId"
          element={<JobDetailPage />}
        />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  mocks.organization.mockReset()
  mocks.job.mockReset()
})
afterEach(cleanup)

describe('Job Detail state ordering', () => {
  test('does not show a not-found/error state while permissions are loading', () => {
    mocks.organization.mockReturnValue({ isPending: true, isError: false })
    mocks.job.mockReturnValue({ isPending: true, isError: false })

    renderPage()

    expect(
      screen.getByRole('heading', { name: 'Checking job access' }),
    ).toBeVisible()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  test('shows permission denial before the disabled Job query pending state', () => {
    mocks.organization.mockReturnValue({
      isPending: false,
      isError: false,
      data: { permissions: [] },
    })
    mocks.job.mockReturnValue({ isPending: true, isError: false })

    renderPage()

    expect(
      screen.getByRole('heading', { name: 'Jobs access unavailable' }),
    ).toBeVisible()
    expect(
      screen.queryByRole('heading', { name: 'Loading job' }),
    ).not.toBeInTheDocument()
  })

  test('preserves a genuine missing-Job error after permission resolution', () => {
    mocks.organization.mockReturnValue({
      isPending: false,
      isError: false,
      data: { permissions: ['job:read'] },
    })
    mocks.job.mockReturnValue({
      isPending: false,
      isError: true,
      error: new ApiError({
        kind: 'http',
        status: 404,
        code: 'JOB_NOT_FOUND',
        message: 'Job not found',
      }),
      refetch: vi.fn(),
    })

    renderPage()

    expect(screen.getByText('This job is no longer available.')).toBeVisible()
  })

  test.each(['OPEN', 'DRAFT', 'CLOSED', 'ARCHIVED'] as const)(
    'only exposes a public posting for %s jobs',
    (status) => {
      mocks.organization.mockReturnValue({
        isPending: false,
        isError: false,
        data: { permissions: ['job:read'], slug: 'acme-careers' },
      })
      mocks.job.mockReturnValue({
        isPending: false,
        isError: false,
        data: {
          id: 'public-job-id',
          title: 'Engineer',
          department: null,
          employmentType: 'FULL_TIME',
          workplaceType: 'REMOTE',
          location: null,
          description: 'Description',
          openings: 1,
          status,
          version: 1,
          openedAt: null,
          closedAt: null,
          archivedAt: null,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      })
      renderPage()
      const publicLink = screen.queryByRole('link', {
        name: 'View public posting',
      })
      if (status === 'OPEN') {
        expect(publicLink).toHaveAttribute(
          'href',
          '/careers/acme-careers/jobs/public-job-id',
        )
        expect(publicLink).toHaveAttribute('target', '_blank')
      } else expect(publicLink).not.toBeInTheDocument()
    },
  )
})
