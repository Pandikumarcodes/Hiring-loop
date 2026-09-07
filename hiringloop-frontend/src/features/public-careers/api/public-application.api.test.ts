import { beforeEach, describe, expect, test, vi } from 'vitest'

const request = vi.hoisted(() => vi.fn())
vi.mock('../../../shared/lib/apiClient', () => ({ apiRequest: request }))

import {
  authorizePublicApplicationUpload,
  getPublicApplicationForm,
  submitPublicApplication,
} from './public-application.api'

beforeEach(() => request.mockReset())

describe('public application API client', () => {
  test('fetches the public form using slug and job id', async () => {
    request.mockResolvedValue({
      data: { applicationForm: { versionId: 'v1', questions: [] } },
    })
    await getPublicApplicationForm('acme /', 'job /')
    expect(request).toHaveBeenCalledWith(
      '/public/careers/acme%20%2F/jobs/job%20%2F/application-form',
      expect.any(Object),
    )
  })

  test('uses the exact upload authorization contract', async () => {
    request.mockResolvedValue({
      data: {
        uploadId: 'upload-1',
        signedUploadUrl: 'https://signed.example',
        expiresAt: '2026-09-07T00:00:00.000Z',
        requiredHeaders: { 'Content-Type': 'application/pdf' },
      },
    })
    await authorizePublicApplicationUpload('acme', 'job', {
      filename: 'resume.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 123,
    })
    expect(request).toHaveBeenCalledWith(
      '/public/careers/acme/jobs/job/application-uploads',
      {
        method: 'POST',
        body: {
          filename: 'resume.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 123,
        },
      },
    )
  })

  test('submits only candidate, version, answers and upload id with idempotency key', async () => {
    request.mockResolvedValue({
      data: {
        submitted: true,
        submittedAt: '2026-09-07T00:00:00.000Z',
        job: { id: 'job', title: 'Engineer' },
      },
    })
    await submitPublicApplication(
      'acme',
      'job',
      {
        candidate: {
          firstName: 'Ada',
          lastName: 'Lovelace',
          email: 'ada@example.test',
        },
        formVersionId: 'version-1',
        answers: [{ questionId: 'q1', value: { optionId: 'option-1' } }],
        resumeUploadId: 'upload-1',
      },
      'key-1',
    )
    expect(request).toHaveBeenCalledWith(
      '/public/careers/acme/jobs/job/applications',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Idempotency-Key': 'key-1' },
        body: expect.objectContaining({
          candidate: {
            firstName: 'Ada',
            lastName: 'Lovelace',
            email: 'ada@example.test',
          },
          formVersionId: 'version-1',
          answers: [{ questionId: 'q1', value: { optionId: 'option-1' } }],
          resumeUploadId: 'upload-1',
        }),
      }),
    )
    const body = request.mock.calls[0][1].body
    expect(body).not.toHaveProperty('organizationId')
    expect(body).not.toHaveProperty('candidateId')
    expect(body).not.toHaveProperty('pipelineId')
    expect(body).not.toHaveProperty('stageId')
    expect(body).not.toHaveProperty('objectKey')
  })
})
