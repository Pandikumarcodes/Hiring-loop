import { describe, expect, it, vi } from 'vitest';

import { createInterviewUseCases } from '../../../src/modules/interviews/use-cases/interview-use-cases.js';
import {
  listInterviewsQuerySchema,
  scheduleInterviewBodySchema,
} from '../../../src/modules/interviews/schemas/interview-schemas.js';

const organizationId = '01990b72-7c3a-7b2d-b6bb-9a6a7a1c0001';
const otherOrganizationId = '01990b72-7c3a-7b2d-b6bb-9a6a7a1c0002';
const applicationId = '01990b72-7c3a-7b2d-b6bb-9a6a7a1c0010';
const interviewerId = '01990b72-7c3a-7b2d-b6bb-9a6a7a1c0020';
const secondInterviewerId = '01990b72-7c3a-7b2d-b6bb-9a6a7a1c0021';
const fixedNow = new Date('2026-09-07T08:00:00.000Z');
const start = new Date('2026-09-14T04:30:00.000Z');

function application() {
  return {
    id: applicationId,
    candidate: {
      id: '01990b72-7c3a-7b2d-b6bb-9a6a7a1c0030',
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
    },
    job: {
      id: '01990b72-7c3a-7b2d-b6bb-9a6a7a1c0040',
      title: 'Platform Engineer',
    },
  };
}

function interview(overrides = {}) {
  return {
    id: '01990b72-7c3a-7b2d-b6bb-9a6a7a1c0050',
    title: 'Technical Round 1',
    format: 'VIDEO',
    status: 'SCHEDULED',
    scheduledStartAt: start,
    scheduledEndAt: new Date(start.getTime() + 60 * 60 * 1000),
    timeZone: 'Asia/Kolkata',
    meetingUrl: 'https://meet.google.com/example',
    location: null,
    participants: [
      {
        id: '01990b72-7c3a-7b2d-b6bb-9a6a7a1c0060',
        user: { id: interviewerId, email: 'interviewer@example.com' },
      },
    ],
    application: application(),
    cancelledAt: null,
    cancelledByUserId: null,
    cancellationReason: null,
    createdAt: fixedNow,
    updatedAt: fixedNow,
    ...overrides,
  };
}

function repository(overrides = {}) {
  return {
    findApplicationForOrganization: vi.fn(async ({ organizationId: id }) =>
      id === organizationId ? application() : null,
    ),
    findOrganizationMembers: vi.fn(async ({ userIds }) =>
      userIds.map((userId) => ({
        userId,
        user: { id: userId, email: `${userId}@example.com` },
      })),
    ),
    findByIdForAccess: vi.fn(async () => interview()),
    listByApplication: vi.fn(async () => [interview()]),
    listForOrganization: vi.fn(async () => [interview()]),
    create: vi.fn(async () => ({ outcome: 'created', interview: interview() })),
    updateMetadata: vi.fn(async () => ({
      outcome: 'updated',
      interview: interview(),
    })),
    reschedule: vi.fn(async () => ({
      outcome: 'updated',
      interview: interview(),
    })),
    cancel: vi.fn(async () => ({
      outcome: 'cancelled',
      interview: interview({ status: 'CANCELLED' }),
    })),
    ...overrides,
  };
}

function useCases(repo) {
  return createInterviewUseCases({ repository: repo, clock: () => fixedNow });
}

describe('interview use cases', () => {
  it('schedules an interview with a derived end time and assigned participants', async () => {
    const repo = repository();
    const result = await useCases(repo).schedule({
      organizationId,
      applicationId,
      actorRole: 'RECRUITER',
      actorUserId: interviewerId,
      title: 'Technical Round 1',
      format: 'VIDEO',
      scheduledStartAt: start,
      durationMinutes: 60,
      timeZone: 'Asia/Kolkata',
      meetingUrl: 'https://meet.google.com/example',
      location: null,
      participantUserIds: [interviewerId],
    });

    expect(result.application.job.title).toBe('Platform Engineer');
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        applicationId,
        data: expect.objectContaining({
          scheduledEndAt: new Date('2026-09-14T05:30:00.000Z'),
        }),
        participants: [expect.objectContaining({ userId: interviewerId })],
      }),
    );
  });

  it('keeps application and participant validation tenant-scoped', async () => {
    const repo = repository({
      findOrganizationMembers: vi.fn(async () => []),
    });
    const cases = [
      useCases(repo).schedule({
        organizationId: otherOrganizationId,
        applicationId,
        actorRole: 'ADMIN',
        actorUserId: interviewerId,
        title: 'Round',
        format: 'PHONE',
        scheduledStartAt: start,
        durationMinutes: 30,
        timeZone: 'UTC',
        participantUserIds: [interviewerId],
      }),
      useCases(repo).schedule({
        organizationId,
        applicationId,
        actorRole: 'ADMIN',
        actorUserId: interviewerId,
        title: 'Round',
        format: 'PHONE',
        scheduledStartAt: start,
        durationMinutes: 30,
        timeZone: 'UTC',
        participantUserIds: [interviewerId],
      }),
    ];

    await expect(cases[0]).rejects.toMatchObject({
      code: 'INTERVIEW_NOT_FOUND',
    });
    await expect(cases[1]).rejects.toMatchObject({
      code: 'INVALID_INTERVIEW_PARTICIPANT',
    });
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('returns a structured conflict and does not create an overlapping interview', async () => {
    const repo = repository({
      create: vi.fn(async () => ({
        outcome: 'conflict',
        conflict: { participantUserIds: [interviewerId] },
      })),
    });
    await expect(
      useCases(repo).schedule({
        organizationId,
        applicationId,
        actorRole: 'ADMIN',
        actorUserId: interviewerId,
        title: 'Round',
        format: 'VIDEO',
        scheduledStartAt: start,
        durationMinutes: 30,
        timeZone: 'UTC',
        participantUserIds: [interviewerId],
      }),
    ).rejects.toMatchObject({ code: 'INTERVIEW_SCHEDULE_CONFLICT' });
  });

  it('limits interviewer reads to assigned resources and mine calendar queries', async () => {
    const repo = repository();
    const cases = useCases(repo);
    await cases.listForApplication({
      organizationId,
      applicationId,
      actorRole: 'INTERVIEWER',
      actorUserId: interviewerId,
    });
    expect(repo.listByApplication).toHaveBeenCalledWith({
      organizationId,
      applicationId,
      participantUserId: interviewerId,
    });
    await expect(
      cases.listForOrganization({
        organizationId,
        actorRole: 'INTERVIEWER',
        actorUserId: interviewerId,
        from: fixedNow,
        to: new Date(fixedNow.getTime() + 86_400_000),
        mine: false,
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('handles reschedule, cancellation, and cancelled interview read behavior', async () => {
    const repo = repository();
    const cases = useCases(repo);
    await cases.reschedule({
      organizationId,
      interviewId: interview().id,
      actorRole: 'RECRUITER',
      scheduledStartAt: new Date('2026-09-15T04:30:00.000Z'),
      durationMinutes: 45,
      timeZone: 'Europe/London',
    });
    await cases.cancel({
      organizationId,
      interviewId: interview().id,
      actorRole: 'RECRUITER',
      actorUserId: interviewerId,
      cancellationReason: 'Panel unavailable',
    });
    expect(repo.reschedule).toHaveBeenCalled();
    expect(repo.cancel).toHaveBeenCalledWith(
      expect.objectContaining({ cancellationReason: 'Panel unavailable' }),
    );
    const cancelled = interview({
      status: 'CANCELLED',
      cancellationReason: 'Panel unavailable',
    });
    repo.findByIdForAccess.mockResolvedValueOnce(cancelled);
    expect(
      (
        await cases.detail({
          organizationId,
          interviewId: cancelled.id,
          actorRole: 'ADMIN',
          actorUserId: interviewerId,
        })
      ).status,
    ).toBe('CANCELLED');
  });
});

describe('interview validation', () => {
  it('rejects malformed time, invalid timezone, and duplicate participants', () => {
    const result = scheduleInterviewBodySchema.safeParse({
      title: 'Round',
      format: 'VIDEO',
      scheduledStartAt: 'not-a-date',
      durationMinutes: 0,
      timeZone: 'IST',
      participantUserIds: [interviewerId, interviewerId],
    });
    expect(result.success).toBe(false);
  });

  it('requires a bounded chronological calendar range', () => {
    const result = listInterviewsQuerySchema.safeParse({
      from: '2026-09-01T00:00:00Z',
      to: '2026-10-15T00:00:00Z',
      mine: 'true',
    });
    expect(result.success).toBe(false);
  });
});
