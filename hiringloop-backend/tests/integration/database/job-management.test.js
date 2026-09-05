import { afterAll, beforeAll, describe, expect, it } from 'vitest';

process.env.NODE_ENV = 'test';

const { disconnectDatabase, getPrismaClient } =
  await import('../../../src/database/client.js');
const { createJobRepository } =
  await import('../../../src/modules/jobs/repositories/job-repository.js');
const { createJobUseCases } =
  await import('../../../src/modules/jobs/use-cases/job-use-cases.js');
const { generateEntityId } = await import('../../../src/utils/ids.js');

describe('Job management repository', () => {
  let prisma;
  let repository;
  let jobs;
  const organizationId = generateEntityId();
  const otherOrganizationId = generateEntityId();
  const ids = [];

  beforeAll(async () => {
    prisma = getPrismaClient();
    repository = createJobRepository(prisma);
    jobs = createJobUseCases({ jobRepository: repository });
    await prisma.organization.createMany({
      data: [
        { id: organizationId, name: 'Jobs Organization' },
        { id: otherOrganizationId, name: 'Other Jobs Organization' },
      ],
    });
  });

  afterAll(async () => {
    await prisma.job.deleteMany({
      where: { organizationId: { in: [organizationId, otherOrganizationId] } },
    });
    await prisma.organization.deleteMany({
      where: { id: { in: [organizationId, otherOrganizationId] } },
    });
    await disconnectDatabase();
  });

  async function seed(overrides = {}, tenant = organizationId) {
    const id = generateEntityId();
    ids.push(id);
    return prisma.job.create({
      data: {
        id,
        organizationId: tenant,
        title: 'Platform Engineer',
        ...overrides,
      },
    });
  }

  it('creates tenant-owned Draft defaults and reads only within that tenant', async () => {
    const created = await jobs.create({
      organizationId,
      data: { title: ' Draft role ', department: null },
    });
    expect(created).toMatchObject({
      title: ' Draft role ',
      status: 'DRAFT',
      openings: 1,
      version: 1,
    });
    expect(
      await repository.findByIdForOrganization({
        organizationId: otherOrganizationId,
        jobId: created.id,
      }),
    ).toBeNull();
    await expect(
      jobs.detail({ organizationId: otherOrganizationId, jobId: created.id }),
    ).rejects.toMatchObject({ code: 'JOB_NOT_FOUND' });
  });

  it('scopes list/count, searches only approved columns, filters, sorts, and omits description', async () => {
    await seed({
      title: 'Alpha',
      department: 'SearchDept',
      description: 'SecretNeedle',
      employmentType: 'FULL_TIME',
      workplaceType: 'REMOTE',
    });
    await seed({
      title: 'Beta',
      location: 'SearchCity',
      status: 'OPEN',
      openedAt: new Date(),
      employmentType: 'CONTRACT',
      workplaceType: 'HYBRID',
    });
    await seed({ title: 'Foreign Alpha' }, otherOrganizationId);
    const base = {
      organizationId,
      page: 1,
      limit: 100,
      sortBy: 'title',
      sortOrder: 'asc',
    };
    expect(
      (await repository.list({ ...base, search: 'Search' })).jobs,
    ).toHaveLength(2);
    expect(
      (await repository.list({ ...base, search: 'SecretNeedle' })).jobs,
    ).toHaveLength(0);
    const filtered = await repository.list({
      ...base,
      status: 'OPEN',
      employmentType: 'CONTRACT',
      workplaceType: 'HYBRID',
    });
    expect(filtered.jobs).toHaveLength(1);
    expect(filtered.jobs[0].title).toBe('Beta');
    expect(filtered.jobs[0]).not.toHaveProperty('description');
    expect(filtered.totalItems).toBe(1);
  });

  it('makes version checking atomic so competing writes cannot clobber', async () => {
    const job = await seed();
    const attempts = await Promise.allSettled([
      jobs.update({
        organizationId,
        jobId: job.id,
        expectedVersion: 1,
        data: { title: 'First' },
      }),
      jobs.update({
        organizationId,
        jobId: job.id,
        expectedVersion: 1,
        data: { title: 'Second' },
      }),
    ]);
    expect(
      attempts.filter(({ status }) => status === 'fulfilled'),
    ).toHaveLength(1);
    const failure = attempts.find(({ status }) => status === 'rejected');
    expect(failure.reason.code).toBe('JOB_VERSION_CONFLICT');
    const stored = await prisma.job.findUnique({ where: { id: job.id } });
    expect(stored.version).toBe(2);
    expect(['First', 'Second']).toContain(stored.title);
  });

  it('atomically scopes mutations by tenant, id, version, and lifecycle status', async () => {
    const job = await seed({
      description: 'Ready',
      employmentType: 'FULL_TIME',
      workplaceType: 'REMOTE',
    });
    await expect(
      jobs.open({
        organizationId: otherOrganizationId,
        jobId: job.id,
        expectedVersion: 1,
      }),
    ).rejects.toMatchObject({ code: 'JOB_NOT_FOUND' });
    const opened = await jobs.open({
      organizationId,
      jobId: job.id,
      expectedVersion: 1,
    });
    expect(opened).toMatchObject({
      status: 'OPEN',
      version: 2,
      closedAt: null,
    });
    await expect(
      jobs.close({ organizationId, jobId: job.id, expectedVersion: 1 }),
    ).rejects.toMatchObject({ code: 'JOB_VERSION_CONFLICT' });
  });
});
