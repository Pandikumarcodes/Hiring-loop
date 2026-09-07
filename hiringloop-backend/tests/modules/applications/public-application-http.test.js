import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { errorHandler } from '../../../src/middleware/error-handler.js';
import { createPublicApplicationRateLimiters } from '../../../src/middleware/rate-limit.js';
import { createPublicCareerRouter } from '../../../src/modules/public-careers/routes/public-career-routes.js';

const jobId = '01990b72-7c3a-7b2d-b6bb-9a6a7a1c0001';
const idempotencyKey = '01990b72-7c3a-7b2d-b6bb-9a6a7a1c0002';

function makeApp() {
  const publicApplicationUseCases = {
    form: vi.fn(async () => ({ versionId: 'version-1', questions: [] })),
    authorizeUpload: vi.fn(async () => ({
      uploadId: '01990b72-7c3a-7b2d-b6bb-9a6a7a1c0003',
      signedUploadUrl: 'https://s3.example.test/signed',
      expiresAt: new Date('2026-09-09T12:10:00.000Z'),
      requiredHeaders: { 'Content-Type': 'application/pdf' },
    })),
    submit: vi.fn(async () => ({
      submitted: true,
      submittedAt: new Date('2026-09-09T12:00:00.000Z'),
      job: { id: jobId, title: 'Engineer' },
    })),
  };
  const app = express();
  app.use(express.json());
  app.use(
    '/api/v1/public',
    createPublicCareerRouter({
      publicCareerUseCases: { list: vi.fn(), detail: vi.fn() },
      publicCareerReadRateLimiter: (_request, _response, next) => next(),
      publicApplicationUseCases,
      publicApplicationRateLimiters: createPublicApplicationRateLimiters({
        policyOverrides: {
          form: { limit: 10, windowMs: 60_000 },
          upload: { limit: 10, windowMs: 60_000 },
          submission: { limit: 10, windowMs: 60_000 },
        },
      }),
    }),
  );
  app.use(errorHandler);
  return { app, publicApplicationUseCases };
}

describe('public application HTTP routes', () => {
  it('exposes only sanitized public application endpoint commands', async () => {
    const { app, publicApplicationUseCases } = makeApp();
    const form = await request(app).get(
      `/api/v1/public/careers/acme/jobs/${jobId}/application-form`,
    );
    expect(form.status).toBe(200);
    expect(form.body.data.applicationForm).toEqual({
      versionId: 'version-1',
      questions: [],
    });

    const authorization = await request(app)
      .post(`/api/v1/public/careers/acme/jobs/${jobId}/application-uploads`)
      .send({
        filename: 'resume.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 1234,
      });
    expect(authorization.status).toBe(201);
    expect(publicApplicationUseCases.authorizeUpload).toHaveBeenCalledWith(
      expect.objectContaining({ organizationSlug: 'acme', jobId }),
    );

    const missingKey = await request(app)
      .post(`/api/v1/public/careers/acme/jobs/${jobId}/applications`)
      .send({
        candidate: {
          firstName: 'Ada',
          lastName: 'Lovelace',
          email: 'ada@example.test',
        },
        formVersionId: '01990b72-7c3a-7b2d-b6bb-9a6a7a1c0004',
        answers: [],
        resumeUploadId: '01990b72-7c3a-7b2d-b6bb-9a6a7a1c0005',
      });
    expect(missingKey.status).toBe(400);
    expect(missingKey.body.error.code).toBe('VALIDATION_ERROR');

    const submitted = await request(app)
      .post(`/api/v1/public/careers/acme/jobs/${jobId}/applications`)
      .set('Idempotency-Key', idempotencyKey)
      .send({
        candidate: {
          firstName: 'Ada',
          lastName: 'Lovelace',
          email: 'ada@example.test',
        },
        formVersionId: '01990b72-7c3a-7b2d-b6bb-9a6a7a1c0004',
        answers: [],
        resumeUploadId: '01990b72-7c3a-7b2d-b6bb-9a6a7a1c0005',
      });
    expect(submitted.status).toBe(201);
    expect(publicApplicationUseCases.submit).toHaveBeenCalledWith(
      expect.objectContaining({ idempotencyKey }),
    );
  });
});
