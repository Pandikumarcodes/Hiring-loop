import { queryOptions, useQuery } from '@tanstack/react-query'
import {
  getInterview,
  listApplicationInterviews,
  listInterviews,
} from '../api/interviews.api'
import { interviewKeys } from './query-keys'
export const applicationInterviewsQueryOptions = (
  o: string,
  a: string,
  enabled = true,
) =>
  queryOptions({
    queryKey: interviewKeys.application(o, a),
    queryFn: ({ signal }) => listApplicationInterviews(o, a, signal),
    enabled,
    meta: { clearOnAuthChange: true },
  })
export const calendarInterviewsQueryOptions = (
  o: string,
  from: string,
  to: string,
  mine: boolean,
  enabled = true,
) =>
  queryOptions({
    queryKey: interviewKeys.calendar(o, from, to, mine),
    queryFn: ({ signal }) => listInterviews(o, from, to, mine, signal),
    enabled,
    placeholderData: (old) => old,
    meta: { clearOnAuthChange: true },
  })
export const interviewQueryOptions = (o: string, id: string, enabled = true) =>
  queryOptions({
    queryKey: interviewKeys.detail(o, id),
    queryFn: ({ signal }) => getInterview(o, id, signal),
    enabled,
    meta: { clearOnAuthChange: true },
  })
export const useApplicationInterviews = (
  o: string,
  a: string,
  enabled = true,
) => useQuery(applicationInterviewsQueryOptions(o, a, enabled))
export const useCalendarInterviews = (
  o: string,
  f: string,
  t: string,
  m: boolean,
  e = true,
) => useQuery(calendarInterviewsQueryOptions(o, f, t, m, e))
export const useInterview = (o: string, id: string, e = true) =>
  useQuery(interviewQueryOptions(o, id, e))
