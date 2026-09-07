import { apiRequest } from '../../../shared/lib/apiClient'
import type { JsonValue } from '../../../shared/types'
import { ApiError } from '../../../shared/lib/apiErrors'
import type {
  ApplicationFormBuilderDto,
  QuestionInput,
} from '../types/application-form.types'

const base = (organizationId: string, jobId: string) =>
  `/organizations/${encodeURIComponent(organizationId)}/jobs/${encodeURIComponent(jobId)}/application-form`
const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null
function builder(response: unknown): ApplicationFormBuilderDto {
  if (
    record(response) &&
    record(response.data) &&
    record(response.data.applicationForm)
  )
    return response.data.applicationForm as unknown as ApplicationFormBuilderDto
  throw new ApiError({
    kind: 'response',
    code: 'INVALID_API_RESPONSE',
    message: 'The server returned an invalid application form response.',
  })
}
export const getApplicationForm = async (
  org: string,
  job: string,
  signal?: AbortSignal,
) => builder(await apiRequest(base(org, job), { signal }))
const mutation = async (
  path: string,
  method: string,
  body: JsonValue | undefined,
  csrf: string,
) =>
  builder(
    await apiRequest(path, { method, body, headers: { 'X-CSRF-Token': csrf } }),
  )
export const createDraft = (org: string, job: string, csrf: string) =>
  mutation(`${base(org, job)}/draft`, 'POST', {}, csrf)
export const addQuestion = (
  org: string,
  job: string,
  input: QuestionInput,
  csrf: string,
) =>
  mutation(
    `${base(org, job)}/draft/questions`,
    'POST',
    input as unknown as JsonValue,
    csrf,
  )
export const updateQuestion = (
  org: string,
  job: string,
  questionId: string,
  input: QuestionInput,
  csrf: string,
) =>
  mutation(
    `${base(org, job)}/draft/questions/${encodeURIComponent(questionId)}`,
    'PATCH',
    input as unknown as JsonValue,
    csrf,
  )
export const deleteQuestion = (
  org: string,
  job: string,
  questionId: string,
  expectedRevision: number,
  csrf: string,
) =>
  mutation(
    `${base(org, job)}/draft/questions/${encodeURIComponent(questionId)}`,
    'DELETE',
    { expectedRevision },
    csrf,
  )
export const reorderQuestions = (
  org: string,
  job: string,
  questionIds: readonly string[],
  expectedRevision: number,
  csrf: string,
) =>
  mutation(
    `${base(org, job)}/draft/questions/order`,
    'PUT',
    { questionIds: [...questionIds], expectedRevision },
    csrf,
  )
export const publishDraft = (
  org: string,
  job: string,
  expectedRevision: number,
  csrf: string,
) =>
  mutation(
    `${base(org, job)}/draft/publish`,
    'POST',
    { expectedRevision },
    csrf,
  )
export const discardDraft = (
  org: string,
  job: string,
  expectedRevision: number,
  csrf: string,
) => mutation(`${base(org, job)}/draft`, 'DELETE', { expectedRevision }, csrf)
