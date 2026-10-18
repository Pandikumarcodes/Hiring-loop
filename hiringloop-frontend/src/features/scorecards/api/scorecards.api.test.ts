import { beforeEach, expect, it, vi } from 'vitest'
import { apiRequest } from '../../../shared/lib/apiClient'
import { saveMine, submitMine, updateDraft } from './scorecards.api'

vi.mock('../../../shared/lib/apiClient', () => ({ apiRequest: vi.fn() }))
beforeEach(() =>
  vi
    .mocked(apiRequest)
    .mockResolvedValue({ data: { scorecard: {}, scorecardTemplate: {} } }),
)

it('serializes nullable template text as clearable API strings while preserving identity and revision', async () => {
  await updateDraft(
    'org',
    'job',
    {
      expectedRevision: 3,
      title: 'Evaluation',
      instructions: null,
      criteria: [
        {
          id: 'criterion',
          label: 'Skill',
          description: null,
          type: 'RATING',
          required: true,
          position: 1,
        },
      ],
    },
    'csrf',
  )
  expect(apiRequest).toHaveBeenLastCalledWith(
    '/organizations/org/jobs/job/scorecard-template/draft',
    expect.objectContaining({
      method: 'PATCH',
      headers: { 'X-CSRF-Token': 'csrf' },
      body: {
        expectedRevision: 3,
        title: 'Evaluation',
        instructions: '',
        criteria: [
          {
            id: 'criterion',
            label: 'Skill',
            description: '',
            type: 'RATING',
            required: true,
            position: 1,
          },
        ],
      },
    }),
  )
})

it.each([saveMine, submitMine])(
  'serializes blank feedback text without relaxing validation or losing an explicit null rating',
  async (send) => {
    await send(
      'org',
      'interview',
      {
        expectedRevision: 2,
        responses: [
          {
            criterionId: 'criterion',
            ratingValue: null,
            textValue: 'Evidence',
            comment: null,
          },
        ],
        overallRecommendation: 'YES',
        overallComment: null,
      },
      'csrf',
    )
    expect(apiRequest).toHaveBeenLastCalledWith(
      expect.stringContaining('/my-scorecard'),
      expect.objectContaining({
        body: {
          expectedRevision: 2,
          responses: [
            {
              criterionId: 'criterion',
              ratingValue: null,
              textValue: 'Evidence',
              comment: '',
            },
          ],
          overallRecommendation: 'YES',
          overallComment: '',
        },
      }),
    )
  },
)
