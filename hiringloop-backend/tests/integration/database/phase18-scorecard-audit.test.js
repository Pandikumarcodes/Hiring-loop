import { afterAll, beforeAll, describe, expect, it } from 'vitest';

process.env.NODE_ENV = 'test';

const { disconnectDatabase } = await import('../../../src/database/client.js');
const { createAuditRepository } =
  await import('../../../src/modules/audit/repositories/audit-repository.js');
const { createScorecardRepository } =
  await import('../../../src/modules/scorecards/repositories/scorecard-repository.js');
const { createScorecardUseCases } =
  await import('../../../src/modules/scorecards/use-cases/scorecard-use-cases.js');
const { fixture, generateEntityId } =
  await import('../phase17-http-helpers.js');

const clock = () => new Date('2026-04-01T12:00:00.000Z');
const failingAudit = {
  create: async () => {
    throw new Error('forced audit failure');
  },
};

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
});
