import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

const useOrganizationMock = vi.hoisted(() => vi.fn())
const useApplicationInterviewsMock = vi.hoisted(() => vi.fn())
const useCalendarInterviewsMock = vi.hoisted(() => vi.fn())
const useInterviewMock = vi.hoisted(() => vi.fn())
const useScheduleInterviewMock = vi.hoisted(() => vi.fn())
const useUpdateInterviewMock = vi.hoisted(() => vi.fn())
const useRescheduleInterviewMock = vi.hoisted(() => vi.fn())
const useCancelInterviewMock = vi.hoisted(() => vi.fn())
const useEligibleParticipantsMock = vi.hoisted(() => vi.fn())

vi.mock('../organizations/hooks/queries', () => ({
  useOrganization: useOrganizationMock,
}))
vi.mock('./hooks/queries', () => ({
  useApplicationInterviews: useApplicationInterviewsMock,
  useCalendarInterviews: useCalendarInterviewsMock,
  useInterview: useInterviewMock,
  useEligibleInterviewParticipants: useEligibleParticipantsMock,
}))
vi.mock('./hooks/mutations', () => ({
  useScheduleInterview: useScheduleInterviewMock,
  useUpdateInterview: useUpdateInterviewMock,
  useRescheduleInterview: useRescheduleInterviewMock,
  useCancelInterview: useCancelInterviewMock,
}))
vi.mock('../scorecards/components/FeedbackSections', () => ({
  InterviewFeedback: () => <section aria-label="Interview feedback" />,
}))

import { ApplicationInterviews } from './components/ApplicationInterviews'
import { InterviewsPage } from './pages/InterviewsPage'
import { InterviewDetailPage } from './pages/InterviewDetailPage'
import { ApiError } from '../../shared/lib/apiErrors'

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
  useInterviewMock.mockReturnValue({
    data: interview,
    isPending: false,
    isError: false,
  })
  useEligibleParticipantsMock.mockReturnValue({
    data: [
      {
        user: { id: 'user-1', email: 'interviewer@example.test' },
        role: 'INTERVIEWER',
      },
    ],
    isPending: false,
    isError: false,
  })
  useScheduleInterviewMock.mockReturnValue({
    isPending: false,
    isError: false,
    reset: vi.fn(),
    mutate: vi.fn(),
  })
  for (const hook of [
    useUpdateInterviewMock,
    useRescheduleInterviewMock,
    useCancelInterviewMock,
  ])
    hook.mockReturnValue({ isPending: false, isError: false, mutate: vi.fn() })
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

function atDetail(path = '/app/organizations/org-1/interviews/interview-1') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="/app/organizations/:organizationId/interviews/:interviewId"
          element={<InterviewDetailPage />}
        />
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
    expect(screen.getByRole('heading', { name: 'My interviews' })).toBeVisible()
  })

  test('groups interviews by local date and moves exactly seven days', async () => {
    const user = userEvent.setup()
    useCalendarInterviewsMock.mockReturnValue({
      data: [
        interview,
        {
          ...interview,
          id: 'interview-2',
          title: 'Team interview',
          scheduledStartAt: '2030-07-16T13:30:00.000Z',
        },
      ],
      isPending: false,
      isError: false,
    })
    at(
      <InterviewsPage />,
      '/app/organizations/org-1/interviews?start=2030-07-15&mine=false',
    )
    expect(
      screen.getByRole('heading', { name: 'Monday, July 15, 2030' }),
    ).toBeVisible()
    expect(
      screen.getByRole('heading', { name: 'Tuesday, July 16, 2030' }),
    ).toBeVisible()
    expect(screen.getAllByText('Scheduled')).toHaveLength(2)
    await user.click(screen.getByRole('button', { name: 'Next week' }))
    expect(useCalendarInterviewsMock).toHaveBeenLastCalledWith(
      'org-1',
      '2030-07-22T00:00:00.000Z',
      '2030-07-29T00:00:00.000Z',
      false,
      true,
    )
    await user.click(screen.getByRole('button', { name: 'Previous week' }))
    expect(useCalendarInterviewsMock).toHaveBeenLastCalledWith(
      'org-1',
      '2030-07-15T00:00:00.000Z',
      '2030-07-22T00:00:00.000Z',
      false,
      true,
    )
  })

  test('keeps previous workspace placeholder results hidden and checks permission before loading', () => {
    useCalendarInterviewsMock.mockReturnValue({
      data: [interview],
      isPending: false,
      isError: false,
      isPlaceholderData: true,
    })
    at(
      <InterviewsPage />,
      '/app/organizations/org-2/interviews?start=2030-07-15',
    )
    expect(
      screen.getByRole('heading', { name: 'Loading interviews' }),
    ).toBeVisible()
    expect(
      screen.queryByRole('link', { name: /Technical screen/ }),
    ).not.toBeInTheDocument()
    cleanup()
    useOrganizationMock.mockReturnValue({
      data: { permissions: [] },
      isPending: false,
    })
    at(
      <InterviewsPage />,
      '/app/organizations/org-2/interviews?start=2030-07-15',
    )
    expect(
      screen.getByRole('heading', { name: 'Interviews unavailable' }),
    ).toBeVisible()
    expect(useCalendarInterviewsMock).toHaveBeenLastCalledWith(
      'org-2',
      '2030-07-15T00:00:00.000Z',
      '2030-07-22T00:00:00.000Z',
      true,
      false,
    )
  })

  test('shows distinct empty, loading, and retryable error states', () => {
    useCalendarInterviewsMock.mockReturnValue({
      data: [],
      isPending: false,
      isError: false,
    })
    at(
      <InterviewsPage />,
      '/app/organizations/org-1/interviews?start=2030-07-15',
    )
    expect(
      screen.getByRole('heading', {
        name: 'No interviews scheduled this week',
      }),
    ).toBeVisible()
    cleanup()

    useCalendarInterviewsMock.mockReturnValue({
      isPending: true,
      isError: false,
    })
    at(
      <InterviewsPage />,
      '/app/organizations/org-1/interviews?start=2030-07-15',
    )
    expect(
      screen.getByRole('heading', { name: 'Loading interviews' }),
    ).toBeVisible()
    cleanup()

    const refetch = vi.fn()
    useCalendarInterviewsMock.mockReturnValue({
      isPending: false,
      isError: true,
      refetch,
    })
    at(
      <InterviewsPage />,
      '/app/organizations/org-1/interviews?start=2030-07-15',
    )
    expect(
      screen.getByRole('heading', { name: 'Interviews unavailable' }),
    ).toBeVisible()
    screen.getByRole('button', { name: 'Try again' }).click()
    expect(refetch).toHaveBeenCalledOnce()
  })

  test('shows cancelled status and assigned-only empty wording', () => {
    useOrganizationMock.mockReturnValue({
      data: { permissions: ['interview:view-assigned'] },
      isPending: false,
    })
    useCalendarInterviewsMock.mockReturnValue({
      data: [{ ...interview, status: 'CANCELLED' }],
      isPending: false,
      isError: false,
    })
    at(
      <InterviewsPage />,
      '/app/organizations/org-1/interviews?start=2030-07-15',
    )
    expect(screen.getByText('Cancelled')).toBeVisible()
    cleanup()
    useCalendarInterviewsMock.mockReturnValue({
      data: [],
      isPending: false,
      isError: false,
    })
    at(
      <InterviewsPage />,
      '/app/organizations/org-1/interviews?start=2030-07-15',
    )
    expect(screen.getByRole('heading', { name: 'My interviews' })).toBeVisible()
    expect(
      screen.getByRole('heading', { name: 'No matching interviews this week' }),
    ).toBeVisible()
  })

  test('schedules in the selected timezone with the existing request shape', async () => {
    const user = userEvent.setup()
    const mutate = vi.fn()
    useScheduleInterviewMock.mockReturnValue({
      isPending: false,
      isError: false,
      mutate,
      reset: vi.fn(),
    })
    render(
      <MemoryRouter>
        <ApplicationInterviews
          organizationId="org-1"
          applicationId="application-1"
          canSchedule
        />
      </MemoryRouter>,
    )
    await user.click(screen.getByRole('button', { name: 'Schedule interview' }))
    const dialog = screen.getByRole('dialog', { name: 'Schedule interview' })
    await user.click(
      within(dialog).getByRole('button', { name: 'Schedule interview' }),
    )
    expect(within(dialog).getByRole('alert')).toHaveTextContent(
      'Complete the required fields',
    )
    await user.type(
      within(dialog).getByLabelText(/Interview title/),
      'Technical screen',
    )
    fireEvent.change(within(dialog).getByLabelText(/Date/), {
      target: { value: '2030-07-15' },
    })
    fireEvent.change(within(dialog).getByLabelText(/Start time/), {
      target: { value: '09:30' },
    })
    await user.selectOptions(
      within(dialog).getByLabelText(/Timezone/),
      'America/New_York',
    )
    await user.click(
      within(dialog).getByRole('checkbox', {
        name: /interviewer@example.test/,
      }),
    )
    await user.click(
      within(dialog).getByRole('button', { name: 'Schedule interview' }),
    )
    expect(mutate).toHaveBeenCalledWith(
      {
        title: 'Technical screen',
        format: 'VIDEO',
        scheduledStartAt: '2030-07-15T13:30:00.000Z',
        durationMinutes: 60,
        timeZone: 'America/New_York',
        participantUserIds: ['user-1'],
        meetingUrl: null,
        location: null,
      },
      expect.any(Object),
    )
  })

  test('shows scheduling conflicts while preserving dialog values', async () => {
    const user = userEvent.setup()
    useScheduleInterviewMock.mockReturnValue({
      isPending: false,
      isError: true,
      error: new ApiError({
        kind: 'response',
        status: 409,
        code: 'INTERVIEW_SCHEDULE_CONFLICT',
        message: 'Conflict',
      }),
      mutate: vi.fn(),
      reset: vi.fn(),
    })
    render(
      <MemoryRouter>
        <ApplicationInterviews
          organizationId="org-1"
          applicationId="application-1"
          canSchedule
        />
      </MemoryRouter>,
    )
    await user.click(screen.getByRole('button', { name: 'Schedule interview' }))
    expect(screen.getByRole('alert')).toHaveTextContent('overlapping interview')
    expect(
      screen.getByRole('textbox', { name: /Interview title/ }),
    ).toHaveValue('')
  })

  test('renders interview context and keeps edit, reschedule, and cancellation scoped', async () => {
    const user = userEvent.setup()
    const update = vi.fn()
    useOrganizationMock.mockReturnValue({
      data: {
        permissions: [
          'interview:view',
          'interview:view-assigned',
          'interview:update',
        ],
      },
      isPending: false,
    })
    const reschedule = vi.fn()
    const cancel = vi.fn()
    useUpdateInterviewMock.mockReturnValue({
      isPending: false,
      isError: false,
      mutate: update,
    })
    useRescheduleInterviewMock.mockReturnValue({
      isPending: false,
      isError: false,
      mutate: reschedule,
    })
    useCancelInterviewMock.mockReturnValue({
      isPending: false,
      isError: false,
      mutate: cancel,
    })
    atDetail()
    expect(
      screen.getByRole('heading', { name: 'Technical screen' }),
    ).toBeVisible()
    expect(screen.getByText('interviewer@example.test')).toBeVisible()
    expect(screen.getByText('America/New_York')).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Reschedule' }))
    const dialog = screen.getByRole('dialog', { name: 'Reschedule interview' })
    expect(within(dialog).getByLabelText(/Date/)).toHaveValue('2030-07-15')
    expect(within(dialog).getByLabelText(/Start time/)).toHaveValue('09:30')
    await user.click(
      within(dialog).getByRole('button', { name: 'Reschedule interview' }),
    )
    expect(reschedule).toHaveBeenCalledWith(
      {
        scheduledStartAt: '2030-07-15T13:30:00.000Z',
        durationMinutes: 60,
        timeZone: 'America/New_York',
      },
      expect.any(Object),
    )
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    await user.click(screen.getByRole('button', { name: 'Edit interview' }))
    const editor = screen.getByRole('dialog', { name: 'Edit interview' })
    expect(
      within(editor).getByRole('checkbox', {
        name: /interviewer@example.test/,
      }),
    ).toBeChecked()
    await user.click(
      within(editor).getByRole('button', { name: 'Save changes' }),
    )
    expect(update).toHaveBeenCalledWith(
      {
        title: 'Technical screen',
        format: 'VIDEO',
        participantUserIds: ['user-1'],
        meetingUrl: null,
        location: null,
      },
      expect.any(Object),
    )
    await user.click(within(editor).getByRole('button', { name: 'Cancel' }))
    await user.click(screen.getByRole('button', { name: 'Cancel interview' }))
    const confirmation = screen.getByRole('dialog', {
      name: 'Cancel interview?',
    })
    await user.type(
      within(confirmation).getByRole('textbox', {
        name: 'Cancellation reason (optional)',
      }),
      'Candidate unavailable',
    )
    await user.click(
      within(confirmation).getByRole('button', { name: 'Cancel interview' }),
    )
    expect(cancel).toHaveBeenCalledWith(
      'Candidate unavailable',
      expect.any(Object),
    )
  })

  test('hides management actions for assigned-only viewers and cancelled interviews', () => {
    useOrganizationMock.mockReturnValue({
      data: { permissions: ['interview:view-assigned'] },
      isPending: false,
    })
    atDetail()
    expect(screen.getByRole('link', { name: 'Alice Applicant' })).toBeVisible()
    expect(
      screen.queryByRole('button', { name: 'Reschedule' }),
    ).not.toBeInTheDocument()
    cleanup()
    useOrganizationMock.mockReturnValue({
      data: { permissions: ['interview:view', 'interview:update'] },
      isPending: false,
    })
    useInterviewMock.mockReturnValue({
      data: { ...interview, status: 'CANCELLED' },
      isPending: false,
      isError: false,
    })
    atDetail()
    expect(screen.getAllByText('Cancelled')).toHaveLength(2)
    expect(
      screen.queryByRole('button', { name: 'Cancel interview' }),
    ).not.toBeInTheDocument()
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
