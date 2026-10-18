import { afterAll, beforeAll, describe, expect, it } from 'vitest';

process.env.NODE_ENV = 'test';

const { disconnectDatabase } = await import('../../../src/database/client.js');
const { createAuditRepository } =
  await import('../../../src/modules/audit/repositories/audit-repository.js');
const { createScorecardRepository } =
  await import('../../../src/modules/scorecards/repositories/scorecard-repository.js');
const { createScorecardUseCases } =
  await import('../../../src/modules/scorecards/use-cases/scorecard-use-cases.js');
const { createInterviewRepository } =
  await import('../../../src/modules/interviews/repositories/interview-repository.js');
const { createInterviewUseCases } =
  await import('../../../src/modules/interviews/use-cases/interview-use-cases.js');
const { fixture, generateEntityId } =
  await import('../phase17-http-helpers.js');

const clock = () => new Date('2026-04-01T12:00:00.000Z');
const failingAudit = {
  create: async () => {
    throw new Error('forced audit failure');
  },
};

async function holdInterviewRow(prisma, interviewId) {
  let markAcquired;
  let release;
  const acquired = new Promise((resolve) => (markAcquired = resolve));
  const released = new Promise((resolve) => (release = resolve));
  const task = prisma.$transaction(async (tx) => {
    await tx.$queryRaw`
      SELECT "id" FROM "Interview" WHERE "id" = ${interviewId} FOR UPDATE
    `;
    const [backend] = await tx.$queryRaw`SELECT pg_backend_pid()::int AS pid`;
    markAcquired(backend.pid);
    await released;
  });
  return { pid: await acquired, release, task };
}

async function waitUntilBlockedBy(prisma, blockerPid, queryFragment) {
  const deadline = Date.now() + 10_000;
  let lastRows = [];
  while (Date.now() < deadline) {
    lastRows = await prisma.$queryRaw`
      SELECT pid, query
      FROM pg_stat_activity
      WHERE datname = current_database()
        AND pid <> pg_backend_pid()
        AND ${blockerPid} = ANY(pg_blocking_pids(pid))
        AND query ILIKE ${`%${queryFragment}%`}
    `;
    if (lastRows.length >= 1) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error(
    `Timed out waiting for lock query ${queryFragment}; blocked queries: ${JSON.stringify(lastRows)}`,
  );
}

async function waitForLockWaiterQuery(prisma, queryFragment) {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    const rows = await prisma.$queryRaw`
      SELECT pid
      FROM pg_stat_activity
      WHERE datname = current_database()
        AND pid <> pg_backend_pid()
        AND wait_event_type = 'Lock'
        AND query ILIKE ${`%${queryFragment}%`}
    `;
    if (rows.length >= 1) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error(`Timed out waiting for lock query ${queryFragment}`);
}

describe('Phase 18 scorecard audit writers', () => {
  let f;
  let scorecards;
  let interviewId;
  let criterionId;
  const publish = (useCases = scorecards, extra = {}) =>
    useCases.publishTemplate({
      organizationId: f.organizationId,
      jobId: f.primary.jobId,
      actorRole: 'RECRUITER',
      actorUserId: f.users.RECRUITER.id,
      expectedRevision: 2,
      ...extra,
    });

  beforeAll(async () => {
    f = await fixture('p18-scorecard-audit');
    scorecards = createScorecardUseCases({
      repository: createScorecardRepository(
        f.prisma,
        createAuditRepository(f.prisma),
      ),
      clock,
    });
    await scorecards.createDraft({
      organizationId: f.organizationId,
      jobId: f.primary.jobId,
      actorRole: 'RECRUITER',
      actorUserId: f.users.RECRUITER.id,
    });
    const draft = await scorecards.updateTemplate({
      organizationId: f.organizationId,
      jobId: f.primary.jobId,
      actorRole: 'RECRUITER',
      actorUserId: f.users.RECRUITER.id,
      expectedRevision: 1,
      title: 'Private evaluation instructions',
      instructions: 'Sensitive free text',
      criteria: [
        {
          label: 'Confidential criterion',
          description: 'Private notes',
          type: 'RATING',
          required: true,
          position: 1,
        },
      ],
    });
    criterionId = draft.draft.criteria[0].id;
    await publish();
    interviewId = generateEntityId();
    await f.prisma.interview.create({
      data: {
        id: interviewId,
        organizationId: f.organizationId,
        applicationId: f.primary.id,
        createdByUserId: f.users.RECRUITER.id,
        title: 'Scorecard interview',
        format: 'VIDEO',
        scheduledStartAt: new Date('2026-04-02T10:00:00.000Z'),
        scheduledEndAt: new Date('2026-04-02T11:00:00.000Z'),
        timeZone: 'UTC',
        participants: {
          create: { id: generateEntityId(), userId: f.users.INTERVIEWER.id },
        },
      },
    });
  });
  afterAll(async () => disconnectDatabase());

  it('writes exactly one safe publication and submission audit event', async () => {
    const submitted = await scorecards.submitMy({
      organizationId: f.organizationId,
      interviewId,
      actorUserId: f.users.INTERVIEWER.id,
      actorRole: 'INTERVIEWER',
      responses: [
        { criterionId, ratingValue: 5, comment: 'Sensitive answer comment' },
      ],
      overallRecommendation: 'YES',
      overallComment: 'Sensitive recommendation',
    });
    const rows = await f.prisma.auditEvent.findMany({
      where: {
        organizationId: f.organizationId,
        action: { in: ['SCORECARD_TEMPLATE_PUBLISHED', 'SCORECARD_SUBMITTED'] },
      },
      orderBy: { action: 'asc' },
    });
    expect(rows).toHaveLength(2);
    const publication = rows.find(
      (row) => row.action === 'SCORECARD_TEMPLATE_PUBLISHED',
    );
    const submission = rows.find((row) => row.action === 'SCORECARD_SUBMITTED');
    expect(publication.after).toEqual({
      status: 'PUBLISHED',
      versionNumber: 1,
    });
    expect(Object.keys(publication.metadata).sort()).toEqual(['versionId']);
    expect(submission.after).toEqual({ status: 'SUBMITTED' });
    expect(Object.keys(submission.metadata).sort()).toEqual([
      'applicationId',
      'interviewId',
      'templateVersionId',
    ]);
    expect(JSON.stringify(rows)).not.toMatch(
      /answer|comment|recommendation|candidate|sensitive|private|criterion/i,
    );
    expect(submitted.status).toBe('SUBMITTED');
    await expect(
      scorecards.submitMy({
        organizationId: f.organizationId,
        interviewId,
        actorUserId: f.users.INTERVIEWER.id,
        responses: [
          { criterionId, ratingValue: 5, comment: 'duplicate submission' },
        ],
        overallRecommendation: 'YES',
      }),
    ).rejects.toMatchObject({ code: 'CONFLICT' });
  });

  it('rolls back an incomplete first submission instead of creating a draft', async () => {
    const incompleteInterviewId = generateEntityId();
    await f.prisma.interview.create({
      data: {
        id: incompleteInterviewId,
        organizationId: f.organizationId,
        applicationId: f.primary.id,
        createdByUserId: f.users.RECRUITER.id,
        title: 'Incomplete scorecard interview',
        format: 'VIDEO',
        scheduledStartAt: new Date('2026-04-06T10:00:00.000Z'),
        scheduledEndAt: new Date('2026-04-06T11:00:00.000Z'),
        timeZone: 'UTC',
        participants: {
          create: { id: generateEntityId(), userId: f.users.INTERVIEWER.id },
        },
      },
    });
    await expect(
      scorecards.submitMy({
        organizationId: f.organizationId,
        interviewId: incompleteInterviewId,
        actorUserId: f.users.INTERVIEWER.id,
        responses: [],
        overallRecommendation: null,
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(
      await f.prisma.scorecard.count({
        where: { interviewId: incompleteInterviewId },
      }),
    ).toBe(0);
  });

  it('keeps an existing draft unchanged when an invalid response is rejected', async () => {
    const invalidInterviewId = generateEntityId();
    await f.prisma.interview.create({
      data: {
        id: invalidInterviewId,
        organizationId: f.organizationId,
        applicationId: f.primary.id,
        createdByUserId: f.users.RECRUITER.id,
        title: 'Invalid response interview',
        format: 'VIDEO',
        scheduledStartAt: new Date('2026-04-04T10:00:00.000Z'),
        scheduledEndAt: new Date('2026-04-04T11:00:00.000Z'),
        timeZone: 'UTC',
        participants: {
          create: { id: generateEntityId(), userId: f.users.INTERVIEWER.id },
        },
      },
    });
    await scorecards.saveMy({
      organizationId: f.organizationId,
      interviewId: invalidInterviewId,
      actorUserId: f.users.INTERVIEWER.id,
      responses: [{ criterionId, ratingValue: 4, comment: 'retain me' }],
      overallRecommendation: 'YES',
      overallComment: 'original draft',
    });
    const before = await f.prisma.scorecard.findFirst({
      where: { interviewId: invalidInterviewId },
      include: { responses: true },
    });

    await expect(
      scorecards.saveMy({
        organizationId: f.organizationId,
        interviewId: invalidInterviewId,
        actorUserId: f.users.INTERVIEWER.id,
        expectedRevision: before.revision,
        responses: [
          { criterionId, textValue: 'wrong response type', comment: 'bad' },
        ],
        overallRecommendation: 'NO',
        overallComment: 'must not persist',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });

    const after = await f.prisma.scorecard.findFirst({
      where: { interviewId: invalidInterviewId },
      include: { responses: true },
    });
    expect(after.revision).toBe(before.revision);
    expect(after.overallRecommendation).toBe(before.overallRecommendation);
    expect(after.overallComment).toBe(before.overallComment);
    expect(after.responses).toEqual(before.responses);
  });

  it('allows only one mutation using the same expected revision', async () => {
    const concurrentInterviewId = generateEntityId();
    await f.prisma.interview.create({
      data: {
        id: concurrentInterviewId,
        organizationId: f.organizationId,
        applicationId: f.primary.id,
        createdByUserId: f.users.RECRUITER.id,
        title: 'Concurrent scorecard interview',
        format: 'VIDEO',
        scheduledStartAt: new Date('2026-04-05T10:00:00.000Z'),
        scheduledEndAt: new Date('2026-04-05T11:00:00.000Z'),
        timeZone: 'UTC',
        participants: {
          create: { id: generateEntityId(), userId: f.users.INTERVIEWER.id },
        },
      },
    });
    await scorecards.saveMy({
      organizationId: f.organizationId,
      interviewId: concurrentInterviewId,
      actorUserId: f.users.INTERVIEWER.id,
      responses: [],
      overallRecommendation: 'YES',
    });
    const attempts = await Promise.allSettled(
      ['NO', 'STRONG_YES'].map((recommendation) =>
        scorecards.saveMy({
          organizationId: f.organizationId,
          interviewId: concurrentInterviewId,
          actorUserId: f.users.INTERVIEWER.id,
          expectedRevision: 1,
          responses: [],
          overallRecommendation: recommendation,
        }),
      ),
    );
    expect(
      attempts.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    expect(
      attempts.filter((result) => result.status === 'rejected'),
    ).toHaveLength(1);
    expect(
      attempts.find((result) => result.status === 'rejected').reason,
    ).toMatchObject({
      code: 'CONFLICT',
    });
    const saved = await f.prisma.scorecard.findFirst({
      where: { interviewId: concurrentInterviewId },
    });
    expect(saved.revision).toBe(2);
    expect(['NO', 'STRONG_YES']).toContain(saved.overallRecommendation);
  });

  it('does not audit failed, unauthorized, or cross-organization calls', async () => {
    const before = await f.prisma.auditEvent.count({
      where: { organizationId: f.organizationId },
    });
    await expect(
      scorecards.publishTemplate({
        organizationId: f.organizationId,
        jobId: f.primary.jobId,
        actorRole: 'INTERVIEWER',
        actorUserId: f.users.INTERVIEWER.id,
        expectedRevision: 3,
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(
      scorecards.publishTemplate({
        organizationId: f.otherOrganizationId,
        jobId: f.primary.jobId,
        actorRole: 'RECRUITER',
        actorUserId: f.users.OTHER.id,
        expectedRevision: 3,
      }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await expect(
      scorecards.submitMy({
        organizationId: f.organizationId,
        interviewId,
        actorUserId: f.users.INTERVIEWER.id,
        actorRole: 'INTERVIEWER',
        expectedRevision: 1,
        responses: [],
        overallRecommendation: 'YES',
      }),
    ).rejects.toMatchObject({ code: 'CONFLICT' });
    await expect(
      scorecards.submitMy({
        organizationId: f.otherOrganizationId,
        interviewId,
        actorUserId: f.users.OTHER.id,
        responses: [],
        overallRecommendation: 'YES',
      }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    expect(
      await f.prisma.auditEvent.count({
        where: { organizationId: f.organizationId },
      }),
    ).toBe(before);
  });

  it('rolls back template publication with the audit write', async () => {
    const broken = createScorecardUseCases({
      repository: createScorecardRepository(f.prisma, failingAudit),
      clock,
    });
    await scorecards.createDraft({
      organizationId: f.organizationId,
      jobId: f.primary.jobId,
      actorRole: 'RECRUITER',
      actorUserId: f.users.RECRUITER.id,
    });
    await expect(publish(broken, { expectedRevision: 1 })).rejects.toThrow(
      'forced audit failure',
    );
    const template = await f.prisma.scorecardTemplate.findUnique({
      where: { jobId: f.primary.jobId },
      include: { versions: { where: { status: 'DRAFT' } } },
    });
    expect(template.versions).toHaveLength(1);
    expect(template.activeVersionId).toBeTruthy();
  });

  it('rolls back scorecard submission with the audit write', async () => {
    const rollbackInterviewId = generateEntityId();
    await f.prisma.interview.create({
      data: {
        id: rollbackInterviewId,
        organizationId: f.organizationId,
        applicationId: f.primary.id,
        createdByUserId: f.users.RECRUITER.id,
        title: 'Rollback submission interview',
        format: 'VIDEO',
        scheduledStartAt: new Date('2026-04-03T10:00:00.000Z'),
        scheduledEndAt: new Date('2026-04-03T11:00:00.000Z'),
        timeZone: 'UTC',
        participants: {
          create: { id: generateEntityId(), userId: f.users.INTERVIEWER.id },
        },
      },
    });
    const before = await f.prisma.auditEvent.count({
      where: { organizationId: f.organizationId },
    });
    const broken = createScorecardUseCases({
      repository: createScorecardRepository(f.prisma, failingAudit),
      clock,
    });
    await expect(
      broken.submitMy({
        organizationId: f.organizationId,
        interviewId: rollbackInterviewId,
        actorUserId: f.users.INTERVIEWER.id,
        actorRole: 'INTERVIEWER',
        responses: [{ criterionId, ratingValue: 5, comment: 'private' }],
        overallRecommendation: 'YES',
        overallComment: 'private',
      }),
    ).rejects.toThrow('forced audit failure');
    expect(
      await f.prisma.scorecard.count({
        where: { interviewId: rollbackInterviewId },
      }),
    ).toBe(0);
    expect(
      await f.prisma.auditEvent.count({
        where: { organizationId: f.organizationId },
      }),
    ).toBe(before);
  });

  it('serializes participant removal and scorecard submission on the interview row', async () => {
    const interviewService = createInterviewUseCases({
      repository: createInterviewRepository(f.prisma),
      clock,
    });
    const created = await interviewService.schedule({
      organizationId: f.organizationId,
      applicationId: f.primary.id,
      actorRole: 'RECRUITER',
      actorUserId: f.users.RECRUITER.id,
      title: 'Concurrent scorecard/removal interview',
      format: 'VIDEO',
      scheduledStartAt: new Date('2026-04-10T10:00:00.000Z'),
      durationMinutes: 60,
      timeZone: 'UTC',
      participantUserIds: [f.users.INTERVIEWER.id],
    });
    const holder = await holdInterviewRow(f.prisma, created.id);
    try {
      const replacement = interviewService.update({
        organizationId: f.organizationId,
        interviewId: created.id,
        actorRole: 'RECRUITER',
        actorUserId: f.users.RECRUITER.id,
        title: 'Replacement serialized with feedback',
        participantUserIds: [f.users.RECRUITER.id],
      });
      await waitUntilBlockedBy(f.prisma, holder.pid, 'FOR UPDATE');

      const submission = scorecards.submitMy({
        organizationId: f.organizationId,
        interviewId: created.id,
        userId: f.users.INTERVIEWER.id,
        actorUserId: f.users.INTERVIEWER.id,
        actorRole: 'INTERVIEWER',
        responses: [{ criterionId, ratingValue: 4 }],
        overallRecommendation: 'YES',
      });
      await waitForLockWaiterQuery(f.prisma, 'FOR SHARE');
      holder.release();

      const [replacementResult, submissionResult] = await Promise.allSettled([
        replacement,
        submission,
      ]);
      const raceCards = await f.prisma.scorecard.findMany({
        where: { interviewId: created.id },
        select: {
          interviewParticipantId: true,
          participant: { select: { userId: true } },
        },
      });
      expect(replacementResult.status).toBe('fulfilled');
      expect(submissionResult.status).toBe('rejected');
      expect(submissionResult.reason).toMatchObject({ code: 'NOT_FOUND' });
      const finalRoster = await f.prisma.interviewParticipant.findMany({
        where: { interviewId: created.id },
        select: { userId: true },
      });
      expect(finalRoster.map(({ userId }) => userId)).toEqual([
        f.users.RECRUITER.id,
      ]);
      expect(raceCards).toHaveLength(0);
    } finally {
      holder.release();
      await holder.task;
    }
  }, 20_000);
});
