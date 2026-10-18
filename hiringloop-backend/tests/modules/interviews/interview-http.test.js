import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { errorHandler } from '../../../src/middleware/error-handler.js';
import { createInterviewRouter } from '../../../src/modules/interviews/routes/interview-routes.js';

const organizationId = '01990b72-7c3a-7b2d-b6bb-9a6a7a1c0001';

function makeApp(role) {
  const useCases = { listEligibleParticipants: vi.fn(async () => []) };
  const app = express();
  app.use(
    '/organizations/:organizationId',
    createInterviewRouter({
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

describe('interview participant discovery HTTP authorization', () => {
  it.each(['ADMIN', 'RECRUITER'])(
    'allows %s to discover only participants from the resolved tenant',
    async (role) => {
      const { app, useCases } = makeApp(role);
      useCases.listEligibleParticipants.mockResolvedValueOnce([
        {
          user: { id: 'user-2', email: 'interviewer@example.test' },
          role: 'INTERVIEWER',
        },
      ]);

      const response = await request(app).get(
        `/organizations/${organizationId}/interviews/participants`,
      );

      expect(response.status).toBe(200);
      expect(response.body.data.participants).toHaveLength(1);
      expect(useCases.listEligibleParticipants).toHaveBeenCalledWith({
        organizationId,
        actorRole: role,
        actorUserId: 'user-1',
      });
    },
  );

  it.each(['HIRING_MANAGER', 'INTERVIEWER'])(
    'keeps participant discovery denied to unauthorized %s users',
    async (role) => {
      const { app, useCases } = makeApp(role);

      await expect(
        request(app).get(
          `/organizations/${organizationId}/interviews/participants`,
        ),
      ).resolves.toMatchObject({ status: 403 });
      expect(useCases.listEligibleParticipants).not.toHaveBeenCalled();
    },
  );
});
