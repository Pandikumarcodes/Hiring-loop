import { afterAll, beforeAll, describe, expect, it } from 'vitest';

process.env.NODE_ENV = 'test';

const { disconnectDatabase, getPrismaClient } =
  await import('../../../src/database/client.js');
const { createInterviewRepository } =
  await import('../../../src/modules/interviews/repositories/interview-repository.js');
const { createInterviewUseCases } =
  await import('../../../src/modules/interviews/use-cases/interview-use-cases.js');
const { createJobRepository } =
  await import('../../../src/modules/jobs/repositories/job-repository.js');
const { createJobUseCases } =
  await import('../../../src/modules/jobs/use-cases/job-use-cases.js');
const { generateEntityId } = await import('../../../src/utils/ids.js');

async function holdParticipantLock(prisma, organizationId, userId) {
  let markAcquired;
  let release;
  const acquired = new Promise((resolve) => (markAcquired = resolve));
  const released = new Promise((resolve) => (release = resolve));
  const task = prisma.$transaction(async (tx) => {
    await tx.$queryRaw`
      WITH lock AS MATERIALIZED (
        SELECT pg_advisory_xact_lock(
          hashtextextended(${`${organizationId}:${userId}`}, 0)
        )
      )
      SELECT 1 AS locked FROM lock
    `;
    const [backend] = await tx.$queryRaw`SELECT pg_backend_pid()::int AS pid`;
    markAcquired(backend.pid);
    await released;
  });
  return { pid: await acquired, release, task };
}

async function waitForBlockedQueries(prisma, blockerPid, fragment, count) {
  const deadline = Date.now() + 10_000;
  let rows = [];
  while (Date.now() < deadline) {
    rows = await prisma.$queryRaw`
      SELECT pid
      FROM pg_stat_activity
      WHERE datname = current_database()
        AND pid <> pg_backend_pid()
        AND ${blockerPid} = ANY(pg_blocking_pids(pid))
        AND query ILIKE ${`%${fragment}%`}
    `;
    if (rows.length >= count) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error(
    `Timed out waiting for ${count} blocked queries containing ${fragment}; found ${rows.length}`,
  );
}

describe('Interview scheduling repository and use cases', () => {
  let prisma;
  let repository;
  let interviews;
  let organizationId;
  let otherOrganizationId;
  let recruiterId;
  let interviewerId;
  let otherInterviewerId;
  let applicationId;
  let jobId;
  const now = new Date('2026-09-07T08:00:00.000Z');
  const start = new Date('2026-09-14T04:30:00.000Z');

  beforeAll(async () => {
    prisma = getPrismaClient();
    repository = createInterviewRepository(prisma);
    interviews = createInterviewUseCases({
      repository,
      clock: () => now,
    });
    organizationId = generateEntityId();
    otherOrganizationId = generateEntityId();
    recruiterId = generateEntityId();
    interviewerId = generateEntityId();
    otherInterviewerId = generateEntityId();
    applicationId = generateEntityId();
    await prisma.organization.createMany({
      data: [
        {
          id: organizationId,
          name: 'Interview Organization',
          slug: `interviews-${organizationId.slice(-12)}`,
        },
        {
          id: otherOrganizationId,
          name: 'Other Interview Organization',
          slug: `other-interviews-${otherOrganizationId.slice(-12)}`,
        },
      ],
    });
    await prisma.user.createMany({
      data: [
        {
          id: recruiterId,
          email: `${recruiterId}@example.com`,
        },
        {
          id: interviewerId,
          email: `${interviewerId}@example.com`,
        },
        {
          id: otherInterviewerId,
          email: `${otherInterviewerId}@example.com`,
        },
      ],
    });
    await prisma.organizationMembership.createMany({
      data: [
        {
          id: generateEntityId(),
          organizationId,
          userId: recruiterId,
          role: 'RECRUITER',
        },
        {
          id: generateEntityId(),
          organizationId,
          userId: interviewerId,
          role: 'INTERVIEWER',
        },
        {
          id: generateEntityId(),
          organizationId: otherOrganizationId,
          userId: otherInterviewerId,
          role: 'INTERVIEWER',
        },
      ],
    });

    const job = await createJobUseCases({
      jobRepository: createJobRepository(prisma),
      clock: () => now,
    }).create({
      organizationId,
      data: { title: 'Platform Engineer' },
    });
    jobId = job.id;
    const form = await prisma.applicationForm.findUnique({
      where: { jobId },
      select: { activeVersionId: true },
    });
    const stage = await prisma.pipelineStage.findFirst({
      where: { pipeline: { jobId }, position: 1 },
      select: { id: true },
    });
    const candidateId = generateEntityId();
    await prisma.candidate.create({
      data: {
        id: candidateId,
        organizationId,
        normalizedEmail: 'ada@example.com',
        email: 'ada@example.com',
        firstName: 'Ada',
        lastName: 'Lovelace',
      },
    });
    await prisma.application.create({
      data: {
        id: applicationId,
        organizationId,
        jobId,
        candidateId,
        applicationFormVersionId: form.activeVersionId,
        currentPipelineStageId: stage.id,
        submittedFirstName: 'Ada',
        submittedLastName: 'Lovelace',
        submittedEmail: 'ada@example.com',
        idempotencyKey: generateEntityId(),
        requestFingerprint: 'a'.repeat(64),
      },
    });
  });

  afterAll(async () => {
    await prisma.$transaction(async (transaction) => {
      await transaction.$executeRawUnsafe('SET CONSTRAINTS ALL DEFERRED');
      await transaction.interviewParticipant.deleteMany({
        where: { interview: { organizationId } },
      });
      await transaction.interview.deleteMany({ where: { organizationId } });
      await transaction.application.deleteMany({ where: { organizationId } });
      await transaction.candidate.deleteMany({ where: { organizationId } });
      await transaction.organizationMembership.deleteMany({
        where: {
          organizationId: { in: [organizationId, otherOrganizationId] },
        },
      });
      await transaction.applicationFormVersion.deleteMany({
        where: { organizationId },
      });
      await transaction.applicationForm.deleteMany({
        where: { organizationId },
      });
    });
    await prisma.pipelineStage.deleteMany({ where: { pipeline: { jobId } } });
    await prisma.pipeline.deleteMany({ where: { jobId } });
    await prisma.job.deleteMany({ where: { organizationId } });
    await prisma.user.deleteMany({
      where: { id: { in: [recruiterId, interviewerId, otherInterviewerId] } },
    });
    await prisma.organization.deleteMany({
      where: { id: { in: [organizationId, otherOrganizationId] } },
    });
    await disconnectDatabase();
  });

  it('creates, lists, and derives the end time while preserving tenant scope', async () => {
    const created = await interviews.schedule({
      organizationId,
      applicationId,
      actorRole: 'RECRUITER',
      actorUserId: recruiterId,
      title: 'Technical Round 1',
      format: 'VIDEO',
      scheduledStartAt: start,
      durationMinutes: 60,
      timeZone: 'Asia/Kolkata',
      participantUserIds: [interviewerId],
      meetingUrl: 'https://meet.google.com/example',
    });
    expect(created.scheduledEndAt).toEqual(
      new Date('2026-09-14T05:30:00.000Z'),
    );
    expect(created.participants[0].user.id).toBe(interviewerId);
    expect(created.application.candidate.name).toBe('Ada Lovelace');
    expect(
      await interviews.listForApplication({
        organizationId,
        applicationId,
        actorRole: 'INTERVIEWER',
        actorUserId: interviewerId,
      }),
    ).toHaveLength(1);
    expect(
      await repository.findByIdForAccess({
        organizationId: otherOrganizationId,
        interviewId: created.id,
        participantOnly: false,
      }),
    ).toBeNull();
  });

  it('detects overlap, ignores cancelled interviews, and persists cancellation', async () => {
    await expect(
      interviews.schedule({
        organizationId,
        applicationId,
        actorRole: 'RECRUITER',
        actorUserId: recruiterId,
        title: 'Overlapping Round',
        format: 'PHONE',
        scheduledStartAt: new Date(start.getTime() + 15 * 60 * 1000),
        durationMinutes: 30,
        timeZone: 'UTC',
        participantUserIds: [interviewerId],
      }),
    ).rejects.toMatchObject({ code: 'INTERVIEW_SCHEDULE_CONFLICT' });

    const scheduled = await repository.listForOrganization({
      organizationId,
      from: new Date('2026-09-14T00:00:00.000Z'),
      to: new Date('2026-09-15T00:00:00.000Z'),
    });
    await interviews.cancel({
      organizationId,
      interviewId: scheduled[0].id,
      actorRole: 'ADMIN',
      actorUserId: recruiterId,
      cancellationReason: 'Panel unavailable',
    });
    const replacement = await interviews.schedule({
      organizationId,
      applicationId,
      actorRole: 'RECRUITER',
      actorUserId: recruiterId,
      title: 'Replacement Round',
      format: 'PHONE',
      scheduledStartAt: new Date(start.getTime() + 15 * 60 * 1000),
      durationMinutes: 30,
      timeZone: 'UTC',
      participantUserIds: [interviewerId],
    });
    expect(replacement.status).toBe('SCHEDULED');
    await expect(
      interviews.reschedule({
        organizationId,
        interviewId: scheduled[0].id,
        actorRole: 'RECRUITER',
        scheduledStartAt: new Date('2026-09-16T04:30:00.000Z'),
        durationMinutes: 30,
        timeZone: 'UTC',
      }),
    ).rejects.toMatchObject({ code: 'INTERVIEW_CANNOT_RESCHEDULE' });
  });

  it('discovers only tenant participants and persists editable interview fields', async () => {
    const eligible = await repository.listEligibleParticipants({
      organizationId,
    });
    expect(eligible.map(({ userId }) => userId).sort()).toEqual(
      [recruiterId, interviewerId].sort(),
    );

    const created = await interviews.schedule({
      organizationId,
      applicationId,
      actorRole: 'RECRUITER',
      actorUserId: recruiterId,
      title: 'Onsite panel',
      format: 'ONSITE',
      scheduledStartAt: new Date(start.getTime() + 2 * 86_400_000),
      durationMinutes: 45,
      timeZone: 'UTC',
      location: 'Room 12',
      participantUserIds: [interviewerId],
    });
    const updated = await interviews.update({
      organizationId,
      interviewId: created.id,
      actorRole: 'RECRUITER',
      actorUserId: recruiterId,
      title: 'Video panel',
      format: 'VIDEO',
      location: null,
      meetingUrl: 'https://meet.example.test/panel',
      participantUserIds: [interviewerId, recruiterId],
    });
    expect(updated.title).toBe('Video panel');
    expect(updated.meetingUrl).toBe('https://meet.example.test/panel');
    expect(updated.location).toBeNull();
    expect(updated.participants.map(({ user }) => user.id).sort()).toEqual(
      [recruiterId, interviewerId].sort(),
    );
    const internalProjection = await repository.findByIdForAccess({
      organizationId,
      interviewId: created.id,
      participantOnly: false,
    });
    expect(internalProjection.organizationId).toBe(organizationId);
    expect(
      internalProjection.participants.map(({ userId }) => userId).sort(),
    ).toEqual([recruiterId, interviewerId].sort());
    const persistedParticipants = await prisma.interviewParticipant.findMany({
      where: { interviewId: created.id },
      select: { interviewId: true, userId: true },
    });
    expect(persistedParticipants).toHaveLength(2);
    expect(
      persistedParticipants.every(
        ({ interviewId }) => interviewId === created.id,
      ),
    ).toBe(true);

    await expect(
      interviews.update({
        organizationId,
        interviewId: created.id,
        actorRole: 'RECRUITER',
        actorUserId: recruiterId,
        participantUserIds: [otherInterviewerId],
      }),
    ).rejects.toMatchObject({ code: 'INVALID_INTERVIEW_PARTICIPANT' });
    const afterInvalidUpdate = await prisma.interviewParticipant.findMany({
      where: { interviewId: created.id },
      select: { userId: true },
    });
    expect(afterInvalidUpdate.map(({ userId }) => userId).sort()).toEqual(
      [recruiterId, interviewerId].sort(),
    );

    await Promise.all([
      interviews.update({
        organizationId,
        interviewId: created.id,
        actorRole: 'RECRUITER',
        actorUserId: recruiterId,
        participantUserIds: [interviewerId],
      }),
      interviews.update({
        organizationId,
        interviewId: created.id,
        actorRole: 'RECRUITER',
        actorUserId: recruiterId,
        participantUserIds: [recruiterId],
      }),
    ]);
    const afterConcurrentReplacement =
      await prisma.interviewParticipant.findMany({
        where: { interviewId: created.id },
        select: { userId: true },
      });
    expect(afterConcurrentReplacement).toHaveLength(1);
    expect([recruiterId, interviewerId]).toContain(
      afterConcurrentReplacement[0].userId,
    );

    await prisma.organizationMembership.deleteMany({
      where: { organizationId, userId: recruiterId },
    });
    const staleReplacement = await repository.updateMetadata({
      organizationId,
      interviewId: created.id,
      data: { title: 'Must not persist' },
      participants: [{ id: generateEntityId(), userId: recruiterId }],
      actorUserId: recruiterId,
    });
    expect(staleReplacement).toMatchObject({
      outcome: 'invalid_participant',
      invalidUserIds: [recruiterId],
    });
    const unchangedInterview = await prisma.interview.findUnique({
      where: { id: created.id },
      select: { title: true, participants: { select: { userId: true } } },
    });
    expect(unchangedInterview.title).toBe('Video panel');
    expect(unchangedInterview.participants.map(({ userId }) => userId)).toEqual(
      afterConcurrentReplacement.map(({ userId }) => userId),
    );
  });

  it('serializes concurrent bookings for the same participant and time', async () => {
    const input = {
      organizationId,
      applicationId,
      actorRole: 'RECRUITER',
      actorUserId: recruiterId,
      title: 'Concurrent panel',
      format: 'PHONE',
      scheduledStartAt: new Date(start.getTime() + 5 * 86_400_000),
      durationMinutes: 45,
      timeZone: 'UTC',
      participantUserIds: [interviewerId],
    };
    const outcomes = await Promise.allSettled([
      interviews.schedule(input),
      interviews.schedule(input),
    ]);
    expect(
      outcomes.filter(({ status }) => status === 'fulfilled'),
    ).toHaveLength(1);
    expect(outcomes.filter(({ status }) => status === 'rejected')).toHaveLength(
      1,
    );
    expect(
      outcomes.find(({ status }) => status === 'rejected').reason,
    ).toMatchObject({
      code: 'INTERVIEW_SCHEDULE_CONFLICT',
    });
  });

  it('serializes simultaneous reschedules into an overlapping slot', async () => {
    const scheduleAt = async (days, title) =>
      interviews.schedule({
        organizationId,
        applicationId,
        actorRole: 'RECRUITER',
        actorUserId: recruiterId,
        title,
        format: 'PHONE',
        scheduledStartAt: new Date(start.getTime() + days * 86_400_000),
        durationMinutes: 45,
        timeZone: 'UTC',
        participantUserIds: [interviewerId],
      });
    const [first, second] = await Promise.all([
      scheduleAt(20, 'Reschedule race A'),
      scheduleAt(22, 'Reschedule race B'),
    ]);
    const holder = await holdParticipantLock(
      prisma,
      organizationId,
      interviewerId,
    );
    try {
      const operations = [first, second].map((interview) =>
        interviews.reschedule({
          organizationId,
          interviewId: interview.id,
          actorRole: 'RECRUITER',
          scheduledStartAt: new Date(start.getTime() + 24 * 86_400_000),
          durationMinutes: 45,
          timeZone: 'UTC',
        }),
      );
      await waitForBlockedQueries(
        prisma,
        holder.pid,
        'pg_advisory_xact_lock',
        2,
      );
      holder.release();
      const outcomes = await Promise.allSettled(operations);
      expect(
        outcomes.filter(({ status }) => status === 'fulfilled'),
      ).toHaveLength(1);
      expect(
        outcomes.filter(({ status }) => status === 'rejected'),
      ).toHaveLength(1);
      expect(
        outcomes.find(({ status }) => status === 'rejected').reason,
      ).toMatchObject({
        code: 'INTERVIEW_SCHEDULE_CONFLICT',
      });
    } finally {
      holder.release();
      await holder.task;
    }
  }, 15_000);
});
