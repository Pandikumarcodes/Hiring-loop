import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { ApiError } from '../../shared/lib/apiErrors'

const mocks = vi.hoisted(() => ({ jobs: vi.fn(), job: vi.fn() }))
vi.mock('./hooks/queries', () => ({
  usePublicCareerJobs: mocks.jobs,
  usePublicCareerJob: mocks.job,
}))
import { PublicCareerPage, PublicJobDetailPage } from './pages'

afterEach(cleanup)

const organization = {
  name: 'Acme',
  slug: 'acme',
  description: 'A good place to work.',
  website: 'https://acme.test',
}
const summary = {
  id: 'job-1',
  title: 'Engineer',
  employmentType: 'FULL_TIME',
  workplaceType: 'REMOTE',
  location: 'Remote',
  openings: 2,
  openedAt: '2026-01-01',
}
function career() {
  return render(
    <MemoryRouter initialEntries={['/careers/acme']}>
      <Routes>
        <Route
          path="/careers/:organizationSlug"
          element={<PublicCareerPage />}
        />
      </Routes>
    </MemoryRouter>,
  )
}
function detail() {
  return render(
    <MemoryRouter initialEntries={['/careers/acme/jobs/job-1']}>
      <Routes>
        <Route
          path="/careers/:organizationSlug/jobs/:jobId"
          element={<PublicJobDetailPage />}
        />
      </Routes>
    </MemoryRouter>,
  )
}

describe('public careers', () => {
  test('renders a candidate-facing careers page and job links', () => {
    mocks.jobs.mockReturnValue({
      isPending: false,
      isError: false,
      data: {
        organization,
        jobs: [summary],
        pagination: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
      },
    })
    const view = career()
    expect(
      screen.getByRole('heading', { name: 'Careers at Acme' }),
    ).toBeVisible()
    expect(
      screen.getByRole('link', { name: /Engineer Employment type/ }),
    ).toHaveAttribute('href', '/careers/acme/jobs/job-1')
    expect(document.title).toBe('Careers at Acme | HiringLoop')
    expect(document.querySelector('meta[name="description"]')).toHaveAttribute(
      'content',
      'A good place to work.',
    )
    view.unmount()
    expect(document.title).not.toBe('Careers at Acme | HiringLoop')
  })
  test('keeps loading distinct from an empty careers page', () => {
    mocks.jobs.mockReturnValue({ isPending: true, isError: false })
    career()
    expect(
      screen.getByRole('heading', { name: 'Loading open positions' }),
    ).toBeVisible()
    expect(
      screen.queryByText('No open positions right now'),
    ).not.toBeInTheDocument()
  })
  test('renders empty and unavailable states safely', () => {
    mocks.jobs.mockReturnValue({
      isPending: false,
      isError: false,
      data: {
        organization,
        jobs: [],
        pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 },
      },
    })
    const view = career()
    expect(screen.getByText('No open positions right now')).toBeVisible()
    view.unmount()
    mocks.jobs.mockReturnValue({
      isPending: false,
      isError: true,
      error: new ApiError({
        kind: 'http',
        status: 404,
        code: 'NOT_FOUND',
        message: 'x',
      }),
    })
    career()
    expect(screen.getByText("This careers page isn't available.")).toBeVisible()
  })
  test('renders generic career error with retry', () => {
    mocks.jobs.mockReturnValue({
      isPending: false,
      isError: true,
      error: new ApiError({ kind: 'network', code: 'NETWORK', message: 'x' }),
      refetch: vi.fn(),
    })
    career()
    expect(
      screen.getByText("We couldn't load this careers page."),
    ).toBeVisible()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeVisible()
  })
  test('renders public job detail with the apply action', () => {
    mocks.job.mockReturnValue({
      isPending: false,
      isError: false,
      data: {
        organization,
        job: { ...summary, description: 'Build useful things.' },
      },
    })
    detail()
    expect(
      screen.getByRole('heading', { name: 'Engineer', level: 1 }),
    ).toBeVisible()
    expect(screen.getByText('About the role')).toBeVisible()
    expect(
      screen.getByRole('link', { name: 'All open positions' }),
    ).toHaveAttribute('href', '/careers/acme')
    expect(
      screen.getByRole('link', { name: 'Apply for this role' }),
    ).toHaveAttribute('href', '/careers/acme/jobs/job-1/apply')
  })
  test('does not render a non-http organization website as a link', () => {
    mocks.jobs.mockReturnValue({
      isPending: false,
      isError: false,
      data: {
        organization: { ...organization, website: 'javascript:alert(1)' },
        jobs: [],
        pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 },
      },
    })
    career()
    expect(
      screen.queryByRole('link', { name: /Visit Acme website/ }),
    ).not.toBeInTheDocument()
  })
  test('uses safe unavailable and retryable generic job errors', () => {
    mocks.job.mockReturnValue({
      isPending: false,
      isError: true,
      error: new ApiError({
        kind: 'http',
        status: 404,
        code: 'NOT_FOUND',
        message: 'x',
      }),
    })
    const view = detail()
    expect(screen.getByText('This job is no longer available.')).toBeVisible()
    view.unmount()
    mocks.job.mockReturnValue({
      isPending: false,
      isError: true,
      error: new ApiError({ kind: 'network', code: 'NETWORK', message: 'x' }),
      refetch: vi.fn(),
    })
    detail()
    expect(screen.getByText("We couldn't load this job.")).toBeVisible()
  })
})
