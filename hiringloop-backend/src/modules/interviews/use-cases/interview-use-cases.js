import {
  forbiddenError,
  interviewAlreadyCancelledError,
  interviewCannotRescheduleError,
  interviewCannotUpdateError,
  interviewNotFoundError,
  interviewScheduleConflictError,
  invalidInterviewParticipantError,
  validationError,
} from '../../../errors/application-error.js';
import { generateEntityId } from '../../../utils/ids.js';
import { toInterviewDto } from '../domain/interview-dto.js';

const MANAGEMENT_ROLES = new Set(['ADMIN', 'RECRUITER']);
const READ_ROLES = new Set([
  'ADMIN',
  'RECRUITER',
  'HIRING_MANAGER',
  'INTERVIEWER',
]);

function calculateEnd(scheduledStartAt, durationMinutes) {
  const scheduledEndAt = new Date(
    scheduledStartAt.getTime() + durationMinutes * 60 * 1000,
  );
  if (scheduledEndAt <= scheduledStartAt) {
    throw validationError('Interview end must be after its start');
  }
  return scheduledEndAt;
}

function assertFuture(start, clock) {
  if (start <= clock()) {
    throw validationError('Interview start must be in the future');
  }
}

function assertReadableRole(actorRole) {
  if (!READ_ROLES.has(actorRole)) throw forbiddenError();
}

function assertManagementRole(actorRole) {
  if (!MANAGEMENT_ROLES.has(actorRole)) throw forbiddenError();
}

function conflictError(result) {
  if (result?.outcome === 'conflict') {
    throw interviewScheduleConflictError({
      participantUserIds: result.conflict.participantUserIds,
    });
  }
}

export function createInterviewUseCases({
  repository,
  clock = () => new Date(),
}) {
  async function validateParticipants({ organizationId, participantUserIds }) {
    const uniqueIds = [...new Set(participantUserIds)];
    const members = await repository.findOrganizationMembers({
      organizationId,
      userIds: uniqueIds,
    });
    const memberIds = new Set(members.map(({ userId }) => userId));
    const invalidUserIds = uniqueIds.filter((userId) => !memberIds.has(userId));
    if (invalidUserIds.length > 0) {
      throw invalidInterviewParticipantError({ invalidUserIds });
    }
    return uniqueIds.map((userId) => ({
      id: generateEntityId(),
      userId,
    }));
  }

  async function getForManagement({ organizationId, interviewId }) {
    const interview = await repository.findByIdForAccess({
      organizationId,
      interviewId,
      participantOnly: false,
    });
    if (!interview) throw interviewNotFoundError();
    if (interview.status === 'CANCELLED') throw interviewCannotUpdateError();
    return interview;
  }

  return {
    async schedule({
      organizationId,
      applicationId,
      actorRole,
      actorUserId,
      title,
      format,
      scheduledStartAt,
      durationMinutes,
      timeZone,
      meetingUrl,
      location,
      participantUserIds,
    }) {
      assertManagementRole(actorRole);
      assertFuture(scheduledStartAt, clock);
      const scheduledEndAt = calculateEnd(scheduledStartAt, durationMinutes);
      const application = await repository.findApplicationForOrganization({
        organizationId,
        applicationId,
      });
      if (!application) throw interviewNotFoundError();
      const participants = await validateParticipants({
        organizationId,
        participantUserIds,
      });
      const result = await repository.create({
        id: generateEntityId(),
        organizationId,
        applicationId,
        createdByUserId: actorUserId,
        data: {
          title,
          format,
          scheduledStartAt,
          scheduledEndAt,
          timeZone,
          meetingUrl: meetingUrl ?? null,
          location: location ?? null,
        },
        participants,
      });
      conflictError(result);
      return toInterviewDto(result.interview);
    },

    async listForApplication({
      organizationId,
      applicationId,
      actorRole,
      actorUserId,
    }) {
      assertReadableRole(actorRole);
      const interviews = await repository.listByApplication({
        organizationId,
        applicationId,
        participantUserId:
          actorRole === 'INTERVIEWER' ? actorUserId : undefined,
      });
      return interviews.map(toInterviewDto);
    },

    async listForOrganization({
      organizationId,
      actorRole,
      actorUserId,
      from,
      to,
      mine,
    }) {
      assertReadableRole(actorRole);
      if (actorRole === 'INTERVIEWER' && !mine) throw forbiddenError();
      const interviews = await repository.listForOrganization({
        organizationId,
        from,
        to,
        participantUserId: mine ? actorUserId : undefined,
      });
      return interviews.map(toInterviewDto);
    },

    async detail({ organizationId, interviewId, actorRole, actorUserId }) {
      assertReadableRole(actorRole);
      const interview = await repository.findByIdForAccess({
        organizationId,
        interviewId,
        participantUserId: actorUserId,
        participantOnly: actorRole === 'INTERVIEWER',
      });
      if (!interview) throw interviewNotFoundError();
      return toInterviewDto(interview);
    },

    async update({
      organizationId,
      interviewId,
      actorRole,
      participantUserIds,
      ...data
    }) {
      assertManagementRole(actorRole);
      await getForManagement({ organizationId, interviewId });
      const participants =
        participantUserIds === undefined
          ? undefined
          : await validateParticipants({ organizationId, participantUserIds });
      const result = await repository.updateMetadata({
        organizationId,
        interviewId,
        data,
        participants,
      });
      if (result.outcome === 'not_found') throw interviewNotFoundError();
      if (result.outcome === 'cancelled') throw interviewCannotUpdateError();
      conflictError(result);
      return toInterviewDto(result.interview);
    },

    async reschedule({
      organizationId,
      interviewId,
      actorRole,
      scheduledStartAt,
      durationMinutes,
      timeZone,
    }) {
      assertManagementRole(actorRole);
      assertFuture(scheduledStartAt, clock);
      const scheduledEndAt = calculateEnd(scheduledStartAt, durationMinutes);
      const result = await repository.reschedule({
        organizationId,
        interviewId,
        scheduledStartAt,
        scheduledEndAt,
        timeZone,
      });
      if (result.outcome === 'not_found') throw interviewNotFoundError();
      if (result.outcome === 'cancelled')
        throw interviewCannotRescheduleError();
      conflictError(result);
      return toInterviewDto(result.interview);
    },

    async cancel({
      organizationId,
      interviewId,
      actorRole,
      actorUserId,
      cancellationReason,
    }) {
      assertManagementRole(actorRole);
      const result = await repository.cancel({
        organizationId,
        interviewId,
        cancelledAt: clock(),
        cancelledByUserId: actorUserId,
        cancellationReason: cancellationReason ?? null,
      });
      if (result.outcome === 'not_found') throw interviewNotFoundError();
      if (result.outcome === 'already_cancelled') {
        throw interviewAlreadyCancelledError();
      }
      return toInterviewDto(result.interview);
    },
  };
}
