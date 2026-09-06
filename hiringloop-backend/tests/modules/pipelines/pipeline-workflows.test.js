import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { errorHandler } from '../../../src/middleware/error-handler.js';
import { createPipelineRouter } from '../../../src/modules/pipelines/routes/pipeline-routes.js';

const organizationId = '01990b72-7c3a-7b2d-b6bb-9a6a7a1c0001';
const jobId = '01990b72-7c3a-7b2d-b6bb-9a6a7a1c0002';
const stageIds = [
  '01990b72-7c3a-7b2d-b6bb-9a6a7a1c0003',
  '01990b72-7c3a-7b2d-b6bb-9a6a7a1c0004',
  '01990b72-7c3a-7b2d-b6bb-9a6a7a1c0005',
  '01990b72-7c3a-7b2d-b6bb-9a6a7a1c0006',
];
const pipeline = {
  id: '01990b72-7c3a-7b2d-b6bb-9a6a7a1c0007',
  jobId,
  version: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
  stages: stageIds.map((id, index) => ({
    id,
    name: ['Applied', 'Screening', 'Interview', 'Offer'][index],
    kind: index ? 'STANDARD' : 'ENTRY',
    position: index + 1,
  })),
};

function appFor({ role = 'ADMIN', useCases = {} } = {}) {
  const api = {
    get: vi.fn(async () => pipeline),
    createStage: vi.fn(async () => pipeline),
    renameStage: vi.fn(async () => pipeline),
    reorderStages: vi.fn(async () => pipeline),
    deleteStage: vi.fn(async () => pipeline),
    ...useCases,
  };
  const app = express();
  app.use(express.json());
  app.use(
    '/api/v1/organizations/:organizationId/jobs/:jobId/pipeline',
    createPipelineRouter({
      authenticateSession: (req, _res, next) => {
        req.auth = { userId: 'user' };
        next();
      },
      requireCsrf: (_req, _res, next) => next(),
      tenantContextMiddleware: (req, _res, next) => {
        req.tenantContext = {
          organizationId: req.params.organizationId,
          membershipId: 'member',
          role,
        };
        next();
      },
      pipelineUseCases: api,
    }),
  );
  app.use(errorHandler);
  return { app, api };
}

describe('Pipeline HTTP API', () => {
  it.each(['ADMIN', 'RECRUITER', 'HIRING_MANAGER'])(
    'permits %s to view the pipeline',
    async (role) => {
      const response = await request(appFor({ role }).app).get(
        `/api/v1/organizations/${organizationId}/jobs/${jobId}/pipeline`,
      );
      expect(response.status).toBe(200);
      expect(response.body.data.pipeline.stages[0]).not.toHaveProperty(
        'normalizedName',
      );
    },
  );
  it.each(['ADMIN', 'RECRUITER'])(
    'permits %s to configure through the four mutation APIs',
    async (role) => {
      const { app } = appFor({ role });
      const base = `/api/v1/organizations/${organizationId}/jobs/${jobId}/pipeline`;
      const responses = await Promise.all([
        request(app)
          .post(`${base}/stages`)
          .send({ name: 'Technical', expectedVersion: 1 }),
        request(app)
          .patch(`${base}/stages/${stageIds[1]}`)
          .send({ name: 'Round', expectedVersion: 1 }),
        request(app)
          .put(`${base}/stages/order`)
          .send({ stageIds, expectedVersion: 1 }),
        request(app)
          .delete(`${base}/stages/${stageIds[1]}`)
          .send({ expectedVersion: 1 }),
      ]);
      expect(responses.every((response) => response.status < 300)).toBe(true);
    },
  );
  it.each(['HIRING_MANAGER', 'INTERVIEWER'])(
    'denies %s configuration',
    async (role) => {
      const response = await request(appFor({ role }).app)
        .post(
          `/api/v1/organizations/${organizationId}/jobs/${jobId}/pipeline/stages`,
        )
        .send({ name: 'Technical', expectedVersion: 1 });
      expect(response.status).toBe(403);
    },
  );
  it('strictly validates IDs, expectedVersion, names, and complete reorder payloads', async () => {
    const { app } = appFor();
    const base = `/api/v1/organizations/${organizationId}/jobs/${jobId}/pipeline`;
    for (const response of await Promise.all([
      request(app)
        .post(`${base}/stages`)
        .send({ name: ' ', expectedVersion: 1 }),
      request(app)
        .post(`${base}/stages`)
        .send({ name: 'x'.repeat(81), expectedVersion: 1 }),
      request(app)
        .post(`${base}/stages`)
        .send({ name: 'ok', expectedVersion: 1, kind: 'ENTRY' }),
      request(app)
        .put(`${base}/stages/order`)
        .send({ stageIds, expectedVersion: 0 }),
      request(app).delete(`${base}/stages/${stageIds[1]}`).send({}),
    ]))
      expect(response.status).toBe(400);
  });
});
