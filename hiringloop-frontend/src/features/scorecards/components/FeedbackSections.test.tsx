import { cleanup, render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { ApiError } from '../../../shared/lib/apiErrors'
import {
  ApplicationFeedback,
  InternalNotes,
  InterviewFeedback,
} from './FeedbackSections'

const queries = {
  summary: vi.fn(),
  mine: vi.fn(),
  submitted: vi.fn(),
  application: vi.fn(),
  notes: vi.fn(),
}
const mutations = { create: vi.fn(), update: vi.fn(), remove: vi.fn() }
let currentUser = 'author'
vi.mock('react-router-dom', () => ({
  Link: ({
    children,
    to,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { to: string }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}))
vi.mock('../../auth/hooks/queries', () => ({
  useCurrentUser: () => ({ user: { id: currentUser } }),
}))
vi.mock('../hooks/queries', () => ({
  useInterviewScorecards: () => queries.summary(),
  useMyScorecard: () => queries.mine(),
  useSubmittedScorecard: () => queries.submitted(),
  useApplicationScorecards: () => queries.application(),
  useApplicationNotes: () => queries.notes(),
}))
vi.mock('../hooks/mutations', () => ({
  useCreateNote: () => mutations.create(),
  useUpdateNote: () => mutations.update(),
  useDeleteNote: () => mutations.remove(),
}))
const published = {
  id: 'score',
  participant: { id: 'participant' },
  templateVersion: {
    id: 'version',
    versionNumber: 1,
    status: 'PUBLISHED',
    title: 'Technical',
    instructions: null,
    revision: 1,
    publishedAt: null,
    criteria: [
      {
        id: 'criterion',
        label: 'Communication',
        description: null,
        type: 'RATING',
        required: true,
        position: 1,
      },
    ],
  },
  responses: [
    {
      criterionId: 'criterion',
      ratingValue: 5,
      textValue: null,
      comment: 'Strong',
    },
  ],
  overallRecommendation: 'STRONG_YES',
  overallComment: 'Hire',
  submittedAt: '2026-01-01T00:00:00.000Z',
}
const settled = (data: unknown) => ({
  data,
  isPending: false,
  isError: false,
  refetch: vi.fn(),
})

describe('feedback sections', () => {
  afterEach(cleanup)
  beforeEach(() => {
    vi.clearAllMocks()
    currentUser = 'author'
    queries.summary.mockReturnValue(settled({ participants: [] }))
    queries.mine.mockReturnValue(settled({ status: 'NOT_STARTED' }))
    queries.submitted.mockReturnValue(settled(published))
    queries.application.mockReturnValue(settled({ interviews: [] }))
    queries.notes.mockReturnValue(settled([]))
    mutations.create.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      isError: false,
    })
    mutations.update.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      error: null,
    })
    mutations.remove.mockReturnValue({ mutate: vi.fn(), isPending: false })
  })

  test('renders participant statuses without exposing draft responses and opens submitted read-only feedback', async () => {
    queries.summary.mockReturnValue(
      settled({
        participants: [
          {
            id: 'not-started',
            participant: { id: 'a' },
            status: 'NOT_STARTED',
            overallRecommendation: null,
          },
          {
            id: 'draft',
            participant: { id: 'b' },
            status: 'DRAFT',
            overallRecommendation: null,
          },
          {
            id: 'score',
            participant: { id: 'c' },
            status: 'SUBMITTED',
            overallRecommendation: 'YES',
          },
        ],
      }),
    )
    render(
      <InterviewFeedback
        organizationId="org"
        interviewId="interview"
        canView
        canComplete={false}
      />,
    )
    expect(screen.getByText('NOT STARTED')).toBeInTheDocument()
    expect(screen.getByText('DRAFT')).toBeInTheDocument()
    expect(screen.queryByText('draft response')).not.toBeInTheDocument()
    await userEvent
      .setup()
      .click(screen.getByRole('button', { name: 'View Scorecard' }))
    expect(screen.getByRole('dialog')).toHaveTextContent(
      'Read-only interview feedback.',
    )
    expect(screen.getByText('Communication')).toBeInTheDocument()
    expect(screen.getByText('STRONG YES')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /save|submit/i }),
    ).not.toBeInTheDocument()
  })

  test('gives an interviewer only their own scorecard action', () => {
    queries.mine.mockReturnValue(settled({ status: 'DRAFT' }))
    render(
      <InterviewFeedback
        organizationId="org"
        interviewId="interview"
        canView={false}
        canComplete
      />,
    )
    expect(
      screen.getByRole('link', { name: 'Continue Scorecard' }),
    ).toBeInTheDocument()
    expect(screen.queryByText('Interview Feedback')).not.toBeInTheDocument()
  })

  test('uses the application aggregation response and opens submitted detail', async () => {
    queries.application.mockReturnValue(
      settled({
        interviews: [
          {
            id: 'interview',
            title: 'Panel',
            participants: [
              { scorecard: { id: 'score', overallRecommendation: 'YES' } },
            ],
          },
        ],
      }),
    )
    render(
      <ApplicationFeedback
        organizationId="org"
        applicationId="application"
        enabled
      />,
    )
    expect(screen.getByText('Panel')).toBeInTheDocument()
    expect(queries.summary).not.toHaveBeenCalled()
    await userEvent
      .setup()
      .click(screen.getByRole('button', { name: 'View Scorecard' }))
    expect(screen.getByRole('dialog')).toHaveTextContent('Submitted scorecard')
  })

  test('renders application feedback empty state', () => {
    render(
      <ApplicationFeedback
        organizationId="org"
        applicationId="application"
        enabled
      />,
    )
    expect(
      screen.getByText('No interview feedback has been submitted yet.'),
    ).toBeInTheDocument()
  })

  test.each([
    { isAdmin: true, author: 'other', allowed: true },
    { isAdmin: false, author: 'author', allowed: true },
    { isAdmin: false, author: 'other', allowed: false },
  ])('enforces note action policy', ({ isAdmin, author, allowed }) => {
    queries.notes.mockReturnValue(
      settled([
        {
          id: 'note',
          body: 'Private note',
          revision: 1,
          updatedAt: '2026-01-01T00:00:00.000Z',
          author: { id: author },
        },
      ]),
    )
    render(
      <InternalNotes
        organizationId="org"
        applicationId="application"
        enabled
        isAdmin={isAdmin}
      />,
    )
    if (allowed) {
      expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()
    } else {
      expect(
        screen.queryByRole('button', { name: 'Edit' }),
      ).not.toBeInTheDocument()
      expect(
        screen.queryByRole('button', { name: 'Delete' }),
      ).not.toBeInTheDocument()
    }
  })

  test('creates, edits, confirms deletion, and offers explicit reload on a note conflict', async () => {
    const create = vi.fn(),
      update = vi.fn(),
      remove = vi.fn()
    mutations.create.mockReturnValue({
      mutate: create,
      isPending: false,
      isError: false,
    })
    mutations.update.mockReturnValue({
      mutate: update,
      isPending: false,
      error: new ApiError({
        kind: 'response',
        code: 'CONFLICT',
        message: 'conflict',
        status: 409,
      }),
    })
    mutations.remove.mockReturnValue({ mutate: remove, isPending: false })
    queries.notes.mockReturnValue(
      settled([
        {
          id: 'note',
          body: 'Private note',
          revision: 1,
          updatedAt: '2026-01-01T00:00:00.000Z',
          author: { id: 'author' },
        },
      ]),
    )
    const user = userEvent.setup()
    render(
      <InternalNotes
        organizationId="org"
        applicationId="application"
        enabled
        isAdmin={false}
      />,
    )
    await user.type(
      screen.getByRole('textbox', { name: 'Add note' }),
      'new note',
    )
    await user.click(screen.getByRole('button', { name: 'Add Note' }))
    expect(create).toHaveBeenCalledWith('new note', expect.any(Object))
    await user.click(screen.getByRole('button', { name: 'Edit' }))
    expect(screen.getByRole('dialog')).toHaveTextContent(
      'Reload the latest version',
    )
    await user.click(screen.getByRole('button', { name: 'Close' }))
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    expect(screen.getByRole('dialog')).toHaveTextContent('Delete note?')
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    expect(remove).toHaveBeenCalledWith('note', expect.any(Object))
  })
})
