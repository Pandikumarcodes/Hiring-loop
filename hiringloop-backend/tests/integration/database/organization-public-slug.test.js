import { Prisma } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

process.env.NODE_ENV = 'test';

const { disconnectDatabase, getPrismaClient } =
  await import('../../../src/database/client.js');
const { createOrganizationRepository } =
  await import('../../../src/modules/organizations/repositories/organization-repository.js');
const { generateEntityId } = await import('../../../src/utils/ids.js');

describe('Organization public slug database integration', () => {
  let prisma;
  let repository;
  const userId = generateEntityId();
  const organizationIds = [];

  beforeAll(async () => {
    prisma = getPrismaClient();
    repository = createOrganizationRepository(prisma);
    await prisma.$connect();
    await prisma.user.create({
      data: { id: userId, email: `${userId}@example.test` },
    });
  });

  afterAll(async () => {
    await prisma.organizationMembership.deleteMany({
      where: { organizationId: { in: organizationIds } },
    });
    await prisma.organization.deleteMany({
      where: { id: { in: organizationIds } },
    });
    await prisma.user.delete({ where: { id: userId } });
    await disconnectDatabase();
  });

  it('creates unique canonical slugs and retains the creator ADMIN membership atomically', async () => {
    const organizations = await Promise.all(
      ['Acme', 'ACME', 'Acme'].map((name) =>
        repository.createOrganizationWithAdminMembership({ userId, name }),
      ),
    );
    organizationIds.push(...organizations.map(({ id }) => id));

    expect(organizations.map(({ slug }) => slug).sort()).toEqual([
      'acme',
      'acme-2',
      'acme-3',
    ]);
    expect(
      await prisma.organizationMembership.count({
        where: {
          organizationId: { in: organizationIds },
          userId,
          role: 'ADMIN',
        },
      }),
    ).toBe(3);
  });

  it('enforces globally unique and canonical non-null database slugs', async () => {
    const id = generateEntityId();
    organizationIds.push(id);
    await prisma.organization.create({
      data: { id, name: 'Manual', slug: `manual-${id.slice(0, 8)}` },
    });

    await expect(
      prisma.organization.create({
        data: {
          id: generateEntityId(),
          name: 'Duplicate',
          slug: `manual-${id.slice(0, 8)}`,
        },
      }),
    ).rejects.toMatchObject({
      code: 'P2002',
    });
    await expect(
      prisma.organization.create({
        data: { id: generateEntityId(), name: 'Invalid', slug: 'Not valid' },
      }),
    ).rejects.toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
  });
});
