import { apiRequest } from '../../../shared/lib/apiClient'
import { ApiError } from '../../../shared/lib/apiErrors'
import type { PipelineDto } from '../types/pipeline.types'

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

function invalid(): never {
  throw new ApiError({
    kind: 'response',
    code: 'INVALID_API_RESPONSE',
    message: 'The server returned an invalid pipeline response.',
  })
}

const base = (organizationId: string, jobId: string) =>
  `/organizations/${encodeURIComponent(organizationId)}/jobs/${encodeURIComponent(jobId)}/pipeline`

function pipeline(response: unknown): PipelineDto {
  return record(response) &&
    record(response.data) &&
    record(response.data.pipeline)
    ? (response.data.pipeline as unknown as PipelineDto)
    : invalid()
}

export async function getPipeline(
  organizationId: string,
  jobId: string,
  signal?: AbortSignal,
) {
  return pipeline(await apiRequest(base(organizationId, jobId), { signal }))
}

export async function createPipelineStage(
  organizationId: string,
  jobId: string,
  input: { name: string; expectedVersion: number },
  csrf: string,
) {
  return pipeline(
    await apiRequest(`${base(organizationId, jobId)}/stages`, {
      method: 'POST',
      body: input,
      headers: { 'X-CSRF-Token': csrf },
    }),
  )
}

export async function renamePipelineStage(
  organizationId: string,
  jobId: string,
  stageId: string,
  input: { name: string; expectedVersion: number },
  csrf: string,
) {
  return pipeline(
    await apiRequest(
      `${base(organizationId, jobId)}/stages/${encodeURIComponent(stageId)}`,
      {
        method: 'PATCH',
        body: input,
        headers: { 'X-CSRF-Token': csrf },
      },
    ),
  )
}

export async function reorderPipelineStages(
  organizationId: string,
  jobId: string,
  input: { stageIds: readonly string[]; expectedVersion: number },
  csrf: string,
) {
  return pipeline(
    await apiRequest(`${base(organizationId, jobId)}/stages/order`, {
      method: 'PUT',
      body: { ...input, stageIds: [...input.stageIds] },
      headers: { 'X-CSRF-Token': csrf },
    }),
  )
}

export async function deletePipelineStage(
  organizationId: string,
  jobId: string,
  stageId: string,
  expectedVersion: number,
  csrf: string,
) {
  return pipeline(
    await apiRequest(
      `${base(organizationId, jobId)}/stages/${encodeURIComponent(stageId)}`,
      {
        method: 'DELETE',
        body: { expectedVersion },
        headers: { 'X-CSRF-Token': csrf },
      },
    ),
  )
}
