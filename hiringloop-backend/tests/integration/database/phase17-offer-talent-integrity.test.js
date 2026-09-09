import { Prisma } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

process.env.NODE_ENV = 'test';
const { disconnectDatabase, getPrismaClient } =
  await import('../../../src/database/client.js');
const { createJobRepository } =
  await import('../../../src/modules/jobs/repositories/job-repository.js');
const { createJobUseCases } =
  await import('../../../src/modules/jobs/use-cases/job-use-cases.js');
const { generateEntityId } = await import('../../../src/utils/ids.js');
const rejected = (operation) =>
  expect(operation()).rejects.toBeInstanceOf(
    Prisma.PrismaClientKnownRequestError,
  );

describe('Phase 17 database integrity', () => {
  const organizationId = generateEntityId(),
    otherOrganizationId = generateEntityId(),
    userId = generateEntityId();
  let prisma, applicationId, candidateId, offerId, versionId;
  beforeAll(async () => {
    prisma = getPrismaClient();
    await prisma.organization.createMany({
      data: [
        {
          id: organizationId,
          name: 'Phase 17',
          slug: `p17-${organizationId.slice(-12)}`,
        },
        {
          id: otherOrganizationId,
          name: 'Other',
          slug: `p17o-${otherOrganizationId.slice(-12)}`,
        },
      ],
    });
    await prisma.user.create({
      data: { id: userId, email: `${userId}@test.local` },
    });
    const job = await createJobUseCases({
      jobRepository: createJobRepository(prisma),
    }).create({ organizationId, data: { title: 'Engineer' } });
    const [form, stage] = await Promise.all([
      prisma.applicationForm.findUnique({ where: { jobId: job.id } }),
      prisma.pipelineStage.findFirst({
        where: { pipeline: { jobId: job.id }, position: 1 },
      }),
    ]);
    const candidate = await prisma.candidate.create({
      data: {
        id: generateEntityId(),
        organizationId,
        normalizedEmail: `${generateEntityId()}@test.local`,
        email: 'candidate@test.local',
        firstName: 'Candidate',
        lastName: 'One',
      },
    });
    candidateId = candidate.id;
    const app = await prisma.application.create({
      data: {
        id: generateEntityId(),
        organizationId,
        jobId: job.id,
        candidateId,
        applicationFormVersionId: form.activeVersionId,
        currentPipelineStageId: stage.id,
        submittedFirstName: 'Candidate',
        submittedLastName: 'One',
        submittedEmail: candidate.email,
        idempotencyKey: generateEntityId(),
        requestFingerprint: 'a'.repeat(64),
      },
    });
    applicationId = app.id;
    offerId = generateEntityId();
    versionId = generateEntityId();
    await prisma.offer.create({
      data: {
        id: offerId,
        organizationId,
        applicationId,
        createdByUserId: userId,
      },
    });
    await prisma.offerVersion.create({
      data: {
        id: versionId,
        organizationId,
        offerId,
        versionNumber: 1,
        jobTitle: 'Engineer',
        currency: 'USD',
        baseCompensationMinor: 100000n,
        createdByUserId: userId,
      },
    });
    await prisma.offer.update({
      where: { id: offerId },
      data: { currentVersionId: versionId },
    });
  });
  afterAll(async () => {
    await disconnectDatabase();
  });
  it('enforces one offer, version uniqueness, compensation, and issued immutability', async () => {
    await rejected(() =>
      prisma.offer.create({
        data: {
          id: generateEntityId(),
          organizationId,
          applicationId,
          createdByUserId: userId,
        },
      }),
    );
    await rejected(() =>
      prisma.offerVersion.create({
        data: {
          id: generateEntityId(),
          organizationId,
          offerId,
          versionNumber: 1,
          jobTitle: 'Engineer',
          currency: 'USD',
          baseCompensationMinor: 1n,
          createdByUserId: userId,
        },
      }),
    );
    await rejected(() =>
      prisma.offerVersion.create({
        data: {
          id: generateEntityId(),
          organizationId,
          offerId,
          versionNumber: 2,
          jobTitle: 'Engineer',
          currency: 'USD',
          baseCompensationMinor: -1n,
          createdByUserId: userId,
        },
      }),
    );
    await prisma.offerVersion.update({
      where: { id: versionId },
      data: { issuedAt: new Date() },
    });
    await rejected(() =>
      prisma.offerVersion.update({
        where: { id: versionId },
        data: { jobTitle: 'Changed' },
      }),
    );
    await rejected(() =>
      prisma.offerVersion.delete({ where: { id: versionId } }),
    );
  });
  it('enforces communication and talent-pool cross-record alignment', async () => {
    await prisma.communication.create({
      data: {
        id: generateEntityId(),
        organizationId,
        applicationId,
        createdByUserId: userId,
        recipientEmail: 'candidate@test.local',
        subject: 'Offer',
        body: 'Issued',
        provider: 'test',
        idempotencyKey: generateEntityId(),
        payloadHash: 'b'.repeat(64),
        offerVersionId: versionId,
      },
    });
    const pool = await prisma.talentPool.create({
      data: {
        id: generateEntityId(),
        organizationId,
        name: `Pool ${generateEntityId()}`,
        createdByUserId: userId,
      },
    });
    await prisma.talentPoolMember.create({
      data: {
        id: generateEntityId(),
        organizationId,
        talentPoolId: pool.id,
        candidateId,
        sourceApplicationId: applicationId,
        addedByUserId: userId,
      },
    });
    await rejected(() =>
      prisma.talentPoolMember.create({
        data: {
          id: generateEntityId(),
          organizationId,
          talentPoolId: pool.id,
          candidateId,
          addedByUserId: userId,
        },
      }),
    );
    await rejected(() =>
      prisma.talentPool.create({
        data: {
          id: generateEntityId(),
          organizationId: otherOrganizationId,
          name: 'Wrong member',
          createdByUserId: userId,
          revision: 0,
        },
      }),
    );
  });
  it('preserves immutable outcome history', async () => {
    const event = await prisma.applicationOutcomeEvent.create({
      data: {
        id: generateEntityId(),
        organizationId,
        applicationId,
        type: 'REJECTED',
        reasonCode: 'OTHER',
        actorUserId: userId,
      },
    });
    await rejected(() =>
      prisma.applicationOutcomeEvent.update({
        where: { id: event.id },
        data: { reasonDetails: 'changed' },
      }),
    );
    await rejected(() =>
      prisma.applicationOutcomeEvent.delete({ where: { id: event.id } }),
    );
  });
});
