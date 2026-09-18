import { generateEntityId } from '../../../utils/ids.js';

// This narrow seam deliberately owns the persisted send request and its audit
// row together. Delivery remains outside the transaction because a provider
// call cannot be rolled back.
export function createCommunicationRepository(prisma, auditRepository) {
  return {
    createSendRequest({
      organizationId,
      applicationId,
      createdByUserId,
      recipientEmail,
      subject,
      body,
      provider,
      payloadHash,
      idempotencyKey,
      requestId,
    }) {
      return prisma.$transaction(async (db) => {
        const communication = await db.communication.create({
          data: {
            id: generateEntityId(),
            organizationId,
            applicationId,
            createdByUserId,
            recipientEmail,
            subject,
            body,
            provider,
            payloadHash,
            idempotencyKey,
          },
          include: { createdBy: { select: { id: true, email: true } } },
        });
        await auditRepository.create(
          {
            organizationId,
            actorUserId: createdByUserId,
            requestId,
            action: 'COMMUNICATION_SEND_REQUESTED',
            resourceType: 'COMMUNICATION',
            resourceId: communication.id,
            metadata: {
              channel: communication.channel,
              status: communication.status,
            },
          },
          db,
        );
        return communication;
      });
    },
  };
}
