const APPLICATION_SUMMARY_SELECT = {
  id: true,
  candidate: {
    select: { id: true, firstName: true, lastName: true, email: true },
  },
  job: { select: { id: true, title: true } },
};

const INTERVIEW_SELECT = {
  id: true,
  organizationId: true,
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
      userId: true,
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

async function lockParticipants(transaction, organizationId, userIds) {
  // The transaction-scoped advisory locks serialize overlap checks for a tenant
  // and participant pair. They are intentionally acquired in a stable order.
  for (const userId of [...new Set(userIds)].sort()) {
    await transaction.$queryRaw`
      WITH lock AS MATERIALIZED (
        SELECT pg_advisory_xact_lock(
          hashtextextended(${`${organizationId}:${userId}`}, 0)
        )
      )
      SELECT 1 AS locked FROM lock
    `;
  }
}

async function findLockedParticipantUserIds(
  transaction,
  organizationId,
  userIds,
) {
  const uniqueIds = [...new Set(userIds)];
  if (typeof transaction.$queryRaw === 'function') {
    const found = new Set();
    for (const userId of uniqueIds) {
      const rows = await transaction.$queryRaw`
        SELECT "userId"
        FROM "OrganizationMembership"
        WHERE "organizationId" = ${organizationId} AND "userId" = ${userId}
        FOR KEY SHARE
      `;
      if (rows.length === 1) found.add(userId);
    }
    return found;
  }
  const members = await transaction.organizationMembership.findMany({
    where: { organizationId, userId: { in: uniqueIds } },
    select: { userId: true },
  });
  return new Set(members.map(({ userId }) => userId));
}

async function lockInterview(transaction, organizationId, interviewId) {
  await transaction.$queryRaw`
    SELECT "id"
    FROM "Interview"
    WHERE "id" = ${interviewId} AND "organizationId" = ${organizationId}
    FOR UPDATE
  `;
}

export function createInterviewRepository(prisma, auditRepository = null) {
  const audit = (tx, input, action, interview, before = null) =>
    auditRepository?.create(
      {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId ?? input.createdByUserId,
        action,
        resourceType: 'INTERVIEW',
        resourceId: interview.id,
        before,
        after: {
          status: interview.status,
          scheduledStartAt: interview.scheduledStartAt.toISOString(),
          scheduledEndAt: interview.scheduledEndAt.toISOString(),
          participantCount: interview.participants.length,
        },
      },
      tx,
    );
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

    async listEligibleParticipants({ organizationId }) {
      return prisma.organizationMembership.findMany({
        where: { organizationId },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        select: { userId: true, role: true, user: { select: { email: true } } },
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
        const memberIds = await findLockedParticipantUserIds(
          transaction,
          organizationId,
          participants.map(({ userId }) => userId),
        );
        const invalidUserIds = participants
          .map(({ userId }) => userId)
          .filter((userId) => !memberIds.has(userId));
        if (invalidUserIds.length) {
          return { outcome: 'invalid_participant', invalidUserIds };
        }
        await lockParticipants(
          transaction,
          organizationId,
          participants.map(({ userId }) => userId),
        );
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
        await audit(
          transaction,
          { organizationId, createdByUserId },
          'INTERVIEW_SCHEDULED',
          interview,
        );
        return { outcome: 'created', interview };
      });
    },

    async updateMetadata({
      organizationId,
      interviewId,
      data,
      participants,
      actorUserId,
    }) {
      if (participants === undefined) {
        return prisma.$transaction(async (transaction) => {
          const before = await findDetailedById(
            transaction,
            interviewWhere({ organizationId, interviewId }),
          );
          const updated = await transaction.interview.updateMany({
            where: {
              ...interviewWhere({ organizationId, interviewId }),
              status: 'SCHEDULED',
            },
            data,
          });
          if (updated.count === 1) {
            const interview = await findDetailedById(
              transaction,
              interviewWhere({ organizationId, interviewId }),
            );
            await audit(
              transaction,
              { organizationId, actorUserId },
              'INTERVIEW_UPDATED',
              interview,
              {
                status: before.status,
                scheduledStartAt: before.scheduledStartAt.toISOString(),
                scheduledEndAt: before.scheduledEndAt.toISOString(),
                participantCount: before.participants.length,
              },
            );
            return { outcome: 'updated', interview };
          }
          const current = await transaction.interview.findFirst({
            where: interviewWhere({ organizationId, interviewId }),
            select: { status: true },
          });
          return { outcome: current ? 'cancelled' : 'not_found' };
        });
      }

      return prisma.$transaction(async (transaction) => {
        await lockInterview(transaction, organizationId, interviewId);
        const current = await transaction.interview.findFirst({
          where: interviewWhere({ organizationId, interviewId }),
          select: {
            status: true,
            scheduledStartAt: true,
            scheduledEndAt: true,
            participants: {
              select: {
                id: true,
                userId: true,
                scorecard: { select: { id: true } },
              },
            },
          },
        });
        if (!current) return { outcome: 'not_found' };
        if (current.status !== 'SCHEDULED') return { outcome: 'cancelled' };

        const memberIds = await findLockedParticipantUserIds(
          transaction,
          organizationId,
          participants.map(({ userId }) => userId),
        );
        const invalidUserIds = participants
          .map(({ userId }) => userId)
          .filter((userId) => !memberIds.has(userId));
        if (invalidUserIds.length) {
          return { outcome: 'invalid_participant', invalidUserIds };
        }

        await lockParticipants(transaction, organizationId, [
          ...current.participants.map(({ userId }) => userId),
          ...participants.map(({ userId }) => userId),
        ]);

        const conflict = await findConflict(transaction, {
          organizationId,
          interviewId,
          scheduledStartAt: current.scheduledStartAt,
          scheduledEndAt: current.scheduledEndAt,
          participantUserIds: participants.map(({ userId }) => userId),
        });
        const conflictOutcome = toConflictOutcome(conflict);
        if (conflictOutcome) return conflictOutcome;

        const nextUserIds = new Set(participants.map(({ userId }) => userId));
        const removed = current.participants.filter(
          ({ userId }) => !nextUserIds.has(userId),
        );
        if (removed.some(({ scorecard }) => scorecard)) {
          return { outcome: 'participant_history' };
        }
        if (removed.length) {
          await transaction.interviewParticipant.deleteMany({
            where: { id: { in: removed.map(({ id }) => id) } },
          });
        }
        const currentUserIds = new Set(
          current.participants.map(({ userId }) => userId),
        );
        const additions = participants.filter(
          ({ userId }) => !currentUserIds.has(userId),
        );
        if (additions.length) {
          await transaction.interviewParticipant.createMany({
            data: additions.map((participant) => ({
              ...participant,
              interviewId,
            })),
          });
        }
        await transaction.interview.update({
          where: { id: interviewId },
          data,
        });
        const interview = await findDetailedById(
          transaction,
          interviewWhere({ organizationId, interviewId }),
        );
        await audit(
          transaction,
          { organizationId, actorUserId },
          'INTERVIEW_UPDATED',
          interview,
          {
            status: current.status,
            scheduledStartAt: current.scheduledStartAt.toISOString(),
            scheduledEndAt: current.scheduledEndAt.toISOString(),
            participantCount: current.participants?.length ?? 0,
          },
        );
        return {
          outcome: 'updated',
          interview,
        };
      });
    },

    async reschedule({
      organizationId,
      interviewId,
      scheduledStartAt,
      scheduledEndAt,
      timeZone,
      actorUserId,
    }) {
      return prisma.$transaction(async (transaction) => {
        await lockInterview(transaction, organizationId, interviewId);
        const current = await transaction.interview.findFirst({
          where: interviewWhere({ organizationId, interviewId }),
          select: {
            status: true,
            scheduledStartAt: true,
            scheduledEndAt: true,
            participants: { select: { userId: true } },
          },
        });
        if (!current) return { outcome: 'not_found' };
        if (current.status !== 'SCHEDULED') return { outcome: 'cancelled' };

        await lockParticipants(
          transaction,
          organizationId,
          current.participants.map(({ userId }) => userId),
        );

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
        const interview = await findDetailedById(
          transaction,
          interviewWhere({ organizationId, interviewId }),
        );
        await audit(
          transaction,
          { organizationId, actorUserId },
          'INTERVIEW_RESCHEDULED',
          interview,
          {
            status: current.status,
            scheduledStartAt: current.scheduledStartAt.toISOString(),
            scheduledEndAt: current.scheduledEndAt.toISOString(),
            participantCount: current.participants.length,
          },
        );
        return {
          outcome: 'updated',
          interview,
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
      return prisma.$transaction(async (transaction) => {
        const before = await findDetailedById(
          transaction,
          interviewWhere({ organizationId, interviewId }),
        );
        const updated = await transaction.interview.updateMany({
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
          const interview = await findDetailedById(
            transaction,
            interviewWhere({ organizationId, interviewId }),
          );
          await audit(
            transaction,
            { organizationId, actorUserId: cancelledByUserId },
            'INTERVIEW_CANCELLED',
            interview,
            {
              status: before.status,
              scheduledStartAt: before.scheduledStartAt.toISOString(),
              scheduledEndAt: before.scheduledEndAt.toISOString(),
              participantCount: before.participants.length,
            },
          );
          return { outcome: 'cancelled', interview };
        }
        const current = await transaction.interview.findFirst({
          where: interviewWhere({ organizationId, interviewId }),
          select: { status: true },
        });
        return { outcome: current ? 'already_cancelled' : 'not_found' };
      });
    },
  };
}
