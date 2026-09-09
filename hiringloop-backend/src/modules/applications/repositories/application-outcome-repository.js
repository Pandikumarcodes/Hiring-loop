import { generateEntityId } from '../../../utils/ids.js';
export function createApplicationOutcomeRepository(prisma) {
  const find = ({ organizationId, applicationId }) =>
    prisma.application.findFirst({
      where: { id: applicationId, organizationId },
    });
  return {
    find,
    findAcceptedOffer: ({ organizationId, applicationId }) =>
      prisma.offer.findFirst({
        where: { organizationId, applicationId, status: 'ACCEPTED' },
      }),
    history: ({ organizationId, applicationId }) =>
      prisma.applicationOutcomeEvent.findMany({
        where: { organizationId, applicationId },
        orderBy: [{ occurredAt: 'asc' }, { id: 'asc' }],
      }),
    async transition({
      organizationId,
      applicationId,
      actorUserId,
      expectedRevision,
      from,
      to,
      reasonCode = null,
      reasonDetails = null,
      talentPoolId,
    }) {
      return prisma.$transaction(async (db) => {
        const application = await db.application.findFirst({
          where: { id: applicationId, organizationId },
        });
        if (!application) return { outcome: 'missing' };
        if (talentPoolId) {
          const pool = await db.talentPool.findFirst({
            where: { id: talentPoolId, organizationId },
          });
          if (!pool) return { outcome: 'pool_missing' };
        }
        const changed = await db.application.updateMany({
          where: {
            id: applicationId,
            organizationId,
            outcome: { in: from },
            outcomeRevision: expectedRevision,
          },
          data: {
            outcome: to,
            outcomeUpdatedAt: new Date(),
            outcomeRevision: { increment: 1 },
          },
        });
        if (!changed.count) return { outcome: 'conflict', application };
        await db.applicationOutcomeEvent.create({
          data: {
            id: generateEntityId(),
            organizationId,
            applicationId,
            type: to === 'ACTIVE' ? 'REOPENED' : to,
            reasonCode,
            reasonDetails,
            actorUserId,
          },
        });
        if (talentPoolId)
          await db.talentPoolMember.upsert({
            where: {
              talentPoolId_candidateId: {
                talentPoolId,
                candidateId: application.candidateId,
              },
            },
            create: {
              id: generateEntityId(),
              organizationId,
              talentPoolId,
              candidateId: application.candidateId,
              sourceApplicationId: applicationId,
              addedByUserId: actorUserId,
            },
            update: {},
          });
        return {
          outcome: 'changed',
          application: await db.application.findFirst({
            where: { id: applicationId, organizationId },
          }),
        };
      });
    },
  };
}
