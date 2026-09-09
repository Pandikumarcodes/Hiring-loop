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

describe('Phase 17 HTTP tenant isolation matrix', () => {
  let f;
  beforeAll(async () => {
    f = await fixture('p17-tenant');
  });
  afterAll(async () => {
    await disconnectDatabase();
  });
  const createForeignOffer = async (application = f.foreign) =>
    mutate(
      f.users.OTHER,
      'post',
      offerApplicationUrl(f, application.id, f.otherOrganizationId),
    ).send(terms());
  const createForeignPool = async () =>
    mutate(f.users.OTHER, 'post', poolsUrl(f, f.otherOrganizationId)).send({
      name: `Foreign ${generateEntityId()}`,
    });
  const expectHidden = async (request, unchanged) => {
    const before = unchanged ? await unchanged() : undefined;
    const response = await request;
    expect(response.status).toBe(404);
    if (unchanged) expect(await unchanged()).toEqual(before);
  };

  it('does not disclose or mutate foreign offers and applications', async () => {
    const email = vi
      .spyOn(authEmailDelivery, 'sendCandidateEmail')
      .mockResolvedValue({ providerMessageId: 'foreign' });
    const draft = await createForeignOffer();
    const offerId = draft.body.data.id;
    await expectHidden(
      as(f.users.ADMIN, 'get', offerApplicationUrl(f, f.foreign.id)),
    );
    await expectHidden(
      mutate(f.users.ADMIN, 'post', offerApplicationUrl(f, f.foreign.id)).send(
        terms(),
      ),
      () => f.prisma.offer.count({ where: { applicationId: f.foreign.id } }),
    );
    await expectHidden(
      mutate(f.users.ADMIN, 'patch', `${offerUrl(f, offerId)}/draft`).send(
        terms({ expectedRevision: 1 }),
      ),
      () =>
        f.prisma.offerVersion.findFirst({
          where: { offerId },
          select: { revision: true, jobTitle: true },
        }),
    );
    await expectHidden(
      mutate(f.users.ADMIN, 'post', `${offerUrl(f, offerId)}/revisions`).send(
        terms({ expectedRevision: 1 }),
      ),
      () => f.prisma.offerVersion.count({ where: { offerId } }),
    );
    await expectHidden(
      mutate(f.users.ADMIN, 'post', `${offerUrl(f, offerId)}/send`).send({
        expectedRevision: 1,
        idempotencyKey: generateEntityId(),
      }),
      () =>
        f.prisma.communication.count({
          where: { applicationId: f.foreign.id },
        }),
    );
    for (const action of ['accept', 'decline', 'withdraw'])
      await expectHidden(
        mutate(f.users.ADMIN, 'post', `${offerUrl(f, offerId)}/${action}`).send(
          { expectedRevision: 1 },
        ),
        () =>
          f.prisma.offer.findUnique({
            where: { id: offerId },
            select: { status: true, revision: true },
          }),
      );
    for (const action of ['hire', 'reject', 'reopen'])
      await expectHidden(
        mutate(
          f.users.ADMIN,
          'post',
          `${outcomeUrl(f, f.foreign.id)}/${action}`,
        ).send(
          action === 'reject'
            ? { expectedRevision: 1, reasonCode: 'OTHER' }
            : action === 'reopen'
              ? { expectedRevision: 1, reasonDetails: 'No disclosure' }
              : { expectedRevision: 1 },
        ),
        () =>
          f.prisma.application.findUnique({
            where: { id: f.foreign.id },
            select: { outcome: true, outcomeRevision: true },
          }),
      );
    expect(email).not.toHaveBeenCalled();
    email.mockRestore();
  });

  it('does not disclose foreign pools or mutate cross-tenant pool relationships', async () => {
    const foreignPool = await createForeignPool();
    const foreignPoolId = foreignPool.body.data.id;
    const ownPool = await mutate(f.users.ADMIN, 'post', poolsUrl(f)).send({
      name: `Own ${generateEntityId()}`,
    });
    const ownPoolId = ownPool.body.data.id;
    const ownApp = await f.application(f.organizationId);
    const otherOwnApp = await f.application(f.organizationId);
    const memberBase = `${poolsUrl(f)}/${foreignPoolId}/members`;

    await expectHidden(
      mutate(f.users.ADMIN, 'patch', `${poolsUrl(f)}/${foreignPoolId}`).send({
        name: 'Probe',
        expectedRevision: 1,
      }),
      () =>
        f.prisma.talentPool.findUnique({
          where: { id: foreignPoolId },
          select: { name: true, revision: true },
        }),
    );
    await expectHidden(as(f.users.ADMIN, 'get', memberBase));
    await expectHidden(
      mutate(f.users.ADMIN, 'post', memberBase).send({
        candidateId: f.foreign.candidate.id,
      }),
      () =>
        f.prisma.talentPoolMember.count({
          where: { talentPoolId: foreignPoolId },
        }),
    );
    await expectHidden(
      mutate(
        f.users.ADMIN,
        'delete',
        `${memberBase}/${f.foreign.candidate.id}`,
      ),
      () =>
        f.prisma.talentPoolMember.count({
          where: { talentPoolId: foreignPoolId },
        }),
    );
    const ownMemberBase = `${poolsUrl(f)}/${ownPoolId}/members`;
    await expectHidden(
      mutate(f.users.ADMIN, 'post', ownMemberBase).send({
        candidateId: f.foreign.candidate.id,
      }),
      () =>
        f.prisma.talentPoolMember.count({ where: { talentPoolId: ownPoolId } }),
    );
    const beforeForeignSource = await f.prisma.talentPoolMember.count({
      where: { talentPoolId: ownPoolId },
    });
    const foreignSource = await mutate(
      f.users.ADMIN,
      'post',
      ownMemberBase,
    ).send({
      candidateId: ownApp.candidate.id,
      sourceApplicationId: f.foreign.id,
    });
    expect(foreignSource.status).toBe(400);
    expect(
      await f.prisma.talentPoolMember.count({
        where: { talentPoolId: ownPoolId },
      }),
    ).toBe(beforeForeignSource);
    const mismatchedSource = await mutate(
      f.users.ADMIN,
      'post',
      ownMemberBase,
    ).send({
      candidateId: ownApp.candidate.id,
      sourceApplicationId: otherOwnApp.id,
    });
    expect(mismatchedSource.status).toBe(400);
    expect(
      await f.prisma.talentPoolMember.count({
        where: { talentPoolId: ownPoolId },
      }),
    ).toBe(beforeForeignSource);
  });
});
