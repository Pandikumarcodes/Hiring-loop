import { Prisma } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

process.env.NODE_ENV = 'test';

const { disconnectDatabase, getPrismaClient, getTestDatabaseUrl } =
  await import('../../../src/database/client.js');
const { generateEntityId } = await import('../../../src/utils/ids.js');

function newFixture() {
  return {
    userId: generateEntityId(),
    secondUserId: generateEntityId(),
    passwordCredentialAId: generateEntityId(),
    passwordCredentialBId: generateEntityId(),
    sessionAId: generateEntityId(),
    sessionBId: generateEntityId(),
    tokenAId: generateEntityId(),
    tokenBId: generateEntityId(),
    providerIdentityAId: generateEntityId(),
    providerIdentityBId: generateEntityId(),
    organizationAId: generateEntityId(),
    organizationBId: generateEntityId(),
    membershipAId: generateEntityId(),
    membershipBId: generateEntityId(),
  };
}

async function createFixture(prisma, fixture = newFixture()) {
  await prisma.user.create({
    data: { id: fixture.userId, email: `${fixture.userId}@example.test` },
  });
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

  it('enforces global authentication uniqueness and cascades auth records on user deletion', async () => {
    const fixture = await createFixture(prisma);

    try {
      await prisma.user
        .create({
          data: {
            id: fixture.secondUserId,
            email: `${fixture.userId}@example.test`,
          },
        })
        .catch((error) => {
          expect(error).toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
          expect(error.code).toBe('P2002');
        });

      await prisma.passwordCredential.create({
        data: {
          id: fixture.passwordCredentialAId,
          userId: fixture.userId,
          passwordHash: 'test-hash',
          passwordChangedAt: new Date(),
        },
      });
      await expectKnownConstraintError(
        () =>
          prisma.passwordCredential.create({
            data: {
              id: fixture.passwordCredentialBId,
              userId: fixture.userId,
              passwordHash: 'another-test-hash',
              passwordChangedAt: new Date(),
            },
          }),
        'P2002',
      );

      await prisma.authSession.create({
        data: {
          id: fixture.sessionAId,
          userId: fixture.userId,
          sessionSecretHash: `${fixture.sessionAId}-hash`,
          expiresAt: new Date(Date.now() + 60_000),
        },
      });
      await expectKnownConstraintError(
        () =>
          prisma.authSession.create({
            data: {
              id: fixture.sessionBId,
              userId: fixture.userId,
              sessionSecretHash: `${fixture.sessionAId}-hash`,
              expiresAt: new Date(Date.now() + 60_000),
            },
          }),
        'P2002',
      );

      await prisma.authToken.create({
        data: {
          id: fixture.tokenAId,
          userId: fixture.userId,
          purpose: 'EMAIL_VERIFICATION',
          tokenHash: `${fixture.tokenAId}-hash`,
          expiresAt: new Date(Date.now() + 60_000),
        },
      });
      await expectKnownConstraintError(
        () =>
          prisma.authToken.create({
            data: {
              id: fixture.tokenBId,
              userId: fixture.userId,
              purpose: 'PASSWORD_RESET',
              tokenHash: `${fixture.tokenAId}-hash`,
              expiresAt: new Date(Date.now() + 60_000),
            },
          }),
        'P2002',
      );

      await prisma.authProviderIdentity.create({
        data: {
          id: fixture.providerIdentityAId,
          userId: fixture.userId,
          provider: 'GOOGLE',
          providerSubject: `${fixture.userId}-subject`,
        },
      });
      await expectKnownConstraintError(
        () =>
          prisma.authProviderIdentity.create({
            data: {
              id: fixture.providerIdentityBId,
              userId: fixture.userId,
              provider: 'GOOGLE',
              providerSubject: `${fixture.userId}-subject`,
            },
          }),
        'P2002',
      );

      const authCounts = await Promise.all([
        prisma.passwordCredential.count({ where: { userId: fixture.userId } }),
        prisma.authSession.count({ where: { userId: fixture.userId } }),
        prisma.authToken.count({ where: { userId: fixture.userId } }),
        prisma.authProviderIdentity.count({
          where: { userId: fixture.userId },
        }),
      ]);
      expect(authCounts).toEqual([1, 1, 1, 1]);
      await prisma.user.delete({ where: { id: fixture.userId } });
      expect(
        await prisma.authSession.count({ where: { id: fixture.sessionAId } }),
      ).toBe(0);
      expect(
        await prisma.authToken.count({ where: { id: fixture.tokenAId } }),
      ).toBe(0);
      expect(
        await prisma.passwordCredential.count({
          where: { id: fixture.passwordCredentialAId },
        }),
      ).toBe(0);
      expect(
        await prisma.authProviderIdentity.count({
          where: { id: fixture.providerIdentityAId },
        }),
      ).toBe(0);
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
