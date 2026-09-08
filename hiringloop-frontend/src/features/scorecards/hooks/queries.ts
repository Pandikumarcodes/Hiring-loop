import { queryOptions, useQuery } from '@tanstack/react-query'
import * as api from '../api/scorecards.api'
import { noteKeys, scorecardKeys, scorecardTemplateKeys } from './query-keys'
export const useScorecardTemplate = (o: string, j: string, e = true) =>
  useQuery(
    queryOptions({
      queryKey: scorecardTemplateKeys.byJob(o, j),
      queryFn: ({ signal }) => api.getTemplate(o, j, signal),
      enabled: e,
      meta: { clearOnAuthChange: true },
    }),
  )
export const useInterviewScorecards = (o: string, i: string, e = true) =>
  useQuery(
    queryOptions({
      queryKey: scorecardKeys.interviewSummary(o, i),
      queryFn: ({ signal }) => api.getSummary(o, i, signal),
      enabled: e,
      meta: { clearOnAuthChange: true },
    }),
  )
export const useMyScorecard = (o: string, i: string, e = true) =>
  useQuery(
    queryOptions({
      queryKey: scorecardKeys.mine(o, i),
      queryFn: ({ signal }) => api.getMine(o, i, signal),
      enabled: e,
      meta: { clearOnAuthChange: true },
    }),
  )
export const useSubmittedScorecard = (
  o: string,
  i: string,
  id: string,
  e = true,
) =>
  useQuery(
    queryOptions({
      queryKey: scorecardKeys.detail(o, i, id),
      queryFn: ({ signal }) => api.getSubmitted(o, i, id, signal),
      enabled: e,
      meta: { clearOnAuthChange: true },
    }),
  )
export const useApplicationScorecards = (o: string, a: string, e = true) =>
  useQuery(
    queryOptions({
      queryKey: scorecardKeys.application(o, a),
      queryFn: ({ signal }) => api.getApplicationScorecards(o, a, signal),
      enabled: e,
      meta: { clearOnAuthChange: true },
    }),
  )
export const useApplicationNotes = (o: string, a: string, e = true) =>
  useQuery(
    queryOptions({
      queryKey: noteKeys.application(o, a),
      queryFn: ({ signal }) => api.getNotes(o, a, signal),
      enabled: e,
      meta: { clearOnAuthChange: true },
    }),
  )
