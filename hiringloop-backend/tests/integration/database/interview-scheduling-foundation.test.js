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

describe('Interview scheduling repository and use cases', () => {
  let prisma;
  let repository;
  let interviews;
  let organizationId;
  let otherOrganizationId;
  let recruiterId;
  let interviewerId;
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
        where: { organizationId },
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
      where: { id: { in: [recruiterId, interviewerId] } },
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
});
