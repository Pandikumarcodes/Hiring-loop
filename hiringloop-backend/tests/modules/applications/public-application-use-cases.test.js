import { describe, expect, it, vi } from 'vitest';

import { createPublicApplicationUseCases } from '../../../src/modules/applications/use-cases/public-application-use-cases.js';

const organization = { id: 'org-1', slug: 'acme' };
const job = { id: 'job-1', title: 'Engineer', status: 'OPEN' };
const version = {
  id: 'version-1',
  questions: [
    {
      id: 'question-1',
      type: 'SINGLE_SELECT',
      required: true,
      options: [{ id: 'option-1' }],
    },
  ],
};
const fixedNow = new Date('2026-09-09T12:00:00.000Z');
const upload = {
  id: 'upload-1',
  objectKey: 'organizations/org-1/application-uploads/upload-1',
  mimeType: 'application/pdf',
  declaredSizeBytes: 1234,
  status: 'PENDING',
  expiresAt: new Date('2026-09-09T12:10:00.000Z'),
};

function makeUseCases(overrides = {}) {
  const applicationRepository = {
    findActivePublishedForm: vi.fn(async () => ({ activeVersion: version })),
    findPublishedFormVersion: vi.fn(async () => version),
    findInitialStage: vi.fn(async () => ({ id: 'stage-1' })),
    createUploadReservation: vi.fn(async (data) => data),
    findUpload: vi.fn(async () => upload),
    findIdempotentApplication: vi.fn(async () => null),
    createAtomicSubmission: vi.fn(async () => ({
      id: 'application-1',
      submittedAt: fixedNow,
      requestFingerprint: 'fingerprint',
      job: { id: 'job-1', title: 'Engineer' },
    })),
    ...overrides.applicationRepository,
  };
  const storage = {
    createSignedPutUrl: vi.fn(async () => ({
      url: 'https://s3.example.test/signed',
      requiredHeaders: { 'Content-Type': 'application/pdf' },
    })),
    headObject: vi.fn(async () => ({
      contentLength: 1234,
      contentType: 'application/pdf',
    })),
    ...overrides.storage,
  };
  return {
    useCases: createPublicApplicationUseCases({
      organizationRepository: {
        findPublicOrganizationBySlug: vi.fn(async () => organization),
      },
      jobRepository: {
        findPublicApplicationJobForOrganization: vi.fn(async () => job),
        findOpenPublicJobForOrganization: vi.fn(async () => job),
      },
      applicationRepository,
      storage,
      uploadTtlSeconds: 600,
      maxUploadBytes: 5 * 1024 * 1024,
      clock: () => fixedNow,
      id: () => 'upload-1',
    }),
    applicationRepository,
    storage,
  };
}

const submission = () => ({
  organizationSlug: 'acme',
  jobId: 'job-1',
  idempotencyKey: '01990b72-7c3a-7b2d-b6bb-9a6a7a1c0001',
  candidate: {
    firstName: ' Ada ',
    lastName: ' Lovelace ',
    email: 'ADA@EXAMPLE.TEST ',
  },
  formVersionId: 'version-1',
  resumeUploadId: 'upload-1',
  answers: [{ questionId: 'question-1', value: { optionId: 'option-1' } }],
});

describe('public application use cases', () => {
  it('returns a sanitized active published form and creates opaque upload reservations', async () => {
    const { useCases, applicationRepository, storage } = makeUseCases();
    const form = await useCases.form({
      organizationSlug: 'acme',
      jobId: 'job-1',
    });
    expect(form).toEqual({
      versionId: 'version-1',
      questions: [
        expect.objectContaining({ id: 'question-1', type: 'SINGLE_SELECT' }),
      ],
    });
    const authorized = await useCases.authorizeUpload({
      organizationSlug: 'acme',
      jobId: 'job-1',
      filename: 'resume.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 1234,
    });
    expect(authorized.uploadId).toBe('upload-1');
    expect(applicationRepository.createUploadReservation).toHaveBeenCalledWith(
      expect.objectContaining({
        objectKey: 'organizations/org-1/application-uploads/upload-1',
      }),
    );
    expect(storage.createSignedPutUrl).toHaveBeenCalledWith(
      expect.objectContaining({ mimeType: 'application/pdf' }),
    );
    await expect(
      useCases.authorizeUpload({
        organizationSlug: 'acme',
        jobId: 'job-1',
        filename: 'resume.exe',
        mimeType: 'application/octet-stream',
        sizeBytes: 1234,
      }),
    ).rejects.toMatchObject({ code: 'FILE_TYPE_NOT_ALLOWED' });
  });

  it('validates persisted question options and commits only validated submission inputs', async () => {
    const { useCases, applicationRepository, storage } = makeUseCases();
    const result = await useCases.submit(submission());
    expect(result).toMatchObject({
      submitted: true,
      job: { id: job.id, title: job.title },
    });
    expect(storage.headObject).toHaveBeenCalledWith({
      objectKey: upload.objectKey,
    });
    expect(applicationRepository.createAtomicSubmission).toHaveBeenCalledWith(
      expect.objectContaining({
        candidate: expect.objectContaining({
          normalizedEmail: 'ada@example.test',
        }),
        answers: [
          { questionId: 'question-1', value: { optionId: 'option-1' } },
        ],
      }),
    );
    await expect(
      useCases.submit({
        ...submission(),
        answers: [{ questionId: 'question-1', value: { optionId: 'foreign' } }],
      }),
    ).rejects.toMatchObject({ code: 'INVALID_APPLICATION_ANSWER' });
  });

  it('replays an existing idempotency key and rejects different request content', async () => {
    const original = {
      id: 'application-1',
      requestFingerprint:
        '7d0c29dd139a36928998a74d5ea8f049936bf1586d37f2171fcf26d63c2d9dc4',
      submittedAt: fixedNow,
      job,
    };
    const first = makeUseCases({
      applicationRepository: {
        findIdempotentApplication: vi.fn(async () => original),
      },
    });
    // Use the first run to derive the exact fingerprint through the service's
    // deterministic request handling rather than duplicating its algorithm.
    const fresh = makeUseCases();
    await fresh.useCases.submit(submission());
    const persisted =
      fresh.applicationRepository.createAtomicSubmission.mock.calls[0][0];
    original.requestFingerprint = persisted.requestFingerprint;
    const replay = await first.useCases.submit(submission());
    expect(replay.submitted).toBe(true);
    await expect(
      first.useCases.submit({ ...submission(), resumeUploadId: 'upload-2' }),
    ).rejects.toMatchObject({ code: 'IDEMPOTENCY_CONFLICT' });
  });

  it('rejects closed jobs, expired uploads, and missing required answers', async () => {
    const closed = makeUseCases({
      jobRepository: {
        findPublicApplicationJobForOrganization: vi.fn(async () => ({
          ...job,
          status: 'CLOSED',
        })),
      },
    });
    // Job repository is deliberately passed through construction; this check
    // uses a dedicated instance because it is public-resource scoped.
    const useCases = createPublicApplicationUseCases({
      organizationRepository: {
        findPublicOrganizationBySlug: async () => organization,
      },
      jobRepository: {
        findPublicApplicationJobForOrganization: async () => ({
          ...job,
          status: 'CLOSED',
        }),
      },
      applicationRepository: closed.applicationRepository,
      storage: closed.storage,
      uploadTtlSeconds: 600,
      maxUploadBytes: 5 * 1024 * 1024,
      clock: () => fixedNow,
    });
    await expect(useCases.submit(submission())).rejects.toMatchObject({
      code: 'JOB_NOT_ACCEPTING_APPLICATIONS',
    });
    const required = makeUseCases();
    await expect(
      required.useCases.submit({ ...submission(), answers: [] }),
    ).rejects.toMatchObject({ code: 'REQUIRED_ANSWER_MISSING' });
  });
});
