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

const rejection = (operation) =>
  expect(operation()).rejects.toBeInstanceOf(
    Prisma.PrismaClientKnownRequestError,
  );

describe('Phase 16 communication and notification database integrity', () => {
  const organizationId = generateEntityId();
  const otherOrganizationId = generateEntityId();
  const userId = generateEntityId();
  const otherUserId = generateEntityId();
  let prisma;
  let applicationId;
  let otherApplicationId;
  let interviewId;
  const jobIds = [];

  async function application(organization) {
    const job = await createJobUseCases({
      jobRepository: createJobRepository(prisma),
    }).create({
      organizationId: organization,
      data: { title: 'Phase 16 role' },
    });
    jobIds.push(job.id);
    const [form, stage] = await Promise.all([
      prisma.applicationForm.findUnique({ where: { jobId: job.id } }),
      prisma.pipelineStage.findFirst({
        where: { pipeline: { jobId: job.id }, position: 1 },
      }),
    ]);
    const candidate = await prisma.candidate.create({
      data: {
        id: generateEntityId(),
        organizationId: organization,
        normalizedEmail: `${generateEntityId()}@example.test`,
        email: 'candidate@example.test',
        firstName: 'Candidate',
        lastName: 'Test',
      },
    });
    return prisma.application.create({
      data: {
        id: generateEntityId(),
        organizationId: organization,
        jobId: job.id,
        candidateId: candidate.id,
        applicationFormVersionId: form.activeVersionId,
        currentPipelineStageId: stage.id,
        submittedFirstName: 'Candidate',
        submittedLastName: 'Test',
        submittedEmail: candidate.email,
        idempotencyKey: generateEntityId(),
        requestFingerprint: 'a'.repeat(64),
      },
    });
  }

  function communication(data = {}) {
    return prisma.communication.create({
      data: {
        id: generateEntityId(),
        organizationId,
        applicationId,
        createdByUserId: userId,
        recipientEmail: 'candidate@example.test',
        subject: 'Subject',
        body: 'Body',
        provider: 'test',
        idempotencyKey: generateEntityId(),
        payloadHash: 'a'.repeat(64),
        ...data,
      },
    });
  }

  beforeAll(async () => {
    prisma = getPrismaClient();
    await prisma.organization.createMany({
      data: [
        {
          id: organizationId,
          name: 'Phase 16',
          slug: `phase16-${organizationId.slice(-12)}`,
        },
        {
          id: otherOrganizationId,
          name: 'Other Phase 16',
          slug: `other-phase16-${otherOrganizationId.slice(-12)}`,
        },
      ],
    });
    await prisma.user.createMany({
      data: [
        { id: userId, email: `${userId}@example.test` },
        { id: otherUserId, email: `${otherUserId}@example.test` },
      ],
    });
    await prisma.organizationMembership.createMany({
      data: [
        { id: generateEntityId(), organizationId, userId, role: 'ADMIN' },
        {
          id: generateEntityId(),
          organizationId: otherOrganizationId,
          userId: otherUserId,
          role: 'ADMIN',
        },
        {
          id: generateEntityId(),
          organizationId: otherOrganizationId,
          userId,
          role: 'RECRUITER',
        },
      ],
    });
    applicationId = (await application(organizationId)).id;
    otherApplicationId = (await application(otherOrganizationId)).id;
    interviewId = generateEntityId();
    await prisma.interview.create({
      data: {
        id: interviewId,
        organizationId,
        applicationId,
        createdByUserId: userId,
        title: 'Interview',
        format: 'VIDEO',
        scheduledStartAt: new Date('2026-10-01T10:00:00Z'),
        scheduledEndAt: new Date('2026-10-01T11:00:00Z'),
        timeZone: 'UTC',
      },
    });
  });

  afterAll(async () => {
    await prisma.notificationPreference.deleteMany({
      where: { organizationId: { in: [organizationId, otherOrganizationId] } },
    });
    await prisma.notification.deleteMany({
      where: { organizationId: { in: [organizationId, otherOrganizationId] } },
    });
    await prisma.communicationTemplate.deleteMany({
      where: { organizationId: { in: [organizationId, otherOrganizationId] } },
    });
    await prisma.communication.deleteMany({
      where: { organizationId: { in: [organizationId, otherOrganizationId] } },
    });
    await prisma.interview.deleteMany({
      where: { organizationId: { in: [organizationId, otherOrganizationId] } },
    });
    await prisma.application.deleteMany({
      where: { organizationId: { in: [organizationId, otherOrganizationId] } },
    });
    await prisma.candidate.deleteMany({
      where: { organizationId: { in: [organizationId, otherOrganizationId] } },
    });
    await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe('SET CONSTRAINTS ALL DEFERRED');
      await tx.applicationFormVersion.deleteMany({
        where: {
          organizationId: { in: [organizationId, otherOrganizationId] },
        },
      });
      await tx.applicationForm.deleteMany({
        where: {
          organizationId: { in: [organizationId, otherOrganizationId] },
        },
      });
    });
    await prisma.pipelineStage.deleteMany({
      where: { pipeline: { jobId: { in: jobIds } } },
    });
    await prisma.pipeline.deleteMany({ where: { jobId: { in: jobIds } } });
    await prisma.job.deleteMany({ where: { id: { in: jobIds } } });
    await prisma.organizationMembership.deleteMany({
      where: { organizationId: { in: [organizationId, otherOrganizationId] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [userId, otherUserId] } },
    });
    await prisma.organization.deleteMany({
      where: { id: { in: [organizationId, otherOrganizationId] } },
    });
    await disconnectDatabase();
  });

  it('accepts valid pending, sent, and failed communication state transitions', async () => {
    await expect(communication()).resolves.toMatchObject({
      status: 'PENDING',
      sentAt: null,
      failedAt: null,
    });
    await expect(
      communication({ status: 'SENT', sentAt: new Date() }),
    ).resolves.toMatchObject({ status: 'SENT', failedAt: null });
    await expect(
      communication({
        status: 'FAILED',
        failedAt: new Date(),
        failureCategory: 'provider-error',
      }),
    ).resolves.toMatchObject({ status: 'FAILED', sentAt: null });
  });

  it('rejects invalid state, content, and cross-tenant application combinations', async () => {
    await rejection(() => communication({ status: 'SENT' }));
    await rejection(() => communication({ status: 'FAILED' }));
    await rejection(() =>
      communication({ status: 'SENT', failedAt: new Date() }),
    );
    await rejection(() =>
      communication({ status: 'FAILED', sentAt: new Date() }),
    );
    await rejection(() =>
      communication({
        status: 'SENT',
        sentAt: new Date(),
        failedAt: new Date(),
      }),
    );
    await rejection(() => communication({ subject: '   ' }));
    await rejection(() => communication({ subject: '' }));
    await rejection(() => communication({ body: '   ' }));
    await rejection(() => communication({ body: '' }));
    await rejection(() =>
      communication({ organizationId, applicationId: otherApplicationId }),
    );
  });

  it('enforces template content, revision, and organization-scoped names', async () => {
    const base = {
      id: generateEntityId(),
      organizationId,
      createdByUserId: userId,
      name: `Template ${generateEntityId()}`,
      subject: 'Subject',
      body: 'Body',
    };
    await expect(
      prisma.communicationTemplate.create({ data: base }),
    ).resolves.toMatchObject({
      revision: 1,
    });
    await rejection(() =>
      prisma.communicationTemplate.create({
        data: { ...base, id: generateEntityId(), subject: ' ' },
      }),
    );
    await rejection(() =>
      prisma.communicationTemplate.create({
        data: { ...base, id: generateEntityId(), body: '' },
      }),
    );
    await rejection(() =>
      prisma.communicationTemplate.create({
        data: { ...base, id: generateEntityId(), revision: 0 },
      }),
    );
    await expect(
      prisma.communicationTemplate.create({
        data: {
          ...base,
          id: generateEntityId(),
          organizationId: otherOrganizationId,
          createdByUserId: otherUserId,
        },
      }),
    ).resolves.toBeTruthy();
  });

  it('enforces idempotency scope and template names while allowing legitimate scope changes', async () => {
    const key = generateEntityId();
    await communication({ idempotencyKey: key });
    await rejection(() => communication({ idempotencyKey: key }));
    await expect(
      communication({
        idempotencyKey: key,
        createdByUserId: otherUserId,
        organizationId: otherOrganizationId,
        applicationId: otherApplicationId,
      }),
    ).resolves.toBeTruthy();
    const template = {
      organizationId,
      createdByUserId: userId,
      name: 'Follow-up',
      subject: 'Hello',
      body: 'Body',
    };
    await prisma.communicationTemplate.create({
      data: { id: generateEntityId(), ...template },
    });
    await rejection(() =>
      prisma.communicationTemplate.create({
        data: { id: generateEntityId(), ...template },
      }),
    );
    await rejection(() =>
      prisma.communicationTemplate.create({
        data: { id: generateEntityId(), ...template, name: ' ' },
      }),
    );
  });

  it('enforces exactly one tenant-owned notification target and membership-backed preferences', async () => {
    const base = {
      id: generateEntityId(),
      organizationId,
      recipientUserId: userId,
      type: 'INTERVIEW_SCHEDULED',
      title: 'Interview',
      message: 'Updated',
    };
    await expect(
      prisma.notification.create({ data: { ...base, interviewId } }),
    ).resolves.toBeTruthy();
    await expect(
      prisma.notification.create({
        data: {
          ...base,
          id: generateEntityId(),
          applicationId,
          readAt: new Date(),
        },
      }),
    ).resolves.toMatchObject({ readAt: expect.any(Date) });
    await rejection(() =>
      prisma.notification.create({ data: { ...base, id: generateEntityId() } }),
    );
    await rejection(() =>
      prisma.notification.create({
        data: { ...base, id: generateEntityId(), interviewId, applicationId },
      }),
    );
    await rejection(() =>
      prisma.notification.create({
        data: {
          ...base,
          id: generateEntityId(),
          applicationId: otherApplicationId,
        },
      }),
    );
    await rejection(() =>
      prisma.notification.create({
        data: {
          ...base,
          id: generateEntityId(),
          organizationId: otherOrganizationId,
          interviewId,
        },
      }),
    );
    const preference = {
      id: generateEntityId(),
      organizationId,
      userId,
      notificationType: 'INTERVIEW_SCHEDULED',
      enabled: false,
    };
    await prisma.notificationPreference.create({ data: preference });
    await rejection(() =>
      prisma.notificationPreference.create({
        data: { ...preference, id: generateEntityId() },
      }),
    );
    await rejection(() =>
      prisma.notificationPreference.create({
        data: {
          ...preference,
          id: generateEntityId(),
          userId: generateEntityId(),
          notificationType: 'INTERVIEW_CANCELLED',
        },
      }),
    );
    await expect(
      prisma.notificationPreference.create({
        data: {
          ...preference,
          id: generateEntityId(),
          organizationId: otherOrganizationId,
          userId: otherUserId,
        },
      }),
    ).resolves.toBeTruthy();
    await expect(
      prisma.notificationPreference.create({
        data: {
          ...preference,
          id: generateEntityId(),
          organizationId: otherOrganizationId,
          notificationType: 'INTERVIEW_RESCHEDULED',
        },
      }),
    ).resolves.toBeTruthy();
  });
});
