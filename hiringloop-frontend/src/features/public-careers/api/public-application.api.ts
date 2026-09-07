import { ApiError } from '../../../shared/lib/apiErrors'
import { apiRequest } from '../../../shared/lib/apiClient'
import type { JsonValue } from '../../../shared/types'
import type {
  PublicApplicationConfirmationDto,
  PublicApplicationFormDto,
  PublicApplicationUploadAuthorizationDto,
} from '../types/public-career.types'

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const invalidResponse = (message: string): never => {
  throw new ApiError({
    kind: 'response',
    code: 'INVALID_API_RESPONSE',
    message,
  })
}

const base = (organizationSlug: string, jobId: string) =>
  `/public/careers/${encodeURIComponent(organizationSlug)}/jobs/${encodeURIComponent(jobId)}`

function applicationFormResponse(value: unknown): PublicApplicationFormDto {
  if (
    !record(value) ||
    !record(value.data) ||
    !record(value.data.applicationForm) ||
    typeof value.data.applicationForm.versionId !== 'string' ||
    !Array.isArray(value.data.applicationForm.questions)
  )
    return invalidResponse(
      'The server returned an invalid application form response.',
    )
  return value.data.applicationForm as unknown as PublicApplicationFormDto
}

function uploadResponse(
  value: unknown,
): PublicApplicationUploadAuthorizationDto {
  if (
    !record(value) ||
    !record(value.data) ||
    typeof value.data.uploadId !== 'string' ||
    typeof value.data.signedUploadUrl !== 'string' ||
    typeof value.data.expiresAt !== 'string' ||
    !record(value.data.requiredHeaders)
  )
    return invalidResponse(
      'The server returned an invalid resume upload response.',
    )
  return value.data as unknown as PublicApplicationUploadAuthorizationDto
}

function confirmationResponse(
  value: unknown,
): PublicApplicationConfirmationDto {
  if (
    !record(value) ||
    !record(value.data) ||
    value.data.submitted !== true ||
    typeof value.data.submittedAt !== 'string' ||
    !record(value.data.job) ||
    typeof value.data.job.id !== 'string' ||
    typeof value.data.job.title !== 'string'
  )
    return invalidResponse(
      'The server returned an invalid application confirmation.',
    )
  return value.data as unknown as PublicApplicationConfirmationDto
}

export function getPublicApplicationForm(
  organizationSlug: string,
  jobId: string,
  signal?: AbortSignal,
) {
  return apiRequest(`${base(organizationSlug, jobId)}/application-form`, {
    signal,
  }).then(applicationFormResponse)
}

export function authorizePublicApplicationUpload(
  organizationSlug: string,
  jobId: string,
  input: { filename: string; mimeType: string; sizeBytes: number },
) {
  return apiRequest(`${base(organizationSlug, jobId)}/application-uploads`, {
    method: 'POST',
    body: input,
  }).then(uploadResponse)
}

export function submitPublicApplication(
  organizationSlug: string,
  jobId: string,
  input: {
    candidate: {
      firstName: string
      lastName: string
      email: string
      phone?: string
    }
    formVersionId: string
    answers: readonly { questionId: string; value: unknown }[]
    resumeUploadId: string
  },
  idempotencyKey: string,
) {
  return apiRequest(`${base(organizationSlug, jobId)}/applications`, {
    method: 'POST',
    body: {
      candidate: input.candidate,
      formVersionId: input.formVersionId,
      answers: input.answers.map((answer) => ({
        questionId: answer.questionId,
        value: answer.value,
      })),
      resumeUploadId: input.resumeUploadId,
    } as unknown as JsonValue,
    headers: { 'Idempotency-Key': idempotencyKey },
  }).then(confirmationResponse)
}
