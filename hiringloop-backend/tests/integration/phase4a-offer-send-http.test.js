import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import {
  fixture,
  disconnectDatabase,
  generateEntityId,
  mutate,
  offerApplicationUrl,
  offerUrl,
  terms,
} from './phase17-http-helpers.js';
import { authEmailDelivery } from '../../src/modules/auth/auth-module.js';
import { EmailDeliveryError } from '../../src/modules/auth/email/email-delivery.js';

describe('Phase 4A offer send HTTP integrity', () => {
  let f;
  let delivery;
  beforeAll(async () => {
    f = await fixture('p4a-send');
    const [identity] = await f.prisma.$queryRaw`
      SELECT current_database() AS database, current_schema() AS schema
    `;
    expect(identity).toEqual({ database: 'hiringloop_test', schema: 'public' });
  });
  afterEach(() => vi.restoreAllMocks());
  afterAll(async () => disconnectDatabase());

  async function draft() {
    const application = await f.application(f.organizationId);
    const response = await mutate(
      f.users.ADMIN,
      'post',
      offerApplicationUrl(f, application.id),
    ).send(terms());
    expect(response.status).toBe(201);
    delivery = vi
      .spyOn(authEmailDelivery, 'sendCandidateEmail')
      .mockResolvedValue({ providerMessageId: 'fake-p4a' });
    return { applicationId: application.id, offerId: response.body.data.id };
  }
  function send(
    d,
    key,
    revision = 1,
    user = f.users.ADMIN,
    org = f.organizationId,
  ) {
    return mutate(user, 'post', `${offerUrl(f, d.offerId, org)}/send`).send({
      expectedRevision: revision,
      idempotencyKey: key,
    });
  }
  async function state(d) {
    const offer = await f.prisma.offer.findUnique({
      where: { id: d.offerId },
      include: { currentVersion: true },
    });
    const communications = await f.prisma.communication.findMany({
      where: { applicationId: d.applicationId },
    });
    const audits = await f.prisma.auditEvent.count({
      where: { resourceId: d.offerId, action: 'OFFER_SENT' },
    });
    return { offer, communications, audits };
  }
  async function issuedOnce(d, status = 'SENT', calls = 1) {
    const s = await state(d);
    expect(s.offer).toMatchObject({
      status: 'SENT',
      revision: 2,
      sentAt: expect.any(Date),
    });
    expect(s.offer.currentVersion.issuedAt).toBeInstanceOf(Date);
    expect(s.communications).toHaveLength(1);
    expect(s.communications[0]).toMatchObject({
      status,
      offerVersionId: s.offer.currentVersionId,
    });
    expect(s.audits).toBe(1);
    expect(delivery).toHaveBeenCalledTimes(calls);
    return s;
  }

  // The blocker covers the old version-write race and the repaired parent lock.
  // Release only after PostgreSQL reports BOTH competing transactions waiting.
  async function compete(d, keys) {
    let acquired, release;
    const ready = new Promise((resolve) => {
      acquired = resolve;
    });
    const gate = new Promise((resolve) => {
      release = resolve;
    });
    const blocker = f.prisma.$transaction(async (db) => {
      await db.$queryRaw`SELECT "id" FROM "Offer" WHERE "id" = ${d.offerId}::uuid FOR NO KEY UPDATE`;
      await db.$queryRaw`SELECT "id" FROM "OfferVersion" WHERE "offerId" = ${d.offerId}::uuid FOR NO KEY UPDATE`;
      const [backend] = await db.$queryRaw`SELECT pg_backend_pid()::int AS pid`;
      acquired(backend.pid);
      await gate;
    });
    const pid = await ready;
    const requests = keys.map((key) =>
      send(d, key).then((response) => response),
    );
    try {
      const deadline = Date.now() + 4000;
      let waiting = [];
      do {
        waiting = await f.prisma.$queryRaw`
          WITH RECURSIVE blocked(pid) AS (
            SELECT ${pid}::int
            UNION
            SELECT activity.pid FROM pg_stat_activity activity
            JOIN blocked ON blocked.pid = ANY(pg_blocking_pids(activity.pid))
            WHERE activity.datname = current_database()
          )
          SELECT activity.pid, activity.query FROM pg_stat_activity activity
          JOIN blocked USING (pid)
          WHERE activity.pid <> ${pid}
            AND (activity.query LIKE '%"Offer"%' OR activity.query LIKE '%"OfferVersion"%')
        `;
        if (waiting.length >= 2) break;
        await new Promise((resolve) => setImmediate(resolve));
      } while (Date.now() < deadline);
      expect(waiting).toHaveLength(2);
    } finally {
      release();
      await blocker;
      await Promise.all(requests);
    }
    return Promise.all(requests);
  }

  it('commits a single valid send before invoking the provider', async () => {
    const d = await draft();
    delivery.mockImplementation(async () => {
      const s = await state(d);
      expect(s.offer).toMatchObject({ status: 'SENT', revision: 2 });
      expect(s.communications).toHaveLength(1);
      expect(s.communications[0].status).toBe('PENDING');
      expect(s.audits).toBe(1);
      return { providerMessageId: 'fake-p4a' };
    });
    const response = await send(d, generateEntityId());
    expect(response.status).toBe(201);
    await issuedOnce(d);
  });

  it('serializes distinct idempotency keys into 201 and 409 under controlled contention', async () => {
    const d = await draft();
    const errors = [];
    const transaction = f.prisma.$transaction.bind(f.prisma);
    vi.spyOn(f.prisma, '$transaction').mockImplementation(async (...args) => {
      try {
        return await transaction(...args);
      } catch (error) {
        errors.push(error);
        console.info('offer-send database error', {
          name: error.name,
          code: error.code,
          databaseCode: error.meta?.driverAdapterError?.cause?.code,
          databaseMessage: error.meta?.driverAdapterError?.cause?.message,
        });
        throw error;
      }
    });
    const keys = [generateEntityId(), generateEntityId()];
    const responses = await compete(d, keys);
    const s = await state(d);
    console.info('offer-send contention evidence', {
      offerId: d.offerId,
      actorUserId: f.users.ADMIN.id,
      keys,
      requests: responses.map((r) => ({
        status: r.status,
        requestId: r.body.error?.requestId ?? r.headers['x-request-id'],
        code: r.body.error?.code,
      })),
      offerStatus: s.offer.status,
      revision: s.offer.revision,
      communications: s.communications.length,
      providerCalls: delivery.mock.calls.length,
    });
    expect(responses.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(responses.find((r) => r.status === 409).body.error).toMatchObject({
      code: 'OFFER_INVALID_TRANSITION',
      requestId: expect.any(String),
    });
    expect(errors).toHaveLength(0);
    await issuedOnce(d);
  });

  it('replays competing duplicate keys without a second communication or dispatch', async () => {
    const d = await draft();
    const key = generateEntityId();
    const responses = await compete(d, [key, key]);
    expect(responses.filter((r) => r.status === 201)).toHaveLength(1);
    expect([200, 202]).toContain(
      responses.find((r) => r.status !== 201).status,
    );
    expect(
      new Set(responses.map((r) => r.body.data.communicationId)).size,
    ).toBe(1);
    expect((await send(d, key)).status).toBe(200);
    const collision = await send(d, key, 2);
    expect(collision.status).toBe(409);
    expect(collision.body.error.code).toBe(
      'COMMUNICATION_IDEMPOTENCY_CONFLICT',
    );
    await issuedOnce(d);
  });

  it('rejects a stale revision without any send side effects', async () => {
    const d = await draft();
    const revised = await mutate(
      f.users.ADMIN,
      'post',
      `${offerUrl(f, d.offerId)}/revisions`,
    ).send(terms({ expectedRevision: 1 }));
    expect(revised.status).toBe(201);
    const before = await state(d);
    const response = await send(d, generateEntityId());
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('OFFER_INVALID_TRANSITION');
    expect(await state(d)).toEqual(before);
    expect(delivery).not.toHaveBeenCalled();
  });

  it('rolls back all send writes on an unexpected database failure and preserves 500', async () => {
    const d = await draft();
    const before = await state(d);
    const transaction = f.prisma.$transaction.bind(f.prisma);
    const fault = vi
      .spyOn(f.prisma, '$transaction')
      .mockImplementation((callback, ...options) =>
        transaction(
          (db) =>
            callback(
              new Proxy(db, {
                get(target, property) {
                  if (property === 'auditEvent')
                    return {
                      ...target.auditEvent,
                      create: () =>
                        db.$queryRaw`SELECT 1 / 0 AS injected_failure`,
                    };
                  return target[property];
                },
              }),
            ),
          ...options,
        ),
      );
    const key = generateEntityId();
    const response = await send(d, key);
    expect(response.status).toBe(500);
    expect(response.body.error).toMatchObject({
      code: 'INTERNAL_ERROR',
      requestId: expect.any(String),
    });
    expect(JSON.stringify(response.body)).not.toContain('injected_failure');
    expect(await state(d)).toEqual(before);
    expect(delivery).not.toHaveBeenCalled();
    fault.mockRestore();
    expect((await send(d, key)).status).toBe(201);
    await issuedOnce(d);
  });

  it('persists rejection and atomically claims only one concurrent failed retry', async () => {
    const d = await draft();
    const key = generateEntityId();
    delivery.mockRejectedValueOnce(
      new EmailDeliveryError({ category: 'provider-rejected' }),
    );
    const rejected = await send(d, key);
    expect(rejected.status).toBe(502);
    expect(rejected.body.error.code).toBe('EMAIL_DELIVERY_FAILED');
    const before = await issuedOnce(d, 'FAILED');
    expect(before.communications[0].failureCategory).toBe('provider-rejected');
    const retried = await compete(d, [key, key]);
    expect(retried.filter((r) => r.status === 201)).toHaveLength(1);
    expect([200, 202]).toContain(retried.find((r) => r.status !== 201).status);
    const after = await issuedOnce(d, 'SENT', 2);
    expect(after.offer).toEqual(before.offer);
    expect(after.communications[0].id).toBe(before.communications[0].id);
  });

  it('preserves ambiguous delivery as pending and never redispatches its replay', async () => {
    const d = await draft();
    const key = generateEntityId();
    delivery.mockRejectedValueOnce(
      new EmailDeliveryError({ category: 'ambiguous' }),
    );
    const response = await send(d, key);
    expect(response.status).toBe(202);
    expect(response.body.data).toMatchObject({
      status: 'PENDING',
      unconfirmed: true,
    });
    const before = await issuedOnce(d, 'PENDING');
    expect((await send(d, key)).status).toBe(202);
    expect((await send(d, generateEntityId())).status).toBe(409);
    expect(await state(d)).toEqual(before);
    expect(delivery).toHaveBeenCalledTimes(1);
  });

  it('returns pending replay while a committed send is still awaiting the provider', async () => {
    const d = await draft();
    const key = generateEntityId();
    let entered, release;
    const ready = new Promise((resolve) => {
      entered = resolve;
    });
    const gate = new Promise((resolve) => {
      release = resolve;
    });
    delivery.mockImplementationOnce(async () => {
      entered();
      await gate;
      return { providerMessageId: 'fake-p4a' };
    });
    const first = send(d, key).then((response) => response);
    await ready;
    try {
      expect((await send(d, key)).status).toBe(202);
      expect((await send(d, generateEntityId())).status).toBe(409);
      await issuedOnce(d, 'PENDING');
    } finally {
      release();
    }
    expect((await first).status).toBe(201);
    await issuedOnce(d);
  });

  it('keeps accepted delivery pending after a status-write failure without redispatch', async () => {
    const d = await draft();
    const key = generateEntityId();
    const update = f.prisma.communication.updateMany.bind(
      f.prisma.communication,
    );
    vi.spyOn(f.prisma.communication, 'updateMany').mockImplementation(
      (args) => {
        if (args.data.status === 'SENT')
          throw new Error('injected persistence failure');
        return update(args);
      },
    );
    expect((await send(d, key)).status).toBe(500);
    const before = await issuedOnce(d, 'PENDING');
    expect((await send(d, key)).status).toBe(202);
    expect(await state(d)).toEqual(before);
    expect(delivery).toHaveBeenCalledTimes(1);
  });

  it('denies foreign tenants and unauthorized roles without persisted changes', async () => {
    const d = await draft();
    const before = await state(d);
    const key = generateEntityId();
    expect((await send(d, key, 1, f.users.OTHER)).status).toBe(404);
    expect(
      (await send(d, key, 1, f.users.OTHER, f.otherOrganizationId)).status,
    ).toBe(404);
    expect(
      (await send(d, key, 1, f.users.ADMIN, f.otherOrganizationId)).status,
    ).toBe(404);
    for (const role of ['HIRING_MANAGER', 'INTERVIEWER'])
      expect((await send(d, key, 1, f.users[role])).status).toBe(403);
    expect(await state(d)).toEqual(before);
    expect(delivery).not.toHaveBeenCalled();
  });
});
