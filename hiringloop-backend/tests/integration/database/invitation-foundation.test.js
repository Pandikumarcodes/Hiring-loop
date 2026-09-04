import { afterAll, beforeAll, describe, expect, it } from 'vitest';

process.env.NODE_ENV = 'test';

const { disconnectDatabase, getPrismaClient } =
  await import('../../../src/database/client.js');
const { createInvitationRepository } =
  await import('../../../src/modules/invitations/repositories/invitation-repository.js');
const { generateEntityId } = await import('../../../src/utils/ids.js');

describe('invitation database foundation', () => {
  let prisma;
  let repository;
  let organizationId;
  let otherOrganizationId;
  let inviterUserId;
  let invitedUserId;
  let otherUserId;
  let inviterMembershipId;

  beforeAll(async () => {
    prisma = getPrismaClient();
    repository = createInvitationRepository(prisma);
    organizationId = generateEntityId();
    otherOrganizationId = generateEntityId();
    inviterUserId = generateEntityId();
    invitedUserId = generateEntityId();
    otherUserId = generateEntityId();
    inviterMembershipId = generateEntityId();
    await prisma.user.create({
      data: { id: inviterUserId, email: `${inviterUserId}@example.test` },
    });
    await prisma.user.createMany({
      data: [
        { id: invitedUserId, email: 'invited@example.test' },
        { id: otherUserId, email: 'other@example.test' },
      ],
    });
    await prisma.organization.createMany({
      data: [
        { id: organizationId, name: 'Invitation Organization' },
        { id: otherOrganizationId, name: 'Other Invitation Organization' },
      ],
    });
    await prisma.organizationMembership.create({
      data: {
        id: inviterMembershipId,
        organizationId,
        userId: inviterUserId,
        role: 'ADMIN',
      },
    });
  });

  afterAll(async () => {
    await prisma.invitation.deleteMany({
      where: { organizationId: { in: [organizationId, otherOrganizationId] } },
    });
    await prisma.organizationMembership.deleteMany({
      where: { organizationId: { in: [organizationId, otherOrganizationId] } },
    });
    await prisma.organization.deleteMany({
      where: { id: { in: [organizationId, otherOrganizationId] } },
    });
    await prisma.user.delete({ where: { id: inviterUserId } });
    await prisma.user.deleteMany({
      where: { id: { in: [invitedUserId, otherUserId] } },
    });
    await disconnectDatabase();
  });

  it('persists only token hashes and rotates one active invitation', async () => {
    const first = await repository.createOrRotateInvitation({
      organizationId,
      email: 'person@example.test',
      role: 'RECRUITER',
      tokenHash: 'first-token-hash',
      expiresAt: new Date('2026-09-11T00:00:00.000Z'),
      inviterMembershipId,
      now: new Date('2026-09-04T00:00:00.000Z'),
    });
    const rotated = await repository.createOrRotateInvitation({
      organizationId,
      email: 'person@example.test',
      role: 'HIRING_MANAGER',
      tokenHash: 'second-token-hash',
      expiresAt: new Date('2026-09-12T00:00:00.000Z'),
      inviterMembershipId,
      now: new Date('2026-09-05T00:00:00.000Z'),
    });

    expect(rotated.id).toBe(first.id);
    expect(rotated.tokenHash).toBe('second-token-hash');
    expect(rotated.role).toBe('HIRING_MANAGER');
    expect(
      await prisma.invitation.count({
        where: {
          organizationId,
          email: 'person@example.test',
          acceptedAt: null,
          revokedAt: null,
        },
      }),
    ).toBe(1);
  });

  it('serializes concurrent invites for one organization and email', async () => {
    const results = await Promise.all([
      repository.createOrRotateInvitation({
        organizationId,
        email: 'concurrent@example.test',
        role: 'RECRUITER',
        tokenHash: 'concurrent-a',
        expiresAt: new Date('2026-09-11T00:00:00.000Z'),
        inviterMembershipId,
        now: new Date('2026-09-04T00:00:00.000Z'),
      }),
      repository.createOrRotateInvitation({
        organizationId,
        email: 'concurrent@example.test',
        role: 'INTERVIEWER',
        tokenHash: 'concurrent-b',
        expiresAt: new Date('2026-09-11T00:00:00.000Z'),
        inviterMembershipId,
        now: new Date('2026-09-04T00:00:00.000Z'),
      }),
    ]);

    expect(new Set(results.map(({ id }) => id)).size).toBe(1);
    expect(
      await prisma.invitation.count({
        where: {
          organizationId,
          email: 'concurrent@example.test',
          acceptedAt: null,
          revokedAt: null,
        },
      }),
    ).toBe(1);
  });

  it('lists and revokes only within the requested organization', async () => {
    const invitation = await repository.createOrRotateInvitation({
      organizationId,
      email: 'tenant@example.test',
      role: 'RECRUITER',
      tokenHash: 'tenant-token-hash',
      expiresAt: new Date('2026-09-11T00:00:00.000Z'),
      inviterMembershipId,
      now: new Date('2026-09-04T00:00:00.000Z'),
    });
    expect(
      await repository.findInvitation({
        organizationId: otherOrganizationId,
        invitationId: invitation.id,
      }),
    ).toBeNull();
    expect(
      await repository.listInvitations({ organizationId: otherOrganizationId }),
    ).toEqual([]);
    const revoked = await repository.revokeInvitation({
      organizationId,
      invitationId: invitation.id,
      now: new Date('2026-09-05T00:00:00.000Z'),
    });
    expect(revoked.revokedAt).toEqual(new Date('2026-09-05T00:00:00.000Z'));
  });

  it('accepts a valid token atomically for the invited verified identity', async () => {
    const invitation = await repository.createOrRotateInvitation({
      organizationId,
      email: 'invited@example.test',
      role: 'RECRUITER',
      tokenHash: 'accept-token-hash',
      expiresAt: new Date('2026-09-11T00:00:00.000Z'),
      inviterMembershipId,
      now: new Date('2026-09-04T00:00:00.000Z'),
    });
    const result = await repository.acceptInvitation({
      tokenHash: 'accept-token-hash',
      userId: invitedUserId,
      normalizedEmail: 'invited@example.test',
      now: new Date('2026-09-05T00:00:00.000Z'),
    });

    expect(result.outcome).toBe('accepted');
    expect(result.membership.role).toBe('RECRUITER');
    expect(result.invitation.id).toBe(invitation.id);
    expect(result.invitation.acceptedAt).toEqual(
      new Date('2026-09-05T00:00:00.000Z'),
    );
    expect(
      await prisma.organizationMembership.count({
        where: { organizationId, userId: invitedUserId },
      }),
    ).toBe(1);
  });

  it('rejects identity mismatch without accepting or creating membership', async () => {
    await repository.createOrRotateInvitation({
      organizationId,
      email: 'mismatch@example.test',
      role: 'ADMIN',
      tokenHash: 'mismatch-token-hash',
      expiresAt: new Date('2026-09-11T00:00:00.000Z'),
      inviterMembershipId,
      now: new Date('2026-09-04T00:00:00.000Z'),
    });
    const result = await repository.acceptInvitation({
      tokenHash: 'mismatch-token-hash',
      userId: otherUserId,
      normalizedEmail: 'other@example.test',
      now: new Date('2026-09-05T00:00:00.000Z'),
    });

    expect(result.outcome).toBe('identity_mismatch');
    expect(
      await prisma.organizationMembership.count({
        where: { organizationId, userId: otherUserId },
      }),
    ).toBe(0);
    expect(
      await prisma.invitation.findUnique({
        where: { tokenHash: 'mismatch-token-hash' },
        select: { acceptedAt: true },
      }),
    ).toEqual({ acceptedAt: null });
  });

  it('allows only one concurrent acceptance of the same token', async () => {
    await repository.createOrRotateInvitation({
      organizationId,
      email: 'concurrent-accept@example.test',
      role: 'INTERVIEWER',
      tokenHash: 'concurrent-accept-token-hash',
      expiresAt: new Date('2026-09-11T00:00:00.000Z'),
      inviterMembershipId,
      now: new Date('2026-09-04T00:00:00.000Z'),
    });
    const results = await Promise.all([
      repository.acceptInvitation({
        tokenHash: 'concurrent-accept-token-hash',
        userId: otherUserId,
        normalizedEmail: 'concurrent-accept@example.test',
        now: new Date('2026-09-05T00:00:00.000Z'),
      }),
      repository.acceptInvitation({
        tokenHash: 'concurrent-accept-token-hash',
        userId: otherUserId,
        normalizedEmail: 'concurrent-accept@example.test',
        now: new Date('2026-09-05T00:00:00.000Z'),
      }),
    ]);

    expect(
      results.filter(({ outcome }) => outcome === 'accepted'),
    ).toHaveLength(1);
    expect(results.filter(({ outcome }) => outcome === 'invalid')).toHaveLength(
      1,
    );
    expect(
      await prisma.organizationMembership.count({
        where: { organizationId, userId: otherUserId },
      }),
    ).toBe(1);
  });

  it('rolls back membership when acceptance cannot complete', async () => {
    await repository.createOrRotateInvitation({
      organizationId,
      email: 'rollback@example.test',
      role: 'RECRUITER',
      tokenHash: 'rollback-token-hash',
      expiresAt: new Date('2026-09-11T00:00:00.000Z'),
      inviterMembershipId,
      now: new Date('2026-09-04T00:00:00.000Z'),
    });

    await expect(
      repository.acceptInvitation({
        tokenHash: 'rollback-token-hash',
        userId: generateEntityId(),
        normalizedEmail: 'rollback@example.test',
        now: new Date('2026-09-05T00:00:00.000Z'),
      }),
    ).rejects.toBeTruthy();
    expect(
      await prisma.invitation.findUnique({
        where: { tokenHash: 'rollback-token-hash' },
        select: { acceptedAt: true },
      }),
    ).toEqual({ acceptedAt: null });
  });
});
