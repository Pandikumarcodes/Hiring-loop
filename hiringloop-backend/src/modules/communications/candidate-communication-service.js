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
      const communication = await prisma.communication.findUnique({
        where: { id: communicationId },
        include: { createdBy: { select: { id: true, email: true } } },
      });
      if (!communication) throw new Error('Persisted communication not found');
      try {
        const result = await emailDelivery.sendCandidateEmail({
          to: communication.recipientEmail,
          subject: communication.subject,
          text: communication.body,
        });
        return {
          kind: 'SENT',
          communication: await prisma.communication.update({
            where: { id: communication.id },
            data: {
              status: 'SENT',
              sentAt: new Date(),
              providerMessageId: result?.providerMessageId ?? null,
            },
            include: { createdBy: { select: { id: true, email: true } } },
          }),
        };
      } catch (providerError) {
        if (providerError?.category === 'ambiguous') {
          return { kind: 'UNCONFIRMED', communication };
        }
        await prisma.communication.update({
          where: { id: communication.id },
          data: {
            status: 'FAILED',
            failedAt: new Date(),
            failureCategory: providerError?.category ?? 'provider-error',
          },
        });
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
          .catch((notificationError) => {
            console.error(
              'Candidate communication failure notification creation failed',
              {
                organizationId,
                recipientUserId: createdByUserId,
                applicationId,
                cause: notificationError?.message,
              },
            );
          });
        return { kind: 'FAILED', error: providerError };
      }
    },
  };
}
