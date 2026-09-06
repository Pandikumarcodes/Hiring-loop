import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { errorHandler } from '../../../src/middleware/error-handler.js';
import { createPublicCareerReadRateLimiter } from '../../../src/middleware/rate-limit.js';
import { createPublicCareerRouter } from '../../../src/modules/public-careers/routes/public-career-routes.js';

const jobId = '01990b72-7c3a-7b2d-b6bb-9a6a7a1c0001';

function makeApp({ policyOverrides } = {}) {
  const publicCareerUseCases = {
    list: vi.fn(async ({ organizationSlug, page, limit }) => ({
      organization: {
        name: 'Acme',
        slug: organizationSlug,
        website: 'https://acme.example.test',
        description: 'Builds things',
      },
      jobs: [],
      pagination: { page, pageSize: limit, totalItems: 0, totalPages: 0 },
    })),
    detail: vi.fn(async ({ organizationSlug, jobId: id }) => ({
      organization: { name: 'Acme', slug: organizationSlug },
      job: { id, title: 'Engineer' },
    })),
  };
  const app = express();
  app.use(
    '/api/v1/public',
    createPublicCareerRouter({
      publicCareerUseCases,
      publicCareerReadRateLimiter: createPublicCareerReadRateLimiter({
        policyOverrides,
      }),
    }),
  );
  app.use(errorHandler);
  return { app, publicCareerUseCases };
}

describe('Public career HTTP routes', () => {
  it('is anonymous, validates only pagination, and uses public pageSize input', async () => {
    const { app, publicCareerUseCases } = makeApp();
    const response = await request(app).get('/api/v1/public/careers/acme/jobs');
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      data: { organization: { slug: 'acme' }, jobs: [] },
      pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 },
    });
    expect(publicCareerUseCases.list).toHaveBeenCalledWith({
      organizationSlug: 'acme',
      page: 1,
      limit: 20,
    });
    await request(app).get(
      '/api/v1/public/careers/acme/jobs?page=2&pageSize=100',
    );
    expect(publicCareerUseCases.list).toHaveBeenLastCalledWith({
      organizationSlug: 'acme',
      page: 2,
      limit: 100,
    });
    for (const query of [
      'page=0',
      'pageSize=101',
      'limit=5',
      'search=engineer',
    ]) {
      expect(
        (await request(app).get(`/api/v1/public/careers/acme/jobs?${query}`))
          .status,
      ).toBe(400);
    }
  });

  it('validates canonical slugs and UUID job IDs before public use cases', async () => {
    const { app, publicCareerUseCases } = makeApp();
    for (const path of [
      '/api/v1/public/careers/Acme/jobs',
      '/api/v1/public/careers/a-/jobs',
      '/api/v1/public/careers/acme/jobs/not-a-uuid',
    ]) {
      expect((await request(app).get(path)).status).toBe(400);
    }
    expect(publicCareerUseCases.list).not.toHaveBeenCalled();
    expect(publicCareerUseCases.detail).not.toHaveBeenCalled();
    expect(
      (await request(app).get(`/api/v1/public/careers/acme/jobs/${jobId}`))
        .status,
    ).toBe(200);
  });

  it('uses the standard structured 429 response', async () => {
    const { app } = makeApp({
      policyOverrides: { limit: 1, windowMs: 60_000 },
    });
    expect(
      (await request(app).get('/api/v1/public/careers/acme/jobs')).status,
    ).toBe(200);
    const limited = await request(app).get('/api/v1/public/careers/acme/jobs');
    expect(limited.status).toBe(429);
    expect(limited.body.error.code).toBe('RATE_LIMITED');
  });
});
