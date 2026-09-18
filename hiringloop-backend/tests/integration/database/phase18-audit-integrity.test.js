import { afterAll, beforeAll, describe, expect, it } from 'vitest';

process.env.NODE_ENV = 'test';

const { disconnectDatabase, getPrismaClient } =
  await import('../../../src/database/client.js');
const { generateEntityId } = await import('../../../src/utils/ids.js');

describe('Phase 18 AuditEvent database integrity', () => {
  const organizationId = generateEntityId();
  const actorUserId = generateEntityId();
  const eventId = generateEntityId();
  let prisma;

  beforeAll(async () => {
    prisma = getPrismaClient();
    await prisma.organization.create({
      data: {
        id: organizationId,
        name: 'Phase 18 audit integrity',
        slug: `p18-audit-${organizationId.slice(-12)}`,
      },
    });
    await prisma.user.create({
      data: { id: actorUserId, email: `${actorUserId}@test.local` },
    });
    await prisma.auditEvent.create({
      data: {
        id: eventId,
        organizationId,
        actorUserId,
        actorType: 'USER',
        action: 'MEMBERSHIP_ROLE_CHANGED',
        resourceType: 'MEMBERSHIP',
        resourceId: generateEntityId(),
        before: { role: 'RECRUITER' },
        after: { role: 'ADMIN' },
      },
    });
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  it('accepts valid rows and enforces actor consistency and foreign keys', async () => {
    await expect(
      prisma.auditEvent.create({
        data: {
          id: generateEntityId(),
          organizationId,
          actorType: 'USER',
          action: 'TEST',
          resourceType: 'TEST',
          resourceId: generateEntityId(),
        },
      }),
    ).rejects.toThrow();
    await expect(
      prisma.user.delete({ where: { id: actorUserId } }),
    ).rejects.toThrow();
  });

  it('rejects Prisma update and delete operations through the append-only trigger', async () => {
    await expect(
      prisma.auditEvent.update({
        where: { id: eventId },
        data: { action: 'TAMPERED' },
      }),
    ).rejects.toThrow(/append-only/);
    await expect(
      prisma.auditEvent.delete({ where: { id: eventId } }),
    ).rejects.toThrow(/append-only/);
  });
});
