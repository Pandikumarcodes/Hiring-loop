import { beforeEach, describe, expect, test, vi } from 'vitest'

const request = vi.hoisted(() => vi.fn())
vi.mock('../../../shared/lib/apiClient', () => ({ apiRequest: request }))
import {
  createPipelineStage,
  deletePipelineStage,
  getPipeline,
  renamePipelineStage,
  reorderPipelineStages,
} from './pipelines.api'

const response = {
  data: {
    pipeline: {
      id: 'pipe',
      jobId: 'job',
      version: 3,
      stages: [],
      createdAt: 'now',
      updatedAt: 'now',
    },
  },
}
beforeEach(() => request.mockReset())
describe('Pipeline API client', () => {
  test('uses the scoped GET endpoint', async () => {
    request.mockResolvedValueOnce(response)
    await getPipeline('org /', 'job /', AbortSignal.abort())
    expect(request).toHaveBeenCalledWith(
      '/organizations/org%20%2F/jobs/job%20%2F/pipeline',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    )
  })
  test('sends only approved stage mutation fields with expectedVersion', async () => {
    request.mockResolvedValue(response)
    await createPipelineStage(
      'org',
      'job',
      { name: 'Screen', expectedVersion: 3 },
      'csrf',
    )
    await renamePipelineStage(
      'org',
      'job',
      'stage',
      { name: 'Interview', expectedVersion: 4 },
      'csrf',
    )
    await reorderPipelineStages(
      'org',
      'job',
      { stageIds: ['entry', 'stage'], expectedVersion: 5 },
      'csrf',
    )
    await deletePipelineStage('org', 'job', 'stage', 6, 'csrf')
    expect(request).toHaveBeenNthCalledWith(
      1,
      '/organizations/org/jobs/job/pipeline/stages',
      expect.objectContaining({
        method: 'POST',
        body: { name: 'Screen', expectedVersion: 3 },
      }),
    )
    expect(request).toHaveBeenNthCalledWith(
      2,
      '/organizations/org/jobs/job/pipeline/stages/stage',
      expect.objectContaining({
        method: 'PATCH',
        body: { name: 'Interview', expectedVersion: 4 },
      }),
    )
    expect(request).toHaveBeenNthCalledWith(
      3,
      '/organizations/org/jobs/job/pipeline/stages/order',
      expect.objectContaining({
        method: 'PUT',
        body: { stageIds: ['entry', 'stage'], expectedVersion: 5 },
      }),
    )
    expect(request).toHaveBeenNthCalledWith(
      4,
      '/organizations/org/jobs/job/pipeline/stages/stage',
      expect.objectContaining({
        method: 'DELETE',
        body: { expectedVersion: 6 },
      }),
    )
  })
})
