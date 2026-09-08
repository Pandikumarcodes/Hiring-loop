import { cleanup, render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { ApiError } from '../../../shared/lib/apiErrors'
import { MyScorecardPage } from './MyScorecardPage'

let conflict = false
const query = vi.fn()
vi.mock('react-router-dom', () => ({
  useParams: () => ({ organizationId: 'org', interviewId: 'interview' }),
}))
vi.mock('../hooks/queries', () => ({ useMyScorecard: () => query() }))
vi.mock('../hooks/mutations', () => ({
  useSaveMyScorecard: () => ({
    mutate: vi.fn(),
    isPending: false,
    isError: conflict,
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
    query.mockReturnValue({
      data: scorecard,
      isPending: false,
      isError: false,
      refetch: vi.fn(),
    })
  })
  test('shows a conflict-specific message and explicit reload without retrying', () => {
    conflict = true
    render(<MyScorecardPage />)
    expect(screen.getByRole('alert')).toHaveTextContent(
      'changed in another session',
    )
    expect(
      screen.getByRole('button', { name: 'Reload latest version' }),
    ).toBeInTheDocument()
  })
  test('uses an accessible submit confirmation dialog', async () => {
    render(<MyScorecardPage />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('radio', { name: '5' }))
    await user.click(screen.getByRole('radio', { name: 'YES' }))
    await user.click(screen.getByRole('button', { name: 'Submit Scorecard' }))
    expect(screen.getByRole('dialog')).toHaveTextContent('Submit scorecard?')
  })
})
