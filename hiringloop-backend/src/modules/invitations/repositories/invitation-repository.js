import { generateEntityId } from '../../../utils/ids.js';

const INVITATION_SELECT = {
  id: true,
  organizationId: true,
  email: true,
  role: true,
  tokenHash: true,
  expiresAt: true,
  acceptedAt: true,
  revokedAt: true,
  inviterMembershipId: true,
  createdAt: true,
  updatedAt: true,
};

export function createInvitationRepository(prisma) {
  return {
    async findMemberByEmail({ organizationId, email }) {
      return prisma.organizationMembership.findFirst({
        where: { organizationId, user: { email } },
        select: { id: true },
      });
    },

    async createOrRotateInvitation({
      organizationId,
      email,
      role,
      tokenHash,
      expiresAt,
      inviterMembershipId,
      now,
    }) {
      return prisma.$transaction(async (transaction) => {
        const lockKey = `${organizationId}:${email}`;
        await transaction.$executeRaw`
          SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))
        `;

        const active = await transaction.invitation.findFirst({
          where: {
            organizationId,
            email,
            acceptedAt: null,
            revokedAt: null,
            expiresAt: { gt: now },
          },
          orderBy: { createdAt: 'desc' },
          select: { id: true },
        });

        if (active) {
          return transaction.invitation.update({
            where: { id: active.id },
            data: { role, tokenHash, expiresAt, inviterMembershipId },
            select: INVITATION_SELECT,
          });
        }

        return transaction.invitation.create({
          data: {
            id: generateEntityId(),
            organizationId,
            email,
            role,
            tokenHash,
            expiresAt,
            inviterMembershipId,
          },
          select: INVITATION_SELECT,
        });
      });
    },

    async listInvitations({ organizationId }) {
      return prisma.invitation.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
        select: INVITATION_SELECT,
      });
    },

    async findInvitation({ organizationId, invitationId }) {
      return prisma.invitation.findFirst({
        where: { organizationId, id: invitationId },
        select: INVITATION_SELECT,
      });
    },

    async revokeInvitation({ organizationId, invitationId, now }) {
      const result = await prisma.invitation.updateMany({
        where: {
          organizationId,
          id: invitationId,
          acceptedAt: null,
          revokedAt: null,
          expiresAt: { gt: now },
        },
        data: { revokedAt: now },
      });
      if (result.count !== 1) return null;
      return this.findInvitation({ organizationId, invitationId });
    },

    async acceptInvitation({ tokenHash, userId, normalizedEmail, now }) {
      return prisma.$transaction(async (transaction) => {
        const lockedRows = await transaction.$queryRaw`
          SELECT "id"
          FROM "Invitation"
          WHERE "tokenHash" = ${tokenHash}
          FOR UPDATE
        `;
        if (lockedRows.length !== 1) return { outcome: 'invalid' };

        const invitation = await transaction.invitation.findUnique({
          where: { id: lockedRows[0].id },
          select: {
            ...INVITATION_SELECT,
            organization: {
              select: {
                id: true,
                name: true,
                website: true,
                description: true,
                createdAt: true,
                updatedAt: true,
              },
            },
          },
        });
        if (
          !invitation ||
          invitation.acceptedAt ||
          invitation.revokedAt ||
          invitation.expiresAt <= now
        ) {
          return { outcome: 'invalid' };
        }
        if (invitation.email !== normalizedEmail) {
          return { outcome: 'identity_mismatch' };
        }

        const existingMembership =
          await transaction.organizationMembership.findUnique({
            where: {
              organizationId_userId: {
                organizationId: invitation.organizationId,
                userId,
              },
            },
            select: {
              id: true,
              organizationId: true,
              userId: true,
              role: true,
            },
          });

        if (!existingMembership) {
          await transaction.organizationMembership.createMany({
            data: {
              id: generateEntityId(),
              organizationId: invitation.organizationId,
              userId,
              role: invitation.role,
            },
            skipDuplicates: true,
          });
        }

        const membership =
          existingMembership ??
          (await transaction.organizationMembership.findUnique({
            where: {
              organizationId_userId: {
                organizationId: invitation.organizationId,
                userId,
              },
            },
            select: {
              id: true,
              organizationId: true,
              userId: true,
              role: true,
            },
          }));
        if (!membership)
          throw new Error('Accepted invitation membership missing');

        const accepted = await transaction.invitation.updateMany({
          where: {
            id: invitation.id,
            acceptedAt: null,
            revokedAt: null,
            expiresAt: { gt: now },
          },
          data: { acceptedAt: now },
        });
        if (accepted.count !== 1) return { outcome: 'invalid' };

        const acceptedInvitation = await transaction.invitation.findUnique({
          where: { id: invitation.id },
          select: {
            ...INVITATION_SELECT,
            organization: {
              select: {
                id: true,
                name: true,
                website: true,
                description: true,
                createdAt: true,
                updatedAt: true,
              },
            },
          },
        });

        return {
          outcome: existingMembership ? 'already_member' : 'accepted',
          invitation: acceptedInvitation,
          membership,
        };
      });
    },
  };
}
