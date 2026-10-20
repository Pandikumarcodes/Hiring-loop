import { cleanup, render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { ApiError } from '../../../shared/lib/apiErrors'
import { MyScorecardPage } from './MyScorecardPage'

let conflict = false
const query = vi.fn()
const saveMutation = vi.fn()
vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useParams: () => ({ organizationId: 'org', interviewId: 'interview' }),
}))
vi.mock('../hooks/queries', () => ({ useMyScorecard: () => query() }))
vi.mock('../hooks/mutations', () => ({
  useSaveMyScorecard: () => ({
    mutate: saveMutation,
    isPending: false,
    isSuccess: false,
    isError: conflict,
    reset: vi.fn(),
    error: conflict
      ? new ApiError({
          kind: 'response',
          code: 'CONFLICT',
          message: 'conflict',
          status: 409,
        })
      : null,
  }),
  useSubmitMyScorecard: () => ({
    mutate: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
    reset: vi.fn(),
  }),
}))
const scorecard = {
  id: 'score',
  interviewId: 'interview',
  interviewParticipantId: 'participant',
  status: 'DRAFT',
  revision: 1,
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
  responses: [],
  overallRecommendation: null,
  overallComment: null,
  submittedAt: null,
}

describe('MyScorecardPage', () => {
  afterEach(cleanup)
  beforeEach(() => {
    conflict = false
    saveMutation.mockClear()
    query.mockReturnValue({
      data: scorecard,
      isPending: false,
      isError: false,
      refetch: vi.fn(),
    })
  })
  const renderPage = () =>
    render(
      <MemoryRouter>
        <MyScorecardPage />
      </MemoryRouter>,
    )
  test('shows a conflict-specific message and explicit reload without retrying', () => {
    conflict = true
    renderPage()
    expect(screen.getByRole('alert')).toHaveTextContent(
      'changed in another session',
    )
    expect(
      screen.getByRole('button', { name: 'Reload latest version' }),
    ).toBeInTheDocument()
  })
  test('uses an accessible submit confirmation dialog', async () => {
    renderPage()
    const user = userEvent.setup()
    await user.click(screen.getByRole('radio', { name: '5' }))
    await user.click(screen.getByRole('radio', { name: 'YES' }))
    await user.click(screen.getByRole('button', { name: 'Submit Scorecard' }))
    expect(screen.getByRole('dialog')).toHaveTextContent('Submit scorecard?')
  })
  test('preserves unsaved responses and the original revision during background refetch', async () => {
    const user = userEvent.setup()
    const view = renderPage()
    await user.click(screen.getByRole('radio', { name: '5' }))
    await user.type(
      screen.getByRole('textbox', { name: 'Overall Comments' }),
      'My draft',
    )

    query.mockReturnValue({
      data: { ...scorecard, revision: 2 },
      isPending: false,
      isError: false,
      refetch: vi.fn(),
    })
    view.rerender(
      <MemoryRouter>
        <MyScorecardPage />
      </MemoryRouter>,
    )

    expect(screen.getByRole('radio', { name: '5' })).toBeChecked()
    expect(
      screen.getByRole('textbox', { name: 'Overall Comments' }),
    ).toHaveValue('My draft')
    await user.click(screen.getByRole('button', { name: 'Save Draft' }))
    expect(saveMutation).toHaveBeenCalledWith(
      expect.objectContaining({
        expectedRevision: 1,
        overallComment: 'My draft',
      }),
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    )
  })
})
