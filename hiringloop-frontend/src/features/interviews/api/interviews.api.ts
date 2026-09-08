import { apiRequest } from '../../../shared/lib/apiClient'
import { ApiError } from '../../../shared/lib/apiErrors'
import type { JsonValue } from '../../../shared/types'
import type {
  InterviewDto,
  RescheduleInterviewInput,
  ScheduleInterviewInput,
  UpdateInterviewInput,
} from '../types/interview.types'
const base = (o: string) => `/organizations/${encodeURIComponent(o)}`
const record = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null
function interview(response: unknown): InterviewDto {
  const v =
    record(response) && record(response.data) ? response.data.interview : null
  if (!record(v))
    throw new ApiError({
      kind: 'response',
      code: 'INVALID_API_RESPONSE',
      message: 'The server returned an invalid interview response.',
    })
  return v as unknown as InterviewDto
}
function interviews(response: unknown): InterviewDto[] {
  const v =
    record(response) && record(response.data) ? response.data.interviews : null
  if (!Array.isArray(v))
    throw new ApiError({
      kind: 'response',
      code: 'INVALID_API_RESPONSE',
      message: 'The server returned an invalid interview response.',
    })
  return v as InterviewDto[]
}
export async function listApplicationInterviews(
  o: string,
  a: string,
  signal?: AbortSignal,
) {
  return interviews(
    await apiRequest(
      `${base(o)}/applications/${encodeURIComponent(a)}/interviews`,
      { signal },
    ),
  )
}
export async function listInterviews(
  o: string,
  from: string,
  to: string,
  mine: boolean,
  signal?: AbortSignal,
) {
  const p = new URLSearchParams({ from, to, mine: String(mine) })
  return interviews(await apiRequest(`${base(o)}/interviews?${p}`, { signal }))
}
export async function getInterview(
  o: string,
  id: string,
  signal?: AbortSignal,
) {
  return interview(
    await apiRequest(`${base(o)}/interviews/${encodeURIComponent(id)}`, {
      signal,
    }),
  )
}
export async function scheduleInterview(
  o: string,
  a: string,
  input: ScheduleInterviewInput,
  csrf: string,
) {
  return interview(
    await apiRequest(
      `${base(o)}/applications/${encodeURIComponent(a)}/interviews`,
      {
        method: 'POST',
        body: input as unknown as JsonValue,
        headers: { 'X-CSRF-Token': csrf },
      },
    ),
  )
}
export async function updateInterview(
  o: string,
  id: string,
  input: UpdateInterviewInput,
  csrf: string,
) {
  return interview(
    await apiRequest(`${base(o)}/interviews/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: input,
      headers: { 'X-CSRF-Token': csrf },
    }),
  )
}
export async function rescheduleInterview(
  o: string,
  id: string,
  input: RescheduleInterviewInput,
  csrf: string,
) {
  return interview(
    await apiRequest(
      `${base(o)}/interviews/${encodeURIComponent(id)}/reschedule`,
      {
        method: 'POST',
        body: input as unknown as JsonValue,
        headers: { 'X-CSRF-Token': csrf },
      },
    ),
  )
}
export async function cancelInterview(
  o: string,
  id: string,
  reason: string | undefined,
  csrf: string,
) {
  return interview(
    await apiRequest(`${base(o)}/interviews/${encodeURIComponent(id)}/cancel`, {
      method: 'POST',
      body: reason ? { cancellationReason: reason } : {},
      headers: { 'X-CSRF-Token': csrf },
    }),
  )
}
