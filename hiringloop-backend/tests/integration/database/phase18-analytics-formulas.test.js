import { afterAll, beforeAll, describe, expect, it } from 'vitest';

process.env.NODE_ENV = 'test';

const { disconnectDatabase } = await import('../../../src/database/client.js');
const { createAnalyticsRepository } =
  await import('../../../src/modules/analytics/repositories/analytics-repository.js');
const { fixture, generateEntityId } =
  await import('../phase17-http-helpers.js');

const from = new Date('2026-05-01T00:00:00.000Z');
const to = new Date('2026-06-01T00:00:00.000Z');
const at = (value) => new Date(`2026-05-${value}T12:00:00.000Z`);

describe('Phase 18 analytics formula regressions', () => {
  let f;
  let analytics;
  let hired;
  let rejected;

  beforeAll(async () => {
    f = await fixture('p18-analytics-formulas');
    analytics = createAnalyticsRepository(f.prisma);
    hired = f.primary;
    rejected = await f.application(
      f.organizationId,
      'formula-rejected@example.test',
    );
    await f.prisma.application.updateMany({
      where: { id: { in: [hired.id, rejected.id] } },
      data: { submittedAt: at('02') },
    });
    await f.prisma.applicationOutcomeEvent.createMany({
      data: [
        {
          id: generateEntityId(),
          organizationId: f.organizationId,
          applicationId: hired.id,
          actorUserId: f.users.ADMIN.id,
          type: 'HIRED',
          occurredAt: at('03'),
        },
        {
          id: generateEntityId(),
          organizationId: f.organizationId,
          applicationId: hired.id,
          actorUserId: f.users.ADMIN.id,
          type: 'REOPENED',
          occurredAt: at('04'),
        },
        {
          id: generateEntityId(),
          organizationId: f.organizationId,
          applicationId: hired.id,
          actorUserId: f.users.ADMIN.id,
          type: 'HIRED',
          occurredAt: at('05'),
        },
        {
          id: generateEntityId(),
          organizationId: f.organizationId,
          applicationId: rejected.id,
          actorUserId: f.users.ADMIN.id,
          type: 'REJECTED',
          reasonCode: 'ROLE_CLOSED',
          occurredAt: at('06'),
        },
      ],
    });
    await f.prisma.offer.createMany({
      data: [
        {
          id: generateEntityId(),
          organizationId: f.organizationId,
          applicationId: hired.id,
          createdByUserId: f.users.ADMIN.id,
          status: 'ACCEPTED',
          sentAt: at('07'),
          acceptedAt: at('08'),
        },
        {
          id: generateEntityId(),
          organizationId: f.organizationId,
          applicationId: rejected.id,
          createdByUserId: f.users.ADMIN.id,
          status: 'DECLINED',
          sentAt: at('07'),
          declinedAt: at('08'),
        },
      ],
    });
    await f.prisma.communication.createMany({
      data: [
        {
          id: generateEntityId(),
          organizationId: f.organizationId,
          applicationId: hired.id,
          createdByUserId: f.users.ADMIN.id,
          recipientEmail: hired.candidate.email,
          subject: 's',
          body: 'b',
          provider: 'test',
          idempotencyKey: generateEntityId(),
          payloadHash: 'a'.repeat(64),
          status: 'SENT',
          sentAt: at('09'),
          createdAt: at('09'),
        },
        {
          id: generateEntityId(),
          organizationId: f.organizationId,
          applicationId: rejected.id,
          createdByUserId: f.users.ADMIN.id,
          recipientEmail: rejected.candidate.email,
          subject: 's',
          body: 'b',
          provider: 'test',
          idempotencyKey: generateEntityId(),
          payloadHash: 'b'.repeat(64),
          status: 'FAILED',
          failedAt: at('09'),
          createdAt: at('09'),
        },
      ],
    });
    await f.prisma.application.update({
      where: { id: f.foreign.id },
      data: { submittedAt: at('02') },
    });
    await f.prisma.applicationOutcomeEvent.create({
      data: {
        id: generateEntityId(),
        organizationId: f.otherOrganizationId,
        applicationId: f.foreign.id,
        actorUserId: f.users.OTHER.id,
        type: 'HIRED',
        occurredAt: at('03'),
      },
    });
  });
  afterAll(async () => disconnectDatabase());

  it('prevents duplicate hires after reopen and uses the latest hire for time to hire', async () => {
    const value = await analytics.outcomes({
      organizationId: f.organizationId,
      from,
      to,
    });
    // Offer decision numerator/denominator = 1 accepted / (1 accepted + 1 declined).
    expect(value.offers.accepted).toBe(1);
    expect(value.offers.declined).toBe(1);
    expect(value.offers.acceptanceRate).toBe(0.5);
    // Outcome numerator/denominator = 1 unique hired application / (1 hired + 1 rejected).
    expect(value.hired).toBe(1);
    expect(value.rejected).toBe(1);
    expect(value.hireRate).toBe(0.5);
    expect(value.reopened).toBe(1);
    // Latest hire is 72 hours after submission; the prior HIRED transition is not duplicated.
    expect(value.averageTimeToHireSeconds).toBe(259200);
  });

  it('calculates communication success and returns null for zero denominators and empty datasets', async () => {
    const communications = await analytics.communications({
      organizationId: f.organizationId,
      from,
      to,
    });
    expect(communications.sent).toBe(1);
    expect(communications.failed).toBe(1);
    expect(communications.completedDeliverySuccessRate).toBe(0.5);
    const empty = await analytics.outcomes({
      organizationId: f.otherOrganizationId,
      from,
      to: at('03'),
    });
    expect(empty.hired).toBe(0);
    expect(empty.rejected).toBe(0);
    expect(empty.hireRate).toBeNull();
    expect(empty.offers.acceptanceRate).toBeNull();
  });

  it('uses inclusive from, exclusive to, and organization scope for every numerator', async () => {
    const inclusive = await analytics.outcomes({
      organizationId: f.organizationId,
      from: at('03'),
      to: at('04'),
    });
    const exclusive = await analytics.outcomes({
      organizationId: f.organizationId,
      from,
      to: at('03'),
    });
    const foreign = await analytics.outcomes({
      organizationId: f.otherOrganizationId,
      from,
      to,
    });
    expect(inclusive.hired).toBe(1);
    expect(inclusive.hireRate).toBe(1);
    expect(exclusive.hired).toBe(0);
    expect(exclusive.hireRate).toBeNull();
    expect(foreign.hired).toBe(1);
    expect(foreign.rejected).toBe(0);
    expect(foreign.hireRate).toBe(1);
  });
});
