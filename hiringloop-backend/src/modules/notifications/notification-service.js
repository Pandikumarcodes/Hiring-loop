import { generateEntityId } from '../../utils/ids.js';

// Missing preferences are enabled. Communication failures are operational and
// deliberately mandatory for their sender.
export function createNotificationService(prisma) {
  return {
    async create(input) {
      if (input.type !== 'CANDIDATE_COMMUNICATION_FAILED') {
        const preference = await prisma.notificationPreference.findUnique({
          where: {
            organizationId_userId_notificationType: {
              organizationId: input.organizationId,
              userId: input.recipientUserId,
              notificationType: input.type,
            },
          },
        });
        if (preference && !preference.enabled) return null;
      }
      const member = await prisma.organizationMembership.findUnique({
        where: {
          organizationId_userId: {
            organizationId: input.organizationId,
            userId: input.recipientUserId,
          },
        },
      });
      if (!member) return null;
      return prisma.notification.create({
        data: { id: generateEntityId(), ...input },
      });
    },
  };
}
