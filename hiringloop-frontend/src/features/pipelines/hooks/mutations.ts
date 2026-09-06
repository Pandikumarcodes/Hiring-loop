import { useMutation, useQueryClient } from '@tanstack/react-query'
import { runAuthenticatedAuthMutation } from '../../auth/hooks/authenticated-mutation'
import {
  createPipelineStage,
  deletePipelineStage,
  renamePipelineStage,
  reorderPipelineStages,
} from '../api/pipelines.api'
import type { PipelineDto } from '../types/pipeline.types'
import { pipelineKeys } from './query-keys'

function usePipelineMutation<T>(
  organizationId: string,
  jobId: string,
  action: (input: T, csrf: string) => Promise<PipelineDto>,
) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (input: T) =>
      runAuthenticatedAuthMutation(client, (csrf) => action(input, csrf)),
    onSuccess: (data) =>
      client.setQueryData(pipelineKeys.detail(organizationId, jobId), data),
    onError: (error: unknown) => {
      if ((error as { code?: string }).code === 'PIPELINE_VERSION_CONFLICT')
        return client.invalidateQueries({
          queryKey: pipelineKeys.detail(organizationId, jobId),
          exact: true,
        })
    },
  })
}

export function useCreatePipelineStage(organizationId: string, jobId: string) {
  return usePipelineMutation(
    organizationId,
    jobId,
    (input: { name: string; expectedVersion: number }, csrf) =>
      createPipelineStage(organizationId, jobId, input, csrf),
  )
}
export function useRenamePipelineStage(organizationId: string, jobId: string) {
  return usePipelineMutation(
    organizationId,
    jobId,
    (input: { stageId: string; name: string; expectedVersion: number }, csrf) =>
      renamePipelineStage(
        organizationId,
        jobId,
        input.stageId,
        { name: input.name, expectedVersion: input.expectedVersion },
        csrf,
      ),
  )
}
export function useReorderPipelineStages(
  organizationId: string,
  jobId: string,
) {
  return usePipelineMutation(
    organizationId,
    jobId,
    (input: { stageIds: readonly string[]; expectedVersion: number }, csrf) =>
      reorderPipelineStages(organizationId, jobId, input, csrf),
  )
}
export function useDeletePipelineStage(organizationId: string, jobId: string) {
  return usePipelineMutation(
    organizationId,
    jobId,
    (input: { stageId: string; expectedVersion: number }, csrf) =>
      deletePipelineStage(
        organizationId,
        jobId,
        input.stageId,
        input.expectedVersion,
        csrf,
      ),
  )
}
