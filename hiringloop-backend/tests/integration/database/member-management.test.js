import { afterAll, beforeEach, describe, expect, it } from 'vitest';

process.env.NODE_ENV = 'test';

const { disconnectDatabase, getPrismaClient } =
  await import('../../../src/database/client.js');
const { createMemberRepository } =
  await import('../../../src/modules/members/repositories/member-repository.js');
const { generateEntityId } = await import('../../../src/utils/ids.js');

let prisma;
let repository;
const fixtures = [];

async function createFixture() {
  const fixture = {
    organizationId: generateEntityId(),
    otherOrganizationId: generateEntityId(),
    userAId: generateEntityId(),
    userBId: generateEntityId(),
    userCId: generateEntityId(),
    membershipAId: generateEntityId(),
    membershipBId: generateEntityId(),
    membershipCId: generateEntityId(),
    otherMembershipId: generateEntityId(),
  };
  await prisma.user.createMany({
    data: [
      { id: fixture.userAId, email: `${fixture.userAId}@example.test` },
      { id: fixture.userBId, email: `${fixture.userBId}@example.test` },
      { id: fixture.userCId, email: `${fixture.userCId}@example.test` },
    ],
  });
  await prisma.organization.createMany({
    data: [
      { id: fixture.organizationId, name: 'Member Organization' },
      { id: fixture.otherOrganizationId, name: 'Other Organization' },
    ],
  });
  await prisma.organizationMembership.createMany({
    data: [
      {
        id: fixture.membershipAId,
        organizationId: fixture.organizationId,
        userId: fixture.userAId,
        role: 'ADMIN',
      },
      {
        id: fixture.membershipBId,
        organizationId: fixture.organizationId,
        userId: fixture.userBId,
        role: 'ADMIN',
      },
      {
        id: fixture.membershipCId,
        organizationId: fixture.organizationId,
        userId: fixture.userCId,
        role: 'RECRUITER',
      },
    ],
  });
  fixtures.push(fixture);
  return fixture;
}

async function cleanupFixture(fixture) {
  await prisma.invitation.deleteMany({
    where: { organizationId: fixture.organizationId },
  });
  await prisma.organizationMembership.deleteMany({
    where: {
      id: {
        in: [
          fixture.membershipAId,
          fixture.membershipBId,
          fixture.membershipCId,
          fixture.otherMembershipId,
        ],
      },
    },
  });
  await prisma.organization.deleteMany({
    where: {
      id: { in: [fixture.organizationId, fixture.otherOrganizationId] },
    },
  });
  await prisma.user.deleteMany({
    where: {
      id: { in: [fixture.userAId, fixture.userBId, fixture.userCId] },
    },
  });
}

describe('member management database behavior', () => {
  beforeEach(async () => {
    prisma ??= getPrismaClient();
    repository ??= createMemberRepository(prisma);
  });

  afterAll(async () => {
    for (const fixture of fixtures) await cleanupFixture(fixture);
    await disconnectDatabase();
  });

  it('lists only the requested organization and returns safe member fields', async () => {
    const fixture = await createFixture();
    const members = await repository.listMembers({
      organizationId: fixture.organizationId,
    });
    expect(members).toHaveLength(3);
    expect(members[0].user).toEqual({
      id: fixture.userAId,
      email: `${fixture.userAId}@example.test`,
    });
    expect(members[0]).not.toHaveProperty('passwordCredential');
    expect(
      await repository.listMembers({
        organizationId: fixture.otherOrganizationId,
      }),
    ).toEqual([]);
  });

  it('updates roles, promotes members, and treats same-role updates as no-ops', async () => {
    const fixture = await createFixture();
    const changed = await repository.updateMembershipRole({
      organizationId: fixture.organizationId,
      membershipId: fixture.membershipCId,
      role: 'HIRING_MANAGER',
    });
    expect(changed.outcome).toBe('updated');
    expect(changed.membership.role).toBe('HIRING_MANAGER');

    const promoted = await repository.updateMembershipRole({
      organizationId: fixture.organizationId,
      membershipId: fixture.membershipCId,
      role: 'ADMIN',
    });
    expect(promoted.membership.role).toBe('ADMIN');

    const unchanged = await repository.updateMembershipRole({
      organizationId: fixture.organizationId,
      membershipId: fixture.membershipCId,
      role: 'ADMIN',
    });
    expect(unchanged.outcome).toBe('unchanged');
  });

  it('removes ordinary members and never mutates a foreign-tenant membership', async () => {
    const fixture = await createFixture();
    await prisma.organizationMembership.create({
      data: {
        id: fixture.otherMembershipId,
        organizationId: fixture.otherOrganizationId,
        userId: fixture.userCId,
        role: 'RECRUITER',
      },
    });
    const removed = await repository.removeMembership({
      organizationId: fixture.organizationId,
      membershipId: fixture.membershipCId,
    });
    expect(removed.outcome).toBe('removed');
    expect(
      await repository.removeMembership({
        organizationId: fixture.organizationId,
        membershipId: fixture.otherMembershipId,
      }),
    ).toEqual({ outcome: 'missing' });
    expect(
      await prisma.organizationMembership.findUnique({
        where: { id: fixture.otherMembershipId },
      }),
    ).not.toBeNull();
  });

  it('protects the final Admin for role change and removal', async () => {
    const fixture = await createFixture();
    await repository.removeMembership({
      organizationId: fixture.organizationId,
      membershipId: fixture.membershipBId,
    });
    expect(
      await repository.updateMembershipRole({
        organizationId: fixture.organizationId,
        membershipId: fixture.membershipAId,
        role: 'RECRUITER',
      }),
    ).toEqual({ outcome: 'final_admin' });
    expect(
      await repository.removeMembership({
        organizationId: fixture.organizationId,
        membershipId: fixture.membershipAId,
      }),
    ).toEqual({ outcome: 'final_admin' });
  });

  it('rolls back removal when inviter history restricts membership deletion', async () => {
    const fixture = await createFixture();
    const invitationId = generateEntityId();
    await prisma.invitation.create({
      data: {
        id: invitationId,
        organizationId: fixture.organizationId,
        email: 'future-member@example.test',
        role: 'RECRUITER',
        tokenHash: `rollback-${invitationId}`,
        expiresAt: new Date(Date.now() + 86400000),
        inviterMembershipId: fixture.membershipCId,
      },
    });

    await expect(
      repository.removeMembership({
        organizationId: fixture.organizationId,
        membershipId: fixture.membershipCId,
      }),
    ).rejects.toMatchObject({ code: 'P2003' });
    expect(
      await prisma.organizationMembership.findUnique({
        where: { id: fixture.membershipCId },
      }),
    ).not.toBeNull();
    expect(
      await prisma.invitation.findUnique({ where: { id: invitationId } }),
    ).not.toBeNull();
  });

  it('serializes concurrent Admin demotions and leaves at least one Admin', async () => {
    const fixture = await createFixture();
    const results = await Promise.all([
      repository.updateMembershipRole({
        organizationId: fixture.organizationId,
        membershipId: fixture.membershipAId,
        role: 'RECRUITER',
      }),
      repository.updateMembershipRole({
        organizationId: fixture.organizationId,
        membershipId: fixture.membershipBId,
        role: 'RECRUITER',
      }),
    ]);
    expect(results.filter(({ outcome }) => outcome === 'updated')).toHaveLength(
      1,
    );
    expect(
      results.filter(({ outcome }) => outcome === 'final_admin'),
    ).toHaveLength(1);
    expect(
      await prisma.organizationMembership.count({
        where: { organizationId: fixture.organizationId, role: 'ADMIN' },
      }),
    ).toBe(1);
  });

  it('serializes concurrent remove/demote operations against different Admins', async () => {
    const fixture = await createFixture();
    const results = await Promise.all([
      repository.removeMembership({
        organizationId: fixture.organizationId,
        membershipId: fixture.membershipAId,
      }),
      repository.updateMembershipRole({
        organizationId: fixture.organizationId,
        membershipId: fixture.membershipBId,
        role: 'RECRUITER',
      }),
    ]);
    expect(results.filter(({ outcome }) => outcome === 'removed')).toHaveLength(
      1,
    );
    expect(
      results.filter(({ outcome }) => outcome === 'final_admin'),
    ).toHaveLength(1);
    expect(
      await prisma.organizationMembership.count({
        where: { organizationId: fixture.organizationId, role: 'ADMIN' },
      }),
    ).toBe(1);
  });

  it('serializes concurrent Admin self-leave/removal attempts', async () => {
    const fixture = await createFixture();
    const results = await Promise.all([
      repository.removeMembership({
        organizationId: fixture.organizationId,
        membershipId: fixture.membershipAId,
      }),
      repository.removeMembership({
        organizationId: fixture.organizationId,
        membershipId: fixture.membershipBId,
      }),
    ]);
    expect(results.filter(({ outcome }) => outcome === 'removed')).toHaveLength(
      1,
    );
    expect(
      results.filter(({ outcome }) => outcome === 'final_admin'),
    ).toHaveLength(1);
    expect(
      await prisma.organizationMembership.count({
        where: { organizationId: fixture.organizationId, role: 'ADMIN' },
      }),
    ).toBe(1);
  });
});
