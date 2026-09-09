import { describe, expect, it, vi } from 'vitest';

import { createInterviewUseCases } from '../../src/modules/interviews/use-cases/interview-use-cases.js';
import { createNotificationService } from '../../src/modules/notifications/notification-service.js';
import { createScorecardUseCases } from '../../src/modules/scorecards/use-cases/scorecard-use-cases.js';

const organizationId = '01990b72-7c3a-7b2d-b6bb-9a6a7a1c0001';
const actorId = '01990b72-7c3a-7b2d-b6bb-9a6a7a1c0002';
const participantId = '01990b72-7c3a-7b2d-b6bb-9a6a7a1c0003';
const secondParticipantId = '01990b72-7c3a-7b2d-b6bb-9a6a7a1c0004';
const interviewId = '01990b72-7c3a-7b2d-b6bb-9a6a7a1c0005';
const applicationId = '01990b72-7c3a-7b2d-b6bb-9a6a7a1c0006';
const now = new Date('2026-09-07T08:00:00.000Z');

function interview(participants = [participantId, secondParticipantId]) {
  return {
    id: interviewId,
    organizationId,
    applicationId,
    createdByUserId: actorId,
    title: 'Panel',
    format: 'VIDEO',
    status: 'SCHEDULED',
    scheduledStartAt: new Date('2026-09-14T04:30:00.000Z'),
    scheduledEndAt: new Date('2026-09-14T05:30:00.000Z'),
    timeZone: 'UTC',
    participants: participants.map((userId) => ({
      id: `${userId}-p`,
      userId,
      user: { id: userId, email: `${userId}@example.test` },
    })),
    application: {
      candidate: { firstName: 'Ada', lastName: 'Lovelace' },
      job: { title: 'Engineer' },
    },
  };
}

function interviewRepository(result = interview()) {
  return {
    findApplicationForOrganization: vi.fn(async () => ({ id: applicationId })),
    findOrganizationMembers: vi.fn(async ({ userIds }) =>
      userIds.map((userId) => ({ userId })),
    ),
    create: vi.fn(async () => ({ outcome: 'created', interview: result })),
    reschedule: vi.fn(async () => ({ outcome: 'updated', interview: result })),
    cancel: vi.fn(async () => ({ outcome: 'cancelled', interview: result })),
  };
}

describe('Phase 16 notification service preferences', () => {
  it('defaults missing preferences to enabled, honors opt-out, requires membership, and keeps failure alerts mandatory', async () => {
    const prisma = {
      notificationPreference: { findUnique: vi.fn() },
      organizationMembership: {
        findUnique: vi.fn(async () => ({ id: 'membership' })),
      },
      notification: { create: vi.fn(async ({ data }) => data) },
    };
    const service = createNotificationService(prisma);
    await service.create({
      organizationId,
      recipientUserId: participantId,
      type: 'INTERVIEW_SCHEDULED',
      interviewId,
      title: 'x',
      message: 'x',
    });
    expect(prisma.notification.create).toHaveBeenCalledTimes(1);
    prisma.notificationPreference.findUnique.mockResolvedValueOnce({
      enabled: false,
    });
    await expect(
      service.create({
        organizationId,
        recipientUserId: participantId,
        type: 'INTERVIEW_RESCHEDULED',
        interviewId,
        title: 'x',
        message: 'x',
      }),
    ).resolves.toBeNull();
    expect(prisma.notification.create).toHaveBeenCalledTimes(1);
    prisma.notificationPreference.findUnique.mockResolvedValueOnce({
      enabled: false,
    });
    await service.create({
      organizationId,
      recipientUserId: participantId,
      type: 'CANDIDATE_COMMUNICATION_FAILED',
      applicationId,
      title: 'x',
      message: 'x',
    });
    expect(prisma.notification.create).toHaveBeenCalledTimes(2);
    prisma.organizationMembership.findUnique.mockResolvedValueOnce(null);
    await expect(
      service.create({
        organizationId,
        recipientUserId: '01990b72-7c3a-7b2d-b6bb-9a6a7a1c0099',
        type: 'INTERVIEW_CANCELLED',
        interviewId,
        title: 'x',
        message: 'x',
      }),
    ).resolves.toBeNull();
  });
});

describe('Phase 16 interview triggers', () => {
  it.each([
    ['schedule', 'INTERVIEW_SCHEDULED'],
    ['reschedule', 'INTERVIEW_RESCHEDULED'],
    ['cancel', 'INTERVIEW_CANCELLED'],
  ])(
    'notifies only final participants other than the actor on %s',
    async (method, type) => {
      const repository = interviewRepository(
        interview([actorId, participantId, secondParticipantId]),
      );
      const notifications = { create: vi.fn(async () => null) };
      const useCases = createInterviewUseCases({
        repository,
        notificationService: notifications,
        clock: () => now,
      });
      const input = {
        organizationId,
        interviewId,
        applicationId,
        actorRole: 'RECRUITER',
        actorUserId: actorId,
        title: 'Panel',
        format: 'VIDEO',
        scheduledStartAt: new Date('2026-09-14T04:30:00.000Z'),
        durationMinutes: 60,
        timeZone: 'UTC',
        participantUserIds: [actorId, participantId, secondParticipantId],
      };
      if (method === 'schedule') await useCases.schedule(input);
      if (method === 'reschedule') await useCases.reschedule(input);
      if (method === 'cancel') await useCases.cancel(input);
      expect(notifications.create).toHaveBeenCalledTimes(2);
      expect(notifications.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId,
          recipientUserId: participantId,
          type,
          interviewId,
        }),
      );
      expect(notifications.create).not.toHaveBeenCalledWith(
        expect.objectContaining({ recipientUserId: actorId }),
      );
    },
  );

  it('isolates notification insertion failure from interview completion', async () => {
    const repository = interviewRepository();
    const useCases = createInterviewUseCases({
      repository,
      notificationService: {
        create: vi.fn(async () => {
          throw new Error('unavailable');
        }),
      },
      clock: () => now,
    });
    await expect(
      useCases.cancel({
        organizationId,
        interviewId,
        actorRole: 'ADMIN',
        actorUserId: actorId,
      }),
    ).resolves.toMatchObject({ id: interviewId });
  });
});

describe('Phase 16 scorecard submitted trigger', () => {
  const submitted = {
    outcome: 'submitted',
    interview: { id: interviewId, createdByUserId: actorId },
    participant: { id: 'participant-row' },
    scorecard: {
      id: 'scorecard',
      status: 'SUBMITTED',
      revision: 2,
      templateVersion: { criteria: [] },
      responses: [],
      submittedAt: now,
    },
  };

  it('notifies the interview creator only after submission, never on draft save', async () => {
    const repository = {
      saveMy: vi.fn(async () => ({
        ...submitted,
        outcome: 'saved',
        scorecard: { ...submitted.scorecard, status: 'DRAFT' },
      })),
      submitMy: vi.fn(async () => submitted),
    };
    const notifications = { create: vi.fn(async () => null) };
    const cases = createScorecardUseCases({
      repository,
      notificationService: notifications,
      clock: () => now,
    });
    await cases.saveMy({
      organizationId,
      interviewId,
      actorUserId: participantId,
    });
    expect(notifications.create).not.toHaveBeenCalled();
    await cases.submitMy({
      organizationId,
      interviewId,
      actorUserId: participantId,
    });
    expect(notifications.create).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId,
        recipientUserId: actorId,
        type: 'SCORECARD_SUBMITTED',
        interviewId,
      }),
    );
  });

  it('excludes self-notification and isolates notification failures from submission', async () => {
    const repository = {
      submitMy: vi.fn(async () => ({
        ...submitted,
        interview: { id: interviewId, createdByUserId: participantId },
      })),
    };
    const self = { create: vi.fn() };
    await expect(
      createScorecardUseCases({
        repository,
        notificationService: self,
        clock: () => now,
      }).submitMy({ organizationId, interviewId, actorUserId: participantId }),
    ).resolves.toMatchObject({ status: 'SUBMITTED' });
    expect(self.create).not.toHaveBeenCalled();
    const failure = createScorecardUseCases({
      repository: { submitMy: vi.fn(async () => submitted) },
      notificationService: {
        create: vi.fn(async () => {
          throw new Error('unavailable');
        }),
      },
      clock: () => now,
    });
    await expect(
      failure.submitMy({
        organizationId,
        interviewId,
        actorUserId: participantId,
      }),
    ).resolves.toMatchObject({ status: 'SUBMITTED' });
  });
});
