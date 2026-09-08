const APPLICATION_SUMMARY_SELECT = {
  id: true,
  candidate: {
    select: { id: true, firstName: true, lastName: true, email: true },
  },
  job: { select: { id: true, title: true } },
};

const INTERVIEW_SELECT = {
  id: true,
  title: true,
  format: true,
  scheduledStartAt: true,
  scheduledEndAt: true,
  timeZone: true,
  meetingUrl: true,
  location: true,
  status: true,
  cancelledAt: true,
  cancelledByUserId: true,
  cancellationReason: true,
  createdAt: true,
  updatedAt: true,
  participants: {
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    select: {
      id: true,
      user: { select: { id: true, email: true } },
    },
  },
  application: { select: APPLICATION_SUMMARY_SELECT },
};

function interviewWhere({ organizationId, interviewId }) {
  return { id: interviewId, organizationId };
}

function participantWhere(userId) {
  return userId ? { participants: { some: { userId } } } : {};
}

function overlapWhere({ scheduledStartAt, scheduledEndAt, interviewId }) {
  return {
    ...(interviewId ? { id: { not: interviewId } } : {}),
    status: 'SCHEDULED',
    scheduledStartAt: { lt: scheduledEndAt },
    scheduledEndAt: { gt: scheduledStartAt },
  };
}

async function findConflict(client, input) {
  const conflict = await client.interview.findFirst({
    where: {
      organizationId: input.organizationId,
      ...overlapWhere(input),
      participants: { some: { userId: { in: input.participantUserIds } } },
    },
    orderBy: [{ scheduledStartAt: 'asc' }, { id: 'asc' }],
    select: {
      id: true,
      participants: {
        where: { userId: { in: input.participantUserIds } },
        select: { userId: true },
      },
    },
  });
  if (!conflict) return null;
  return {
    interviewId: conflict.id,
    participantUserIds: conflict.participants.map(({ userId }) => userId),
  };
}

function toConflictOutcome(conflict) {
  return conflict ? { outcome: 'conflict', conflict } : null;
}

export function createInterviewRepository(prisma) {
  async function findDetailedById(client, where) {
    return client.interview.findFirst({ where, select: INTERVIEW_SELECT });
  }

  return {
    findApplicationForOrganization({ organizationId, applicationId }) {
      return prisma.application.findFirst({
        where: { id: applicationId, organizationId },
        select: APPLICATION_SUMMARY_SELECT,
      });
    },

    async findOrganizationMembers({ organizationId, userIds }) {
      return prisma.organizationMembership.findMany({
        where: { organizationId, userId: { in: userIds } },
        select: { userId: true, user: { select: { id: true, email: true } } },
      });
    },

    findByIdForAccess({
      organizationId,
      interviewId,
      participantUserId,
      participantOnly,
    }) {
      return findDetailedById(prisma, {
        ...interviewWhere({ organizationId, interviewId }),
        ...(participantOnly ? participantWhere(participantUserId) : {}),
      });
    },

    listByApplication({ organizationId, applicationId, participantUserId }) {
      return prisma.interview.findMany({
        where: {
          organizationId,
          applicationId,
          ...participantWhere(participantUserId),
        },
        orderBy: [{ scheduledStartAt: 'asc' }, { id: 'asc' }],
        select: INTERVIEW_SELECT,
      });
    },

    listForOrganization({ organizationId, from, to, participantUserId }) {
      return prisma.interview.findMany({
        where: {
          organizationId,
          scheduledStartAt: { gte: from, lt: to },
          ...participantWhere(participantUserId),
        },
        orderBy: [{ scheduledStartAt: 'asc' }, { id: 'asc' }],
        select: INTERVIEW_SELECT,
      });
    },

    async create({
      id,
      organizationId,
      applicationId,
      createdByUserId,
      data,
      participants,
    }) {
      return prisma.$transaction(async (transaction) => {
        const conflict = await findConflict(transaction, {
          organizationId,
          scheduledStartAt: data.scheduledStartAt,
          scheduledEndAt: data.scheduledEndAt,
          participantUserIds: participants.map(({ userId }) => userId),
        });
        const conflictOutcome = toConflictOutcome(conflict);
        if (conflictOutcome) return conflictOutcome;

        const interview = await transaction.interview.create({
          data: {
            id,
            organizationId,
            applicationId,
            createdByUserId,
            ...data,
            participants: { createMany: { data: participants } },
          },
          select: INTERVIEW_SELECT,
        });
        return { outcome: 'created', interview };
      });
    },

    async updateMetadata({ organizationId, interviewId, data, participants }) {
      if (participants === undefined) {
        const updated = await prisma.interview.updateMany({
          where: {
            ...interviewWhere({ organizationId, interviewId }),
            status: 'SCHEDULED',
          },
          data,
        });
        if (updated.count === 1) {
          return {
            outcome: 'updated',
            interview: await findDetailedById(
              prisma,
              interviewWhere({ organizationId, interviewId }),
            ),
          };
        }
        const current = await prisma.interview.findFirst({
          where: interviewWhere({ organizationId, interviewId }),
          select: { status: true },
        });
        return { outcome: current ? 'cancelled' : 'not_found' };
      }

      return prisma.$transaction(async (transaction) => {
        const current = await transaction.interview.findFirst({
          where: interviewWhere({ organizationId, interviewId }),
          select: {
            status: true,
            scheduledStartAt: true,
            scheduledEndAt: true,
          },
        });
        if (!current) return { outcome: 'not_found' };
        if (current.status !== 'SCHEDULED') return { outcome: 'cancelled' };

        const conflict = await findConflict(transaction, {
          organizationId,
          interviewId,
          scheduledStartAt: current.scheduledStartAt,
          scheduledEndAt: current.scheduledEndAt,
          participantUserIds: participants.map(({ userId }) => userId),
        });
        const conflictOutcome = toConflictOutcome(conflict);
        if (conflictOutcome) return conflictOutcome;

        await transaction.interviewParticipant.deleteMany({
          where: { interviewId },
        });
        await transaction.interviewParticipant.createMany({
          data: participants,
        });
        await transaction.interview.update({
          where: { id: interviewId },
          data,
        });
        return {
          outcome: 'updated',
          interview: await findDetailedById(
            transaction,
            interviewWhere({ organizationId, interviewId }),
          ),
        };
      });
    },

    async reschedule({
      organizationId,
      interviewId,
      scheduledStartAt,
      scheduledEndAt,
      timeZone,
    }) {
      return prisma.$transaction(async (transaction) => {
        const current = await transaction.interview.findFirst({
          where: interviewWhere({ organizationId, interviewId }),
          select: {
            status: true,
            participants: { select: { userId: true } },
          },
        });
        if (!current) return { outcome: 'not_found' };
        if (current.status !== 'SCHEDULED') return { outcome: 'cancelled' };

        const conflict = await findConflict(transaction, {
          organizationId,
          interviewId,
          scheduledStartAt,
          scheduledEndAt,
          participantUserIds: current.participants.map(({ userId }) => userId),
        });
        const conflictOutcome = toConflictOutcome(conflict);
        if (conflictOutcome) return conflictOutcome;

        await transaction.interview.update({
          where: { id: interviewId },
          data: { scheduledStartAt, scheduledEndAt, timeZone },
        });
        return {
          outcome: 'updated',
          interview: await findDetailedById(
            transaction,
            interviewWhere({ organizationId, interviewId }),
          ),
        };
      });
    },

    async cancel({
      organizationId,
      interviewId,
      cancelledAt,
      cancelledByUserId,
      cancellationReason,
    }) {
      const updated = await prisma.interview.updateMany({
        where: {
          ...interviewWhere({ organizationId, interviewId }),
          status: 'SCHEDULED',
        },
        data: {
          status: 'CANCELLED',
          cancelledAt,
          cancelledByUserId,
          cancellationReason,
        },
      });
      if (updated.count === 1) {
        return {
          outcome: 'cancelled',
          interview: await findDetailedById(
            prisma,
            interviewWhere({ organizationId, interviewId }),
          ),
        };
      }
      const current = await prisma.interview.findFirst({
        where: interviewWhere({ organizationId, interviewId }),
        select: { status: true },
      });
      return { outcome: current ? 'already_cancelled' : 'not_found' };
    },
  };
}
