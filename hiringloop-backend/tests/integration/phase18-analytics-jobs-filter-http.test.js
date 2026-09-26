import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  as,
  createJobRepository,
  createJobUseCases,
  disconnectDatabase,
  fixture,
  generateEntityId,
} from './phase17-http-helpers.js';

process.env.NODE_ENV = 'test';

const from = '2026-01-01T00:00:00.000Z';
const to = '2026-02-01T00:00:00.000Z';

describe('Phase 18 jobs analytics jobId regression', () => {
  let f;
  let second;
  let emptyJob;
  const get = (user, organizationId, params = {}) =>
    as(
      user,
      'get',
      `/api/v1/organizations/${organizationId}/analytics/jobs?${new URLSearchParams({ from, to, ...params })}`,
    );

  beforeAll(async () => {
    f = await fixture('p18-jobs-filter');
    second = await f.application(f.organizationId, 'second-job@example.test');
    const jobs = createJobUseCases({
      jobRepository: createJobRepository(f.prisma),
    });
    emptyJob = await jobs.create({
      organizationId: f.organizationId,
      data: { title: 'Empty analytics job' },
    });
    await f.prisma.application.update({
      where: { id: f.primary.id },
      data: { submittedAt: new Date('2026-01-10T12:00:00.000Z') },
    });
    await f.prisma.application.update({
      where: { id: second.id },
      data: { submittedAt: new Date('2026-01-20T12:00:00.000Z') },
    });
  });

  afterAll(async () => disconnectDatabase());

  it('preserves the unfiltered organization list and its aggregate counts', async () => {
    const response = await get(f.users.ADMIN, f.organizationId);
    expect(response.status).toBe(200);
    expect(response.body.data.totalItems).toBe(3);
    expect(response.body.data.rows.map((row) => row.id)).toEqual([
      emptyJob.id,
      ...[f.primary.jobId, second.jobId].sort(),
    ]);
    expect(response.body.data.rows.map((row) => row.applications)).toEqual([
      0, 1, 1,
    ]);
    expect(
      response.body.data.rows.some((row) => row.id === f.foreign.jobId),
    ).toBe(false);
  });

  it('filters a local job before pagination and keeps its counts and date range correct', async () => {
    const selected = await get(f.users.ADMIN, f.organizationId, {
      jobId: second.jobId,
      page: 1,
      pageSize: 1,
    });
    expect(selected.status).toBe(200);
    expect(selected.body.data).toMatchObject({
      totalItems: 1,
      rows: [{ id: second.jobId, applications: 1, active: 1 }],
    });

    const laterPage = await get(f.users.ADMIN, f.organizationId, {
      jobId: second.jobId,
      page: 2,
      pageSize: 1,
    });
    expect(laterPage.status).toBe(200);
    expect(laterPage.body.data).toEqual({ rows: [], totalItems: 1 });

    const narrow = await get(f.users.ADMIN, f.organizationId, {
      jobId: second.jobId,
      to: '2026-01-15T00:00:00.000Z',
    });
    expect(narrow.status).toBe(200);
    expect(narrow.body.data).toMatchObject({
      totalItems: 1,
      rows: [{ id: second.jobId, applications: 0, active: 1 }],
    });
  });

  it('returns only the selected empty job and zero analytics', async () => {
    const response = await get(f.users.ADMIN, f.organizationId, {
      jobId: emptyJob.id,
    });
    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({
      totalItems: 1,
      rows: [
        {
          id: emptyJob.id,
          title: emptyJob.title,
          applications: 0,
          active: 0,
          scheduledInterviews: 0,
          offersSent: 0,
          hires: 0,
          rejections: 0,
        },
      ],
    });
  });

  it('treats foreign and nonexistent job IDs alike and preserves role authorization', async () => {
    for (const jobId of [f.foreign.jobId, generateEntityId()]) {
      const response = await get(f.users.ADMIN, f.organizationId, { jobId });
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('JOB_NOT_FOUND');
      expect(JSON.stringify(response.body)).not.toContain(f.foreign.jobId);
    }
    const denied = await get(f.users.INTERVIEWER, f.organizationId, {
      jobId: f.primary.jobId,
    });
    expect(denied.status).toBe(403);
  });
});
