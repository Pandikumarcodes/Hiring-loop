import assert from 'node:assert/strict';
import express from 'express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

process.env.NODE_ENV = 'test';

const { getPrismaClient, disconnectDatabase, getTestDatabaseUrl } =
  await import('../../../src/database/client.js');
const { generateEntityId: id } = await import('../../../src/utils/ids.js');
const { createJobRepository } =
  await import('../../../src/modules/jobs/repositories/job-repository.js');
const { createJobUseCases } =
  await import('../../../src/modules/jobs/use-cases/job-use-cases.js');
const { createOrganizationRepository } =
  await import('../../../src/modules/organizations/repositories/organization-repository.js');
const { createApplicationRepository } =
  await import('../../../src/modules/applications/repositories/application-repository.js');
const { createPublicApplicationUseCases } =
  await import('../../../src/modules/applications/use-cases/public-application-use-cases.js');
const { StorageObjectNotFoundError } =
  await import('../../../src/modules/applications/storage/application-storage.js');
const { createPublicCareerRouter } =
  await import('../../../src/modules/public-careers/routes/public-career-routes.js');
const { errorHandler } =
  await import('../../../src/middleware/error-handler.js');

describe('Phase 4B PostgreSQL resume persistence', () => {
  let prisma, jobs, repository;
  const organizations = [];
  const jobIds = [];
  const objects = new Map();
  const bytes = Buffer.from('%PDF-1.7 synthetic resume');
  const storage = {
    createSignedPutUrl: vi.fn(async ({ objectKey, mimeType }) => ({
      url: `https://storage.invalid/${objectKey}`,
      requiredHeaders: { 'Content-Type': mimeType, 'If-None-Match': '*' },
    })),
    headObject: vi.fn(async ({ objectKey }) => {
      const object = objects.get(objectKey);
      if (!object) throw new StorageObjectNotFoundError();
      return {
        contentLength: object.bytes.length,
        contentType: object.mimeType,
      };
    }),
    readObjectPrefix: vi.fn(async ({ objectKey }) =>
      objects.get(objectKey).bytes.subarray(0, 8),
    ),
  };
  const service = (applicationRepository = repository) =>
    createPublicApplicationUseCases({
      organizationRepository: createOrganizationRepository(prisma),
      jobRepository: createJobRepository(prisma),
      applicationRepository,
      storage,
      uploadTtlSeconds: 600,
      maxUploadBytes: 5242880,
    });

  beforeAll(async () => {
    const target = new URL(getTestDatabaseUrl());
    assert.equal(target.pathname, '/hiringloop_test');
    assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(target.hostname));
    prisma = getPrismaClient();
    const [identity] =
      await prisma.$queryRaw`SELECT current_database() AS database, current_schema() AS schema`;
    expect(identity).toEqual({ database: 'hiringloop_test', schema: 'public' });
    jobs = createJobUseCases({ jobRepository: createJobRepository(prisma) });
    repository = createApplicationRepository(prisma);
    for (let n = 0; n < 2; n++) {
      organizations.push(
        await prisma.organization.create({
          data: { id: id(), name: 'Resume test', slug: `resume-${id()}` },
        }),
      );
    }
  });

  afterAll(async () => {
    if (!prisma) return;
    const where = { organizationId: { in: organizations.map((o) => o.id) } };
    for (const model of [
      'applicationStageHistory',
      'candidateDocument',
      'applicationAnswer',
      'applicationUpload',
      'application',
      'candidate',
    ])
      await prisma[model].deleteMany({ where });
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SET CONSTRAINTS ALL DEFERRED`;
      await tx.applicationFormQuestionOption.deleteMany({ where });
      await tx.applicationFormQuestion.deleteMany({ where });
      for (const org of organizations) {
        await tx.$executeRaw`DELETE FROM "ApplicationFormVersion" WHERE "organizationId" = ${org.id}::uuid`;
        await tx.$executeRaw`DELETE FROM "ApplicationForm" WHERE "organizationId" = ${org.id}::uuid`;
      }
    });
    await prisma.pipelineStage.deleteMany({
      where: { pipeline: { jobId: { in: jobIds } } },
    });
    await prisma.pipeline.deleteMany({ where: { jobId: { in: jobIds } } });
    await prisma.job.deleteMany({ where: { id: { in: jobIds } } });
    await prisma.organization.deleteMany({
      where: { id: { in: organizations.map((o) => o.id) } },
    });
    await disconnectDatabase();
  });

  async function fixture(org = organizations[0]) {
    const job = await jobs.create({
      organizationId: org.id,
      data: { title: 'Resume persistence' },
    });
    jobIds.push(job.id);
    await prisma.job.update({
      where: { id: job.id },
      data: { status: 'OPEN', openedAt: new Date() },
    });
    const form = await prisma.applicationForm.findUnique({
      where: { jobId: job.id },
    });
    const input = {
      organizationSlug: org.slug,
      jobId: job.id,
      idempotencyKey: id(),
      formVersionId: form.activeVersionId,
      candidate: {
        firstName: 'Resume',
        lastName: 'Tester',
        email: `${id()}@example.test`,
      },
      answers: [],
    };
    return { org, job, input };
  }

  async function reserve(f) {
    const result = await service().authorizeUpload({
      organizationSlug: f.org.slug,
      jobId: f.job.id,
      filename: 'resume.pdf',
      mimeType: 'application/pdf',
      sizeBytes: bytes.length,
    });
    const upload = await prisma.applicationUpload.findUnique({
      where: { id: result.uploadId },
    });
    // Fake conditional object PUT: accepted bytes cannot be replaced.
    assert.ok(!objects.has(upload.objectKey));
    objects.set(upload.objectKey, { bytes, mimeType: 'application/pdf' });
    return { ...f.input, resumeUploadId: upload.id };
  }

  async function snapshot(f) {
    const where = { organizationId: f.org.id, jobId: f.job.id };
    const applications = await prisma.application.findMany({
      where,
      include: {
        candidate: true,
        documents: true,
        answers: true,
        stageHistory: true,
      },
    });
    const uploads = await prisma.applicationUpload.findMany({
      where,
      orderBy: { id: 'asc' },
    });
    return { applications, uploads };
  }

  it('persists reservation, resume metadata, candidate, application and history atomically', async () => {
    const f = await fixture();
    const input = await reserve(f);
    expect(await service().submit(input)).toMatchObject({
      submitted: true,
      job: { id: f.job.id },
    });
    const { applications, uploads } = await snapshot(f);
    expect(applications).toHaveLength(1);
    const app = applications[0];
    expect(app.documents).toHaveLength(1);
    expect(app.documents[0]).toMatchObject({
      organizationId: f.org.id,
      candidateId: app.candidateId,
      applicationId: app.id,
      objectKey: uploads[0].objectKey,
      type: 'RESUME',
      originalFilename: 'resume.pdf',
      mimeType: 'application/pdf',
      sizeBytes: bytes.length,
    });
    expect(app.candidate.normalizedEmail).toBe(input.candidate.email);
    expect(app.applicationFormVersionId).toBe(input.formVersionId);
    expect(app.stageHistory).toEqual([
      expect.objectContaining({
        event: 'APPLICATION_SUBMITTED',
        toStageId: app.currentPipelineStageId,
      }),
    ]);
    expect(uploads[0]).toMatchObject({
      status: 'CONSUMED',
      consumedApplicationId: app.id,
      consumedAt: expect.any(Date),
    });
  });

  it('replays duplicate completion and rejects changed content without changing persisted state', async () => {
    const f = await fixture(),
      input = await reserve(f);
    const first = await service().submit(input),
      before = await snapshot(f);
    const calls = storage.headObject.mock.calls.length;
    expect(await service().submit(input)).toEqual(first);
    expect(storage.headObject.mock.calls.length).toBe(calls);
    await expect(
      service().submit({
        ...input,
        candidate: { ...input.candidate, firstName: 'Changed' },
      }),
    ).rejects.toMatchObject({ code: 'IDEMPOTENCY_CONFLICT' });
    expect(await snapshot(f)).toEqual(before);
  });

  it('rejects unknown, wrong-job and cross-tenant references before persistence', async () => {
    const f = await fixture(),
      input = await reserve(f);
    const otherJob = await fixture(),
      foreign = await fixture(organizations[1]);
    const before = await snapshot(f);
    for (const rejected of [
      { ...input, resumeUploadId: id() },
      { ...otherJob.input, resumeUploadId: input.resumeUploadId },
      { ...foreign.input, resumeUploadId: input.resumeUploadId },
    ])
      await expect(service().submit(rejected)).rejects.toMatchObject({
        code: 'INVALID_APPLICATION_UPLOAD',
      });
    expect(await snapshot(f)).toEqual(before);
    expect((await snapshot(otherJob)).applications).toEqual([]);
    expect((await snapshot(foreign)).applications).toEqual([]);
  });

  it.each(['missing', 'size', 'mime', 'signature', 'expired', 'key'])(
    'rejects invalid %s upload without accepting an application',
    async (kind) => {
      const f = await fixture(),
        input = await reserve(f);
      const upload = await prisma.applicationUpload.findUnique({
        where: { id: input.resumeUploadId },
      });
      if (kind === 'missing') objects.delete(upload.objectKey);
      if (kind === 'size')
        objects.set(upload.objectKey, {
          bytes: Buffer.from('%PDF-'),
          mimeType: 'application/pdf',
        });
      if (kind === 'mime')
        objects.get(upload.objectKey).mimeType = 'application/msword';
      if (kind === 'signature')
        objects.get(upload.objectKey).bytes = Buffer.alloc(bytes.length);
      if (kind === 'expired')
        await prisma.applicationUpload.update({
          where: { id: upload.id },
          data: { expiresAt: new Date(0) },
        });
      if (kind === 'key')
        await prisma.applicationUpload.update({
          where: { id: upload.id },
          data: { objectKey: `invalid/${id()}` },
        });
      const before = await snapshot(f);
      await expect(service().submit(input)).rejects.toMatchObject({
        code:
          kind === 'expired'
            ? 'APPLICATION_UPLOAD_EXPIRED'
            : 'INVALID_APPLICATION_UPLOAD',
      });
      expect(await snapshot(f)).toEqual(before);
    },
  );

  it('rolls back candidate updates, application, answers, document, history and consumption after a database error', async () => {
    const f = await fixture(),
      input = await reserve(f);
    const question = await prisma.applicationFormQuestion.create({
      data: {
        id: id(),
        organizationId: f.org.id,
        applicationFormVersionId: input.formVersionId,
        questionKey: 'rollback',
        type: 'SHORT_TEXT',
        label: 'Rollback answer',
        sortOrder: 1,
      },
    });
    input.answers = [{ questionId: question.id, value: 'Synthetic answer' }];
    const candidate = await prisma.candidate.create({
      data: {
        id: id(),
        organizationId: f.org.id,
        normalizedEmail: input.candidate.email,
        email: input.candidate.email,
        firstName: 'Original',
        lastName: 'Original',
      },
    });
    // Inject a real PostgreSQL failure after the final consumption write.
    const failingPrisma = {
      $transaction: (callback) =>
        prisma.$transaction((tx) =>
          callback(
            new Proxy(tx, {
              get(target, key) {
                if (key === 'applicationUpload')
                  return {
                    updateMany: async (args) => {
                      await target.applicationUpload.updateMany(args);
                      await target.$queryRaw`SELECT 1 / 0 AS injected_failure`;
                    },
                  };
                return target[key];
              },
            }),
          ),
        ),
    };
    const before = await snapshot(f);
    await expect(
      service({
        ...repository,
        createAtomicSubmission:
          createApplicationRepository(failingPrisma).createAtomicSubmission,
      }).submit(input),
    ).rejects.toMatchObject({
      code: 'P2010',
      meta: { driverAdapterError: { cause: { originalCode: '22012' } } },
    });
    expect(await snapshot(f)).toEqual(before);
    expect(
      await prisma.candidate.findUnique({ where: { id: candidate.id } }),
    ).toEqual(candidate);
    expect(objects.has(before.uploads[0].objectKey)).toBe(true);
    await expect(service().submit(input)).resolves.toMatchObject({
      submitted: true,
    });
    expect((await snapshot(f)).applications[0].answers).toEqual([
      expect.objectContaining({
        questionId: question.id,
        value: 'Synthetic answer',
      }),
    ]);
  });

  it('rolls back when an upload expires between preflight and conditional consumption', async () => {
    const f = await fixture(),
      input = await reserve(f);
    const expiring = service({
      ...repository,
      createAtomicSubmission: async (args) => {
        await prisma.applicationUpload.update({
          where: { id: input.resumeUploadId },
          data: { expiresAt: new Date(0) },
        });
        return repository.createAtomicSubmission(args);
      },
    });
    await expect(expiring.submit(input)).rejects.toMatchObject({
      code: 'APPLICATION_UPLOAD_ALREADY_CONSUMED',
    });
    const state = await snapshot(f);
    expect(state.applications).toEqual([]);
    expect(state.uploads[0]).toMatchObject({
      status: 'PENDING',
      consumedApplicationId: null,
      consumedAt: null,
    });
    expect(
      await prisma.candidate.count({
        where: {
          organizationId: f.org.id,
          normalizedEmail: input.candidate.email,
        },
      }),
    ).toBe(0);
  });

  // Both requests pass upload validation before either transaction starts.
  async function race(inputs) {
    let arrivals = 0,
      release;
    const gate = new Promise((resolve) => {
      release = resolve;
    });
    const racing = service({
      ...repository,
      createAtomicSubmission: async (args) => {
        if (++arrivals === inputs.length) release();
        await gate;
        return repository.createAtomicSubmission(args);
      },
    });
    return Promise.allSettled(inputs.map((input) => racing.submit(input)));
  }

  it('serializes concurrent same-key completion to one persisted submission and replay', async () => {
    const f = await fixture(),
      input = await reserve(f);
    const results = await race([input, input]);
    expect(results.map((r) => r.status)).toEqual(['fulfilled', 'fulfilled']);
    expect(results[0].value).toEqual(results[1].value);
    const state = await snapshot(f);
    expect(state.applications).toHaveLength(1);
    expect(state.applications[0].documents).toHaveLength(1);
    expect(state.applications[0].stageHistory).toHaveLength(1);
  });

  it('allows only one concurrent claimant of the same upload under distinct keys/candidates', async () => {
    const f = await fixture(),
      input = await reserve(f);
    const alternative = {
      ...input,
      idempotencyKey: id(),
      candidate: { ...input.candidate, email: `${id()}@example.test` },
    };
    const results = await race([input, alternative]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(results.find((r) => r.status === 'rejected').reason).toMatchObject({
      code: 'DUPLICATE_APPLICATION',
    });
    const state = await snapshot(f);
    expect(state.applications).toHaveLength(1);
    expect(state.applications[0].documents).toHaveLength(1);
    expect(state.uploads[0].consumedApplicationId).toBe(
      state.applications[0].id,
    );
    const losingEmail =
      results[0].status === 'rejected'
        ? input.candidate.email
        : alternative.candidate.email;
    expect(
      await prisma.candidate.count({
        where: { organizationId: f.org.id, normalizedEmail: losingEmail },
      }),
    ).toBe(0);
  });

  it('rejects reuse of an accepted upload with another key or candidate', async () => {
    const f = await fixture(),
      input = await reserve(f);
    await service().submit(input);
    const before = await snapshot(f);
    for (const candidate of [
      input.candidate,
      { ...input.candidate, email: `${id()}@example.test` },
    ]) {
      await expect(
        service().submit({ ...input, idempotencyKey: id(), candidate }),
      ).rejects.toMatchObject({ code: 'APPLICATION_UPLOAD_ALREADY_CONSUMED' });
    }
    expect(await snapshot(f)).toEqual(before);
  });

  it('retains database guards for mismatched candidate, tenant and consumed application/job', async () => {
    const f = await fixture(),
      input = await reserve(f);
    await service().submit(input);
    const state = await snapshot(f),
      doc = state.applications[0].documents[0];
    const other = await fixture(organizations[1]),
      otherInput = await reserve(other);
    await service().submit(otherInput);
    const foreign = (await snapshot(other)).applications[0];
    const wrongCandidate = await prisma.candidate.create({
      data: {
        id: id(),
        organizationId: f.org.id,
        normalizedEmail: `${id()}@example.test`,
        email: 'wrong@example.test',
        firstName: 'Wrong',
        lastName: 'Candidate',
      },
    });
    for (const data of [
      { candidateId: wrongCandidate.id },
      { organizationId: other.org.id },
      { applicationId: foreign.id },
    ]) {
      await expect(
        prisma.candidateDocument.update({ where: { id: doc.id }, data }),
      ).rejects.toMatchObject({ code: 'P2039' });
    }
    await expect(
      prisma.applicationUpload.update({
        where: { id: input.resumeUploadId },
        data: { consumedApplicationId: foreign.id },
      }),
    ).rejects.toMatchObject({ code: 'P2039' });
    const sameTenant = await fixture(),
      sameTenantInput = await reserve(sameTenant);
    await service().submit(sameTenantInput);
    const wrongJobApplication = (await snapshot(sameTenant)).applications[0];
    await expect(
      prisma.applicationUpload.update({
        where: { id: input.resumeUploadId },
        data: { consumedApplicationId: wrongJobApplication.id },
      }),
    ).rejects.toMatchObject({ code: 'P2039' });
    expect(await snapshot(f)).toEqual(state);
  });

  it('persists through public HTTP upload and completion routes using fake storage', async () => {
    const f = await fixture();
    const app = express();
    app.use(express.json());
    const next = (_req, _res, done) => done();
    app.use(
      '/api/v1/public',
      createPublicCareerRouter({
        publicCareerUseCases: {},
        publicCareerReadRateLimiter: next,
        publicApplicationUseCases: service(),
        publicApplicationRateLimiters: {
          applicationFormRateLimiter: next,
          applicationUploadRateLimiter: next,
          applicationSubmissionRateLimiter: next,
        },
      }),
    );
    app.use(errorHandler);
    const base = `/api/v1/public/careers/${f.org.slug}/jobs/${f.job.id}`;
    const authorized = await request(app)
      .post(`${base}/application-uploads`)
      .send({
        filename: 'resume.pdf',
        mimeType: 'application/pdf',
        sizeBytes: bytes.length,
      });
    expect(authorized.status).toBe(201);
    expect(authorized.body.data.requiredHeaders['If-None-Match']).toBe('*');
    const upload = await prisma.applicationUpload.findUnique({
      where: { id: authorized.body.data.uploadId },
    });
    objects.set(upload.objectKey, { bytes, mimeType: 'application/pdf' });
    const {
      organizationSlug: _slug,
      jobId: _job,
      idempotencyKey,
      ...body
    } = f.input;
    body.resumeUploadId = upload.id;
    for (let n = 0; n < 2; n++) {
      const completed = await request(app)
        .post(`${base}/applications`)
        .set('Idempotency-Key', idempotencyKey)
        .send(body);
      expect(completed.status).toBe(201);
      expect(completed.body.data).toMatchObject({
        submitted: true,
        job: { id: f.job.id },
      });
      expect(JSON.stringify(completed.body)).not.toContain(upload.objectKey);
    }
    expect((await snapshot(f)).applications).toHaveLength(1);
  });
});
