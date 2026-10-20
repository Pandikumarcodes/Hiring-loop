import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import type { OrganizationDto } from '../types/organization.types'
import type { JobPage } from '../../../features/jobs/types/job.types'
import type { CandidatePageDto } from '../../../features/candidate-management/types/candidate-management.types'
import type { InterviewDto } from '../../../features/interviews/types/interview.types'

const mocks = vi.hoisted(() => ({
  useJobs: vi.fn(),
  useCandidates: vi.fn(),
  useAnalyticsOverview: vi.fn(),
  useAnalyticsPipeline: vi.fn(),
  useCalendarInterviews: vi.fn(),
  useOrganization: vi.fn(),
  useOrganizations: vi.fn(),
}))

vi.mock('../../jobs/hooks/queries', () => ({ useJobs: mocks.useJobs }))
vi.mock('../../candidate-management/hooks/queries', () => ({
  useCandidates: mocks.useCandidates,
}))
vi.mock('../../analytics/hooks/queries', () => ({
  useAnalyticsOverview: mocks.useAnalyticsOverview,
  useAnalyticsPipeline: mocks.useAnalyticsPipeline,
}))
vi.mock('../../interviews/hooks/queries', () => ({
  useCalendarInterviews: mocks.useCalendarInterviews,
}))
vi.mock('../hooks/queries', () => ({
  useOrganization: mocks.useOrganization,
  useOrganizations: mocks.useOrganizations,
}))

import { WorkspaceDashboard } from './WorkspaceDashboard'
import { OrganizationWorkspacePage } from '../pages/OrganizationWorkspacePage'

const orgId = '123e4567-e89b-12d3-a456-426614174000'
const otherOrgId = '123e4567-e89b-12d3-a456-426614174001'
const permissions: NonNullable<OrganizationDto['permissions']> = [
  'job:list',
  'job:create',
  'candidate:list',
  'interview:view-assigned',
  'interview:view',
  'analytics:view',
  'member:role-change',
]
const organization: OrganizationDto = {
  id: orgId,
  name: 'Acme Hiring',
  slug: 'acme-hiring',
  website: null,
  description: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  permissions,
}
const job = {
  id: 'job-1',
  title: 'Senior Engineer',
  department: 'Engineering',
  location: 'Remote',
  status: 'OPEN' as const,
  employmentType: 'FULL_TIME' as const,
  workplaceType: 'REMOTE' as const,
  openings: 1,
  openedAt: null,
  closedAt: null,
  archivedAt: null,
  version: 1,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-02-01T00:00:00.000Z',
}
const jobPage: JobPage = {
  jobs: [job],
  pagination: { page: 1, limit: 5, totalItems: 12, totalPages: 3 },
}
const emptyJobPage: JobPage = {
  jobs: [],
  pagination: { page: 1, limit: 5, totalItems: 0, totalPages: 0 },
}
const candidatePage: CandidatePageDto = {
  candidates: [],
  pagination: { page: 1, limit: 1, totalItems: 24, totalPages: 24 },
}
const interviewStart = new Date(Date.now() + 86400000).toISOString()
const interviewEnd = new Date(Date.now() + 90000000).toISOString()
const interview: InterviewDto = {
  id: 'interview-1',
  title: 'Technical interview',
  format: 'VIDEO',
  status: 'SCHEDULED',
  scheduledStartAt: interviewStart,
  scheduledEndAt: interviewEnd,
  timeZone: 'UTC',
  meetingUrl: null,
  location: null,
  participants: [],
  application: {
    id: 'application-1',
    candidate: {
      id: 'candidate-1',
      name: 'Taylor Candidate',
      email: 'taylor@example.test',
    },
    job: { id: 'job-1', title: 'Senior Engineer' },
  },
  cancellation: null,
}

function queryResult<T>(data: T, overrides: Record<string, unknown> = {}) {
  return {
    data,
    isPending: false,
    isError: false,
    isPlaceholderData: false,
    error: null,
    refetch: vi.fn(),
    ...overrides,
  }
}

function renderDashboard(org = organization) {
  return render(
    <MemoryRouter initialEntries={[`/app/organizations/${org.id}`]}>
      <Routes>
        <Route
          path="/app/organizations/:organizationId"
          element={<WorkspaceDashboard organization={org} />}
        />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.useJobs.mockImplementation(
    (_id: string, filters: { status?: string }) =>
      queryResult(
        filters.status
          ? { ...jobPage, pagination: { ...jobPage.pagination, totalItems: 3 } }
          : jobPage,
      ),
  )
  mocks.useCandidates.mockReturnValue(queryResult(candidatePage))
  mocks.useAnalyticsOverview.mockReturnValue(
    queryResult({ openJobs: 3, activeApplications: 9 }),
  )
  mocks.useAnalyticsPipeline.mockReturnValue(
    queryResult({
      currentStages: [{ id: 'stage-1', name: 'Screening', count: 4 }],
      initialEntries: [],
    }),
  )
  mocks.useCalendarInterviews.mockReturnValue(queryResult([interview]))
  mocks.useOrganization.mockReturnValue({
    isPending: false,
    isError: false,
    data: organization,
    refetch: vi.fn(),
  })
  mocks.useOrganizations.mockReturnValue({ data: [organization] })
})

afterEach(() => cleanup())

describe('workspace dashboard', () => {
  test('shows the workspace title, authoritative KPI totals and supported widgets', () => {
    renderDashboard()
    expect(screen.getByText('Acme Hiring')).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
    expect(screen.getByText('Total jobs')).toBeVisible()
    expect(screen.getByText('12')).toBeVisible()
    expect(screen.getByText('Total candidates')).toBeVisible()
    expect(screen.getByText('24')).toBeVisible()
    expect(screen.getByText('Active applications')).toBeVisible()
    expect(screen.getByText('9')).toBeVisible()
    expect(
      screen.getAllByRole('link', { name: 'Create job' })[0],
    ).toHaveAttribute('href', `/app/organizations/${orgId}/jobs/new`)
    expect(
      screen.getByRole('link', { name: 'Senior Engineer' }),
    ).toHaveAttribute('href', `/app/organizations/${orgId}/jobs/job-1`)
    expect(screen.getByText('Screening')).toBeVisible()
    expect(screen.getByText('Taylor Candidate · Senior Engineer')).toBeVisible()
  })

  test('uses only the selected organization in every data hook and hides placeholder tenant data', () => {
    mocks.useJobs.mockReturnValue(
      queryResult(jobPage, { isPlaceholderData: true }),
    )
    mocks.useCandidates.mockReturnValue(
      queryResult(candidatePage, { isPlaceholderData: true }),
    )
    mocks.useCalendarInterviews.mockReturnValue(
      queryResult([interview], { isPlaceholderData: true }),
    )
    renderDashboard({
      ...organization,
      id: otherOrgId,
      name: 'Second Workspace',
    })
    expect(screen.getByText('Second Workspace')).toBeVisible()
    expect(
      screen.queryByRole('link', { name: 'Senior Engineer' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByText('Taylor Candidate · Senior Engineer'),
    ).not.toBeInTheDocument()
    expect(mocks.useJobs).toHaveBeenCalledWith(
      otherOrgId,
      expect.anything(),
      true,
    )
    expect(mocks.useCandidates).toHaveBeenCalledWith(
      otherOrgId,
      expect.anything(),
      true,
    )
    expect(mocks.useAnalyticsOverview).toHaveBeenCalledWith(
      otherOrgId,
      expect.anything(),
      true,
    )
    expect(mocks.useCalendarInterviews).toHaveBeenCalledWith(
      otherOrgId,
      expect.any(String),
      expect.any(String),
      false,
      true,
    )
  })

  test('omits widgets and actions without their permissions and disables their queries', () => {
    renderDashboard({ ...organization, permissions: ['candidate:list'] })
    expect(screen.getByText('Total candidates')).toBeVisible()
    expect(screen.queryByText('Recent jobs')).not.toBeInTheDocument()
    expect(screen.queryByText('Recruitment pipeline')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: 'Create job' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: 'View interviews' }),
    ).not.toBeInTheDocument()
    expect(mocks.useJobs).toHaveBeenCalledWith(orgId, expect.anything(), false)
    expect(mocks.useAnalyticsPipeline).toHaveBeenCalledWith(
      orgId,
      expect.anything(),
      false,
    )
    expect(mocks.useCalendarInterviews).toHaveBeenCalledWith(
      orgId,
      expect.any(String),
      expect.any(String),
      true,
      false,
    )
  })

  test('renders per-widget loading and failure states with a working retry', async () => {
    const user = userEvent.setup()
    const retry = vi.fn()
    mocks.useJobs.mockReturnValue(
      queryResult(jobPage, { isPending: true, data: undefined }),
    )
    mocks.useCandidates.mockReturnValue(
      queryResult(undefined, {
        isError: true,
        error: new Error('offline'),
        refetch: retry,
      }),
    )
    renderDashboard()
    expect(screen.getByText('Loading recent jobs…')).toBeVisible()
    expect(screen.getByRole('alert')).toHaveTextContent('Unavailable')
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(retry).toHaveBeenCalledOnce()
    expect(screen.getByText('Recruitment pipeline')).toBeVisible()
  })

  test('shows empty jobs, no scheduled interviews and a real zero candidate total', () => {
    mocks.useJobs.mockReturnValue(queryResult(emptyJobPage))
    mocks.useCandidates.mockReturnValue(
      queryResult({
        ...candidatePage,
        pagination: { ...candidatePage.pagination, totalItems: 0 },
      }),
    )
    mocks.useCalendarInterviews.mockReturnValue(queryResult([]))
    mocks.useAnalyticsPipeline.mockReturnValue(
      queryResult({ currentStages: [], initialEntries: [] }),
    )
    renderDashboard()
    expect(screen.getByText('No jobs yet in this workspace.')).toBeVisible()
    expect(
      screen.getByText('No scheduled interviews in the next 7 days.'),
    ).toBeVisible()
    expect(screen.getByText('No pipeline stages yet.')).toBeVisible()
    const candidatesMetric = screen
      .getByText('Across this workspace')
      .closest('[class*="rounded-card"]')
    expect(within(candidatesMetric as HTMLElement).getByText('0')).toBeVisible()
  })

  test('workspace route retains its access check and renders the dashboard after organization load', async () => {
    render(
      <MemoryRouter initialEntries={[`/app/organizations/${orgId}`]}>
        <Routes>
          <Route
            path="/app/organizations/:organizationId"
            element={<OrganizationWorkspacePage />}
          />
        </Routes>
      </MemoryRouter>,
    )
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeVisible(),
    )
  })
})
