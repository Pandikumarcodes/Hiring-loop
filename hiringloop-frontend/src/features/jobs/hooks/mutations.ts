import { useMutation, useQueryClient } from '@tanstack/react-query'
import { runAuthenticatedAuthMutation } from '../../auth/hooks/authenticated-mutation'
import {
  createJob,
  transitionJob,
  updateJob,
  type JobAction,
} from '../api/jobs.api'
import type { JobDetailDto, JobInput } from '../types/job.types'
import { jobKeys } from './query-keys'
export function useCreateJob(organizationId: string) {
  const c = useQueryClient()
  return useMutation({
    mutationFn: (input: JobInput) =>
      runAuthenticatedAuthMutation(c, (token) =>
        createJob(organizationId, input, token),
      ),
    onSuccess: () =>
      c.invalidateQueries({ queryKey: jobKeys.lists(organizationId) }),
  })
}
export function useUpdateJob(organizationId: string, jobId: string) {
  const c = useQueryClient()
  return useMutation({
    mutationFn: (input: JobInput & { expectedVersion: number }) =>
      runAuthenticatedAuthMutation(c, (token) =>
        updateJob(organizationId, jobId, input, token),
      ),
    onSuccess: (data) => {
      c.setQueryData(jobKeys.detail(organizationId, jobId), data)
      return c.invalidateQueries({ queryKey: jobKeys.lists(organizationId) })
    },
  })
}
export function useTransitionJob(organizationId: string, jobId: string) {
  const c = useQueryClient()
  return useMutation({
    mutationFn: ({
      action,
      expectedVersion,
      targetJobId = jobId,
    }: {
      action: JobAction
      expectedVersion: number
      targetJobId?: string
    }) =>
      runAuthenticatedAuthMutation(c, (token) =>
        transitionJob(
          organizationId,
          targetJobId,
          action,
          expectedVersion,
          token,
        ),
      ),
    onSuccess: (data: JobDetailDto) => {
      c.setQueryData(jobKeys.detail(organizationId, data.id), data)
      return c.invalidateQueries({ queryKey: jobKeys.lists(organizationId) })
    },
  })
}
