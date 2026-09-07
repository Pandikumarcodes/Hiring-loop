import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { errorHandler } from '../../../src/middleware/error-handler.js';
import { createCandidateManagementRouter } from '../../../src/modules/candidates/routes/candidate-management-routes.js';

const organizationId = '01990b72-7c3a-7b2d-b6bb-9a6a7a1c0001';
const candidateId = '01990b72-7c3a-7b2d-b6bb-9a6a7a1c0002';
const applicationId = '01990b72-7c3a-7b2d-b6bb-9a6a7a1c0003';
const documentId = '01990b72-7c3a-7b2d-b6bb-9a6a7a1c0004';

function makeApp(role = 'RECRUITER') {
  const useCases = {
    list: vi.fn(async () => ({
      candidates: [],
      pagination: { page: 1, limit: 25, totalItems: 0, totalPages: 0 },
    })),
    candidateDetail: vi.fn(async () => ({ id: candidateId, applications: [] })),
    applicationDetail: vi.fn(async () => ({ id: applicationId, answers: [] })),
    accessDocument: vi.fn(async () => ({
      url: 'https://s3.example.test/signed',
    })),
  };
  const app = express();
  const organizations = express.Router();
  app.use(express.json());
  organizations.use(
    '/:organizationId',
    createCandidateManagementRouter({
      authenticateSession: (req, _res, next) => {
        req.auth = { userId: 'user-1', sessionId: 'session-1' };
        next();
      },
      requireCsrf: (_req, _res, next) => next(),
      tenantContextMiddleware: (req, _res, next) => {
        req.tenantContext = { organizationId, membershipId: 'member-1', role };
        next();
      },
      useCases,
    }),
  );
  app.use('/organizations', organizations);
  app.use(errorHandler);
  return { app, useCases };
}

describe('candidate management HTTP routes', () => {
  it('exposes the four authenticated recruiter endpoints with validated inputs', async () => {
    const { app, useCases } = makeApp();
    const base = `/organizations/${organizationId}`;
    await expect(
      request(app).get(
        `${base}/candidates?search=Ada&sort=nameAsc&page=2&pageSize=10`,
      ),
    ).resolves.toMatchObject({ status: 200 });
    await expect(
      request(app).get(`${base}/candidates/${candidateId}`),
    ).resolves.toMatchObject({ status: 200 });
    await expect(
      request(app).get(`${base}/applications/${applicationId}`),
    ).resolves.toMatchObject({ status: 200 });
    await expect(
      request(app).post(`${base}/candidate-documents/${documentId}/access`),
    ).resolves.toMatchObject({ status: 200 });
    expect(useCases.list).toHaveBeenCalledWith(
      expect.objectContaining({
        search: 'Ada',
        page: 2,
        pageSize: 10,
        sort: 'nameAsc',
      }),
    );
    expect(useCases.accessDocument).toHaveBeenCalledWith({
      organizationId,
      documentId,
    });
  });

  it('rejects invalid candidate-list sorting and interviewer access', async () => {
    const base = `/organizations/${organizationId}`;
    const recruiter = makeApp();
    const invalid = await request(recruiter.app).get(
      `${base}/candidates?sort=unsafe`,
    );
    expect(invalid.status).toBe(400);
    const interviewer = makeApp('INTERVIEWER');
    const denied = await request(interviewer.app).get(`${base}/candidates`);
    expect(denied.status).toBe(403);
    const manager = makeApp('HIRING_MANAGER');
    const managerDenied = await request(manager.app).get(`${base}/candidates`);
    expect(managerDenied.status).toBe(403);
  });
});
