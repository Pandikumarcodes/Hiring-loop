import { generateEntityId } from '../../../utils/ids.js';
import { slugForAttempt } from '../domain/organization-slug.js';

const MAX_SLUG_ALLOCATION_ATTEMPTS = 100;

const ORGANIZATION_SELECT = {
  id: true,
  name: true,
  slug: true,
  website: true,
  description: true,
  createdAt: true,
  updatedAt: true,
};

const PUBLIC_ORGANIZATION_SELECT = {
  id: true,
  name: true,
  slug: true,
  website: true,
  description: true,
};

export function createOrganizationRepository(prisma) {
  return {
    async createOrganizationWithAdminMembership({
      userId,
      name,
      website,
      description,
    }) {
      for (
        let attempt = 1;
        attempt <= MAX_SLUG_ALLOCATION_ATTEMPTS;
        attempt += 1
      ) {
        try {
          return await prisma.$transaction(async (transaction) => {
            const organization = await transaction.organization.create({
              data: {
                id: generateEntityId(),
                name,
                slug: slugForAttempt(name, attempt),
                website,
                description,
              },
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
        } catch (error) {
          if (error?.code !== 'P2002') throw error;
        }
      }

      const error = new Error('Unable to allocate a unique organization slug.');
      error.code = 'ORGANIZATION_SLUG_ALLOCATION_EXHAUSTED';
      throw error;
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

    async findPublicOrganizationBySlug(slug) {
      return prisma.organization.findUnique({
        where: { slug },
        select: PUBLIC_ORGANIZATION_SELECT,
      });
    },
  };
}
