import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { authEmailDelivery } from '../../src/modules/auth/auth-module.js';
import { EmailDeliveryError } from '../../src/modules/auth/email/email-delivery.js';
import {
  as,
  disconnectDatabase,
  fixture,
  generateEntityId,
  mutate,
  offerApplicationUrl,
  offerUrl,
  terms,
} from './phase17-http-helpers.js';

describe('Phase 17 offer HTTP APIs', () => {
  let f;
  beforeAll(async () => {
    f = await fixture('p17-offer');
  });
  afterAll(async () => {
    await disconnectDatabase();
  });
  const create = (user, appId = f.primary.id, body = terms()) =>
    mutate(user, 'post', offerApplicationUrl(f, appId)).send(body);

  it('authorizes offer reads and never exposes compensation to denied roles', async () => {
    const created = await create(f.users.ADMIN);
    const id = created.body.data.id;
    for (const user of [f.users.ADMIN, f.users.RECRUITER])
      expect((await as(user, 'get', offerUrl(f, id))).status).toBe(200);
    for (const user of [f.users.HIRING_MANAGER, f.users.INTERVIEWER]) {
      const response = await as(user, 'get', offerUrl(f, id));
      expect(response.status).toBe(403);
      expect(JSON.stringify(response.body)).not.toContain('12500000');
    }
    const missing = await as(
      f.users.ADMIN,
      'get',
      offerApplicationUrl(f, generateEntityId()),
    );
    const foreign = await as(
      f.users.ADMIN,
      'get',
      offerApplicationUrl(f, f.foreign.id),
    );
    expect(missing.status).toBe(404);
    expect(foreign.status).toBe(404);
  });

  it('creates a version one offer and validates duplicate, terms, tenant, and roles', async () => {
    const app = await f.application(f.organizationId);
    const made = await create(f.users.RECRUITER, app.id);
    expect(made.status).toBe(201);
    expect(made.body.data.currentVersion.versionNumber).toBe(1);
    expect((await create(f.users.ADMIN, app.id)).status).toBe(409);
    expect(
      (
        await create(
          f.users.ADMIN,
          (await f.application(f.organizationId)).id,
          terms({ baseCompensationMinor: '-1' }),
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await create(
          f.users.ADMIN,
          (await f.application(f.organizationId)).id,
          terms({ currency: 'usd' }),
        )
      ).status,
    ).toBe(400);
    expect((await create(f.users.ADMIN, f.foreign.id)).status).toBe(404);
    for (const user of [f.users.HIRING_MANAGER, f.users.INTERVIEWER])
      expect(
        (await create(user, (await f.application(f.organizationId)).id)).status,
      ).toBe(403);
  });

  it('edits drafts, rejects stale and issued edits, and creates immutable incremented revisions', async () => {
    const app = await f.application(f.organizationId);
    const made = await create(f.users.ADMIN, app.id);
    const id = made.body.data.id;
    const edited = await mutate(
      f.users.ADMIN,
      'patch',
      `${offerUrl(f, id)}/draft`,
    ).send(terms({ jobTitle: 'Edited', expectedRevision: 1 }));
    expect(edited.status).toBe(200);
    expect(edited.body.data.jobTitle).toBe('Edited');
    expect(
      (
        await mutate(f.users.ADMIN, 'patch', `${offerUrl(f, id)}/draft`).send(
          terms({ expectedRevision: 1 }),
        )
      ).status,
    ).toBe(409);
    const send = vi
      .spyOn(authEmailDelivery, 'sendCandidateEmail')
      .mockResolvedValue({ providerMessageId: 'one' });
    expect(
      (
        await mutate(f.users.ADMIN, 'post', `${offerUrl(f, id)}/send`).send({
          expectedRevision: 1,
          idempotencyKey: generateEntityId(),
        })
      ).status,
    ).toBe(201);
    expect(
      (
        await mutate(f.users.ADMIN, 'patch', `${offerUrl(f, id)}/draft`).send(
          terms({ expectedRevision: 2 }),
        )
      ).status,
    ).toBe(409);
    const revision = await mutate(
      f.users.ADMIN,
      'post',
      `${offerUrl(f, id)}/revisions`,
    ).send(terms({ jobTitle: 'V2', expectedRevision: 2 }));
    expect(revision.status).toBe(201);
    expect(revision.body.data.currentVersion.versionNumber).toBe(2);
    expect(
      (
        await f.prisma.offerVersion.findFirst({
          where: { offerId: id, versionNumber: 1 },
        })
      ).jobTitle,
    ).toBe('Edited');
    expect(
      (
        await mutate(f.users.ADMIN, 'post', `${offerUrl(f, id)}/accept`).send({
          expectedRevision: 3,
        })
      ).status,
    ).toBe(409);
    const revisedSend = await mutate(
      f.users.ADMIN,
      'post',
      `${offerUrl(f, id)}/send`,
    ).send({ expectedRevision: 3, idempotencyKey: generateEntityId() });
    expect(revisedSend.status).toBe(201);
    expect(
      await f.prisma.offerVersion.findFirst({
        where: { offerId: id, versionNumber: 2 },
      }),
    ).toMatchObject({ issuedAt: expect.any(Date) });
    send.mockRestore();
  });

  it('sends with provider success, failure, ambiguity, idempotency, pending and failed retry safety', async () => {
    const app = await f.application(f.organizationId);
    const made = await create(f.users.ADMIN, app.id);
    const id = made.body.data.id;
    const delivery = vi
      .spyOn(authEmailDelivery, 'sendCandidateEmail')
      .mockResolvedValue({ providerMessageId: 'sent' });
    const key = generateEntityId();
    const first = await mutate(
      f.users.ADMIN,
      'post',
      `${offerUrl(f, id)}/send`,
    ).send({ expectedRevision: 1, idempotencyKey: key });
    expect(first.status).toBe(201);
    const communication = await f.prisma.communication.findUnique({
      where: { id: first.body.data.communicationId },
    });
    expect(communication).toMatchObject({
      status: 'SENT',
      recipientEmail: app.candidate.email,
    });
    expect(
      (
        await mutate(f.users.ADMIN, 'post', `${offerUrl(f, id)}/send`).send({
          expectedRevision: 1,
          idempotencyKey: key,
        })
      ).status,
    ).toBe(200);
    expect(delivery).toHaveBeenCalledTimes(1);
    expect(
      (
        await mutate(f.users.ADMIN, 'post', `${offerUrl(f, id)}/send`).send({
          expectedRevision: 2,
          idempotencyKey: key,
        })
      ).status,
    ).toBe(409);
    const current = await as(f.users.ADMIN, 'get', offerUrl(f, id));
    const revised = await mutate(
      f.users.ADMIN,
      'post',
      `${offerUrl(f, id)}/revisions`,
    ).send(terms({ expectedRevision: current.body.data.revision }));
    expect(revised.status).toBe(201);
    const failedApp = await f.application(f.organizationId);
    const failedOffer = await create(f.users.ADMIN, failedApp.id);
    delivery.mockRejectedValueOnce(
      new EmailDeliveryError({ category: 'sendgrid-error' }),
    );
    const failed = await mutate(
      f.users.ADMIN,
      'post',
      `${offerUrl(f, failedOffer.body.data.id)}/send`,
    ).send({ expectedRevision: 1, idempotencyKey: generateEntityId() });
    expect(failed.status).toBe(502);
    expect(
      (
        await f.prisma.offer.findUnique({
          where: { id: failedOffer.body.data.id },
        })
      ).status,
    ).toBe('SENT');
    expect(
      await f.prisma.notification.count({
        where: {
          organizationId: f.organizationId,
          type: 'CANDIDATE_COMMUNICATION_FAILED',
        },
      }),
    ).toBeGreaterThan(0);
    const pendingApp = await f.application(f.organizationId);
    const pendingOffer = await create(f.users.ADMIN, pendingApp.id);
    delivery.mockRejectedValueOnce(
      new EmailDeliveryError({ category: 'ambiguous' }),
    );
    const pendingKey = generateEntityId();
    const pending = await mutate(
      f.users.ADMIN,
      'post',
      `${offerUrl(f, pendingOffer.body.data.id)}/send`,
    ).send({ expectedRevision: 1, idempotencyKey: pendingKey });
    expect(pending.status).toBe(202);
    const calls = delivery.mock.calls.length;
    expect(
      (
        await mutate(
          f.users.ADMIN,
          'post',
          `${offerUrl(f, pendingOffer.body.data.id)}/send`,
        ).send({ expectedRevision: 1, idempotencyKey: pendingKey })
      ).status,
    ).toBe(202);
    expect(delivery.mock.calls.length).toBe(calls);
    delivery.mockRestore();
  });

  it('retries a failed offer communication without reissuing its immutable version', async () => {
    const app = await f.application(f.organizationId);
    const made = await create(f.users.ADMIN, app.id);
    const offerId = made.body.data.id;
    const key = generateEntityId();
    const delivery = vi
      .spyOn(authEmailDelivery, 'sendCandidateEmail')
      .mockRejectedValueOnce(
        new EmailDeliveryError({ category: 'sendgrid-error' }),
      )
      .mockResolvedValueOnce({ providerMessageId: 'retry-sent' });

    const failed = await mutate(
      f.users.ADMIN,
      'post',
      `${offerUrl(f, offerId)}/send`,
    ).send({ expectedRevision: 1, idempotencyKey: key });
    expect(failed.status).toBe(502);

    const beforeRetry = await f.prisma.offer.findUnique({
      where: { id: offerId },
      include: { versions: true },
    });
    const failedCommunication = await f.prisma.communication.findFirst({
      where: { applicationId: app.id, idempotencyKey: key },
    });
    expect(beforeRetry).toMatchObject({ status: 'SENT', revision: 2 });
    expect(beforeRetry.versions).toHaveLength(1);
    expect(beforeRetry.versions[0].issuedAt).toBeTruthy();
    expect(failedCommunication).toMatchObject({
      status: 'FAILED',
      offerVersionId: beforeRetry.currentVersionId,
      failureCategory: 'sendgrid-error',
    });
    expect(
      await f.prisma.notification.count({
        where: {
          organizationId: f.organizationId,
          applicationId: app.id,
          type: 'CANDIDATE_COMMUNICATION_FAILED',
        },
      }),
    ).toBe(1);

    const retried = await mutate(
      f.users.ADMIN,
      'post',
      `${offerUrl(f, offerId)}/send`,
    ).send({ expectedRevision: 1, idempotencyKey: key });
    expect(retried.status).toBe(201);
    expect(retried.body.data.communicationId).toBe(failedCommunication.id);
    expect(delivery).toHaveBeenCalledTimes(2);

    const afterRetry = await f.prisma.offer.findUnique({
      where: { id: offerId },
      include: { versions: true },
    });
    const finalCommunication = await f.prisma.communication.findUnique({
      where: { id: failedCommunication.id },
    });
    expect(afterRetry).toMatchObject({
      status: 'SENT',
      revision: beforeRetry.revision,
      currentVersionId: beforeRetry.currentVersionId,
    });
    expect(afterRetry.versions).toHaveLength(1);
    expect(finalCommunication).toMatchObject({
      status: 'SENT',
      offerVersionId: beforeRetry.currentVersionId,
      providerMessageId: 'retry-sent',
    });
    expect(
      await f.prisma.communication.count({ where: { applicationId: app.id } }),
    ).toBe(1);
    delivery.mockRestore();
  });

  it('transitions accept decline withdraw and conceals foreign offers', async () => {
    const app = await f.application(f.organizationId);
    const made = await create(f.users.ADMIN, app.id);
    const id = made.body.data.id;
    expect(
      (
        await mutate(f.users.ADMIN, 'post', `${offerUrl(f, id)}/accept`).send({
          expectedRevision: 1,
        })
      ).status,
    ).toBe(409);
    expect(
      (
        await mutate(f.users.ADMIN, 'post', `${offerUrl(f, id)}/withdraw`).send(
          { expectedRevision: 1 },
        )
      ).status,
    ).toBe(200);
    expect(
      (
        await mutate(f.users.ADMIN, 'post', `${offerUrl(f, id)}/withdraw`).send(
          { expectedRevision: 2 },
        )
      ).status,
    ).toBe(409);
    expect(
      (
        await mutate(
          f.users.ADMIN,
          'patch',
          `${offerUrl(f, generateEntityId())}/draft`,
        ).send(terms({ expectedRevision: 1 }))
      ).status,
    ).toBe(404);
  });

  it('serializes a real concurrent send into one issue and one deterministic loser', async () => {
    const app = await f.application(f.organizationId);
    const made = await create(f.users.ADMIN, app.id);
    const delivery = vi
      .spyOn(authEmailDelivery, 'sendCandidateEmail')
      .mockResolvedValue({ providerMessageId: 'race' });
    const [left, right] = await Promise.all([
      mutate(
        f.users.ADMIN,
        'post',
        `${offerUrl(f, made.body.data.id)}/send`,
      ).send({
        expectedRevision: 1,
        idempotencyKey: generateEntityId(),
      }),
      mutate(
        f.users.ADMIN,
        'post',
        `${offerUrl(f, made.body.data.id)}/send`,
      ).send({
        expectedRevision: 1,
        idempotencyKey: generateEntityId(),
      }),
    ]);
    expect(
      [left.status, right.status].filter((status) => status === 201),
    ).toHaveLength(1);
    expect(
      [left.status, right.status].filter((status) => status === 409),
    ).toHaveLength(1);
    expect(
      await f.prisma.communication.count({ where: { applicationId: app.id } }),
    ).toBe(1);
    expect(delivery).toHaveBeenCalledTimes(1);
    delivery.mockRestore();
  });
});
