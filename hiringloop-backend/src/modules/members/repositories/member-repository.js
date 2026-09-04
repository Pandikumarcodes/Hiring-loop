const MEMBER_SELECT = {
  id: true,
  organizationId: true,
  role: true,
  createdAt: true,
  user: {
    select: { id: true, email: true },
  },
};

export function createMemberRepository(prisma) {
  return {
    async listMembers({ organizationId }) {
      return prisma.organizationMembership.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'asc' },
        select: MEMBER_SELECT,
      });
    },

    async updateMembershipRole({ organizationId, membershipId, role }) {
      return prisma.$transaction(async (transaction) => {
        await lockOrganization(transaction, organizationId);
        const membership = await findMembership(
          transaction,
          organizationId,
          membershipId,
        );
        if (!membership) return { outcome: 'missing' };
        if (membership.role === role)
          return { outcome: 'unchanged', membership };

        if (membership.role === 'ADMIN' && role !== 'ADMIN') {
          const adminCount = await countAdmins(transaction, organizationId);
          if (adminCount <= 1) return { outcome: 'final_admin' };
        }

        const updatedCount =
          await transaction.organizationMembership.updateMany({
            where: { id: membership.id, organizationId },
            data: { role },
          });
        if (updatedCount.count !== 1) return { outcome: 'missing' };
        const updated = await findMembership(
          transaction,
          organizationId,
          membershipId,
        );
        return { outcome: 'updated', membership: updated };
      });
    },

    async removeMembership({ organizationId, membershipId }) {
      return prisma.$transaction(async (transaction) => {
        await lockOrganization(transaction, organizationId);
        const membership = await findMembership(
          transaction,
          organizationId,
          membershipId,
        );
        if (!membership) return { outcome: 'missing' };

        if (membership.role === 'ADMIN') {
          const adminCount = await countAdmins(transaction, organizationId);
          if (adminCount <= 1) return { outcome: 'final_admin' };
        }

        const deleted = await transaction.organizationMembership.deleteMany({
          where: { id: membership.id, organizationId },
        });
        if (deleted.count !== 1) return { outcome: 'missing' };
        return { outcome: 'removed', membership };
      });
    },
  };
}

async function lockOrganization(transaction, organizationId) {
  const rows = await transaction.$queryRaw`
    SELECT "id"
    FROM "Organization"
    WHERE "id" = ${organizationId}
    FOR UPDATE
  `;
  return rows.length === 1;
}

function findMembership(transaction, organizationId, membershipId) {
  return transaction.organizationMembership.findFirst({
    where: { organizationId, id: membershipId },
    select: MEMBER_SELECT,
  });
}

function countAdmins(transaction, organizationId) {
  return transaction.organizationMembership.count({
    where: { organizationId, role: 'ADMIN' },
  });
}
