import { apiRequest } from '../../../shared/lib/apiClient'
import type { JsonValue } from '../../../shared/types'
import { ApiError } from '../../../shared/lib/apiErrors'
import type {
  ApplicationNote,
  ApplicationScorecards,
  InterviewScorecardSummary,
  Scorecard,
  ScorecardInput,
  ScorecardTemplate,
  SubmittedScorecard,
  TemplateInput,
} from '../types/scorecard.types'
const base = (o: string) => `/organizations/${encodeURIComponent(o)}`
const job = (o: string, j: string) =>
  `${base(o)}/jobs/${encodeURIComponent(j)}/scorecard-template`
const interview = (o: string, i: string) =>
  `${base(o)}/interviews/${encodeURIComponent(i)}`
const application = (o: string, a: string) =>
  `${base(o)}/applications/${encodeURIComponent(a)}`
const record = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null
function data<T>(response: unknown, key: string): T {
  if (record(response) && record(response.data) && key in response.data)
    return response.data[key] as T
  throw new ApiError({
    kind: 'response',
    code: 'INVALID_API_RESPONSE',
    message: 'The server returned an invalid scorecard response.',
  })
}
const get = <T>(path: string, key: string, signal?: AbortSignal) =>
  apiRequest(path, { signal }).then((r) => data<T>(r, key))
const mutate = <T>(
  path: string,
  method: string,
  body: JsonValue | undefined,
  key: string,
  csrf: string,
) =>
  apiRequest(path, { method, body, headers: { 'X-CSRF-Token': csrf } }).then(
    (r) => data<T>(r, key),
  )
export const getTemplate = (o: string, j: string, signal?: AbortSignal) =>
  get<ScorecardTemplate | null>(job(o, j), 'scorecardTemplate', signal)
export const createDraft = (o: string, j: string, csrf: string) =>
  mutate<ScorecardTemplate>(
    `${job(o, j)}/draft`,
    'POST',
    {},
    'scorecardTemplate',
    csrf,
  )
export const updateDraft = (
  o: string,
  j: string,
  input: TemplateInput,
  csrf: string,
) =>
  mutate<ScorecardTemplate>(
    `${job(o, j)}/draft`,
    'PATCH',
    input as unknown as JsonValue,
    'scorecardTemplate',
    csrf,
  )
export const publishDraft = (
  o: string,
  j: string,
  expectedRevision: number,
  csrf: string,
) =>
  mutate<ScorecardTemplate>(
    `${job(o, j)}/publish`,
    'POST',
    { expectedRevision },
    'scorecardTemplate',
    csrf,
  )
export const getSummary = (o: string, i: string, signal?: AbortSignal) =>
  get<InterviewScorecardSummary>(
    `${interview(o, i)}/scorecards`,
    'scorecards',
    signal,
  )
export const getMine = (o: string, i: string, signal?: AbortSignal) =>
  get<Scorecard>(`${interview(o, i)}/my-scorecard`, 'scorecard', signal)
export const saveMine = (
  o: string,
  i: string,
  input: ScorecardInput,
  csrf: string,
) =>
  mutate<Scorecard>(
    `${interview(o, i)}/my-scorecard`,
    'PATCH',
    input as unknown as JsonValue,
    'scorecard',
    csrf,
  )
export const submitMine = (
  o: string,
  i: string,
  input: ScorecardInput,
  csrf: string,
) =>
  mutate<Scorecard>(
    `${interview(o, i)}/my-scorecard/submit`,
    'POST',
    input as unknown as JsonValue,
    'scorecard',
    csrf,
  )
export const getSubmitted = (
  o: string,
  i: string,
  id: string,
  signal?: AbortSignal,
) =>
  get<SubmittedScorecard>(
    `${interview(o, i)}/scorecards/${encodeURIComponent(id)}`,
    'scorecard',
    signal,
  )
export const getApplicationScorecards = (
  o: string,
  a: string,
  signal?: AbortSignal,
) =>
  get<ApplicationScorecards>(
    `${application(o, a)}/scorecards`,
    'scorecards',
    signal,
  )
export const getNotes = (o: string, a: string, signal?: AbortSignal) =>
  get<readonly ApplicationNote[]>(`${application(o, a)}/notes`, 'notes', signal)
export const createNote = (o: string, a: string, body: string, csrf: string) =>
  mutate<ApplicationNote>(
    `${application(o, a)}/notes`,
    'POST',
    { body },
    'note',
    csrf,
  )
export const updateNote = (
  o: string,
  a: string,
  id: string,
  body: string,
  expectedRevision: number,
  csrf: string,
) =>
  mutate<ApplicationNote>(
    `${application(o, a)}/notes/${encodeURIComponent(id)}`,
    'PATCH',
    { body, expectedRevision },
    'note',
    csrf,
  )
export const deleteNote = async (
  o: string,
  a: string,
  id: string,
  csrf: string,
) => {
  await apiRequest(`${application(o, a)}/notes/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { 'X-CSRF-Token': csrf },
  })
}
