import { Prisma } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

process.env.NODE_ENV = 'test';

const { disconnectDatabase, getPrismaClient, getTestDatabaseUrl } =
  await import('../../../src/database/client.js');
const { generateEntityId } = await import('../../../src/utils/ids.js');

function newFixture() {
  return {
    userId: generateEntityId(),
    organizationAId: generateEntityId(),
    organizationBId: generateEntityId(),
    membershipAId: generateEntityId(),
    membershipBId: generateEntityId(),
  };
}

async function createFixture(prisma, fixture = newFixture()) {
  await prisma.user.create({ data: { id: fixture.userId } });
  await prisma.organization.create({
    data: { id: fixture.organizationAId, name: 'Integration Organization A' },
  });
  return fixture;
}

async function cleanupFixture(prisma, fixture) {
  await prisma.organizationMembership.deleteMany({
    where: { id: { in: [fixture.membershipAId, fixture.membershipBId] } },
  });
  await prisma.organization.deleteMany({
    where: {
      id: { in: [fixture.organizationAId, fixture.organizationBId] },
    },
  });
  await prisma.user.deleteMany({ where: { id: fixture.userId } });
}

async function expectKnownConstraintError(operation, code) {
  let error;

  try {
    await operation();
  } catch (caughtError) {
    error = caughtError;
  }

  expect(error).toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
  expect(error.code).toBe(code);
}

describe('tenant foundation database integration', () => {
  let prisma;

  beforeAll(async () => {
    expect(getTestDatabaseUrl()).toContain('/hiringloop_test');
    prisma = getPrismaClient();
    await prisma.$connect();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  it('creates and queries a user, organization, and membership relationship', async () => {
    const fixture = await createFixture(prisma);

    try {
      const membership = await prisma.organizationMembership.create({
        data: {
          id: fixture.membershipAId,
          organizationId: fixture.organizationAId,
          userId: fixture.userId,
          role: 'ADMIN',
        },
        include: { organization: true, user: true },
      });

      expect(membership.role).toBe('ADMIN');
      expect(membership.user.id).toBe(fixture.userId);
      expect(membership.organization.id).toBe(fixture.organizationAId);
    } finally {
      await cleanupFixture(prisma, fixture);
    }
  });

  it('rejects duplicate membership for the same organization and user', async () => {
    const fixture = await createFixture(prisma);

    try {
      await prisma.organizationMembership.create({
        data: {
          id: fixture.membershipAId,
          organizationId: fixture.organizationAId,
          userId: fixture.userId,
          role: 'RECRUITER',
        },
      });

      await expectKnownConstraintError(
        () =>
          prisma.organizationMembership.create({
            data: {
              id: fixture.membershipBId,
              organizationId: fixture.organizationAId,
              userId: fixture.userId,
              role: 'INTERVIEWER',
            },
          }),
        'P2002',
      );
    } finally {
      await cleanupFixture(prisma, fixture);
    }
  });

  it('allows one global user to belong to multiple organizations', async () => {
    const fixture = await createFixture(prisma);

    try {
      await prisma.organization.create({
        data: {
          id: fixture.organizationBId,
          name: 'Integration Organization B',
        },
      });
      await prisma.organizationMembership.createMany({
        data: [
          {
            id: fixture.membershipAId,
            organizationId: fixture.organizationAId,
            userId: fixture.userId,
            role: 'RECRUITER',
          },
          {
            id: fixture.membershipBId,
            organizationId: fixture.organizationBId,
            userId: fixture.userId,
            role: 'HIRING_MANAGER',
          },
        ],
      });

      const user = await prisma.user.findUnique({
        where: { id: fixture.userId },
        include: { organizationMemberships: true },
      });

      expect(user.organizationMemberships).toHaveLength(2);
      expect(user).not.toHaveProperty('organizationId');
    } finally {
      await cleanupFixture(prisma, fixture);
    }
  });

  it('enforces the PostgreSQL role CHECK constraint', async () => {
    const fixture = await createFixture(prisma);

    try {
      await expectKnownConstraintError(
        () =>
          prisma.organizationMembership.create({
            data: {
              id: fixture.membershipAId,
              organizationId: fixture.organizationAId,
              userId: fixture.userId,
              role: 'SUPER_ADMIN',
            },
          }),
        'P2039',
      );
    } finally {
      await cleanupFixture(prisma, fixture);
    }
  });

  it('rejects membership rows with nonexistent users or organizations', async () => {
    const fixture = await createFixture(prisma);

    try {
      await expectKnownConstraintError(
        () =>
          prisma.organizationMembership.create({
            data: {
              id: fixture.membershipAId,
              organizationId: fixture.organizationAId,
              userId: generateEntityId(),
              role: 'ADMIN',
            },
          }),
        'P2003',
      );
      await expectKnownConstraintError(
        () =>
          prisma.organizationMembership.create({
            data: {
              id: fixture.membershipAId,
              organizationId: generateEntityId(),
              userId: fixture.userId,
              role: 'ADMIN',
            },
          }),
        'P2003',
      );
    } finally {
      await cleanupFixture(prisma, fixture);
    }
  });

  it('rejects deletes of a referenced user and organization', async () => {
    const fixture = await createFixture(prisma);

    try {
      await prisma.organizationMembership.create({
        data: {
          id: fixture.membershipAId,
          organizationId: fixture.organizationAId,
          userId: fixture.userId,
          role: 'ADMIN',
        },
      });
      await expectKnownConstraintError(
        () => prisma.user.delete({ where: { id: fixture.userId } }),
        'P2003',
      );
      await expectKnownConstraintError(
        () =>
          prisma.organization.delete({
            where: { id: fixture.organizationAId },
          }),
        'P2003',
      );
    } finally {
      await cleanupFixture(prisma, fixture);
    }
  });

  it('round-trips application UUIDv7 IDs and persists timestamps', async () => {
    const fixture = await createFixture(prisma);

    try {
      const created = await prisma.organizationMembership.create({
        data: {
          id: fixture.membershipAId,
          organizationId: fixture.organizationAId,
          userId: fixture.userId,
          role: 'INTERVIEWER',
        },
      });

      expect(created.id).toBe(fixture.membershipAId);
      expect(created.id[14]).toBe('7');
      expect(created.createdAt).toBeInstanceOf(Date);
      expect(created.updatedAt).toBeInstanceOf(Date);
      expect(created.createdAt.getTime()).toBeGreaterThan(0);
      expect(created.updatedAt.getTime()).toBeGreaterThan(0);
    } finally {
      await cleanupFixture(prisma, fixture);
    }
  });
});
