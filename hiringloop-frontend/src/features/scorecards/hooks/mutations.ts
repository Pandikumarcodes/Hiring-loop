import { useMutation, useQueryClient } from '@tanstack/react-query'
import { runAuthenticatedAuthMutation } from '../../auth/hooks/authenticated-mutation'
import * as api from '../api/scorecards.api'
import type { ScorecardInput, TemplateInput } from '../types/scorecard.types'
import { noteKeys, scorecardKeys, scorecardTemplateKeys } from './query-keys'
function useTemplateMutation<T>(
  o: string,
  j: string,
  fn: (v: T, c: string) => ReturnType<typeof api.updateDraft>,
) {
  const q = useQueryClient()
  return useMutation({
    mutationFn: (v: T) => runAuthenticatedAuthMutation(q, (c) => fn(v, c)),
    onSuccess: (d) => q.setQueryData(scorecardTemplateKeys.byJob(o, j), d),
  })
}
export const useCreateDraft = (o: string, j: string) =>
  useTemplateMutation(o, j, (_v, c) => api.createDraft(o, j, c))
export const useUpdateDraft = (o: string, j: string) =>
  useTemplateMutation<TemplateInput>(o, j, (v, c) =>
    api.updateDraft(o, j, v, c),
  )
export const usePublishDraft = (o: string, j: string) =>
  useTemplateMutation<{ expectedRevision: number }>(o, j, (v, c) =>
    api.publishDraft(o, j, v.expectedRevision, c),
  )
function useMineMutation<T>(
  o: string,
  i: string,
  fn: (
    v: T,
    c: string,
  ) => Promise<import('../types/scorecard.types').Scorecard>,
) {
  const q = useQueryClient()
  return useMutation({
    mutationFn: (v: T) => runAuthenticatedAuthMutation(q, (c) => fn(v, c)),
    onSuccess: (d) => {
      q.setQueryData(scorecardKeys.mine(o, i), d)
      void q.invalidateQueries({
        queryKey: scorecardKeys.interviewSummary(o, i),
        exact: true,
      })
    },
  })
}
export const useSaveMyScorecard = (o: string, i: string) =>
  useMineMutation<ScorecardInput>(o, i, (v, c) => api.saveMine(o, i, v, c))
export const useSubmitMyScorecard = (o: string, i: string) =>
  useMineMutation<ScorecardInput>(o, i, (v, c) => api.submitMine(o, i, v, c))
export const useCreateNote = (o: string, a: string) => {
  const q = useQueryClient()
  return useMutation({
    mutationFn: (body: string) =>
      runAuthenticatedAuthMutation(q, (c) => api.createNote(o, a, body, c)),
    onSuccess: () =>
      q.invalidateQueries({
        queryKey: noteKeys.application(o, a),
        exact: true,
      }),
  })
}
export const useUpdateNote = (o: string, a: string) => {
  const q = useQueryClient()
  return useMutation({
    mutationFn: (v: { id: string; body: string; expectedRevision: number }) =>
      runAuthenticatedAuthMutation(q, (c) =>
        api.updateNote(o, a, v.id, v.body, v.expectedRevision, c),
      ),
    onSuccess: () =>
      q.invalidateQueries({
        queryKey: noteKeys.application(o, a),
        exact: true,
      }),
  })
}
export const useDeleteNote = (o: string, a: string) => {
  const q = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      runAuthenticatedAuthMutation(q, (c) => api.deleteNote(o, a, id, c)),
    onSuccess: () =>
      q.invalidateQueries({
        queryKey: noteKeys.application(o, a),
        exact: true,
      }),
  })
}
