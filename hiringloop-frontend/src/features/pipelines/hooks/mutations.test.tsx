import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { type ReactNode } from 'react'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { ApiError } from '../../../shared/lib/apiErrors'
import { pipelineKeys } from './query-keys'

const mocks = vi.hoisted(() => ({
  authenticatedMutation: vi.fn(),
  createStage: vi.fn(),
}))

vi.mock('../../auth/hooks/authenticated-mutation', () => ({
  runAuthenticatedAuthMutation: mocks.authenticatedMutation,
}))
vi.mock('../api/pipelines.api', () => ({
  createPipelineStage: mocks.createStage,
  deletePipelineStage: vi.fn(),
  renamePipelineStage: vi.fn(),
  reorderPipelineStages: vi.fn(),
}))

import { useCreatePipelineStage } from './mutations'

const organizationId = 'organization-a'
const jobId = 'job-a'
const updatedPipeline = {
  id: 'pipeline-a',
  jobId,
  version: 2,
  stages: [],
  createdAt: '2026-09-06T00:00:00.000Z',
  updatedAt: '2026-09-06T00:00:00.000Z',
}

describe('Pipeline mutation cache behavior', () => {
  let client: QueryClient

  beforeEach(() => {
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    mocks.authenticatedMutation.mockReset()
    mocks.createStage.mockReset()
    mocks.authenticatedMutation.mockImplementation(
      (_client: QueryClient, action: (csrf: string) => Promise<unknown>) =>
        action('csrf'),
    )
  })

  function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }

  test('replaces only the matching Pipeline cache entry after success', async () => {
    mocks.createStage.mockResolvedValueOnce(updatedPipeline)
    const otherKey = pipelineKeys.detail('organization-b', jobId)
    client.setQueryData(otherKey, { version: 1 })
    const { result } = renderHook(
      () => useCreatePipelineStage(organizationId, jobId),
      { wrapper },
    )

    result.current.mutate({ name: 'Technical', expectedVersion: 1 })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(
      client.getQueryData(pipelineKeys.detail(organizationId, jobId)),
    ).toBe(updatedPipeline)
    expect(client.getQueryData(otherKey)).toEqual({ version: 1 })
  })

  test('invalidates only the matching Pipeline after a version conflict', async () => {
    const invalidate = vi.spyOn(client, 'invalidateQueries')
    mocks.createStage.mockRejectedValueOnce(
      new ApiError({
        kind: 'http',
        status: 409,
        code: 'PIPELINE_VERSION_CONFLICT',
        message: 'stale',
      }),
    )
    const { result } = renderHook(
      () => useCreatePipelineStage(organizationId, jobId),
      { wrapper },
    )

    result.current.mutate({ name: 'Technical', expectedVersion: 1 })
    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(invalidate).toHaveBeenCalledWith({
      queryKey: pipelineKeys.detail(organizationId, jobId),
      exact: true,
    })
  })
})
