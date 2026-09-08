import { useMutation, useQueryClient } from '@tanstack/react-query'
import { runAuthenticatedAuthMutation } from '../../auth/hooks/authenticated-mutation'
import {
  cancelInterview,
  rescheduleInterview,
  scheduleInterview,
  updateInterview,
} from '../api/interviews.api'
import type {
  RescheduleInterviewInput,
  ScheduleInterviewInput,
  UpdateInterviewInput,
} from '../types/interview.types'
import { interviewKeys } from './query-keys'
function invalidate(
  q: ReturnType<typeof useQueryClient>,
  o: string,
  a?: string,
  id?: string,
) {
  if (id) void q.invalidateQueries({ queryKey: interviewKeys.detail(o, id) })
  if (a) void q.invalidateQueries({ queryKey: interviewKeys.application(o, a) })
  void q.invalidateQueries({ queryKey: ['interviews', 'calendar', o] })
}
export function useScheduleInterview(o: string, a: string) {
  const q = useQueryClient()
  return useMutation({
    mutationFn: (input: ScheduleInterviewInput) =>
      runAuthenticatedAuthMutation(q, (c) => scheduleInterview(o, a, input, c)),
    onSuccess: () => invalidate(q, o, a),
  })
}
export function useUpdateInterview(o: string, a: string, id: string) {
  const q = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateInterviewInput) =>
      runAuthenticatedAuthMutation(q, (c) => updateInterview(o, id, input, c)),
    onSuccess: () => invalidate(q, o, a, id),
  })
}
export function useRescheduleInterview(o: string, a: string, id: string) {
  const q = useQueryClient()
  return useMutation({
    mutationFn: (input: RescheduleInterviewInput) =>
      runAuthenticatedAuthMutation(q, (c) =>
        rescheduleInterview(o, id, input, c),
      ),
    onSuccess: () => invalidate(q, o, a, id),
  })
}
export function useCancelInterview(o: string, a: string, id: string) {
  const q = useQueryClient()
  return useMutation({
    mutationFn: (reason: string) =>
      runAuthenticatedAuthMutation(q, (c) =>
        cancelInterview(o, id, reason || undefined, c),
      ),
    onSuccess: () => invalidate(q, o, a, id),
  })
}
