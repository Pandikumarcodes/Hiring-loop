import { queryOptions, useQuery } from '@tanstack/react-query'
import { getPipeline } from '../api/pipelines.api'
import { pipelineKeys } from './query-keys'

export function pipelineQueryOptions(
  organizationId: string,
  jobId: string,
  enabled = true,
) {
  return queryOptions({
    queryKey: pipelineKeys.detail(organizationId, jobId),
    queryFn: ({ signal }) => getPipeline(organizationId, jobId, signal),
    enabled,
    meta: { clearOnAuthChange: true },
  })
}

export const usePipeline = (
  organizationId: string,
  jobId: string,
  enabled = true,
) => useQuery(pipelineQueryOptions(organizationId, jobId, enabled))
