import { Prisma } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

process.env.NODE_ENV = 'test';

const { disconnectDatabase, getPrismaClient } =
  await import('../../../src/database/client.js');
const { createJobRepository } =
  await import('../../../src/modules/jobs/repositories/job-repository.js');
const { createJobUseCases } =
  await import('../../../src/modules/jobs/use-cases/job-use-cases.js');
const { generateEntityId } = await import('../../../src/utils/ids.js');

async function expectDatabaseRejection(operation) {
  await expect(operation()).rejects.toBeInstanceOf(
    Prisma.PrismaClientKnownRequestError,
  );
}

describe('Candidate application database foundation', () => {
  const organizationId = generateEntityId();
  const otherOrganizationId = generateEntityId();
  const jobIds = [];
  let prisma;
  let jobs;

  beforeAll(async () => {
    prisma = getPrismaClient();
    await prisma.$connect();
    jobs = createJobUseCases({ jobRepository: createJobRepository(prisma) });
    await prisma.organization.createMany({
      data: [
        {
          id: organizationId,
          name: 'Application integrity',
          slug: `application-integrity-${organizationId.slice(-12)}`,
        },
        {
          id: otherOrganizationId,
          name: 'Other application integrity',
          slug: `other-application-integrity-${otherOrganizationId.slice(-12)}`,
        },
      ],
    });
  });

  afterAll(async () => {
    await prisma.applicationStageHistory.deleteMany({
      where: { organizationId: { in: [organizationId, otherOrganizationId] } },
    });
    await prisma.candidateDocument.deleteMany({
      where: { organizationId: { in: [organizationId, otherOrganizationId] } },
    });
    await prisma.applicationAnswer.deleteMany({
      where: { organizationId: { in: [organizationId, otherOrganizationId] } },
    });
    await prisma.applicationUpload.deleteMany({
      where: { organizationId: { in: [organizationId, otherOrganizationId] } },
    });
    await prisma.application.deleteMany({
      where: { organizationId: { in: [organizationId, otherOrganizationId] } },
    });
    await prisma.candidate.deleteMany({
      where: { organizationId: { in: [organizationId, otherOrganizationId] } },
    });
    await prisma.$transaction(async (transaction) => {
      await transaction.$executeRawUnsafe('SET CONSTRAINTS ALL DEFERRED');
      await transaction.applicationFormQuestionOption.deleteMany({
        where: {
          organizationId: { in: [organizationId, otherOrganizationId] },
        },
      });
      await transaction.applicationFormQuestion.deleteMany({
        where: {
          organizationId: { in: [organizationId, otherOrganizationId] },
        },
      });
      await transaction.$executeRawUnsafe(
        `DELETE FROM "ApplicationFormVersion" WHERE "organizationId" IN ('${organizationId}', '${otherOrganizationId}')`,
      );
      await transaction.$executeRawUnsafe(
        `DELETE FROM "ApplicationForm" WHERE "organizationId" IN ('${organizationId}', '${otherOrganizationId}')`,
      );
    });
    await prisma.pipelineStage.deleteMany({
      where: { pipeline: { jobId: { in: jobIds } } },
    });
    await prisma.pipeline.deleteMany({ where: { jobId: { in: jobIds } } });
    await prisma.job.deleteMany({ where: { id: { in: jobIds } } });
    await prisma.organization.deleteMany({
      where: { id: { in: [organizationId, otherOrganizationId] } },
    });
    await disconnectDatabase();
  });

  async function createOpenJob(organization = organizationId) {
    const job = await jobs.create({
      organizationId: organization,
      data: { title: 'Candidate integrity role' },
    });
    jobIds.push(job.id);
    await prisma.job.update({
      where: { id: job.id },
      data: { status: 'OPEN', openedAt: new Date() },
    });
    const [form, stage] = await Promise.all([
      prisma.applicationForm.findUnique({ where: { jobId: job.id } }),
      prisma.pipelineStage.findFirst({
        where: { pipeline: { jobId: job.id }, kind: 'ENTRY', position: 1 },
      }),
    ]);
    return { job, form, stage };
  }

  async function application({
    tenant = organizationId,
    job,
    form,
    stage,
    candidate,
  }) {
    return prisma.application.create({
      data: {
        id: generateEntityId(),
        organizationId: tenant,
        jobId: job.id,
        candidateId: candidate.id,
        applicationFormVersionId: form.activeVersionId,
        currentPipelineStageId: stage.id,
        submittedFirstName: 'Ada',
        submittedLastName: 'Lovelace',
        submittedEmail: candidate.email,
        idempotencyKey: generateEntityId(),
        requestFingerprint: 'a'.repeat(64),
      },
    });
  }

  it('enforces organization-scoped candidate identity and one application per candidate/job', async () => {
    const first = await createOpenJob();
    const second = await createOpenJob();
    const candidate = await prisma.candidate.create({
      data: {
        id: generateEntityId(),
        organizationId,
        normalizedEmail: 'ada@example.test',
        email: 'ada@example.test',
        firstName: 'Ada',
        lastName: 'Lovelace',
      },
    });
    await expectDatabaseRejection(() =>
      prisma.candidate.create({
        data: {
          id: generateEntityId(),
          organizationId,
          normalizedEmail: 'ada@example.test',
          email: 'ada@example.test',
          firstName: 'Ada',
          lastName: 'Lovelace',
        },
      }),
    );
    await prisma.candidate.create({
      data: {
        id: generateEntityId(),
        organizationId: otherOrganizationId,
        normalizedEmail: 'ada@example.test',
        email: 'ada@example.test',
        firstName: 'Ada',
        lastName: 'Lovelace',
      },
    });
    await application({ ...first, candidate });
    await expectDatabaseRejection(() => application({ ...first, candidate }));
    await expect(application({ ...second, candidate })).resolves.toBeTruthy();
  });

  it('enforces one answer per application/question and submitted-version ownership', async () => {
    const seeded = await createOpenJob();
    const candidate = await prisma.candidate.create({
      data: {
        id: generateEntityId(),
        organizationId,
        normalizedEmail: `answer-${generateEntityId()}@example.test`,
        email: 'answer@example.test',
        firstName: 'Answer',
        lastName: 'Tester',
      },
    });
    const question = await prisma.applicationFormQuestion.create({
      data: {
        id: generateEntityId(),
        organizationId,
        applicationFormVersionId: seeded.form.activeVersionId,
        questionKey: generateEntityId(),
        type: 'SHORT_TEXT',
        label: 'Why?',
        sortOrder: 1000,
      },
    });
    const created = await application({ ...seeded, candidate });
    await prisma.applicationAnswer.create({
      data: {
        id: generateEntityId(),
        organizationId,
        applicationId: created.id,
        questionId: question.id,
        value: 'Because',
      },
    });
    await expectDatabaseRejection(() =>
      prisma.applicationAnswer.create({
        data: {
          id: generateEntityId(),
          organizationId,
          applicationId: created.id,
          questionId: question.id,
          value: 'Duplicate',
        },
      }),
    );
  });
});
