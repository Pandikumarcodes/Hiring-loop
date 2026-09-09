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

describe('Phase 17 HTTP authorization matrix', () => {
  let f;
  beforeAll(async () => {
    f = await fixture('p17-access');
  });
  afterAll(async () => {
    await disconnectDatabase();
  });

  const createOffer = async (app, user = f.users.ADMIN) =>
    mutate(user, 'post', offerApplicationUrl(f, app.id)).send(terms());
  const sendOffer = async (offerId, user = f.users.ADMIN) =>
    mutate(user, 'post', `${offerUrl(f, offerId)}/send`).send({
      expectedRevision: 1,
      idempotencyKey: generateEntityId(),
    });
  async function sentOffer() {
    const app = await f.application(f.organizationId);
    const offer = await createOffer(app);
    await sendOffer(offer.body.data.id);
    return { app, offerId: offer.body.data.id };
  }
  async function acceptedApplication() {
    const result = await sentOffer();
    await mutate(
      f.users.ADMIN,
      'post',
      `${offerUrl(f, result.offerId)}/accept`,
    ).send({
      expectedRevision: 2,
    });
    return result.app;
  }
  async function pool() {
    return mutate(f.users.ADMIN, 'post', poolsUrl(f)).send({
      name: `Access ${generateEntityId()}`,
    });
  }
  const response = (user, operation) => operation(user);

  it('uses all 17 actual endpoints for ADMIN and RECRUITER, and denies both remaining roles without mutation', async () => {
    const email = vi
      .spyOn(authEmailDelivery, 'sendCandidateEmail')
      .mockResolvedValue({ providerMessageId: 'access' });
    const operations = [
      {
        name: 'GET application Offer',
        setup: async () => {
          const app = await f.application(f.organizationId);
          await createOffer(app);
          return { run: (u) => as(u, 'get', offerApplicationUrl(f, app.id)) };
        },
      },
      {
        name: 'POST create Offer',
        setup: async () => {
          const app = await f.application(f.organizationId);
          return {
            run: (u) =>
              mutate(u, 'post', offerApplicationUrl(f, app.id)).send(terms()),
            unchanged: () =>
              f.prisma.offer.count({ where: { applicationId: app.id } }),
          };
        },
      },
      {
        name: 'PATCH draft',
        setup: async () => {
          const app = await f.application(f.organizationId),
            offer = await createOffer(app);
          return {
            run: (u) =>
              mutate(
                u,
                'patch',
                `${offerUrl(f, offer.body.data.id)}/draft`,
              ).send(terms({ jobTitle: 'Changed', expectedRevision: 1 })),
            unchanged: () =>
              f.prisma.offerVersion.findFirst({
                where: { offerId: offer.body.data.id },
                select: { jobTitle: true, revision: true },
              }),
          };
        },
      },
      {
        name: 'POST revision',
        setup: async () => {
          const app = await f.application(f.organizationId),
            offer = await createOffer(app);
          return {
            run: (u) =>
              mutate(
                u,
                'post',
                `${offerUrl(f, offer.body.data.id)}/revisions`,
              ).send(terms({ expectedRevision: 1 })),
            unchanged: () =>
              f.prisma.offerVersion.count({
                where: { offerId: offer.body.data.id },
              }),
          };
        },
      },
      {
        name: 'POST send',
        setup: async () => {
          const app = await f.application(f.organizationId),
            offer = await createOffer(app);
          return {
            run: (u) => sendOffer(offer.body.data.id, u),
            unchanged: () =>
              f.prisma.communication.count({
                where: { applicationId: app.id },
              }),
          };
        },
      },
      ...['accept', 'decline'].map((action) => ({
        name: `POST ${action}`,
        setup: async () => {
          const { app, offerId } = await sentOffer();
          return {
            run: (u) =>
              mutate(u, 'post', `${offerUrl(f, offerId)}/${action}`).send({
                expectedRevision: 2,
              }),
            unchanged: () =>
              f.prisma.offer.findUnique({
                where: { id: offerId },
                select: { status: true, revision: true },
              }),
          };
        },
      })),
      {
        name: 'POST withdraw',
        setup: async () => {
          const app = await f.application(f.organizationId),
            offer = await createOffer(app);
          return {
            run: (u) =>
              mutate(
                u,
                'post',
                `${offerUrl(f, offer.body.data.id)}/withdraw`,
              ).send({ expectedRevision: 1 }),
            unchanged: () =>
              f.prisma.offer.findUnique({
                where: { id: offer.body.data.id },
                select: { status: true, revision: true },
              }),
          };
        },
      },
      {
        name: 'POST hire',
        setup: async () => {
          const app = await acceptedApplication();
          return {
            run: (u) =>
              mutate(u, 'post', `${outcomeUrl(f, app.id)}/hire`).send({
                expectedRevision: 1,
              }),
            unchanged: () =>
              f.prisma.application.findUnique({
                where: { id: app.id },
                select: { outcome: true, outcomeRevision: true },
              }),
          };
        },
      },
      {
        name: 'POST reject',
        setup: async () => {
          const app = await f.application(f.organizationId);
          return {
            run: (u) =>
              mutate(u, 'post', `${outcomeUrl(f, app.id)}/reject`).send({
                expectedRevision: 1,
                reasonCode: 'OTHER',
              }),
            unchanged: () =>
              f.prisma.application.findUnique({
                where: { id: app.id },
                select: { outcome: true, outcomeRevision: true },
              }),
          };
        },
      },
      {
        name: 'POST reopen',
        setup: async () => {
          const app = await f.application(f.organizationId);
          await mutate(
            f.users.ADMIN,
            'post',
            `${outcomeUrl(f, app.id)}/reject`,
          ).send({ expectedRevision: 1, reasonCode: 'OTHER' });
          return {
            run: (u) =>
              mutate(u, 'post', `${outcomeUrl(f, app.id)}/reopen`).send({
                expectedRevision: 2,
                reasonDetails: 'Review',
              }),
            unchanged: () =>
              f.prisma.application.findUnique({
                where: { id: app.id },
                select: { outcome: true, outcomeRevision: true },
              }),
          };
        },
      },
      {
        name: 'GET pools',
        setup: async () => ({ run: (u) => as(u, 'get', poolsUrl(f)) }),
      },
      {
        name: 'POST pool',
        setup: async () => ({
          run: (u) =>
            mutate(u, 'post', poolsUrl(f)).send({
              name: `New ${generateEntityId()}`,
            }),
          unchanged: () =>
            f.prisma.talentPool.count({
              where: { organizationId: f.organizationId },
            }),
        }),
      },
      {
        name: 'PATCH pool',
        setup: async () => {
          const value = await pool();
          return {
            run: (u) =>
              mutate(u, 'patch', `${poolsUrl(f)}/${value.body.data.id}`).send({
                name: `Changed ${generateEntityId()}`,
                expectedRevision: 1,
              }),
            unchanged: () =>
              f.prisma.talentPool.findUnique({
                where: { id: value.body.data.id },
                select: { name: true, revision: true },
              }),
          };
        },
      },
      {
        name: 'GET members',
        setup: async () => {
          const value = await pool();
          return {
            run: (u) =>
              as(u, 'get', `${poolsUrl(f)}/${value.body.data.id}/members`),
          };
        },
      },
      {
        name: 'POST member',
        setup: async () => {
          const value = await pool(),
            app = await f.application(f.organizationId);
          return {
            run: (u) =>
              mutate(
                u,
                'post',
                `${poolsUrl(f)}/${value.body.data.id}/members`,
              ).send({ candidateId: app.candidate.id }),
            unchanged: () =>
              f.prisma.talentPoolMember.count({
                where: {
                  talentPoolId: value.body.data.id,
                  candidateId: app.candidate.id,
                },
              }),
          };
        },
      },
      {
        name: 'DELETE member',
        setup: async () => {
          const value = await pool(),
            app = await f.application(f.organizationId),
            base = `${poolsUrl(f)}/${value.body.data.id}/members`;
          await mutate(f.users.ADMIN, 'post', base).send({
            candidateId: app.candidate.id,
          });
          return {
            run: (u) => mutate(u, 'delete', `${base}/${app.candidate.id}`),
            unchanged: () =>
              f.prisma.talentPoolMember.count({
                where: {
                  talentPoolId: value.body.data.id,
                  candidateId: app.candidate.id,
                },
              }),
          };
        },
      },
    ];

    expect(operations).toHaveLength(17);
    for (const operation of operations) {
      for (const role of ['ADMIN', 'RECRUITER']) {
        const target = await operation.setup();
        expect(
          (await response(f.users[role], target.run)).status,
          operation.name,
        ).toBeLessThan(300);
      }
      for (const role of ['HIRING_MANAGER', 'INTERVIEWER']) {
        const target = await operation.setup();
        const before = target.unchanged ? await target.unchanged() : undefined;
        const denied = await response(f.users[role], target.run);
        expect(denied.status, `${operation.name}: ${role}`).toBe(403);
        expect(JSON.stringify(denied.body)).not.toContain('12500000');
        if (target.unchanged) expect(await target.unchanged()).toEqual(before);
      }
    }
    email.mockRestore();
  }, 30000);
});
