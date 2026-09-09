import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  as,
  disconnectDatabase,
  fixture,
  generateEntityId,
  mutate,
  poolsUrl,
} from './phase17-http-helpers.js';

describe('Phase 17 talent pool HTTP APIs', () => {
  let f;
  beforeAll(async () => {
    f = await fixture('p17-pool');
  });
  afterAll(async () => {
    await disconnectDatabase();
  });
  it('enforces four-role list/create authorization and validates pools', async () => {
    for (const user of [f.users.ADMIN, f.users.RECRUITER])
      expect((await as(user, 'get', poolsUrl(f))).status).toBe(200);
    for (const user of [f.users.HIRING_MANAGER, f.users.INTERVIEWER]) {
      expect((await as(user, 'get', poolsUrl(f))).status).toBe(403);
      expect(
        (await mutate(user, 'post', poolsUrl(f)).send({ name: 'Denied' }))
          .status,
      ).toBe(403);
    }
    expect(
      (await mutate(f.users.ADMIN, 'post', poolsUrl(f)).send({ name: ' ' }))
        .status,
    ).toBe(400);
    expect(
      (
        await mutate(f.users.RECRUITER, 'post', poolsUrl(f)).send({
          name: `Pool ${generateEntityId()}`,
        })
      ).status,
    ).toBe(201);
  });
  it('updates pools with optimistic revisions, pagination, and tenant non-disclosure', async () => {
    const pool = await mutate(f.users.ADMIN, 'post', poolsUrl(f)).send({
      name: `Update ${generateEntityId()}`,
    });
    const id = pool.body.data.id;
    expect(
      (
        await mutate(f.users.ADMIN, 'patch', `${poolsUrl(f)}/${id}`).send({
          name: `Updated ${generateEntityId()}`,
          expectedRevision: 1,
        })
      ).status,
    ).toBe(200);
    expect(
      (
        await mutate(f.users.ADMIN, 'patch', `${poolsUrl(f)}/${id}`).send({
          name: 'Again',
          expectedRevision: 1,
        })
      ).status,
    ).toBe(409);
    expect(
      (await as(f.users.ADMIN, 'get', `${poolsUrl(f)}?page=1&pageSize=1`))
        .status,
    ).toBe(200);
    const searched = await as(
      f.users.ADMIN,
      'get',
      `${poolsUrl(f)}?page=1&pageSize=25&search=Updated`,
    );
    expect(searched.body.data.pools).toHaveLength(1);
    expect(searched.body.data.pools[0].id).toBe(id);
    expect(
      (
        await mutate(
          f.users.ADMIN,
          'patch',
          `${poolsUrl(f)}/${generateEntityId()}`,
        ).send({ name: 'No', expectedRevision: 1 })
      ).status,
    ).toBe(404);
  });
  it('adds, searches, paginates, idempotently re-adds and removes members with relationship validation', async () => {
    const pool = await mutate(f.users.ADMIN, 'post', poolsUrl(f)).send({
      name: `Members ${generateEntityId()}`,
    });
    const base = `${poolsUrl(f)}/${pool.body.data.id}/members`;
    const candidate2 = await f.application(f.organizationId);
    expect(
      (
        await mutate(f.users.ADMIN, 'post', base).send({
          candidateId: f.primary.candidate.id,
          sourceApplicationId: f.primary.id,
          note: 'Strong',
        })
      ).status,
    ).toBe(201);
    expect(
      (
        await mutate(f.users.ADMIN, 'post', base).send({
          candidateId: f.primary.candidate.id,
        })
      ).status,
    ).toBe(201);
    expect(
      (
        await mutate(f.users.ADMIN, 'post', base).send({
          candidateId: candidate2.candidate.id,
        })
      ).status,
    ).toBe(201);
    const listed = await as(
      f.users.RECRUITER,
      'get',
      `${base}?page=1&pageSize=1&search=Phase`,
    );
    expect(listed.status).toBe(200);
    expect(listed.body.data.pagination.pageSize).toBe(1);
    expect(
      (
        await mutate(f.users.ADMIN, 'post', base).send({
          candidateId: f.foreign.candidate.id,
        })
      ).status,
    ).toBe(404);
    expect(
      (
        await mutate(f.users.ADMIN, 'post', base).send({
          candidateId: f.primary.candidate.id,
          sourceApplicationId: candidate2.id,
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await mutate(
          f.users.ADMIN,
          'delete',
          `${base}/${f.primary.candidate.id}`,
        )
      ).status,
    ).toBe(204);
    expect(
      (
        await mutate(
          f.users.ADMIN,
          'delete',
          `${base}/${f.primary.candidate.id}`,
        )
      ).status,
    ).toBe(404);
  });
});
