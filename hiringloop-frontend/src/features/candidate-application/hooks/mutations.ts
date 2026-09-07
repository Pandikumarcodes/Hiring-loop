import { useMutation } from '@tanstack/react-query'
import {
  authorizePublicApplicationUpload,
  submitPublicApplication,
} from '../../public-careers/api/public-application.api'

export function useAuthorizePublicApplicationUpload(
  organizationSlug: string,
  jobId: string,
) {
  return useMutation({
    mutationFn: (input: {
      filename: string
      mimeType: string
      sizeBytes: number
    }) => authorizePublicApplicationUpload(organizationSlug, jobId, input),
  })
}

export function useSubmitPublicApplication(
  organizationSlug: string,
  jobId: string,
) {
  return useMutation({
    mutationFn: (input: {
      candidate: {
        firstName: string
        lastName: string
        email: string
        phone?: string
      }
      formVersionId: string
      answers: readonly { questionId: string; value: unknown }[]
      resumeUploadId: string
      idempotencyKey: string
    }) =>
      submitPublicApplication(
        organizationSlug,
        jobId,
        {
          candidate: input.candidate,
          formVersionId: input.formVersionId,
          answers: input.answers,
          resumeUploadId: input.resumeUploadId,
        },
        input.idempotencyKey,
      ),
  })
}
