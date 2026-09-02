import { afterAll, beforeAll, describe, expect, it } from 'vitest';

process.env.NODE_ENV = 'test';

const { disconnectDatabase, getPrismaClient } =
  await import('../../../src/database/client.js');
const { createAuthRepository } =
  await import('../../../src/modules/auth/repositories/auth-repository.js');
const { generateEntityId } = await import('../../../src/utils/ids.js');

describe('authentication session lifecycle database behavior', () => {
  let prisma;
  let repository;

  beforeAll(async () => {
    prisma = getPrismaClient();
    repository = createAuthRepository(prisma);
    await prisma.$connect();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  it('revokes the owned current session and retains its row', async () => {
    const userId = generateEntityId();
    const sessionId = generateEntityId();
    const revokedAt = new Date('2026-09-02T00:00:00.000Z');

    await prisma.user.create({ data: { id: userId, email: `${userId}@test` } });
    await prisma.authSession.create({
      data: {
        id: sessionId,
        userId,
        sessionSecretHash: `${sessionId}-hash`,
        expiresAt: new Date('2026-09-10T00:00:00.000Z'),
      },
    });

    try {
      await repository.revokeSessionById({ sessionId, userId, revokedAt });
      await expect(
        prisma.authSession.findUnique({ where: { id: sessionId } }),
      ).resolves.toMatchObject({ id: sessionId, userId, revokedAt });
    } finally {
      await prisma.user.delete({ where: { id: userId } });
    }
  });

  it('revoke-all updates active sessions only for the requested user', async () => {
    const userId = generateEntityId();
    const otherUserId = generateEntityId();
    const sessionIds = [generateEntityId(), generateEntityId()];
    const otherSessionId = generateEntityId();
    const alreadyRevokedAt = new Date('2026-09-01T00:00:00.000Z');
    const revokedAt = new Date('2026-09-02T00:00:00.000Z');

    await prisma.user.createMany({
      data: [
        { id: userId, email: `${userId}@test` },
        { id: otherUserId, email: `${otherUserId}@test` },
      ],
    });
    await prisma.authSession.createMany({
      data: [
        ...sessionIds.map((id) => ({
          id,
          userId,
          sessionSecretHash: `${id}-hash`,
          expiresAt: new Date('2026-09-10T00:00:00.000Z'),
        })),
        {
          id: otherSessionId,
          userId: otherUserId,
          sessionSecretHash: `${otherSessionId}-hash`,
          expiresAt: new Date('2026-09-10T00:00:00.000Z'),
          revokedAt: alreadyRevokedAt,
        },
      ],
    });

    try {
      await repository.revokeAllSessionsForUser({ userId, revokedAt });
      const rows = await prisma.authSession.findMany({
        where: { id: { in: [...sessionIds, otherSessionId] } },
        orderBy: { id: 'asc' },
      });
      expect(rows.filter((row) => row.userId === userId)).toHaveLength(2);
      expect(
        rows
          .filter((row) => row.userId === userId)
          .every((row) => row.revokedAt?.getTime() === revokedAt.getTime()),
      ).toBe(true);
      expect(rows.find((row) => row.id === otherSessionId).revokedAt).toEqual(
        alreadyRevokedAt,
      );
    } finally {
      await prisma.user.deleteMany({
        where: { id: { in: [userId, otherUserId] } },
      });
    }
  });
});
