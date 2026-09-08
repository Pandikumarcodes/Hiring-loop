import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

const useOrganizationMock = vi.hoisted(() => vi.fn())
const useApplicationInterviewsMock = vi.hoisted(() => vi.fn())
const useCalendarInterviewsMock = vi.hoisted(() => vi.fn())
const useInterviewMock = vi.hoisted(() => vi.fn())
const useScheduleInterviewMock = vi.hoisted(() => vi.fn())

vi.mock('../organizations/hooks/queries', () => ({
  useOrganization: useOrganizationMock,
}))
vi.mock('./hooks/queries', () => ({
  useApplicationInterviews: useApplicationInterviewsMock,
  useCalendarInterviews: useCalendarInterviewsMock,
  useInterview: useInterviewMock,
}))
vi.mock('./hooks/mutations', () => ({
  useScheduleInterview: useScheduleInterviewMock,
  useUpdateInterview: vi.fn(),
  useRescheduleInterview: vi.fn(),
  useCancelInterview: vi.fn(),
}))

import { ApplicationInterviews } from './components/ApplicationInterviews'
import { InterviewsPage } from './pages/InterviewsPage'

const interview = {
  id: 'interview-1',
  title: 'Technical screen',
  format: 'VIDEO',
  status: 'SCHEDULED',
  scheduledStartAt: '2030-07-15T13:30:00.000Z',
  scheduledEndAt: '2030-07-15T14:30:00.000Z',
  timeZone: 'America/New_York',
  meetingUrl: null,
  location: null,
  cancellation: null,
  participants: [
    { id: 'p-1', user: { id: 'user-1', email: 'interviewer@example.test' } },
  ],
  application: {
    id: 'application-1',
    candidate: {
      id: 'candidate-1',
      name: 'Alice Applicant',
      email: 'alice@example.test',
    },
    job: { id: 'job-1', title: 'Engineer' },
  },
}

beforeEach(() => {
  useOrganizationMock.mockReturnValue({
    data: { permissions: ['interview:view', 'interview:view-assigned'] },
    isPending: false,
  })
  useApplicationInterviewsMock.mockReturnValue({
    data: [interview],
    isPending: false,
    isError: false,
  })
  useCalendarInterviewsMock.mockReturnValue({
    data: [interview],
    isPending: false,
    isError: false,
  })
  useScheduleInterviewMock.mockReturnValue({
    isPending: false,
    isError: false,
    reset: vi.fn(),
    mutate: vi.fn(),
  })
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

function at(element: React.ReactNode, path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/app/organizations/:organizationId/*" element={element} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('Phase 14 interview views', () => {
  test('renders an application interview and links to its detail', () => {
    render(
      <MemoryRouter>
        <ApplicationInterviews
          organizationId="org-1"
          applicationId="application-1"
          canSchedule
        />
      </MemoryRouter>,
    )
    expect(screen.getByRole('heading', { name: 'Interviews' })).toBeVisible()
    expect(
      screen.getByRole('link', { name: /Technical screen/ }),
    ).toHaveAttribute('href', '/app/organizations/org-1/interviews/interview-1')
  })

  test('requests an exactly seven-day bounded organization range and renders a card', () => {
    at(
      <InterviewsPage />,
      '/app/organizations/org-1/interviews?start=2026-07-15&mine=false',
    )
    expect(useCalendarInterviewsMock).toHaveBeenCalledWith(
      'org-1',
      '2026-07-15T00:00:00.000Z',
      '2026-07-22T00:00:00.000Z',
      false,
      true,
    )
    expect(
      screen.getByRole('link', { name: /Technical screen/ }),
    ).toHaveAttribute('href', '/app/organizations/org-1/interviews/interview-1')
  })

  test('forces assigned-interviewer calendar requests to mine=true', () => {
    useOrganizationMock.mockReturnValue({
      data: { permissions: ['interview:view-assigned'] },
      isPending: false,
    })
    at(
      <InterviewsPage />,
      '/app/organizations/org-1/interviews?start=2026-07-15&mine=false',
    )
    expect(useCalendarInterviewsMock).toHaveBeenCalledWith(
      'org-1',
      '2026-07-15T00:00:00.000Z',
      '2026-07-22T00:00:00.000Z',
      true,
      true,
    )
    expect(screen.queryByLabelText('My interviews')).not.toBeInTheDocument()
  })

  test('does not expose scheduling controls to read-only interviewers', () => {
    render(
      <MemoryRouter>
        <ApplicationInterviews
          organizationId="org-1"
          applicationId="application-1"
          canSchedule={false}
        />
      </MemoryRouter>,
    )
    expect(
      screen.queryByRole('button', { name: 'Schedule interview' }),
    ).not.toBeInTheDocument()
  })
})
