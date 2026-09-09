import { randomUUID } from 'node:crypto';
import request from 'supertest';

process.env.NODE_ENV = 'test';

export const { default: app } = await import('../../src/app.js');
export const { getPrismaClient, disconnectDatabase } =
  await import('../../src/database/client.js');
export const { hashAuthSecret } =
  await import('../../src/modules/auth/secrets/auth-secret.js');
export const { createCsrfToken } = await import('../../src/middleware/csrf.js');
export const { config } = await import('../../src/config/env.js');
export const { createJobRepository } =
  await import('../../src/modules/jobs/repositories/job-repository.js');
export const { createJobUseCases } =
  await import('../../src/modules/jobs/use-cases/job-use-cases.js');
export const { generateEntityId } = await import('../../src/utils/ids.js');

export const origin = 'http://localhost:5173';
export const terms = (extra = {}) => ({
  jobTitle: 'Phase 17 Engineer',
  currency: 'USD',
  baseCompensationMinor: '12500000',
  ...extra,
});

export function as(user, method, url) {
  return request(app)
    [method](url)
    .set('Origin', origin)
    .set('Cookie', user.cookie);
}
export function mutate(user, method, url) {
  return as(user, method, url).set('X-CSRF-Token', user.csrf);
}

export async function fixture(label = 'phase17') {
  const prisma = getPrismaClient();
  await prisma.$connect();
  const organizationId = generateEntityId();
  const otherOrganizationId = generateEntityId();
  await prisma.organization.createMany({
    data: [
      {
        id: organizationId,
        name: `${label} A`,
        slug: `${label}-a-${organizationId.slice(-10)}`,
      },
      {
        id: otherOrganizationId,
        name: `${label} B`,
        slug: `${label}-b-${otherOrganizationId.slice(-10)}`,
      },
    ],
  });
  const jobs = createJobUseCases({
    jobRepository: createJobRepository(prisma),
  });
  async function application(
    orgId,
    email = `${generateEntityId()}@candidate.test`,
  ) {
    const job = await jobs.create({
      organizationId: orgId,
      data: { title: `${label} job` },
    });
    const [form, stage] = await Promise.all([
      prisma.applicationForm.findUnique({ where: { jobId: job.id } }),
      prisma.pipelineStage.findFirst({
        where: { pipeline: { jobId: job.id }, kind: 'ENTRY' },
      }),
    ]);
    const candidate = await prisma.candidate.create({
      data: {
        id: generateEntityId(),
        organizationId: orgId,
        normalizedEmail: email,
        email,
        firstName: 'Phase',
        lastName: 'Candidate',
      },
    });
    const value = await prisma.application.create({
      data: {
        id: generateEntityId(),
        organizationId: orgId,
        jobId: job.id,
        candidateId: candidate.id,
        applicationFormVersionId: form.activeVersionId,
        currentPipelineStageId: stage.id,
        submittedFirstName: 'Phase',
        submittedLastName: 'Candidate',
        submittedEmail: email,
        idempotencyKey: generateEntityId(),
        requestFingerprint: 'f'.repeat(64),
      },
    });
    return { ...value, candidate };
  }
  const primary = await application(
    organizationId,
    `${label}-${organizationId.slice(-6)}@candidate.test`,
  );
  const foreign = await application(
    otherOrganizationId,
    `${label}-${otherOrganizationId.slice(-6)}@candidate.test`,
  );
  const users = {};
  for (const role of ['ADMIN', 'RECRUITER', 'HIRING_MANAGER', 'INTERVIEWER']) {
    const id = generateEntityId(),
      sessionId = generateEntityId(),
      secret = randomUUID();
    await prisma.user.create({
      data: { id, email: `${label}-${role}-${id.slice(-8)}@test.local` },
    });
    await prisma.organizationMembership.create({
      data: { id: generateEntityId(), organizationId, userId: id, role },
    });
    await prisma.authSession.create({
      data: {
        id: sessionId,
        userId: id,
        sessionSecretHash: hashAuthSecret(secret),
        expiresAt: new Date(Date.now() + 86400000),
      },
    });
    users[role] = {
      id,
      cookie: `${config.authSession.cookieName}=${secret}`,
      csrf: createCsrfToken({ secret: config.authCsrfSecret, sessionId }),
    };
  }
  const otherId = generateEntityId(),
    otherSession = generateEntityId(),
    otherSecret = randomUUID();
  await prisma.user.create({
    data: {
      id: otherId,
      email: `${label}-other-${otherId.slice(-8)}@test.local`,
    },
  });
  await prisma.organizationMembership.create({
    data: {
      id: generateEntityId(),
      organizationId: otherOrganizationId,
      userId: otherId,
      role: 'RECRUITER',
    },
  });
  await prisma.authSession.create({
    data: {
      id: otherSession,
      userId: otherId,
      sessionSecretHash: hashAuthSecret(otherSecret),
      expiresAt: new Date(Date.now() + 86400000),
    },
  });
  users.OTHER = {
    id: otherId,
    cookie: `${config.authSession.cookieName}=${otherSecret}`,
    csrf: createCsrfToken({
      secret: config.authCsrfSecret,
      sessionId: otherSession,
    }),
  };
  return {
    prisma,
    organizationId,
    otherOrganizationId,
    primary,
    foreign,
    users,
    application,
  };
}

export const offerApplicationUrl = (
  f,
  appId = f.primary.id,
  orgId = f.organizationId,
) => `/api/v1/organizations/${orgId}/applications/${appId}/offer`;
export const offerUrl = (f, offerId, orgId = f.organizationId) =>
  `/api/v1/organizations/${orgId}/offers/${offerId}`;
export const outcomeUrl = (f, appId = f.primary.id, orgId = f.organizationId) =>
  `/api/v1/organizations/${orgId}/applications/${appId}`;
export const poolsUrl = (f, orgId = f.organizationId) =>
  `/api/v1/organizations/${orgId}/talent-pools`;
