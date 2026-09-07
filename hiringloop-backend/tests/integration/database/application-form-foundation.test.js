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

describe('Application form database foundation', () => {
  let prisma;
  let jobs;
  const organizationId = generateEntityId();
  const otherOrganizationId = generateEntityId();
  const jobIds = [];

  beforeAll(async () => {
    prisma = getPrismaClient();
    await prisma.$connect();
    jobs = createJobUseCases({ jobRepository: createJobRepository(prisma) });
    await prisma.organization.createMany({
      data: [
        {
          id: organizationId,
          name: 'Application Forms',
          slug: `forms-${organizationId.slice(-12)}`,
        },
        {
          id: otherOrganizationId,
          name: 'Other Application Forms',
          slug: `other-forms-${otherOrganizationId.slice(-12)}`,
        },
      ],
    });
  });

  afterAll(async () => {
    await prisma.$transaction(async (transaction) => {
      await transaction.$executeRawUnsafe('SET CONSTRAINTS ALL DEFERRED');
      const organizationIds = [organizationId, otherOrganizationId];
      await transaction.applicationFormQuestionOption.deleteMany({
        where: { organizationId: { in: organizationIds } },
      });
      await transaction.applicationFormQuestion.deleteMany({
        where: { organizationId: { in: organizationIds } },
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

  async function createJob(organization = organizationId) {
    const job = await prisma.job.create({
      data: {
        id: generateEntityId(),
        organizationId: organization,
        title: 'Form role',
      },
    });
    jobIds.push(job.id);
    return job;
  }

  async function createForm(job, overrides = {}) {
    const versionId = generateEntityId();
    return prisma.$transaction(async (transaction) => {
      const form = await transaction.applicationForm.create({
        data: {
          id: generateEntityId(),
          organizationId: job.organizationId,
          jobId: job.id,
          activeVersionId: versionId,
          ...overrides,
        },
      });
      const version = await transaction.applicationFormVersion.create({
        data: {
          id: versionId,
          organizationId: job.organizationId,
          applicationFormId: form.id,
          versionNumber: 1,
          status: 'PUBLISHED',
          publishedAt: new Date(),
        },
      });
      return { form, version };
    });
  }

  it('enforces one form per Job and supports distinct forms with version 1', async () => {
    const firstJob = await createJob();
    const secondJob = await createJob();
    const first = await createForm(firstJob);
    const second = await createForm(secondJob);
    expect(first.form.activeVersionId).toBe(first.version.id);
    expect(second.version.versionNumber).toBe(1);
    await expectDatabaseRejection(() => createForm(firstJob));
  });

  it('enforces version checks, uniqueness, one Draft, and permits published history', async () => {
    const form = await createForm(await createJob());
    await prisma.applicationFormVersion.create({
      data: {
        id: generateEntityId(),
        organizationId,
        applicationFormId: form.form.id,
        versionNumber: 2,
        status: 'PUBLISHED',
        publishedAt: new Date(),
      },
    });
    await prisma.applicationFormVersion.create({
      data: {
        id: generateEntityId(),
        organizationId,
        applicationFormId: form.form.id,
        versionNumber: 3,
        status: 'DRAFT',
      },
    });
    await expectDatabaseRejection(() =>
      prisma.applicationFormVersion.create({
        data: {
          id: generateEntityId(),
          organizationId,
          applicationFormId: form.form.id,
          versionNumber: 2,
          status: 'PUBLISHED',
          publishedAt: new Date(),
        },
      }),
    );
    await expectDatabaseRejection(() =>
      prisma.applicationFormVersion.create({
        data: {
          id: generateEntityId(),
          organizationId,
          applicationFormId: form.form.id,
          versionNumber: 0,
          status: 'PUBLISHED',
          publishedAt: new Date(),
        },
      }),
    );
    await expectDatabaseRejection(() =>
      prisma.applicationFormVersion.create({
        data: {
          id: generateEntityId(),
          organizationId,
          applicationFormId: form.form.id,
          versionNumber: 4,
          revision: 0,
          status: 'PUBLISHED',
          publishedAt: new Date(),
        },
      }),
    );
    await expectDatabaseRejection(() =>
      prisma.applicationFormVersion.create({
        data: {
          id: generateEntityId(),
          organizationId,
          applicationFormId: form.form.id,
          versionNumber: 5,
          status: 'DRAFT',
        },
      }),
    );
  });

  it('enforces question and option ownership, logical keys, values, and ordering', async () => {
    const form = await createForm(await createJob());
    const question = await prisma.applicationFormQuestion.create({
      data: {
        id: generateEntityId(),
        organizationId,
        applicationFormVersionId: form.version.id,
        questionKey: generateEntityId(),
        type: 'SINGLE_SELECT',
        label: 'Location?',
        sortOrder: 1000,
      },
    });
    await prisma.applicationFormQuestionOption.create({
      data: {
        id: generateEntityId(),
        organizationId,
        questionId: question.id,
        label: 'Remote',
        value: 'remote',
        sortOrder: 1000,
      },
    });
    await expectDatabaseRejection(() =>
      prisma.applicationFormQuestion.create({
        data: {
          id: generateEntityId(),
          organizationId,
          applicationFormVersionId: form.version.id,
          questionKey: question.questionKey,
          type: 'SHORT_TEXT',
          label: 'Duplicate',
          sortOrder: 2000,
        },
      }),
    );
    await expectDatabaseRejection(() =>
      prisma.applicationFormQuestion.create({
        data: {
          id: generateEntityId(),
          organizationId,
          applicationFormVersionId: form.version.id,
          questionKey: generateEntityId(),
          type: 'SHORT_TEXT',
          label: 'Bad order',
          sortOrder: 0,
        },
      }),
    );
    await expectDatabaseRejection(() =>
      prisma.applicationFormQuestionOption.create({
        data: {
          id: generateEntityId(),
          organizationId,
          questionId: question.id,
          label: 'Duplicate',
          value: 'remote',
          sortOrder: 2000,
        },
      }),
    );
    await expectDatabaseRejection(() =>
      prisma.applicationFormQuestionOption.create({
        data: {
          id: generateEntityId(),
          organizationId,
          questionId: generateEntityId(),
          label: 'Invalid',
          value: 'invalid',
          sortOrder: 1000,
        },
      }),
    );
  });

  it('creates exactly one published empty V1 and active link through the Job creation path', async () => {
    const job = await jobs.create({
      organizationId,
      data: { title: 'Default form job' },
    });
    jobIds.push(job.id);
    const form = await prisma.applicationForm.findUnique({
      where: { jobId: job.id },
      include: { versions: true },
    });
    expect(form.versions).toHaveLength(1);
    expect(form.versions[0]).toMatchObject({
      versionNumber: 1,
      status: 'PUBLISHED',
      revision: 1,
    });
    expect(form.activeVersionId).toBe(form.versions[0].id);
    expect(
      await prisma.applicationFormQuestion.count({
        where: { applicationFormVersionId: form.versions[0].id },
      }),
    ).toBe(0);
  });

  it('has the required partial and ordered-query indexes and restrictive parent behavior', async () => {
    const indexes = await prisma.$queryRaw`
      SELECT indexname FROM pg_indexes
      WHERE schemaname = 'public' AND tablename IN ('ApplicationFormVersion', 'ApplicationFormQuestion', 'ApplicationFormQuestionOption')
    `;
    const names = indexes.map(({ indexname }) => indexname);
    expect(names).toEqual(
      expect.arrayContaining([
        'ApplicationFormVersion_one_draft_per_form_key',
        'ApplicationFormQuestion_applicationFormVersionId_sortOrder_idx',
        'ApplicationFormQuestionOption_questionId_sortOrder_idx',
      ]),
    );
    const form = await createForm(await createJob(otherOrganizationId));
    await expectDatabaseRejection(() =>
      prisma.organization.delete({ where: { id: otherOrganizationId } }),
    );
    expect(form.form.organizationId).toBe(otherOrganizationId);
  });
});
