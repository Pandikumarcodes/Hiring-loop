import { Prisma } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

process.env.NODE_ENV = 'test';

const { disconnectDatabase, getPrismaClient } =
  await import('../../../src/database/client.js');
const { createJobRepository } =
  await import('../../../src/modules/jobs/repositories/job-repository.js');
const { createJobUseCases } =
  await import('../../../src/modules/jobs/use-cases/job-use-cases.js');
const { createDefaultPipelineData, normalizePipelineStageName } =
  await import('../../../src/modules/pipelines/domain/pipeline-defaults.js');
const { generateEntityId } = await import('../../../src/utils/ids.js');

async function expectDatabaseRejection(operation) {
  await expect(operation()).rejects.toBeInstanceOf(
    Prisma.PrismaClientKnownRequestError,
  );
}

describe('Pipeline database foundation', () => {
  let prisma;
  let jobs;
  const organizationId = generateEntityId();
  const createdJobIds = [];

  beforeAll(async () => {
    prisma = getPrismaClient();
    await prisma.$connect();
    await prisma.organization.create({
      data: {
        id: organizationId,
        name: 'Pipeline Test Organization',
        slug: `pipeline-test-${organizationId.slice(0, 8)}`,
      },
    });
    jobs = createJobUseCases({ jobRepository: createJobRepository(prisma) });
  });

  afterAll(async () => {
    await prisma.$transaction(async (transaction) => {
      await transaction.$executeRawUnsafe('SET CONSTRAINTS ALL DEFERRED');
      await transaction.applicationFormQuestionOption.deleteMany({
        where: { organizationId },
      });
      await transaction.applicationFormQuestion.deleteMany({
        where: { organizationId },
      });
      await transaction.$executeRawUnsafe(
        `DELETE FROM "ApplicationFormVersion" WHERE "organizationId" = '${organizationId}'`,
      );
      await transaction.$executeRawUnsafe(
        `DELETE FROM "ApplicationForm" WHERE "organizationId" = '${organizationId}'`,
      );
    });
    await prisma.pipelineStage.deleteMany({
      where: { pipeline: { jobId: { in: createdJobIds } } },
    });
    await prisma.pipeline.deleteMany({
      where: { jobId: { in: createdJobIds } },
    });
    await prisma.job.deleteMany({ where: { id: { in: createdJobIds } } });
    await prisma.organization.delete({ where: { id: organizationId } });
    await disconnectDatabase();
  });

  async function createJob(title = 'Pipeline Engineer') {
    const job = await prisma.job.create({
      data: { id: generateEntityId(), organizationId, title },
    });
    createdJobIds.push(job.id);
    return job;
  }

  async function createPipeline(job) {
    const pipelineJob = job ?? (await createJob());
    const pipeline = await prisma.pipeline.create({
      data: { id: generateEntityId(), jobId: pipelineJob.id },
    });
    return pipeline;
  }

  function stageData(pipelineId, overrides = {}) {
    const name = overrides.name ?? 'Screening';
    return {
      id: generateEntityId(),
      pipelineId,
      name,
      normalizedName: normalizePipelineStageName(name),
      kind: 'STANDARD',
      position: 1,
      ...overrides,
    };
  }

  it('creates one Pipeline per Job with version 1 and a UUIDv7 identifier', async () => {
    const pipeline = await createPipeline();
    expect(pipeline.version).toBe(1);
    expect(pipeline.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    await expectDatabaseRejection(() =>
      prisma.pipeline.create({
        data: { id: generateEntityId(), jobId: pipeline.jobId },
      }),
    );
    await expectDatabaseRejection(() =>
      prisma.pipeline.create({
        data: { id: generateEntityId(), jobId: generateEntityId() },
      }),
    );
    const invalidVersionJob = await createJob();
    await expectDatabaseRejection(() =>
      prisma.pipeline.create({
        data: {
          id: generateEntityId(),
          jobId: invalidVersionJob.id,
          version: 0,
        },
      }),
    );
  });

  it('enforces stage foreign keys, positions, normalized names, and ENTRY uniqueness', async () => {
    const first = await createPipeline();
    const second = await createPipeline();
    await prisma.pipelineStage.create({
      data: stageData(first.id, {
        name: 'Applied',
        normalizedName: 'applied',
        kind: 'ENTRY',
      }),
    });
    await prisma.pipelineStage.create({
      data: stageData(second.id, {
        name: 'Applied',
        normalizedName: 'applied',
        kind: 'ENTRY',
      }),
    });
    await prisma.pipelineStage.create({
      data: stageData(first.id, { position: 2 }),
    });
    await expectDatabaseRejection(() =>
      prisma.pipelineStage.create({
        data: stageData(first.id, {
          position: 2,
          name: 'Interview',
          normalizedName: 'interview',
        }),
      }),
    );
    await expectDatabaseRejection(() =>
      prisma.pipelineStage.create({
        data: stageData(first.id, {
          position: 3,
          name: ' SCREENING ',
          normalizedName: 'screening',
        }),
      }),
    );
    await expectDatabaseRejection(() =>
      prisma.pipelineStage.create({
        data: stageData(first.id, {
          position: 3,
          name: 'Start',
          normalizedName: 'start',
          kind: 'ENTRY',
        }),
      }),
    );
    await expectDatabaseRejection(() =>
      prisma.pipelineStage.create({
        data: stageData(first.id, {
          position: 0,
          name: 'Offer',
          normalizedName: 'offer',
        }),
      }),
    );
    await expectDatabaseRejection(() =>
      prisma.pipelineStage.create({ data: stageData(generateEntityId()) }),
    );
  });

  it('creates the exact ordered default Pipeline atomically when a Job is created', async () => {
    const job = await jobs.create({
      organizationId,
      data: { title: 'Default Pipeline Job' },
    });
    createdJobIds.push(job.id);
    const pipeline = await prisma.pipeline.findUnique({
      where: { jobId: job.id },
      include: { stages: { orderBy: { position: 'asc' } } },
    });
    expect(
      pipeline.stages.map(({ name, normalizedName, kind, position }) => ({
        name,
        normalizedName,
        kind,
        position,
      })),
    ).toEqual([
      {
        name: 'Applied',
        normalizedName: 'applied',
        kind: 'ENTRY',
        position: 1,
      },
      {
        name: 'Screening',
        normalizedName: 'screening',
        kind: 'STANDARD',
        position: 2,
      },
      {
        name: 'Interview',
        normalizedName: 'interview',
        kind: 'STANDARD',
        position: 3,
      },
      { name: 'Offer', normalizedName: 'offer', kind: 'STANDARD', position: 4 },
    ]);

    const failingJobId = generateEntityId();
    const invalidPipeline = createDefaultPipelineData();
    invalidPipeline.stages[0].position = 0;
    await expectDatabaseRejection(() =>
      createJobRepository(prisma).create({
        organizationId,
        id: failingJobId,
        data: { title: 'Must Roll Back' },
        pipeline: invalidPipeline,
      }),
    );
    expect(
      await prisma.job.findUnique({ where: { id: failingJobId } }),
    ).toBeNull();
  });
});
