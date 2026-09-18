import { afterAll, beforeAll, describe, expect, it } from 'vitest';

process.env.NODE_ENV = 'test';

const { disconnectDatabase, getPrismaClient } =
  await import('../../../src/database/client.js');
const { createMemberRepository } =
  await import('../../../src/modules/members/repositories/member-repository.js');
const { createOfferRepository } =
  await import('../../../src/modules/offers/repositories/offer-repository.js');
const { createApplicationOutcomeRepository } =
  await import('../../../src/modules/applications/repositories/application-outcome-repository.js');
const { createTalentPoolRepository } =
  await import('../../../src/modules/talent-pools/repositories/talent-pool-repository.js');
const { createJobRepository } =
  await import('../../../src/modules/jobs/repositories/job-repository.js');
const { createJobUseCases } =
  await import('../../../src/modules/jobs/use-cases/job-use-cases.js');
const { generateEntityId } = await import('../../../src/utils/ids.js');

const failingAudit = {
  async create() {
    throw new Error('deliberate audit write failure');
  },
};

describe('Phase 18 audit write rollback boundaries', () => {
  const organizationId = generateEntityId();
  const actorUserId = generateEntityId();
  const memberUserId = generateEntityId();
  let prisma;
  let membershipId;
  let applicationId;
  let candidateId;

  beforeAll(async () => {
    prisma = getPrismaClient();
    await prisma.organization.create({
      data: {
        id: organizationId,
        name: 'Phase 18 rollback',
        slug: `p18-rollback-${organizationId.slice(-12)}`,
      },
    });
    await prisma.user.createMany({
      data: [
        { id: actorUserId, email: `${actorUserId}@test.local` },
        { id: memberUserId, email: `${memberUserId}@test.local` },
      ],
    });
    membershipId = generateEntityId();
    await prisma.organizationMembership.createMany({
      data: [
        {
          id: generateEntityId(),
          organizationId,
          userId: actorUserId,
          role: 'ADMIN',
        },
        {
          id: membershipId,
          organizationId,
          userId: memberUserId,
          role: 'RECRUITER',
        },
      ],
    });
    const job = await createJobUseCases({
      jobRepository: createJobRepository(prisma),
    }).create({ organizationId, data: { title: 'Rollback engineer' } });
    const [form, stage] = await Promise.all([
      prisma.applicationForm.findUnique({ where: { jobId: job.id } }),
      prisma.pipelineStage.findFirst({
        where: { pipeline: { jobId: job.id }, kind: 'ENTRY' },
      }),
    ]);
    candidateId = generateEntityId();
    await prisma.candidate.create({
      data: {
        id: candidateId,
        organizationId,
        normalizedEmail: `${candidateId}@test.local`,
        email: `${candidateId}@test.local`,
        firstName: 'Rollback',
        lastName: 'Candidate',
      },
    });
    applicationId = generateEntityId();
    await prisma.application.create({
      data: {
        id: applicationId,
        organizationId,
        jobId: job.id,
        candidateId,
        applicationFormVersionId: form.activeVersionId,
        currentPipelineStageId: stage.id,
        submittedFirstName: 'Rollback',
        submittedLastName: 'Candidate',
        submittedEmail: `${candidateId}@test.local`,
        idempotencyKey: generateEntityId(),
        requestFingerprint: 'a'.repeat(64),
      },
    });
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  it('rolls back a membership role change when the audit insert fails', async () => {
    const repository = createMemberRepository(prisma, failingAudit);
    await expect(
      repository.updateMembershipRole({
        organizationId,
        membershipId,
        role: 'HIRING_MANAGER',
        actorUserId,
      }),
    ).rejects.toThrow('deliberate audit write failure');
    expect(
      (
        await prisma.organizationMembership.findUnique({
          where: { id: membershipId },
        })
      ).role,
    ).toBe('RECRUITER');
    expect(await prisma.auditEvent.count({ where: { organizationId } })).toBe(
      0,
    );
  });

  it('rolls back offer and initial version creation when the audit insert fails', async () => {
    const offerId = generateEntityId();
    const repository = createOfferRepository(prisma, failingAudit);
    await expect(
      repository.createWithInitialVersion({
        organizationId,
        applicationId,
        actorUserId,
        offerId,
        versionId: generateEntityId(),
        terms: {
          jobTitle: 'Rollback engineer',
          currency: 'USD',
          baseCompensationMinor: 1n,
        },
      }),
    ).rejects.toThrow('deliberate audit write failure');
    expect(
      await prisma.offer.findUnique({ where: { id: offerId } }),
    ).toBeNull();
    expect(await prisma.offerVersion.count({ where: { organizationId } })).toBe(
      0,
    );
    expect(await prisma.auditEvent.count({ where: { organizationId } })).toBe(
      0,
    );
  });

  it('rolls back application outcome history when the audit insert fails', async () => {
    const repository = createApplicationOutcomeRepository(prisma, failingAudit);
    await expect(
      repository.transition({
        organizationId,
        applicationId,
        actorUserId,
        expectedRevision: 1,
        from: ['ACTIVE'],
        to: 'REJECTED',
        reasonCode: 'OTHER',
      }),
    ).rejects.toThrow('deliberate audit write failure');
    expect(
      (await prisma.application.findUnique({ where: { id: applicationId } }))
        .outcome,
    ).toBe('ACTIVE');
    expect(
      await prisma.applicationOutcomeEvent.count({ where: { applicationId } }),
    ).toBe(0);
    expect(await prisma.auditEvent.count({ where: { organizationId } })).toBe(
      0,
    );
  });

  it('rolls back talent-pool creation when the audit insert fails', async () => {
    const repository = createTalentPoolRepository(prisma, failingAudit);
    const id = generateEntityId();
    await expect(
      repository.create({
        id,
        organizationId,
        actorUserId,
        data: { name: 'Rollback pool' },
      }),
    ).rejects.toThrow('deliberate audit write failure');
    expect(await prisma.talentPool.findUnique({ where: { id } })).toBeNull();
    expect(
      await prisma.talentPoolMember.count({
        where: { organizationId, candidateId },
      }),
    ).toBe(0);
    expect(await prisma.auditEvent.count({ where: { organizationId } })).toBe(
      0,
    );
  });
});
