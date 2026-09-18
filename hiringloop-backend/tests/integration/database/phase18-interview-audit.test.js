import { afterAll, beforeAll, describe, expect, it } from 'vitest';

process.env.NODE_ENV = 'test';

const { disconnectDatabase } = await import('../../../src/database/client.js');
const { createAuditRepository } =
  await import('../../../src/modules/audit/repositories/audit-repository.js');
const { createInterviewRepository } =
  await import('../../../src/modules/interviews/repositories/interview-repository.js');
const { createInterviewUseCases } =
  await import('../../../src/modules/interviews/use-cases/interview-use-cases.js');
const { fixture } = await import('../phase17-http-helpers.js');

const now = new Date('2026-03-01T00:00:00.000Z');
const auditActions = [
  'INTERVIEW_SCHEDULED',
  'INTERVIEW_UPDATED',
  'INTERVIEW_RESCHEDULED',
  'INTERVIEW_CANCELLED',
];
const failingAudit = {
  create: async () => {
    throw new Error('forced audit failure');
  },
};

describe('Phase 18 interview audit writers', () => {
  let f;
  let interviews;
  let interviewId;

  const scheduleInput = (extra = {}) => ({
    organizationId: f.organizationId,
    applicationId: f.primary.id,
    actorRole: 'RECRUITER',
    actorUserId: f.users.RECRUITER.id,
    title: 'Confidential panel notes',
    format: 'VIDEO',
    scheduledStartAt: new Date('2026-03-05T10:00:00.000Z'),
    durationMinutes: 60,
    timeZone: 'UTC',
    meetingUrl: 'https://private.example/secret',
    location: 'Private meeting room',
    participantUserIds: [f.users.INTERVIEWER.id],
    ...extra,
  });
  const schedule = (extra = {}) => interviews.schedule(scheduleInput(extra));

  beforeAll(async () => {
    f = await fixture('p18-interview-audit');
    interviews = createInterviewUseCases({
      repository: createInterviewRepository(
        f.prisma,
        createAuditRepository(f.prisma),
      ),
      clock: () => now,
    });
    interviewId = (await schedule()).id;
  });
  afterAll(async () => disconnectDatabase());

  it('writes exactly one safe audit event for each successful interview mutation', async () => {
    await interviews.update({
      organizationId: f.organizationId,
      interviewId,
      actorRole: 'RECRUITER',
      actorUserId: f.users.RECRUITER.id,
      title: 'Changed title',
    });
    await interviews.reschedule({
      organizationId: f.organizationId,
      interviewId,
      actorRole: 'RECRUITER',
      actorUserId: f.users.RECRUITER.id,
      scheduledStartAt: new Date('2026-03-06T10:00:00.000Z'),
      durationMinutes: 30,
      timeZone: 'UTC',
    });
    await interviews.cancel({
      organizationId: f.organizationId,
      interviewId,
      actorRole: 'ADMIN',
      actorUserId: f.users.ADMIN.id,
      cancellationReason: 'Sensitive free text reason',
    });
    const rows = await f.prisma.auditEvent.findMany({
      where: {
        organizationId: f.organizationId,
        resourceId: interviewId,
        action: { in: auditActions },
      },
      orderBy: { action: 'asc' },
    });
    expect(rows).toHaveLength(4);
    expect(rows.map((row) => row.action).sort()).toEqual(auditActions.sort());
    for (const row of rows) {
      for (const payload of [row.before, row.after].filter(Boolean))
        expect(Object.keys(payload).sort()).toEqual([
          'participantCount',
          'scheduledEndAt',
          'scheduledStartAt',
          'status',
        ]);
      expect(JSON.stringify(row)).not.toMatch(
        /private|secret|location|reason|candidate|title/i,
      );
    }
  });

  it('does not audit failed, unauthorized, or cross-organization operations', async () => {
    const before = await f.prisma.auditEvent.count({
      where: { organizationId: f.organizationId },
    });
    await expect(
      schedule({ scheduledStartAt: new Date('2026-03-01T00:00:00.000Z') }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    await expect(
      interviews.update({
        organizationId: f.organizationId,
        interviewId,
        actorRole: 'INTERVIEWER',
        actorUserId: f.users.INTERVIEWER.id,
        title: 'no',
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(
      interviews.update({
        organizationId: f.otherOrganizationId,
        interviewId,
        actorRole: 'RECRUITER',
        actorUserId: f.users.OTHER.id,
        title: 'no',
      }),
    ).rejects.toMatchObject({ code: 'INTERVIEW_NOT_FOUND' });
    expect(
      await f.prisma.auditEvent.count({
        where: { organizationId: f.organizationId },
      }),
    ).toBe(before);
  });

  it('rolls back both an interview mutation and its audit event when the audit write fails', async () => {
    const broken = createInterviewUseCases({
      repository: createInterviewRepository(f.prisma, failingAudit),
      clock: () => now,
    });
    const auditCount = await f.prisma.auditEvent.count({
      where: { organizationId: f.organizationId },
    });
    await expect(
      broken.schedule(
        scheduleInput({
          title: 'Rollback interview',
          scheduledStartAt: new Date('2026-03-08T10:00:00.000Z'),
        }),
      ),
    ).rejects.toThrow('forced audit failure');
    expect(
      await f.prisma.interview.findFirst({
        where: {
          organizationId: f.organizationId,
          title: 'Rollback interview',
        },
      }),
    ).toBeNull();
    expect(
      await f.prisma.auditEvent.count({
        where: { organizationId: f.organizationId },
      }),
    ).toBe(auditCount);
  });
});
