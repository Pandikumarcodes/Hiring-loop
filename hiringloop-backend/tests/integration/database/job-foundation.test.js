import { Prisma } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

process.env.NODE_ENV = 'test';

const { disconnectDatabase, getPrismaClient } =
  await import('../../../src/database/client.js');
const { generateEntityId } = await import('../../../src/utils/ids.js');

const openedAt = new Date('2026-09-01T00:00:00.000Z');
const closedAt = new Date('2026-09-02T00:00:00.000Z');
const archivedAt = new Date('2026-09-03T00:00:00.000Z');

async function expectDatabaseRejection(operation) {
  await expect(operation()).rejects.toBeInstanceOf(
    Prisma.PrismaClientKnownRequestError,
  );
}

describe('Job database foundation', () => {
  let prisma;
  let organizationId;
  let otherOrganizationId;

  beforeAll(async () => {
    prisma = getPrismaClient();
    await prisma.$connect();
    organizationId = generateEntityId();
    otherOrganizationId = generateEntityId();
    await prisma.organization.createMany({
      data: [
        { id: organizationId, name: 'Job Test Organization' },
        { id: otherOrganizationId, name: 'Other Job Test Organization' },
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

  function jobData(overrides = {}) {
    return {
      id: generateEntityId(),
      organizationId,
      title: 'Backend Engineer',
      ...overrides,
    };
  }

  it('creates a Job for an Organization with approved defaults', async () => {
    const job = await prisma.job.create({ data: jobData() });

    expect(job).toMatchObject({
      organizationId,
      status: 'DRAFT',
      openings: 1,
      version: 1,
      openedAt: null,
      closedAt: null,
      archivedAt: null,
    });
  });

  it('belongs to the correct organization and allows duplicate titles', async () => {
    const first = await prisma.job.create({
      data: jobData({ title: 'Same title' }),
    });
    const second = await prisma.job.create({
      data: jobData({ title: 'Same title' }),
    });

    expect(first.organizationId).toBe(organizationId);
    expect(second.organizationId).toBe(organizationId);
    expect(await prisma.job.count({ where: { title: 'Same title' } })).toBe(2);
  });

  it('enforces the Organization foreign key', async () => {
    await expectDatabaseRejection(() =>
      prisma.job.create({
        data: jobData({ organizationId: generateEntityId() }),
      }),
    );
  });

  it('restricts deletion of an Organization that owns Jobs', async () => {
    const job = await prisma.job.create({ data: jobData() });

    await expectDatabaseRejection(() =>
      prisma.organization.delete({ where: { id: organizationId } }),
    );

    await prisma.job.delete({ where: { id: job.id } });
  });

  it.each([0, -1, 1001])('rejects openings=%s', async (openings) => {
    await expectDatabaseRejection(() =>
      prisma.job.create({ data: jobData({ openings }) }),
    );
  });

  it.each([0, -1])('rejects version=%s', async (version) => {
    await expectDatabaseRejection(() =>
      prisma.job.create({ data: jobData({ version }) }),
    );
  });

  it.each([
    ['DRAFT', { openedAt }],
    ['DRAFT', { archivedAt }],
    ['OPEN', {}],
    ['OPEN', { closedAt }],
    ['OPEN', { archivedAt, openedAt }],
    ['CLOSED', { closedAt }],
    ['CLOSED', { openedAt }],
    ['CLOSED', { openedAt, closedAt, archivedAt }],
    ['ARCHIVED', {}],
  ])(
    'rejects invalid lifecycle state %s with %j',
    async (status, timestamps) => {
      await expectDatabaseRejection(() =>
        prisma.job.create({ data: jobData({ status, ...timestamps }) }),
      );
    },
  );

  it('allows all approved lifecycle timestamp states', async () => {
    const states = [
      { status: 'DRAFT' },
      { status: 'OPEN', openedAt },
      { status: 'CLOSED', openedAt, closedAt },
      { status: 'ARCHIVED', archivedAt },
      { status: 'ARCHIVED', openedAt, closedAt, archivedAt },
    ];

    for (const state of states) {
      const job = await prisma.job.create({ data: jobData(state) });
      expect(job.status).toBe(state.status);
    }
  });

  it('exposes the two approved composite business indexes', async () => {
    const indexes = await prisma.$queryRaw`
      SELECT indexname
      FROM pg_indexes
      WHERE schemaname = 'public' AND tablename = 'Job'
    `;
    const names = indexes.map(({ indexname }) => indexname);

    expect(names).toContain('Job_organizationId_updatedAt_idx');
    expect(names).toContain('Job_organizationId_status_updatedAt_idx');
  });
});
