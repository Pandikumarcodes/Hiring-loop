import { cleanup, render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { ScorecardForm } from './ScorecardForm'

const scorecard = {
  id: 'scorecard-1',
  interviewId: 'interview-1',
  interviewParticipantId: 'participant-1',
  status: 'DRAFT' as const,
  revision: 2,
  templateVersion: {
    id: 'version-1',
    versionNumber: 1,
    status: 'PUBLISHED' as const,
    title: 'Technical',
    instructions: null,
    revision: 1,
    publishedAt: null,
    criteria: [
      {
        id: 'rating',
        label: 'Communication',
        description: null,
        type: 'RATING' as const,
        required: true,
        position: 1,
      },
      {
        id: 'text',
        label: 'Design',
        description: null,
        type: 'TEXT' as const,
        required: true,
        position: 2,
      },
    ],
  },
  responses: [],
  overallRecommendation: null,
  overallComment: null,
  submittedAt: null,
}

describe('ScorecardForm', () => {
  afterEach(cleanup)
  test('uses radio controls and permits an incomplete draft save', async () => {
    const user = userEvent.setup(),
      save = vi.fn()
    render(
      <ScorecardForm
        scorecard={scorecard}
        busy={false}
        error={undefined}
        onSave={save}
        onSubmit={vi.fn()}
      />,
    )
    expect(screen.getAllByRole('radio')).toHaveLength(10)
    await user.click(screen.getByRole('button', { name: 'Save Draft' }))
    expect(save).toHaveBeenCalledWith([], null, '')
  })

  test('blocks incomplete submission and submits completed feedback', async () => {
    const user = userEvent.setup(),
      submit = vi.fn()
    render(
      <ScorecardForm
        scorecard={scorecard}
        busy={false}
        error={undefined}
        onSave={vi.fn()}
        onSubmit={submit}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'Submit Scorecard' }))
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Answer all required criteria',
    )
    await user.click(screen.getByRole('radio', { name: '5' }))
    await user.type(
      screen.getByRole('textbox', { name: 'Design response' }),
      'Clear system design',
    )
    await user.click(screen.getByRole('radio', { name: 'YES' }))
    await user.click(screen.getByRole('button', { name: 'Submit Scorecard' }))
    expect(submit).toHaveBeenCalled()
  })
})
