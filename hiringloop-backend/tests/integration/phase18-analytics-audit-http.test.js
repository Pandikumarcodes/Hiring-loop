import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  as,
  disconnectDatabase,
  fixture,
  generateEntityId,
} from './phase17-http-helpers.js';

process.env.NODE_ENV = 'test';

const range = {
  from: '2026-01-01T00:00:00.000Z',
  to: '2026-02-01T00:00:00.000Z',
};
const query = new URLSearchParams(range).toString();
const analytics = [
  'overview',
  'funnel',
  'pipeline',
  'interviews',
  'communications',
  'outcomes',
  'jobs',
];

describe('Phase 18 analytics and audit HTTP API', () => {
  let f;
  let localAuditId;
  let foreignAuditId;
  let emptyOrganizationId;

  beforeAll(async () => {
    f = await fixture('phase18-http');
    emptyOrganizationId = generateEntityId();
    await f.prisma.organization.create({
      data: {
        id: emptyOrganizationId,
        name: 'Empty Phase 18 organization',
        slug: `p18-empty-${emptyOrganizationId.slice(-12)}`,
      },
    });
    await f.prisma.organizationMembership.create({
      data: {
        id: generateEntityId(),
        organizationId: emptyOrganizationId,
        userId: f.users.ADMIN.id,
        role: 'ADMIN',
      },
    });
    const occurredAt = new Date('2026-01-15T12:00:00.000Z');
    await f.prisma.application.update({
      where: { id: f.primary.id },
      data: { submittedAt: occurredAt },
    });
    await f.prisma.application.update({
      where: { id: f.foreign.id },
      data: { submittedAt: occurredAt },
    });
    const stage = await f.prisma.pipelineStage.findFirst({
      where: { pipeline: { jobId: f.primary.jobId } },
    });
    await f.prisma.interview.create({
      data: {
        id: generateEntityId(),
        organizationId: f.organizationId,
        applicationId: f.primary.id,
        createdByUserId: f.users.ADMIN.id,
        title: 'Safe interview',
        format: 'VIDEO',
        scheduledStartAt: occurredAt,
        scheduledEndAt: new Date(occurredAt.getTime() + 3600000),
        timeZone: 'UTC',
        status: 'SCHEDULED',
      },
    });
    await f.prisma.communication.create({
      data: {
        id: generateEntityId(),
        organizationId: f.organizationId,
        applicationId: f.primary.id,
        createdByUserId: f.users.ADMIN.id,
        recipientEmail: f.primary.candidate.email,
        subject: 'Sensitive subject',
        body: 'Sensitive body',
        provider: 'test',
        idempotencyKey: generateEntityId(),
        payloadHash: 'a'.repeat(64),
        status: 'SENT',
        sentAt: occurredAt,
        createdAt: occurredAt,
      },
    });
    await f.prisma.applicationOutcomeEvent.create({
      data: {
        id: generateEntityId(),
        organizationId: f.organizationId,
        applicationId: f.primary.id,
        type: 'REJECTED',
        reasonCode: 'ROLE_CLOSED',
        reasonDetails: 'Never expose this text',
        actorUserId: f.users.ADMIN.id,
        occurredAt,
      },
    });
    localAuditId = generateEntityId();
    foreignAuditId = generateEntityId();
    await f.prisma.auditEvent.createMany({
      data: [
        {
          id: localAuditId,
          organizationId: f.organizationId,
          actorUserId: f.users.ADMIN.id,
          actorType: 'USER',
          action: 'OFFER_SENT',
          resourceType: 'OFFER',
          resourceId: generateEntityId(),
          before: { status: 'DRAFT', compensation: '99999999' },
          after: {
            status: 'SENT',
            versionNumber: 1,
            terms: 'must never leave the API',
          },
          metadata: { recipient: 'candidate@example.test', body: 'secret' },
          occurredAt,
        },
        {
          id: generateEntityId(),
          organizationId: f.organizationId,
          actorUserId: f.users.ADMIN.id,
          actorType: 'USER',
          action: 'COMMUNICATION_SEND_REQUESTED',
          resourceType: 'COMMUNICATION',
          resourceId: generateEntityId(),
          metadata: {
            channel: 'EMAIL',
            status: 'PENDING',
            recipient: 'candidate@example.test',
            subject: 'secret',
            body: 'secret',
            providerMessageId: 'provider-secret',
          },
          occurredAt: new Date('2026-01-16T12:00:00.000Z'),
        },
        {
          id: foreignAuditId,
          organizationId: f.otherOrganizationId,
          actorUserId: f.users.OTHER.id,
          actorType: 'USER',
          action: 'MEMBERSHIP_ROLE_CHANGED',
          resourceType: 'MEMBERSHIP',
          resourceId: generateEntityId(),
          after: { role: 'ADMIN', private: 'foreign secret' },
          occurredAt,
        },
      ],
    });
    // Ensure the current-stage query has a visible current snapshot.
    await f.prisma.application.update({
      where: { id: f.primary.id },
      data: { currentPipelineStageId: stage.id },
    });
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  it('serves each analytics API with scoped populated data', async () => {
    for (const endpoint of analytics) {
      const response = await as(
        f.users.ADMIN,
        'get',
        `/api/v1/organizations/${f.organizationId}/analytics/${endpoint}?${query}`,
      );
      expect(response.status, endpoint).toBe(200);
      expect(response.body.data).toBeTruthy();
    }
    const overview = await as(
      f.users.ADMIN,
      'get',
      `/api/v1/organizations/${f.organizationId}/analytics/overview?${query}`,
    );
    expect(overview.body.data.applicationsReceived).toBe(1);
    const communications = await as(
      f.users.ADMIN,
      'get',
      `/api/v1/organizations/${f.organizationId}/analytics/communications?${query}`,
    );
    expect(communications.body.data).toMatchObject({
      sent: 1,
      completedDeliverySuccessRate: 1,
    });
  });

  it('returns bounded empty-organization analytics responses', async () => {
    for (const endpoint of analytics) {
      const response = await as(
        f.users.ADMIN,
        'get',
        `/api/v1/organizations/${emptyOrganizationId}/analytics/${endpoint}?${query}`,
      );
      expect(response.status, endpoint).toBe(200);
      expect(JSON.stringify(response.body.data)).not.toMatch(
        /compensation|recipientEmail|subject|body|scorecard/i,
      );
    }
  });

  it('enforces the analytics and audit role matrix through HTTP', async () => {
    for (const role of ['ADMIN', 'RECRUITER', 'HIRING_MANAGER']) {
      expect(
        (
          await as(
            f.users[role],
            'get',
            `/api/v1/organizations/${f.organizationId}/analytics/overview?${query}`,
          )
        ).status,
      ).toBe(200);
    }
    expect(
      (
        await as(
          f.users.INTERVIEWER,
          'get',
          `/api/v1/organizations/${f.organizationId}/analytics/overview?${query}`,
        )
      ).status,
    ).toBe(403);
    for (const role of ['ADMIN', 'RECRUITER'])
      expect(
        (
          await as(
            f.users[role],
            'get',
            `/api/v1/organizations/${f.organizationId}/audit-events?${query}`,
          )
        ).status,
      ).toBe(200);
    for (const role of ['HIRING_MANAGER', 'INTERVIEWER'])
      expect(
        (
          await as(
            f.users[role],
            'get',
            `/api/v1/organizations/${f.organizationId}/audit-events?${query}`,
          )
        ).status,
      ).toBe(403);
  });

  it('validates UTC ranges, inclusive from, exclusive to, and page limits', async () => {
    const base = `/api/v1/organizations/${f.organizationId}/analytics/overview`;
    expect(
      (await as(f.users.ADMIN, 'get', `${base}?from=2026-01-01`)).status,
    ).toBe(400);
    expect(
      (
        await as(
          f.users.ADMIN,
          'get',
          `${base}?from=2026-01-01T00%3A00%3A00.000Z&to=2027-01-03T00%3A00%3A00.000Z`,
        )
      ).status,
    ).toBe(400);
    const exclusive = await as(
      f.users.ADMIN,
      'get',
      `${base}?from=2026-01-15T12%3A00%3A00.000Z&to=2026-01-15T12%3A00%3A00.001Z`,
    );
    expect(exclusive.status).toBe(200);
    expect(exclusive.body.data.applicationsReceived).toBe(1);
    expect(
      (
        await as(
          f.users.ADMIN,
          'get',
          `/api/v1/organizations/${f.organizationId}/analytics/jobs?${query}&pageSize=101`,
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await as(
          f.users.ADMIN,
          'get',
          `/api/v1/organizations/${f.organizationId}/audit-events?pageSize=101`,
        )
      ).status,
    ).toBe(400);
  });

  it('rejects foreign organizations and job IDs for every analytics API', async () => {
    for (const endpoint of analytics)
      expect(
        (
          await as(
            f.users.ADMIN,
            'get',
            `/api/v1/organizations/${f.otherOrganizationId}/analytics/${endpoint}?${query}`,
          )
        ).status,
      ).toBeOneOf([403, 404]);
    for (const endpoint of analytics)
      expect(
        (
          await as(
            f.users.ADMIN,
            'get',
            `/api/v1/organizations/${f.organizationId}/analytics/${endpoint}?${query}&jobId=${f.foreign.jobId}`,
          )
        ).status,
      ).toBe(404);
  });

  it('provides paginated, filtered, allowlisted audit data and protects audit IDOR', async () => {
    const list = await as(
      f.users.ADMIN,
      'get',
      `/api/v1/organizations/${f.organizationId}/audit-events?${query}&page=1&pageSize=1&action=COMMUNICATION_SEND_REQUESTED`,
    );
    expect(list.status).toBe(200);
    expect(list.body.data.pagination).toMatchObject({ page: 1, pageSize: 1 });
    expect(list.body.data.auditEvents[0].metadata).toEqual({
      channel: 'EMAIL',
      status: 'PENDING',
    });
    const detail = await as(
      f.users.ADMIN,
      'get',
      `/api/v1/organizations/${f.organizationId}/audit-events/${localAuditId}`,
    );
    expect(detail.status).toBe(200);
    expect(detail.body.data.before).toEqual({ status: 'DRAFT' });
    expect(detail.body.data.after).toEqual({
      status: 'SENT',
      versionNumber: 1,
    });
    expect(detail.body.data.metadata).toBeNull();
    expect(JSON.stringify(detail.body)).not.toMatch(
      /compensation|terms|recipient|subject|body/i,
    );
    expect(
      (
        await as(
          f.users.ADMIN,
          'get',
          `/api/v1/organizations/${f.organizationId}/audit-events/${foreignAuditId}`,
        )
      ).status,
    ).toBe(404);
    expect(
      (
        await as(
          f.users.ADMIN,
          'get',
          `/api/v1/organizations/${f.organizationId}/audit-events/${generateEntityId()}`,
        )
      ).status,
    ).toBe(404);
    expect(
      (
        await as(
          f.users.ADMIN,
          'post',
          `/api/v1/organizations/${f.organizationId}/audit-events`,
        )
      ).status,
    ).toBe(404);
  });
});
