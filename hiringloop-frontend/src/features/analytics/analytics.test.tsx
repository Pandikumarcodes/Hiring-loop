import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { afterEach, describe, expect, test, vi } from 'vitest'

const useOrganizationMock = vi.hoisted(() => vi.fn())
const useJobsMock = vi.hoisted(() => vi.fn())
const queryMock = vi.hoisted(() => vi.fn())
vi.mock('../organizations/hooks/queries', () => ({
  useOrganization: useOrganizationMock,
}))
vi.mock('../jobs/hooks/queries', () => ({ useJobs: useJobsMock }))
vi.mock('./hooks/queries', () => ({
  useAnalyticsOverview: (...args: unknown[]) => queryMock('overview', ...args),
  useAnalyticsFunnel: (...args: unknown[]) => queryMock('funnel', ...args),
  useAnalyticsPipeline: (...args: unknown[]) => queryMock('pipeline', ...args),
  useAnalyticsInterviews: (...args: unknown[]) =>
    queryMock('interviews', ...args),
  useAnalyticsCommunications: (...args: unknown[]) =>
    queryMock('communications', ...args),
  useAnalyticsOutcomes: (...args: unknown[]) => queryMock('outcomes', ...args),
  useAnalyticsJobs: (...args: unknown[]) => queryMock('jobs', ...args),
}))

import { AnalyticsPage } from './pages/AnalyticsPage'

const organizationId = '123e4567-e89b-12d3-a456-426614174000'
const overview = {
  applicationsReceived: 42,
  scheduledInterviews: 8,
  offersSent: 3,
  hires: 2,
  rejections: 4,
  activeApplications: 19,
  openJobs: 2,
  awaitingOfferDecision: 1,
  averageTimeToHireSeconds: null,
  generatedAt: '2026-01-01T00:00:00.000Z',
}

function LocationOutput() {
  return <output data-testid="location">{useLocation().search}</output>
}

function setup(overrides: Record<string, unknown> = {}) {
  useOrganizationMock.mockReturnValue({
    isPending: false,
    isError: false,
    data: { permissions: ['analytics:view', 'job:list'] },
  })
  useJobsMock.mockReturnValue({
    data: { jobs: [{ id: 'job-1', title: 'Platform Engineer' }] },
  })
  queryMock.mockImplementation((name: string) => ({
    isPending: false,
    isError: false,
    refetch: vi.fn(),
    data:
      name === 'overview'
        ? overview
        : name === 'funnel'
          ? {
              applied: 42,
              offerSent: 3,
              offerAccepted: 2,
              hired: 2,
              scheduledInterviewContext: 8,
            }
          : name === 'pipeline'
            ? {
                currentStages: [{ id: 'stage-1', name: 'Applied', count: 19 }],
                initialEntries: [{ stageId: 'stage-1', count: 42 }],
              }
            : name === 'interviews'
              ? {
                  scheduled: 8,
                  cancelled: 1,
                  upcoming: 4,
                  submittedFeedback: 2,
                }
              : name === 'communications'
                ? {
                    attempted: 10,
                    pending: 2,
                    sent: 7,
                    failed: 1,
                    completedDeliverySuccessRate: null,
                  }
                : name === 'outcomes'
                  ? {
                      hired: 2,
                      rejected: 4,
                      reopened: 1,
                      hireRate: 1 / 3,
                      rejectionRate: 2 / 3,
                      rejectionReasons: [{ code: 'WITHDRAWN', count: 2 }],
                      averageTimeToHireSeconds: null,
                      offers: {
                        created: null,
                        sent: null,
                        accepted: 2,
                        declined: 1,
                        withdrawn: 0,
                        awaitingDecision: 1,
                        acceptanceRate: 2 / 3,
                        declineRate: 1 / 3,
                      },
                      talentPools: {
                        poolCount: 1,
                        memberships: 4,
                        uniqueCandidates: 3,
                        membersAddedInRange: 2,
                      },
                    }
                  : {
                      rows: [
                        {
                          id: 'job-1',
                          title: 'Platform Engineer',
                          applications: 42,
                          active: 19,
                          scheduledInterviews: 8,
                          offersSent: 3,
                          hires: 2,
                          rejections: 4,
                        },
                      ],
                      totalItems: 1,
                    },
    ...overrides,
  }))
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('AnalyticsPage', () => {
  test('renders supported populated dashboard metrics and wording', () => {
    setup()
    render(
      <MemoryRouter
        initialEntries={[`/app/organizations/${organizationId}/analytics`]}
      >
        <AnalyticsPage />
        <LocationOutput />
      </MemoryRouter>,
    )
    expect(screen.getByRole('heading', { name: 'Analytics' })).toBeVisible()
    expect(screen.getByLabelText('Applications Received: 42')).toBeVisible()
    expect(screen.getAllByText('No hires in selected period')[0]).toBeVisible()
    expect(screen.getAllByText('Scheduled Interviews')[0]).toBeVisible()
    expect(screen.getByText('PENDING')).toBeVisible()
    expect(screen.getByText('Not enough completed delivery data')).toBeVisible()
    expect(screen.getAllByText('Platform Engineer')[0]).toBeVisible()
    expect(screen.queryByText('Interviews Completed')).not.toBeInTheDocument()
    expect(screen.queryByText('Candidates Interviewed')).not.toBeInTheDocument()
  })

  test('changes the job filter and carries the filter in the URL', () => {
    setup()
    render(
      <MemoryRouter
        initialEntries={[`/app/organizations/${organizationId}/analytics`]}
      >
        <AnalyticsPage />
        <LocationOutput />
      </MemoryRouter>,
    )
    fireEvent.change(screen.getByRole('combobox', { name: 'Analytics job' }), {
      target: { value: 'job-1' },
    })
    expect(screen.getByTestId('location')).toHaveTextContent('jobId=job-1')
  })

  test('renders loading, error, empty, and denied states', () => {
    setup({ isPending: true })
    render(
      <MemoryRouter>
        <AnalyticsPage />
      </MemoryRouter>,
    )
    expect(screen.getAllByRole('status')[0]).toHaveTextContent(
      'Loading analytics section',
    )
    cleanup()
    setup({ isPending: false, isError: true })
    render(
      <MemoryRouter>
        <AnalyticsPage />
      </MemoryRouter>,
    )
    expect(screen.getAllByRole('alert').length).toBeGreaterThan(0)
    cleanup()
    setup({ data: undefined })
    render(
      <MemoryRouter>
        <AnalyticsPage />
      </MemoryRouter>,
    )
    expect(
      screen.getAllByText('No data for this selection').length,
    ).toBeGreaterThan(0)
    cleanup()
    useOrganizationMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: { permissions: [] },
    })
    useJobsMock.mockReturnValue({ data: { jobs: [] } })
    queryMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: undefined,
      refetch: vi.fn(),
    })
    render(
      <MemoryRouter>
        <AnalyticsPage />
      </MemoryRouter>,
    )
    expect(
      screen.getByRole('heading', { name: 'Analytics access unavailable' }),
    ).toBeVisible()
  })
})
