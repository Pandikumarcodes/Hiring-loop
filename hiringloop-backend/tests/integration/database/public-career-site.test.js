import 'dotenv/config';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

process.env.NODE_ENV = 'test';

const { disconnectDatabase, getPrismaClient } =
  await import('../../../src/database/client.js');
const { createJobRepository } =
  await import('../../../src/modules/jobs/repositories/job-repository.js');
const { createJobUseCases } =
  await import('../../../src/modules/jobs/use-cases/job-use-cases.js');
const { generateEntityId } = await import('../../../src/utils/ids.js');
const { default: app } = await import('../../../src/app.js');

describe('Public career site database integration', () => {
  let prisma;
  let jobs;
  const organizationId = generateEntityId();
  const otherOrganizationId = generateEntityId();
  const slug = `public-${organizationId.slice(-12)}`;
  const otherSlug = `public-other-${otherOrganizationId.slice(-12)}`;

  beforeAll(async () => {
    prisma = getPrismaClient();
    jobs = createJobUseCases({ jobRepository: createJobRepository(prisma) });
    await prisma.organization.createMany({
      data: [
        {
          id: organizationId,
          name: 'Public Acme',
          slug,
          website: 'https://acme.example.test',
          description: 'Public company profile',
        },
        { id: otherOrganizationId, name: 'Other', slug: otherSlug },
      ],
    });
  });

  afterAll(async () => {
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

  async function seed(overrides = {}, organization = organizationId) {
    return prisma.job.create({
      data: {
        id: generateEntityId(),
        organizationId: organization,
        title: 'Public Engineer',
        employmentType: 'FULL_TIME',
        workplaceType: 'REMOTE',
        description: 'Public description',
        ...overrides,
      },
    });
  }

  it('lists only OPEN jobs, supports empty sites and paginates in deterministic openedAt/id order', async () => {
    const older = await seed({
      status: 'OPEN',
      openedAt: new Date('2026-01-01T00:00:00Z'),
    });
    const tieOpenedAt = new Date('2026-01-15T00:00:00Z');
    const tiedFirst = await seed({ status: 'OPEN', openedAt: tieOpenedAt });
    const tiedSecond = await seed({ status: 'OPEN', openedAt: tieOpenedAt });
    const newer = await seed({
      status: 'OPEN',
      openedAt: new Date('2026-02-01T00:00:00Z'),
    });
    await seed({ status: 'DRAFT' });
    await seed({
      status: 'CLOSED',
      openedAt: new Date(),
      closedAt: new Date(),
    });
    await seed({ status: 'ARCHIVED', archivedAt: new Date() });

    const response = await request(app).get(
      `/api/v1/public/careers/${slug}/jobs?page=1&pageSize=1`,
    );
    expect(response.status).toBe(200);
    expect(response.body.data.organization).toEqual({
      name: 'Public Acme',
      slug,
      website: 'https://acme.example.test',
      description: 'Public company profile',
    });
    expect(response.body.data.jobs).toHaveLength(1);
    expect(response.body.data.jobs[0].id).toBe(newer.id);
    expect(response.body.pagination).toEqual({
      page: 1,
      pageSize: 1,
      totalItems: 4,
      totalPages: 4,
    });
    expect(
      (
        await request(app).get(
          `/api/v1/public/careers/${slug}/jobs?page=4&pageSize=1`,
        )
      ).body.data.jobs[0].id,
    ).toBe(older.id);
    const ordered = await request(app).get(
      `/api/v1/public/careers/${slug}/jobs?pageSize=100`,
    );
    expect(
      ordered.body.data.jobs
        .filter((job) => [tiedFirst.id, tiedSecond.id].includes(job.id))
        .map((job) => job.id),
    ).toEqual([tiedFirst.id, tiedSecond.id].sort().reverse());
    for (const job of response.body.data.jobs) {
      for (const field of [
        'description',
        'organizationId',
        'version',
        'closedAt',
        'archivedAt',
        'createdAt',
        'updatedAt',
        'status',
        'pipeline',
      ]) {
        expect(job).not.toHaveProperty(field);
      }
    }

    const emptyOrganizationId = generateEntityId();
    const emptySlug = `public-empty-${emptyOrganizationId.slice(-12)}`;
    await prisma.organization.create({
      data: { id: emptyOrganizationId, name: 'Empty', slug: emptySlug },
    });
    const empty = await request(app).get(
      `/api/v1/public/careers/${emptySlug}/jobs`,
    );
    expect(empty.status).toBe(200);
    expect(empty.body.data.jobs).toEqual([]);
    expect(empty.body.pagination).toEqual({
      page: 1,
      pageSize: 20,
      totalItems: 0,
      totalPages: 0,
    });
    await prisma.organization.delete({ where: { id: emptyOrganizationId } });
  });

  it('returns only OPEN detail, protects cross-organization identities, and follows lifecycle changes', async () => {
    const open = await seed({ status: 'OPEN', openedAt: new Date() });
    const draft = await seed({ status: 'DRAFT' });
    const closed = await seed({
      status: 'CLOSED',
      openedAt: new Date(),
      closedAt: new Date(),
    });
    const archived = await seed({ status: 'ARCHIVED', archivedAt: new Date() });
    const openResponse = await request(app).get(
      `/api/v1/public/careers/${slug}/jobs/${open.id}`,
    );
    expect(openResponse.status).toBe(200);
    expect(openResponse.body.data.job).toMatchObject({
      id: open.id,
      description: 'Public description',
    });
    for (const field of [
      'organizationId',
      'version',
      'closedAt',
      'archivedAt',
      'createdAt',
      'updatedAt',
      'status',
      'pipeline',
    ]) {
      expect(openResponse.body.data.job).not.toHaveProperty(field);
    }
    for (const job of [draft, closed, archived]) {
      expect(
        (
          await request(app).get(
            `/api/v1/public/careers/${slug}/jobs/${job.id}`,
          )
        ).status,
      ).toBe(404);
    }
    expect(
      (
        await request(app).get(
          `/api/v1/public/careers/${otherSlug}/jobs/${open.id}`,
        )
      ).status,
    ).toBe(404);
    expect(
      (
        await request(app).get(
          `/api/v1/public/careers/${slug}/jobs/${generateEntityId()}`,
        )
      ).status,
    ).toBe(404);
    expect(
      (await request(app).get('/api/v1/public/careers/unknown-org/jobs'))
        .status,
    ).toBe(404);

    const lifecycle = await jobs.create({
      organizationId,
      data: {
        title: 'Lifecycle',
        description: 'Ready',
        employmentType: 'FULL_TIME',
        workplaceType: 'REMOTE',
      },
    });
    const opened = await jobs.open({
      organizationId,
      jobId: lifecycle.id,
      expectedVersion: lifecycle.version,
    });
    expect(
      (
        await request(app).get(
          `/api/v1/public/careers/${slug}/jobs/${lifecycle.id}`,
        )
      ).status,
    ).toBe(200);
    const closedLifecycle = await jobs.close({
      organizationId,
      jobId: lifecycle.id,
      expectedVersion: opened.version,
    });
    expect(
      (
        await request(app).get(
          `/api/v1/public/careers/${slug}/jobs/${lifecycle.id}`,
        )
      ).status,
    ).toBe(404);
    await jobs.reopen({
      organizationId,
      jobId: lifecycle.id,
      expectedVersion: closedLifecycle.version,
    });
    expect(
      (
        await request(app).get(
          `/api/v1/public/careers/${slug}/jobs/${lifecycle.id}`,
        )
      ).status,
    ).toBe(200);
  });
});
