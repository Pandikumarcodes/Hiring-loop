import { generateEntityId } from '../../../utils/ids.js';

const ORGANIZATION_SELECT = {
  id: true,
  name: true,
  website: true,
  description: true,
  createdAt: true,
  updatedAt: true,
};

export function createOrganizationRepository(prisma) {
  return {
    async createOrganizationWithAdminMembership({
      userId,
      name,
      website,
      description,
    }) {
      return prisma.$transaction(async (transaction) => {
        const organization = await transaction.organization.create({
          data: { id: generateEntityId(), name, website, description },
          select: ORGANIZATION_SELECT,
        });

        await transaction.organizationMembership.create({
          data: {
            id: generateEntityId(),
            organizationId: organization.id,
            userId,
            role: 'ADMIN',
          },
        });

        return organization;
      });
    },

    async listOrganizationsForUser(userId) {
      const memberships = await prisma.organizationMembership.findMany({
        where: { userId },
        orderBy: { createdAt: 'asc' },
        select: { organization: { select: ORGANIZATION_SELECT } },
      });
      return memberships.map(({ organization }) => organization);
    },

    async findOrganizationForUser({ userId, organizationId }) {
      const membership = await prisma.organizationMembership.findUnique({
        where: { organizationId_userId: { organizationId, userId } },
        select: { organization: { select: ORGANIZATION_SELECT } },
      });
      return membership?.organization ?? null;
    },

    async findMembershipForUserAndOrganization({ userId, organizationId }) {
      return prisma.organizationMembership.findUnique({
        where: { organizationId_userId: { organizationId, userId } },
        select: {
          id: true,
          organizationId: true,
          role: true,
        },
      });
    },

    async findOrganizationById(organizationId) {
      return prisma.organization.findUnique({
        where: { id: organizationId },
        select: ORGANIZATION_SELECT,
      });
    },
  };
}
