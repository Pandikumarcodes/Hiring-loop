import { beforeEach, describe, expect, test, vi } from 'vitest'
const request = vi.hoisted(() => vi.fn())
vi.mock('../../../shared/lib/apiClient', () => ({ apiRequest: request }))
import {
  addQuestion,
  createDraft,
  deleteQuestion,
  discardDraft,
  getApplicationForm,
  publishDraft,
  reorderQuestions,
  updateQuestion,
} from './application-form.api'
const response = {
  data: {
    applicationForm: {
      id: 'form',
      jobId: 'job',
      activeVersion: {},
      draft: null,
    },
  },
}
const input = {
  type: 'SHORT_TEXT' as const,
  label: 'Portfolio',
  description: null,
  placeholder: null,
  required: false,
  expectedRevision: 2,
}
beforeEach(() => request.mockReset().mockResolvedValue(response))
describe('Application form API client', () => {
  test('uses the scoped GET endpoint', async () => {
    await getApplicationForm('org /', 'job /', AbortSignal.abort())
    expect(request).toHaveBeenCalledWith(
      '/organizations/org%20%2F/jobs/job%20%2F/application-form',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    )
  })
  test('uses only the eight approved mutation paths and revision payloads', async () => {
    await createDraft('org', 'job', 'csrf')
    await addQuestion('org', 'job', input, 'csrf')
    await updateQuestion('org', 'job', 'q', input, 'csrf')
    await deleteQuestion('org', 'job', 'q', 2, 'csrf')
    await reorderQuestions('org', 'job', ['q2', 'q1'], 2, 'csrf')
    await publishDraft('org', 'job', 2, 'csrf')
    await discardDraft('org', 'job', 2, 'csrf')
    expect(request.mock.calls.map(([path]) => path)).toEqual([
      '/organizations/org/jobs/job/application-form/draft',
      '/organizations/org/jobs/job/application-form/draft/questions',
      '/organizations/org/jobs/job/application-form/draft/questions/q',
      '/organizations/org/jobs/job/application-form/draft/questions/q',
      '/organizations/org/jobs/job/application-form/draft/questions/order',
      '/organizations/org/jobs/job/application-form/draft/publish',
      '/organizations/org/jobs/job/application-form/draft',
    ])
    expect(request.mock.calls[1][1]).toMatchObject({
      method: 'POST',
      body: input,
    })
    expect(request.mock.calls[4][1]).toMatchObject({
      method: 'PUT',
      body: { questionIds: ['q2', 'q1'], expectedRevision: 2 },
    })
    expect(request.mock.calls[5][1]).toMatchObject({
      body: { expectedRevision: 2 },
    })
  })
})
