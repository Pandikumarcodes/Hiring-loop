import { afterAll, beforeAll, describe, expect, it } from 'vitest';
process.env.NODE_ENV = 'test';
const { disconnectDatabase, getPrismaClient } =
  await import('../../../src/database/client.js');
const { createPipelineRepository } =
  await import('../../../src/modules/pipelines/repositories/pipeline-repository.js');
const { createPipelineUseCases } =
  await import('../../../src/modules/pipelines/use-cases/pipeline-use-cases.js');
const { createDefaultPipelineData } =
  await import('../../../src/modules/pipelines/domain/pipeline-defaults.js');
const { generateEntityId } = await import('../../../src/utils/ids.js');

describe('Pipeline configuration repository', () => {
  const organizationId = generateEntityId();
  const otherOrganizationId = generateEntityId();
  let prisma;
  let pipelines;
  beforeAll(async () => {
    prisma = getPrismaClient();
    pipelines = createPipelineUseCases({
      pipelineRepository: createPipelineRepository(prisma),
    });
    await prisma.organization.createMany({
      data: [
        {
          id: organizationId,
          name: 'A',
          slug: `pipeline-a-${organizationId.slice(0, 8)}`,
        },
        {
          id: otherOrganizationId,
          name: 'B',
          slug: `pipeline-b-${otherOrganizationId.slice(0, 8)}`,
        },
      ],
    });
  });
  afterAll(async () => {
    await prisma.pipelineStage.deleteMany({
      where: {
        pipeline: {
          job: {
            organizationId: { in: [organizationId, otherOrganizationId] },
          },
        },
      },
    });
    await prisma.pipeline.deleteMany({
      where: {
        job: { organizationId: { in: [organizationId, otherOrganizationId] } },
      },
    });
    await prisma.job.deleteMany({
      where: { organizationId: { in: [organizationId, otherOrganizationId] } },
    });
    await prisma.organization.deleteMany({
      where: { id: { in: [organizationId, otherOrganizationId] } },
    });
    await disconnectDatabase();
  });
  async function seed(tenant = organizationId) {
    const jobId = generateEntityId();
    const data = createDefaultPipelineData();
    await prisma.$transaction(async (transaction) => {
      await transaction.job.create({
        data: { id: jobId, organizationId: tenant, title: 'Engineer' },
      });
      await transaction.pipeline.create({
        data: {
          id: data.id,
          jobId,
          stages: {
            createMany: {
              data: data.stages.map(
                ({ pipelineId: _pipelineId, ...stage }) => stage,
              ),
            },
          },
        },
      });
    });
    return { jobId, ...data };
  }
  it('enforces tenant scope, reorder collision safety, and atomic concurrency', async () => {
    const { jobId } = await seed();
    const initial = await pipelines.get({ organizationId, jobId });
    await expect(
      pipelines.get({ organizationId: otherOrganizationId, jobId }),
    ).rejects.toMatchObject({ code: 'PIPELINE_NOT_FOUND' });
    const reordered = await pipelines.reorderStages({
      organizationId,
      jobId,
      expectedVersion: 1,
      stageIds: [
        initial.stages[0].id,
        initial.stages[2].id,
        initial.stages[1].id,
        initial.stages[3].id,
      ],
    });
    expect(reordered.stages.map((stage) => stage.position)).toEqual([
      1, 2, 3, 4,
    ]);
    expect(reordered.version).toBe(2);
    const attempts = await Promise.allSettled([
      pipelines.createStage({
        organizationId,
        jobId,
        expectedVersion: 2,
        name: 'Technical',
      }),
      pipelines.createStage({
        organizationId,
        jobId,
        expectedVersion: 2,
        name: 'Culture',
      }),
    ]);
    expect(attempts.filter((item) => item.status === 'fulfilled')).toHaveLength(
      1,
    );
    expect(
      attempts.find((item) => item.status === 'rejected').reason.code,
    ).toBe('PIPELINE_VERSION_CONFLICT');
    const final = await pipelines.get({ organizationId, jobId });
    expect(final.version).toBe(3);
    expect(final.stages.map((stage) => stage.position)).toEqual([
      1, 2, 3, 4, 5,
    ]);
  });

  it('enforces stage aggregate rules and lifecycle restrictions', async () => {
    const { jobId } = await seed();
    const initial = await pipelines.get({ organizationId, jobId });
    const renamed = await pipelines.renameStage({
      organizationId,
      jobId,
      stageId: initial.stages[0].id,
      name: ' Submitted ',
      expectedVersion: 1,
    });
    expect(renamed.stages[0]).toMatchObject({
      name: 'Submitted',
      kind: 'ENTRY',
      position: 1,
    });
    await expect(
      pipelines.createStage({
        organizationId,
        jobId,
        name: ' submitted ',
        expectedVersion: 2,
      }),
    ).rejects.toMatchObject({ code: 'PIPELINE_DUPLICATE_STAGE_NAME' });
    await expect(
      pipelines.deleteStage({
        organizationId,
        jobId,
        stageId: initial.stages[0].id,
        expectedVersion: 2,
      }),
    ).rejects.toMatchObject({ code: 'PIPELINE_ENTRY_DELETE_FORBIDDEN' });
    const deleted = await pipelines.deleteStage({
      organizationId,
      jobId,
      stageId: initial.stages[2].id,
      expectedVersion: 2,
    });
    expect(deleted.stages.map((stage) => stage.position)).toEqual([1, 2, 3]);
    await expect(
      pipelines.reorderStages({
        organizationId,
        jobId,
        expectedVersion: 3,
        stageIds: [
          initial.stages[1].id,
          initial.stages[0].id,
          initial.stages[3].id,
        ],
      }),
    ).rejects.toMatchObject({ code: 'PIPELINE_ENTRY_MOVE_FORBIDDEN' });
    await prisma.job.update({
      where: { id: jobId },
      data: { status: 'CLOSED', openedAt: new Date(), closedAt: new Date() },
    });
    await expect(
      pipelines.createStage({
        organizationId,
        jobId,
        name: 'Blocked',
        expectedVersion: 3,
      }),
    ).rejects.toMatchObject({ code: 'PIPELINE_JOB_LOCKED' });
  });
});
