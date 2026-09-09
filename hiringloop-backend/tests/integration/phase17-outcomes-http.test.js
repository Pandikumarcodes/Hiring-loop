import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { authEmailDelivery } from '../../src/modules/auth/auth-module.js';
import {
  as,
  disconnectDatabase,
  fixture,
  generateEntityId,
  mutate,
  offerApplicationUrl,
  offerUrl,
  outcomeUrl,
  poolsUrl,
  terms,
} from './phase17-http-helpers.js';

describe('Phase 17 application outcome HTTP APIs', () => {
  let f;
  beforeAll(async () => {
    f = await fixture('p17-outcome');
  });
  afterAll(async () => {
    await disconnectDatabase();
  });
  async function acceptedApplication() {
    const app = await f.application(f.organizationId);
    const made = await mutate(
      f.users.ADMIN,
      'post',
      offerApplicationUrl(f, app.id),
    ).send(terms());
    const email = vi
      .spyOn(authEmailDelivery, 'sendCandidateEmail')
      .mockResolvedValue({});
    const sent = await mutate(
      f.users.ADMIN,
      'post',
      `${offerUrl(f, made.body.data.id)}/send`,
    ).send({ expectedRevision: 1, idempotencyKey: generateEntityId() });
    const current = await f.prisma.offer.findUnique({
      where: { id: made.body.data.id },
    });
    email.mockRestore();
    await mutate(
      f.users.ADMIN,
      'post',
      `${offerUrl(f, made.body.data.id)}/accept`,
    ).send({ expectedRevision: current.revision });
    return app;
  }
  it('hires only an active application with an accepted offer, records actor/event and guards revision', async () => {
    const app = await acceptedApplication();
    const response = await mutate(
      f.users.ADMIN,
      'post',
      `${outcomeUrl(f, app.id)}/hire`,
    ).send({ expectedRevision: 1 });
    expect(response.status).toBe(200);
    expect(response.body.data.outcome).toBe('HIRED');
    expect(response.body.data.outcomeRevision).toBe(2);
    expect(
      await f.prisma.applicationOutcomeEvent.findFirst({
        where: {
          applicationId: app.id,
          type: 'HIRED',
          actorUserId: f.users.ADMIN.id,
        },
      }),
    ).toBeTruthy();
    expect(
      (
        await mutate(
          f.users.ADMIN,
          'post',
          `${outcomeUrl(f, app.id)}/hire`,
        ).send({ expectedRevision: 1 })
      ).status,
    ).toBe(409);
    const noOffer = await f.application(f.organizationId);
    expect(
      (
        await mutate(
          f.users.ADMIN,
          'post',
          `${outcomeUrl(f, noOffer.id)}/hire`,
        ).send({ expectedRevision: 1 })
      ).status,
    ).toBe(409);
    for (const user of [f.users.HIRING_MANAGER, f.users.INTERVIEWER])
      expect(
        (
          await mutate(user, 'post', `${outcomeUrl(f, noOffer.id)}/hire`).send({
            expectedRevision: 1,
          })
        ).status,
      ).toBe(403);
  });
  it('rejects, validates reason, reopens while retaining history, and enforces tenant isolation', async () => {
    const app = await f.application(f.organizationId);
    const reject = await mutate(
      f.users.RECRUITER,
      'post',
      `${outcomeUrl(f, app.id)}/reject`,
    ).send({
      expectedRevision: 1,
      reasonCode: 'OTHER',
      reasonDetails: 'Documented',
    });
    expect(reject.status).toBe(200);
    expect(reject.body.data.outcome).toBe('REJECTED');
    expect(
      (
        await mutate(
          f.users.ADMIN,
          'post',
          `${outcomeUrl(f, app.id)}/reject`,
        ).send({ expectedRevision: 2 })
      ).status,
    ).toBe(400);
    const reopen = await mutate(
      f.users.ADMIN,
      'post',
      `${outcomeUrl(f, app.id)}/reopen`,
    ).send({ expectedRevision: 2, reasonDetails: 'Reconsidered' });
    expect(reopen.status).toBe(200);
    expect(reopen.body.data.outcome).toBe('ACTIVE');
    expect(
      await f.prisma.applicationOutcomeEvent.count({
        where: { applicationId: app.id },
      }),
    ).toBe(2);
    expect(
      (
        await mutate(
          f.users.ADMIN,
          'post',
          `${outcomeUrl(f, app.id)}/reopen`,
        ).send({ expectedRevision: 3, reasonDetails: 'Again' })
      ).status,
    ).toBe(409);
    expect(
      (
        await mutate(
          f.users.ADMIN,
          'post',
          `${outcomeUrl(f, f.foreign.id)}/reject`,
        ).send({ expectedRevision: 1, reasonCode: 'OTHER' })
      ).status,
    ).toBe(404);
    for (const user of [f.users.HIRING_MANAGER, f.users.INTERVIEWER])
      expect(
        (
          await mutate(
            user,
            'post',
            `${outcomeUrl(f, (await f.application(f.organizationId)).id)}/reject`,
          ).send({ expectedRevision: 1, reasonCode: 'OTHER' })
        ).status,
      ).toBe(403);
  });
  it('commits reject plus pool membership atomically and preserves an existing membership', async () => {
    const pool = await mutate(f.users.ADMIN, 'post', poolsUrl(f)).send({
      name: `Rejected ${generateEntityId()}`,
    });
    const app = await f.application(f.organizationId);
    const response = await mutate(
      f.users.ADMIN,
      'post',
      `${outcomeUrl(f, app.id)}/reject`,
    ).send({
      expectedRevision: 1,
      reasonCode: 'OTHER',
      talentPoolId: pool.body.data.id,
    });
    expect(response.status).toBe(200);
    expect(
      await f.prisma.talentPoolMember.count({
        where: {
          talentPoolId: pool.body.data.id,
          candidateId: app.candidate.id,
        },
      }),
    ).toBe(1);
    const untouched = await f.application(f.organizationId);
    expect(
      (
        await mutate(
          f.users.ADMIN,
          'post',
          `${outcomeUrl(f, untouched.id)}/reject`,
        ).send({
          expectedRevision: 1,
          reasonCode: 'OTHER',
          talentPoolId: generateEntityId(),
        })
      ).status,
    ).toBe(404);
    expect(
      (await f.prisma.application.findUnique({ where: { id: untouched.id } }))
        .outcome,
    ).toBe('ACTIVE');
    expect(
      await f.prisma.applicationOutcomeEvent.count({
        where: { applicationId: untouched.id },
      }),
    ).toBe(0);
    const again = await f.application(f.organizationId);
    await mutate(
      f.users.ADMIN,
      'post',
      `${poolsUrl(f)}/${pool.body.data.id}/members`,
    ).send({ candidateId: again.candidate.id });
    expect(
      (
        await mutate(
          f.users.ADMIN,
          'post',
          `${outcomeUrl(f, again.id)}/reject`,
        ).send({
          expectedRevision: 1,
          reasonCode: 'OTHER',
          talentPoolId: pool.body.data.id,
        })
      ).status,
    ).toBe(200);
    expect(
      await f.prisma.talentPoolMember.count({
        where: {
          talentPoolId: pool.body.data.id,
          candidateId: again.candidate.id,
        },
      }),
    ).toBe(1);
  });
  it('performs a real hire versus reject database race with one winner', async () => {
    const app = await acceptedApplication();
    const [hire, reject] = await Promise.all([
      mutate(f.users.ADMIN, 'post', `${outcomeUrl(f, app.id)}/hire`).send({
        expectedRevision: 1,
      }),
      mutate(f.users.RECRUITER, 'post', `${outcomeUrl(f, app.id)}/reject`).send(
        { expectedRevision: 1, reasonCode: 'OTHER' },
      ),
    ]);
    expect(
      [hire.status, reject.status].filter((status) => status === 200),
    ).toHaveLength(1);
    expect(
      [hire.status, reject.status].filter((status) => status === 409),
    ).toHaveLength(1);
    expect(
      await f.prisma.applicationOutcomeEvent.count({
        where: { applicationId: app.id, type: { in: ['HIRED', 'REJECTED'] } },
      }),
    ).toBe(1);
  });
});
