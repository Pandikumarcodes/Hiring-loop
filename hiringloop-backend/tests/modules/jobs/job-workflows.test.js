import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { errorHandler } from '../../../src/middleware/error-handler.js';
import { createJobRouter } from '../../../src/modules/jobs/routes/job-routes.js';
import { createJobUseCases } from '../../../src/modules/jobs/use-cases/job-use-cases.js';

const organizationId = '01990b72-7c3a-7b2d-b6bb-9a6a7a1c0001';
const jobId = '01990b72-7c3a-7b2d-b6bb-9a6a7a1c0002';
const now = new Date('2026-09-05T10:00:00.000Z');
const baseJob = {
  id: jobId,
  organizationId,
  title: 'Engineer',
  department: null,
  employmentType: 'FULL_TIME',
  workplaceType: 'REMOTE',
  location: null,
  description: 'Build things',
  openings: 1,
  status: 'DRAFT',
  openedAt: null,
  closedAt: null,
  archivedAt: null,
  version: 1,
  createdAt: now,
  updatedAt: now,
};

function makeApp({ role = 'ADMIN', useCases = {} } = {}) {
  const defaults = {
    create: vi.fn(async () => baseJob),
    list: vi.fn(async () => ({
      jobs: [{ ...baseJob, description: undefined }],
      pagination: { page: 1, limit: 20, totalItems: 1, totalPages: 1 },
    })),
    detail: vi.fn(async () => baseJob),
    update: vi.fn(async () => ({ ...baseJob, version: 2 })),
    open: vi.fn(async () => ({ ...baseJob, status: 'OPEN', version: 2 })),
    close: vi.fn(async () => ({ ...baseJob, status: 'CLOSED', version: 2 })),
    reopen: vi.fn(async () => ({ ...baseJob, status: 'OPEN', version: 2 })),
    archive: vi.fn(async () => ({
      ...baseJob,
      status: 'ARCHIVED',
      version: 2,
    })),
    ...useCases,
  };
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.auth = { userId: 'user' };
    next();
  });
  app.use(
    '/api/v1/organizations/:organizationId/jobs',
    createJobRouter({
      authenticateSession: (_req, _res, next) => next(),
      requireCsrf: (_req, _res, next) => next(),
      tenantContextMiddleware: (req, _res, next) => {
        req.tenantContext = {
          organizationId: req.params.organizationId,
          membershipId: 'member',
          role,
        };
        next();
      },
      jobUseCases: defaults,
    }),
  );
  app.use(errorHandler);
  return { app, useCases: defaults };
}

describe('Job HTTP API', () => {
  it.each(['ADMIN', 'RECRUITER', 'HIRING_MANAGER'])(
    'allows %s across the seven shared Job permissions',
    async (role) => {
      const { app } = makeApp({ role });
      const responses = await Promise.all([
        request(app).get(`/api/v1/organizations/${organizationId}/jobs`),
        request(app).get(
          `/api/v1/organizations/${organizationId}/jobs/${jobId}`,
        ),
        request(app)
          .post(`/api/v1/organizations/${organizationId}/jobs`)
          .send({ title: 'Draft' }),
        request(app)
          .patch(`/api/v1/organizations/${organizationId}/jobs/${jobId}`)
          .send({ title: 'Changed', expectedVersion: 1 }),
        ...['open', 'close', 'reopen'].map((action) =>
          request(app)
            .post(
              `/api/v1/organizations/${organizationId}/jobs/${jobId}/${action}`,
            )
            .send({ expectedVersion: 1 }),
        ),
      ]);
      expect(responses.every(({ status }) => status < 300)).toBe(true);
    },
  );

  it('allows Admin and Recruiter archive, but denies Hiring Manager and all Interviewer access', async () => {
    for (const role of ['ADMIN', 'RECRUITER']) {
      expect(
        (
          await request(makeApp({ role }).app)
            .post(
              `/api/v1/organizations/${organizationId}/jobs/${jobId}/archive`,
            )
            .send({ expectedVersion: 1 })
        ).status,
      ).toBe(200);
    }
    expect(
      (
        await request(makeApp({ role: 'HIRING_MANAGER' }).app)
          .post(`/api/v1/organizations/${organizationId}/jobs/${jobId}/archive`)
          .send({ expectedVersion: 1 })
      ).status,
    ).toBe(403);
    expect(
      (
        await request(makeApp({ role: 'INTERVIEWER' }).app).get(
          `/api/v1/organizations/${organizationId}/jobs`,
        )
      ).status,
    ).toBe(403);
  });

  it('normalizes optional strings and rejects forbidden create fields', async () => {
    const { app, useCases } = makeApp();
    expect(
      (
        await request(app)
          .post(`/api/v1/organizations/${organizationId}/jobs`)
          .send({ title: '  Draft  ', department: '', location: '   ' })
      ).status,
    ).toBe(201);
    expect(useCases.create).toHaveBeenCalledWith({
      organizationId,
      data: { title: 'Draft', department: null, location: null },
    });
    for (const forbidden of [
      'status',
      'organizationId',
      'version',
      'openedAt',
    ]) {
      expect(
        (
          await request(app)
            .post(`/api/v1/organizations/${organizationId}/jobs`)
            .send({ title: 'Draft', [forbidden]: 'OPEN' })
        ).status,
      ).toBe(400);
    }
  });

  it.each([
    [{ title: '' }, 201],
    [{ title: 'x'.repeat(161) }, 400],
    [{ title: 'Draft', employmentType: 'PERMANENT' }, 400],
    [{ title: 'Draft', openings: 0 }, 400],
  ])('validates create body %#', async (body, status) => {
    expect(
      (
        await request(makeApp().app)
          .post(`/api/v1/organizations/${organizationId}/jobs`)
          .send(body)
      ).status,
    ).toBe(status);
  });

  it('validates and defaults list queries and rejects unsafe pagination/sort', async () => {
    const { app, useCases } = makeApp();
    const response = await request(app).get(
      `/api/v1/organizations/${organizationId}/jobs`,
    );
    expect(response.body.pagination).toEqual({
      page: 1,
      limit: 20,
      totalItems: 1,
      totalPages: 1,
    });
    expect(useCases.list).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 1,
        limit: 20,
        sortBy: 'updatedAt',
        sortOrder: 'desc',
      }),
    );
    expect(response.body.data.jobs[0]).not.toHaveProperty('description');
    for (const query of [
      'limit=101',
      'page=0',
      'sortBy=description',
      'sortOrder=sideways',
    ]) {
      expect(
        (
          await request(app).get(
            `/api/v1/organizations/${organizationId}/jobs?${query}`,
          )
        ).status,
      ).toBe(400);
    }
  });

  it('passes only approved list concerns and full detail remains present', async () => {
    const { app, useCases } = makeApp();
    const query =
      'page=2&limit=5&search=eng&status=OPEN&employmentType=FULL_TIME&workplaceType=REMOTE&sortBy=title&sortOrder=asc';
    await request(app).get(
      `/api/v1/organizations/${organizationId}/jobs?${query}`,
    );
    expect(useCases.list).toHaveBeenCalledWith({
      organizationId,
      page: 2,
      limit: 5,
      search: 'eng',
      status: 'OPEN',
      employmentType: 'FULL_TIME',
      workplaceType: 'REMOTE',
      sortBy: 'title',
      sortOrder: 'asc',
    });
    const detail = await request(app).get(
      `/api/v1/organizations/${organizationId}/jobs/${jobId}`,
    );
    expect(detail.body.data.job.description).toBe('Build things');
  });

  it('requires expectedVersion and rejects mass assignment on update and transitions', async () => {
    const { app } = makeApp();
    expect(
      (
        await request(app)
          .patch(`/api/v1/organizations/${organizationId}/jobs/${jobId}`)
          .send({ title: 'No version' })
      ).status,
    ).toBe(400);
    for (const field of ['status', 'organizationId', 'closedAt']) {
      expect(
        (
          await request(app)
            .patch(`/api/v1/organizations/${organizationId}/jobs/${jobId}`)
            .send({ expectedVersion: 1, [field]: 'OPEN' })
        ).status,
      ).toBe(400);
    }
    expect(
      (
        await request(app)
          .post(`/api/v1/organizations/${organizationId}/jobs/${jobId}/open`)
          .send({ expectedVersion: 1, status: 'OPEN' })
      ).status,
    ).toBe(400);
  });
});

function memoryRepository(initial) {
  let job = { ...initial };
  return {
    findByIdForOrganization: vi.fn(
      async ({ organizationId: tenant, jobId: id }) =>
        tenant === job.organizationId && id === job.id ? { ...job } : null,
    ),
    mutate: vi.fn(
      async ({
        organizationId: tenant,
        jobId: id,
        expectedVersion,
        status,
        data,
      }) => {
        const statusMatches =
          typeof status === 'object'
            ? job.status !== status.not
            : !status || job.status === status;
        if (
          tenant !== job.organizationId ||
          id !== job.id ||
          job.version !== expectedVersion ||
          !statusMatches
        )
          return {
            outcome: 'not_updated',
            current:
              tenant === job.organizationId && id === job.id
                ? { ...job }
                : null,
          };
        job = { ...job, ...data, version: job.version + 1 };
        return { outcome: 'updated', job: { ...job } };
      },
    ),
    current: () => job,
  };
}

describe('Job lifecycle use cases', () => {
  it('opens a ready Draft and applies timestamps/version', async () => {
    const repository = memoryRepository(baseJob);
    const jobs = createJobUseCases({
      jobRepository: repository,
      clock: () => now,
    });
    const result = await jobs.open({
      organizationId,
      jobId,
      expectedVersion: 1,
    });
    expect(result).toMatchObject({
      status: 'OPEN',
      openedAt: now,
      closedAt: null,
      archivedAt: null,
      version: 2,
    });
  });

  it.each([
    ['employmentType', null],
    ['workplaceType', null],
    ['description', null],
    ['description', '   '],
    ['location', null, 'ONSITE'],
    ['location', null, 'HYBRID'],
  ])('rejects readiness defect in %s', async (field, value, workplaceType) => {
    const repository = memoryRepository({
      ...baseJob,
      [field]: value,
      ...(workplaceType ? { workplaceType } : {}),
    });
    const jobs = createJobUseCases({ jobRepository: repository });
    await expect(
      jobs.open({ organizationId, jobId, expectedVersion: 1 }),
    ).rejects.toMatchObject({ code: 'JOB_NOT_READY_TO_OPEN' });
  });

  it.each([
    ['REMOTE', null],
    ['HYBRID', 'Bengaluru'],
    ['ONSITE', 'Chennai'],
  ])('opens %s with valid location policy', async (workplaceType, location) => {
    const jobs = createJobUseCases({
      jobRepository: memoryRepository({ ...baseJob, workplaceType, location }),
    });
    await expect(
      jobs.open({ organizationId, jobId, expectedVersion: 1 }),
    ).resolves.toMatchObject({ status: 'OPEN' });
  });

  it('closes, reopens with a replaced openedAt, and archives Closed history', async () => {
    const oldOpenedAt = new Date('2026-09-01T00:00:00Z');
    const repository = memoryRepository({
      ...baseJob,
      status: 'OPEN',
      openedAt: oldOpenedAt,
    });
    const jobs = createJobUseCases({
      jobRepository: repository,
      clock: () => now,
    });
    const closed = await jobs.close({
      organizationId,
      jobId,
      expectedVersion: 1,
    });
    expect(closed).toMatchObject({
      status: 'CLOSED',
      openedAt: oldOpenedAt,
      closedAt: now,
      version: 2,
    });
    const reopened = await jobs.reopen({
      organizationId,
      jobId,
      expectedVersion: 2,
    });
    expect(reopened).toMatchObject({
      status: 'OPEN',
      openedAt: now,
      closedAt: null,
      version: 3,
    });
  });

  it.each([
    ['open', 'OPEN'],
    ['open', 'CLOSED'],
    ['open', 'ARCHIVED'],
    ['close', 'DRAFT'],
    ['close', 'CLOSED'],
    ['close', 'ARCHIVED'],
    ['reopen', 'DRAFT'],
    ['reopen', 'OPEN'],
    ['reopen', 'ARCHIVED'],
    ['archive', 'OPEN'],
    ['archive', 'ARCHIVED'],
  ])('rejects %s from %s', async (operation, status) => {
    const jobs = createJobUseCases({
      jobRepository: memoryRepository({
        ...baseJob,
        status,
        openedAt: status === 'DRAFT' ? null : now,
        closedAt: status === 'CLOSED' ? now : null,
        archivedAt: status === 'ARCHIVED' ? now : null,
      }),
    });
    await expect(
      jobs[operation]({ organizationId, jobId, expectedVersion: 1 }),
    ).rejects.toMatchObject({ code: 'JOB_INVALID_TRANSITION' });
  });

  it('allows Draft and Closed archive, preserves history, and makes Archived read-only', async () => {
    for (const initial of [
      baseJob,
      { ...baseJob, status: 'CLOSED', openedAt: now, closedAt: now },
    ]) {
      const repository = memoryRepository(initial);
      const jobs = createJobUseCases({
        jobRepository: repository,
        clock: () => now,
      });
      const archived = await jobs.archive({
        organizationId,
        jobId,
        expectedVersion: 1,
      });
      expect(archived).toMatchObject({
        status: 'ARCHIVED',
        archivedAt: now,
        openedAt: initial.openedAt,
        closedAt: initial.closedAt,
        version: 2,
      });
      await expect(
        jobs.update({
          organizationId,
          jobId,
          expectedVersion: 2,
          data: { title: 'No' },
        }),
      ).rejects.toMatchObject({ code: 'JOB_ARCHIVED' });
    }
  });

  it('returns safe not-found and stale conflicts without overwriting', async () => {
    const repository = memoryRepository(baseJob);
    const jobs = createJobUseCases({ jobRepository: repository });
    await expect(
      jobs.detail({
        organizationId: '01990b72-7c3a-7b2d-b6bb-9a6a7a1c9999',
        jobId,
      }),
    ).rejects.toMatchObject({ code: 'JOB_NOT_FOUND' });
    await jobs.update({
      organizationId,
      jobId,
      expectedVersion: 1,
      data: { title: 'Winner' },
    });
    await expect(
      jobs.update({
        organizationId,
        jobId,
        expectedVersion: 1,
        data: { title: 'Loser' },
      }),
    ).rejects.toMatchObject({ code: 'JOB_VERSION_CONFLICT' });
    expect(repository.current().title).toBe('Winner');
  });

  it.each([
    ['detail', 'DRAFT'],
    ['update', 'DRAFT'],
    ['open', 'DRAFT'],
    ['close', 'OPEN'],
    ['reopen', 'CLOSED'],
    ['archive', 'DRAFT'],
  ])(
    'returns safe not-found for foreign-tenant %s',
    async (operation, status) => {
      const repository = memoryRepository({
        ...baseJob,
        status,
        openedAt: ['OPEN', 'CLOSED'].includes(status) ? now : null,
        closedAt: status === 'CLOSED' ? now : null,
      });
      const jobs = createJobUseCases({ jobRepository: repository });
      const common = {
        organizationId: '01990b72-7c3a-7b2d-b6bb-9a6a7a1c9999',
        jobId,
        expectedVersion: 1,
      };
      const input =
        operation === 'update' ? { ...common, data: { title: 'No' } } : common;
      await expect(jobs[operation](input)).rejects.toMatchObject({
        code: 'JOB_NOT_FOUND',
      });
    },
  );
});
