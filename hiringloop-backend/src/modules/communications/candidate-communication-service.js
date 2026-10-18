import { generateEntityId } from '../../utils/ids.js';

/**
 * Delivers an already-persisted candidate communication. Creation remains the
 * caller's transaction boundary; provider dispatch deliberately happens after
 * that transaction commits.
 */
export function createCandidateCommunicationService({ prisma, emailDelivery }) {
  return {
    async dispatchPersisted({
      communicationId,
      organizationId,
      applicationId,
      createdByUserId,
    }) {
      const communication = await prisma.communication.findFirst({
        where: { id: communicationId, organizationId, applicationId },
        include: { createdBy: { select: { id: true, email: true } } },
      });
      if (!communication) throw new Error('Persisted communication not found');
      if (communication.status !== 'PENDING') {
        if (communication.status === 'SENT')
          return { kind: 'SENT', communication };
        if (communication.status === 'FAILED')
          return { kind: 'FAILED', communication };
        return { kind: 'UNCONFIRMED', communication };
      }
      let providerResult;
      try {
        providerResult = await emailDelivery.sendCandidateEmail({
          to: communication.recipientEmail,
          subject: communication.subject,
          text: communication.body,
        });
      } catch (providerError) {
        if (
          !['provider-rejected', 'not-sent'].includes(providerError?.category)
        ) {
          return { kind: 'UNCONFIRMED', communication };
        }
        const failed = await prisma.communication.updateMany({
          where: {
            id: communication.id,
            organizationId,
            applicationId,
            status: 'PENDING',
          },
          data: {
            status: 'FAILED',
            failedAt: new Date(),
            failureCategory: providerError.category,
          },
        });
        if (failed.count === 1) {
          await prisma.notification
            .create({
              data: {
                id: generateEntityId(),
                organizationId,
                recipientUserId: createdByUserId,
                type: 'CANDIDATE_COMMUNICATION_FAILED',
                title: 'Candidate email failed',
                message: 'A candidate email could not be delivered.',
                applicationId,
              },
            })
            .catch(() => {
              console.error(
                'Candidate communication failure notification creation failed',
                {
                  organizationId,
                  recipientUserId: createdByUserId,
                  applicationId,
                },
              );
            });
        }
        return { kind: 'FAILED', error: providerError };
      }
      // Provider acceptance and database persistence are distinct outcomes.
      // If this write fails, allow the error to propagate and leave the durable
      // request PENDING; it must not be reclassified as a provider rejection.
      const sent = await prisma.communication.updateMany({
        where: {
          id: communication.id,
          organizationId,
          applicationId,
          status: 'PENDING',
        },
        data: {
          status: 'SENT',
          sentAt: new Date(),
          providerMessageId: providerResult?.providerMessageId ?? null,
        },
      });
      if (!sent.count) {
        const current = await prisma.communication.findFirst({
          where: { id: communication.id, organizationId, applicationId },
          include: { createdBy: { select: { id: true, email: true } } },
        });
        return current?.status === 'SENT'
          ? { kind: 'SENT', communication: current }
          : { kind: 'UNCONFIRMED', communication: current ?? communication };
      }
      return {
        kind: 'SENT',
        communication: await prisma.communication.findFirst({
          where: { id: communication.id, organizationId, applicationId },
          include: { createdBy: { select: { id: true, email: true } } },
        }),
      };
    },
  };
}
