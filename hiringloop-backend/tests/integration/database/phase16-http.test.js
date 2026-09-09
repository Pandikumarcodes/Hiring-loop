import { randomUUID } from 'node:crypto';

import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

process.env.NODE_ENV = 'test';

const { default: app } = await import('../../../src/app.js');
const { disconnectDatabase, getPrismaClient } =
  await import('../../../src/database/client.js');
const { authEmailDelivery } =
  await import('../../../src/modules/auth/auth-module.js');
const { EmailDeliveryError } =
  await import('../../../src/modules/auth/email/email-delivery.js');
const { hashAuthSecret } =
  await import('../../../src/modules/auth/secrets/auth-secret.js');
const { createCsrfToken } = await import('../../../src/middleware/csrf.js');
const { config } = await import('../../../src/config/env.js');
const { createJobRepository } =
  await import('../../../src/modules/jobs/repositories/job-repository.js');
const { createJobUseCases } =
  await import('../../../src/modules/jobs/use-cases/job-use-cases.js');
const { generateEntityId } = await import('../../../src/utils/ids.js');

const origin = 'http://localhost:5173';
const organizationId = generateEntityId();
const otherOrganizationId = generateEntityId();
const users = new Map();
const jobIds = [];
let prisma;
let applicationId;
let otherApplicationId;
let jobs;

function endpoint(orgId = organizationId, appId = applicationId) {
  return `/api/v1/organizations/${orgId}/applications/${appId}/communications`;
}

async function user(role, label, organizations = [organizationId]) {
  const id = generateEntityId();
  const secret = randomUUID();
  const sessionId = generateEntityId();
  await prisma.user.create({
    data: { id, email: `${label}-${id.slice(-8)}@example.test` },
  });
  await prisma.organizationMembership.createMany({
    data: organizations.map((organizationId) => ({
      id: generateEntityId(),
      organizationId,
      userId: id,
      role,
    })),
  });
  await prisma.authSession.create({
    data: {
      id: sessionId,
      userId: id,
      sessionSecretHash: hashAuthSecret(secret),
      expiresAt: new Date(Date.now() + 86_400_000),
    },
  });
  const value = {
    id,
    cookie: `${config.authSession.cookieName}=${secret}`,
    csrf: createCsrfToken({ secret: config.authCsrfSecret, sessionId }),
  };
  users.set(label, value);
  return value;
}

function as(user, method, url) {
  return request(app)
    [method](url)
    .set('Origin', origin)
    .set('Cookie', user.cookie);
}

function mutation(user, method, url) {
  return as(user, method, url).set('X-CSRF-Token', user.csrf);
}

function payload(extra = {}) {
  return {
    subject: 'Candidate update',
    body: 'Thank you for your time.',
    idempotencyKey: generateEntityId(),
    ...extra,
  };
}

async function createApplication(organizationId, email) {
  const job = await jobs.create({
    organizationId,
    data: { title: `Phase 16 ${organizationId.slice(-6)}` },
  });
  jobIds.push(job.id);
  const [form, stage] = await Promise.all([
    prisma.applicationForm.findUnique({ where: { jobId: job.id } }),
    prisma.pipelineStage.findFirst({
      where: { pipeline: { jobId: job.id }, kind: 'ENTRY' },
    }),
  ]);
  const candidate = await prisma.candidate.create({
    data: {
      id: generateEntityId(),
      organizationId,
      normalizedEmail: email,
      email,
      firstName: 'Candidate',
      lastName: 'Phase16',
    },
  });
  return prisma.application.create({
    data: {
      id: generateEntityId(),
      organizationId,
      jobId: job.id,
      candidateId: candidate.id,
      applicationFormVersionId: form.activeVersionId,
      currentPipelineStageId: stage.id,
      submittedFirstName: 'Candidate',
      submittedLastName: 'Phase16',
      submittedEmail: email,
      idempotencyKey: generateEntityId(),
      requestFingerprint: 'f'.repeat(64),
    },
  });
}

describe('Phase 16 HTTP APIs', () => {
  beforeAll(async () => {
    prisma = getPrismaClient();
    await prisma.$connect();
    jobs = createJobUseCases({ jobRepository: createJobRepository(prisma) });
    await prisma.organization.createMany({
      data: [
        {
          id: organizationId,
          name: 'Phase 16 HTTP',
          slug: `p16-${organizationId.slice(-12)}`,
        },
        {
          id: otherOrganizationId,
          name: 'Phase 16 Other',
          slug: `p16-${otherOrganizationId.slice(-12)}`,
        },
      ],
    });
    applicationId = (
      await createApplication(organizationId, 'candidate@authoritative.test')
    ).id;
    otherApplicationId = (
      await createApplication(
        otherOrganizationId,
        'other-candidate@example.test',
      )
    ).id;
    await user('ADMIN', 'admin', [organizationId, otherOrganizationId]);
    await user('RECRUITER', 'recruiter', [organizationId]);
    await user('HIRING_MANAGER', 'manager', [organizationId]);
    await user('INTERVIEWER', 'interviewer', [organizationId]);
    await user('RECRUITER', 'other-user', [organizationId]);
    await user('RECRUITER', 'rate-user', [organizationId]);
    await user('RECRUITER', 'other-org', [otherOrganizationId]);
  });

  afterAll(async () => {
    const orgs = [organizationId, otherOrganizationId];
    await prisma.notificationPreference.deleteMany({
      where: { organizationId: { in: orgs } },
    });
    await prisma.notification.deleteMany({
      where: { organizationId: { in: orgs } },
    });
    await prisma.communication.deleteMany({
      where: { organizationId: { in: orgs } },
    });
    await prisma.communicationTemplate.deleteMany({
      where: { organizationId: { in: orgs } },
    });
    await prisma.application.deleteMany({
      where: { organizationId: { in: orgs } },
    });
    await prisma.candidate.deleteMany({
      where: { organizationId: { in: orgs } },
    });
    await prisma.pipelineStage.deleteMany({
      where: { pipeline: { jobId: { in: jobIds } } },
    });
    await prisma.pipeline.deleteMany({ where: { jobId: { in: jobIds } } });
    await prisma.$transaction(async (transaction) => {
      await transaction.$executeRawUnsafe('SET CONSTRAINTS ALL DEFERRED');
      await transaction.$executeRawUnsafe(
        `DELETE FROM "ApplicationFormVersion" WHERE "organizationId" IN ('${organizationId}', '${otherOrganizationId}')`,
      );
      await transaction.applicationForm.deleteMany({
        where: { organizationId: { in: orgs } },
      });
    });
    await prisma.job.deleteMany({ where: { id: { in: jobIds } } });
    await prisma.authSession.deleteMany({
      where: { userId: { in: [...users.values()].map((u) => u.id) } },
    });
    await prisma.organizationMembership.deleteMany({
      where: { organizationId: { in: orgs } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [...users.values()].map((u) => u.id) } },
    });
    await prisma.organization.deleteMany({ where: { id: { in: orgs } } });
    await disconnectDatabase();
  });

  it('enforces communication role authorization and CSRF on mutations', async () => {
    for (const label of ['admin', 'recruiter']) {
      expect((await as(users.get(label), 'get', endpoint())).status).toBe(200);
      expect(
        (await mutation(users.get(label), 'post', endpoint()).send(payload()))
          .status,
      ).toBe(201);
    }
    for (const label of ['manager', 'interviewer']) {
      for (const method of ['get', 'post']) {
        const response =
          method === 'post'
            ? await mutation(users.get(label), method, endpoint()).send(
                payload(),
              )
            : await as(users.get(label), method, endpoint());
        expect(response.status).toBe(403);
        expect(response.body.error.code).toBe('FORBIDDEN');
      }
    }
    const csrf = await as(users.get('recruiter'), 'post', endpoint()).send(
      payload(),
    );
    expect(csrf.status).toBe(403);
    expect(csrf.body.error.code).toBe('CSRF_INVALID');
  });

  it('requires CSRF for every other Phase 16 mutation endpoint', async () => {
    const recruiter = users.get('recruiter');
    const templateBase = `/api/v1/organizations/${organizationId}/communication-templates`;
    const notificationBase = `/api/v1/organizations/${organizationId}/notifications`;
    const templateId = generateEntityId();
    const notificationId = generateEntityId();
    const requests = [
      as(recruiter, 'post', templateBase).send({
        name: 'csrf',
        subject: 'csrf',
        body: 'csrf',
      }),
      as(recruiter, 'patch', `${templateBase}/${templateId}`).send({
        name: 'csrf',
        subject: 'csrf',
        body: 'csrf',
        expectedRevision: 1,
      }),
      as(recruiter, 'delete', `${templateBase}/${templateId}`),
      as(recruiter, 'patch', `${notificationBase}/${notificationId}/read`),
      as(recruiter, 'post', `${notificationBase}/read-all`),
      as(
        recruiter,
        'put',
        `/api/v1/organizations/${organizationId}/notification-preferences`,
      ).send({
        preferences: [],
      }),
    ];
    for (const request of requests) {
      const response = await request;
      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('CSRF_INVALID');
    }
  });

  it('locks delivery to the application candidate and validates strict communication input', async () => {
    const send = vi
      .spyOn(authEmailDelivery, 'sendCandidateEmail')
      .mockResolvedValue({ providerMessageId: 'provider-1' });
    const response = await mutation(
      users.get('recruiter'),
      'post',
      endpoint(),
    ).send(payload({ recipientEmail: 'relay@evil.test' }));
    expect(response.status).toBe(400);
    const sent = await mutation(
      users.get('recruiter'),
      'post',
      endpoint(),
    ).send(payload());
    expect(sent.status).toBe(201);
    expect(send).toHaveBeenLastCalledWith({
      to: 'candidate@authoritative.test',
      subject: 'Candidate update',
      text: 'Thank you for your time.',
    });
    expect(sent.body.data.communication).toMatchObject({
      recipientEmail: 'candidate@authoritative.test',
      status: 'SENT',
      provider: expect.any(String),
    });
    expect(sent.body.data.communication).not.toHaveProperty('payloadHash');
    expect(sent.body.data.communication).not.toHaveProperty(
      'providerMessageId',
    );
    for (const body of [
      {},
      { subject: ' ', body: 'x', idempotencyKey: generateEntityId() },
      { subject: 'x', body: ' ', idempotencyKey: generateEntityId() },
      {
        subject: 'x'.repeat(999),
        body: 'x',
        idempotencyKey: generateEntityId(),
      },
      {
        subject: 'x',
        body: 'x'.repeat(100001),
        idempotencyKey: generateEntityId(),
      },
      { subject: 'x', body: 'x', idempotencyKey: 'not-a-uuid' },
      {
        subject: 'x',
        body: 'x',
        idempotencyKey: generateEntityId(),
        to: 'relay@evil.test',
      },
    ])
      expect(
        (await mutation(users.get('recruiter'), 'post', endpoint()).send(body))
          .status,
      ).toBe(400);
    send.mockRestore();
  });

  it('persists confirmed and ambiguous provider outcomes without leaking provider errors', async () => {
    const send = vi.spyOn(authEmailDelivery, 'sendCandidateEmail');
    send.mockRejectedValueOnce(
      new EmailDeliveryError({ category: 'sendgrid-error' }),
    );
    const failed = await mutation(
      users.get('recruiter'),
      'post',
      endpoint(),
    ).send(payload());
    expect(failed.status).toBe(502);
    expect(failed.body.error).toEqual(
      expect.objectContaining({
        code: 'EMAIL_DELIVERY_FAILED',
        message: 'Email delivery failed',
      }),
    );
    expect(JSON.stringify(failed.body)).not.toContain('sendgrid-error');
    const failedRow = await prisma.communication.findFirst({
      where: { organizationId, status: 'FAILED' },
      orderBy: { createdAt: 'desc' },
    });
    expect(failedRow).toMatchObject({
      failureCategory: 'sendgrid-error',
      sentAt: null,
    });
    expect(failedRow.failedAt).toBeTruthy();
    expect(
      await prisma.notification.count({
        where: {
          organizationId,
          recipientUserId: users.get('recruiter').id,
          type: 'CANDIDATE_COMMUNICATION_FAILED',
          applicationId,
        },
      }),
    ).toBe(1);
    send.mockRejectedValueOnce(
      new EmailDeliveryError({ category: 'ambiguous' }),
    );
    const ambiguous = await mutation(
      users.get('recruiter'),
      'post',
      endpoint(),
    ).send(payload());
    expect(ambiguous.status).toBe(202);
    expect(ambiguous.body.data.deliveryState).toBe('UNCONFIRMED');
    const pending = await prisma.communication.findUnique({
      where: { id: ambiguous.body.data.communication.id },
    });
    expect(pending).toMatchObject({
      status: 'PENDING',
      sentAt: null,
      failedAt: null,
    });
    send.mockRestore();
  });

  it('makes communication sending idempotent and rejects conflicting reuse without duplicate failure notification', async () => {
    const send = vi
      .spyOn(authEmailDelivery, 'sendCandidateEmail')
      .mockRejectedValue(new EmailDeliveryError());
    const idempotencyKey = generateEntityId();
    const first = await mutation(users.get('admin'), 'post', endpoint()).send(
      payload({ subject: 'A', body: 'A', idempotencyKey }),
    );
    const repeat = await mutation(users.get('admin'), 'post', endpoint()).send(
      payload({ subject: 'A', body: 'A', idempotencyKey }),
    );
    const conflict = await mutation(
      users.get('admin'),
      'post',
      endpoint(),
    ).send(payload({ subject: 'B', body: 'A', idempotencyKey }));
    expect([first.status, repeat.status, conflict.status]).toEqual([
      502, 200, 409,
    ]);
    expect(send).toHaveBeenCalledTimes(1);
    expect(
      await prisma.communication.count({
        where: {
          organizationId,
          createdByUserId: users.get('admin').id,
          idempotencyKey,
        },
      }),
    ).toBe(1);
    expect(
      await prisma.notification.count({
        where: {
          organizationId,
          recipientUserId: users.get('admin').id,
          type: 'CANDIDATE_COMMUNICATION_FAILED',
        },
      }),
    ).toBe(1);
    send.mockRestore();
  });

  it('conceals cross-tenant communication resources and provides deterministic pagination', async () => {
    const foreign = users.get('other-org');
    expect(
      (
        await mutation(
          users.get('recruiter'),
          'post',
          endpoint(otherOrganizationId, otherApplicationId),
        ).send(payload())
      ).status,
    ).toBe(404);
    expect(
      (
        await as(
          users.get('recruiter'),
          'get',
          endpoint(otherOrganizationId, otherApplicationId),
        )
      ).status,
    ).toBe(404);
    expect(
      (
        await as(
          users.get('admin'),
          'get',
          endpoint(organizationId, otherApplicationId),
        )
      ).status,
    ).toBe(404);
    const page = await as(
      users.get('recruiter'),
      'get',
      `${endpoint()}?page=1&pageSize=2`,
    );
    expect(page.status).toBe(200);
    expect(page.body).toMatchObject({ pagination: { page: 1, pageSize: 2 } });
    expect(page.body.data.length).toBeLessThanOrEqual(2);
    expect(
      (await as(users.get('recruiter'), 'get', `${endpoint()}?pageSize=101`))
        .status,
    ).toBe(400);
    expect((await as(foreign, 'get', endpoint())).status).toBe(404);
  });

  it('enforces template roles, validation, tenant uniqueness, revisions, and delete isolation', async () => {
    const base = `/api/v1/organizations/${organizationId}/communication-templates`;
    expect((await as(users.get('manager'), 'get', base)).status).toBe(403);
    expect(
      (
        await mutation(users.get('interviewer'), 'post', base).send({
          name: 'x',
          subject: 'x',
          body: 'x',
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await mutation(users.get('recruiter'), 'post', base).send({
          name: ' ',
          subject: 'x',
          body: 'x',
        })
      ).status,
    ).toBe(400);
    const created = await mutation(users.get('recruiter'), 'post', base).send({
      name: 'Shared',
      subject: 'Subject',
      body: 'Body',
    });
    expect(created.status).toBe(201);
    expect(
      (
        await mutation(users.get('admin'), 'post', base).send({
          name: 'Shared',
          subject: 'x',
          body: 'x',
        })
      ).status,
    ).toBe(409);
    expect(
      (
        await mutation(
          users.get('other-org'),
          'post',
          `/api/v1/organizations/${otherOrganizationId}/communication-templates`,
        ).send({ name: 'Shared', subject: 'x', body: 'x' })
      ).status,
    ).toBe(201);
    const templateId = created.body.data.id;
    expect(
      (
        await mutation(
          users.get('recruiter'),
          'patch',
          `${base}/${templateId}`,
        ).send({
          name: 'Updated',
          subject: 'Subject',
          body: 'Body',
          expectedRevision: 1,
        })
      ).status,
    ).toBe(200);
    expect(
      (
        await mutation(
          users.get('recruiter'),
          'patch',
          `${base}/${templateId}`,
        ).send({
          name: 'Updated',
          subject: 'Subject',
          body: 'Body',
          expectedRevision: 1,
        })
      ).status,
    ).toBe(409);
    expect(
      (
        await mutation(
          users.get('recruiter'),
          'delete',
          `${base}/${templateId}`,
        )
      ).status,
    ).toBe(204);
    expect(
      await prisma.communication.count({ where: { organizationId } }),
    ).toBeGreaterThan(0);
    expect(
      (await as(users.get('recruiter'), 'get', `${base}?page=1&pageSize=25`))
        .body,
    ).toHaveProperty('pagination.pageSize', 25);
  });

  it('keeps notification inbox, unread counts, read operations, and preferences scoped to the recipient tenant', async () => {
    const me = users.get('recruiter');
    const other = users.get('other-user');
    const ownUnread = generateEntityId();
    const ownRead = generateEntityId();
    const otherUnread = generateEntityId();
    const otherTenantUnread = generateEntityId();
    await prisma.notification.createMany({
      data: [
        {
          id: ownUnread,
          organizationId,
          recipientUserId: me.id,
          type: 'INTERVIEW_SCHEDULED',
          title: 'mine',
          message: 'mine',
          applicationId,
        },
        {
          id: ownRead,
          organizationId,
          recipientUserId: me.id,
          type: 'INTERVIEW_SCHEDULED',
          title: 'read',
          message: 'read',
          applicationId,
          readAt: new Date(),
        },
        {
          id: otherUnread,
          organizationId,
          recipientUserId: other.id,
          type: 'INTERVIEW_SCHEDULED',
          title: 'other',
          message: 'other',
          applicationId,
        },
        {
          id: otherTenantUnread,
          organizationId: otherOrganizationId,
          recipientUserId: users.get('admin').id,
          type: 'INTERVIEW_SCHEDULED',
          title: 'other tenant',
          message: 'other tenant',
          applicationId: otherApplicationId,
        },
      ],
    });
    const base = `/api/v1/organizations/${organizationId}/notifications`;
    const inbox = await as(me, 'get', `${base}?page=1&pageSize=25`);
    expect(inbox.status).toBe(200);
    expect(inbox.body.data.map((n) => n.id)).toContain(ownUnread);
    expect(inbox.body.data.map((n) => n.id)).not.toContain(otherUnread);
    expect(inbox.body.data[0]).not.toHaveProperty('recipientUserId');
    expect(
      (await as(me, 'get', `${base}/unread-count`)).body.count,
    ).toBeGreaterThanOrEqual(1);
    expect(
      (await mutation(me, 'patch', `${base}/${ownUnread}/read`)).status,
    ).toBe(200);
    expect(
      (await mutation(me, 'patch', `${base}/${ownUnread}/read`)).status,
    ).toBe(200);
    expect(
      (await mutation(me, 'patch', `${base}/${otherUnread}/read`)).status,
    ).toBe(404);
    const all = await mutation(me, 'post', `${base}/read-all`);
    expect(all.status).toBe(200);
    expect(
      (await prisma.notification.findUnique({ where: { id: otherUnread } }))
        .readAt,
    ).toBeNull();
    const prefs = `/api/v1/organizations/${organizationId}/notification-preferences`;
    const defaults = await as(me, 'get', prefs);
    expect(defaults.body.data).toContainEqual({
      notificationType: 'CANDIDATE_COMMUNICATION_FAILED',
      enabled: true,
    });
    expect(
      (
        await mutation(me, 'put', prefs).send({
          preferences: [
            {
              notificationType: 'CANDIDATE_COMMUNICATION_FAILED',
              enabled: false,
            },
          ],
        })
      ).status,
    ).toBe(204);
    expect((await as(me, 'get', prefs)).body.data).toContainEqual({
      notificationType: 'CANDIDATE_COMMUNICATION_FAILED',
      enabled: true,
    });
    expect(
      (
        await mutation(me, 'put', prefs).send({
          preferences: [{ notificationType: 'NOT_REAL', enabled: false }],
        })
      ).status,
    ).toBe(400);
    expect((await as(users.get('other-org'), 'get', prefs)).status).toBe(404);
  });

  it('applies the production 30/hour send limiter only to communication POST', async () => {
    const rate = users.get('rate-user');
    const send = vi
      .spyOn(authEmailDelivery, 'sendCandidateEmail')
      .mockResolvedValue({});
    for (let i = 0; i < 30; i += 1) {
      expect(
        (
          await mutation(rate, 'post', endpoint()).send(
            payload({ subject: `rate ${i}` }),
          )
        ).status,
      ).toBe(201);
    }
    const limited = await mutation(rate, 'post', endpoint()).send(
      payload({ subject: 'rate limited' }),
    );
    expect(limited.status).toBe(429);
    expect(limited.body.error.code).toBe('RATE_LIMITED');
    expect((await as(rate, 'get', endpoint())).status).toBe(200);
    expect(send).toHaveBeenCalledTimes(30);
    send.mockRestore();
  });
});
