import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { errorHandler } from '../../../src/middleware/error-handler.js';
import { createScorecardRouter } from '../../../src/modules/scorecards/routes/scorecard-routes.js';

const organizationId = '01990b72-7c3a-7b2d-b6bb-9a6a7a1c0001';
const interviewId = '01990b72-7c3a-7b2d-b6bb-9a6a7a1c0002';
const applicationId = '01990b72-7c3a-7b2d-b6bb-9a6a7a1c0003';

function makeApp(role) {
  const useCases = {
    summary: vi.fn(async () => ({ participants: [] })),
    listNotes: vi.fn(async () => []),
  };
  const app = express();
  app.use(express.json());
  app.use(
    '/organizations/:organizationId',
    createScorecardRouter({
      authenticateSession: (req, _res, next) => {
        req.auth = { userId: 'user-1' };
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
  app.use(errorHandler);
  return { app, useCases };
}

describe('scorecard HTTP authorization', () => {
  it('keeps interviewer feedback access to their own scorecard route', async () => {
    const { app, useCases } = makeApp('INTERVIEWER');
    const base = `/organizations/${organizationId}`;

    await expect(
      request(app).get(`${base}/interviews/${interviewId}/scorecards`),
    ).resolves.toMatchObject({ status: 403 });
    await expect(
      request(app).get(`${base}/applications/${applicationId}/notes`),
    ).resolves.toMatchObject({ status: 403 });
    expect(useCases.summary).not.toHaveBeenCalled();
    expect(useCases.listNotes).not.toHaveBeenCalled();
  });

  it('allows internal roles to request only their authorized collaboration data', async () => {
    const recruiter = makeApp('RECRUITER');
    const base = `/organizations/${organizationId}`;

    await expect(
      request(recruiter.app).get(
        `${base}/interviews/${interviewId}/scorecards`,
      ),
    ).resolves.toMatchObject({ status: 200 });
    await expect(
      request(recruiter.app).get(`${base}/applications/${applicationId}/notes`),
    ).resolves.toMatchObject({ status: 200 });
    expect(recruiter.useCases.summary).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId,
        interviewId,
        actorRole: 'RECRUITER',
      }),
    );
    expect(recruiter.useCases.listNotes).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId,
        applicationId,
        actorRole: 'RECRUITER',
      }),
    );
  });
});
