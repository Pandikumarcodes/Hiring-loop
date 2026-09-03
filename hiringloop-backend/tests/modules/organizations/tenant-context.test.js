import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { errorHandler } from '../../../src/middleware/error-handler.js';
import { createTenantContextMiddleware } from '../../../src/middleware/tenant-context.js';
import { createResolveTenantContext } from '../../../src/modules/organizations/use-cases/resolve-tenant-context.js';

const A = '01990b72-7c3a-7b2d-b6bb-9a6a7a1c0001';
const B = '01990b72-7c3a-7b2d-b6bb-9a6a7a1c0002';

function contextApp({ userId, memberships, authenticated = true }) {
  const repository = {
    findMembershipForUserAndOrganization: vi.fn(
      async ({ userId: id, organizationId }) =>
        memberships.find(
          (membership) =>
            membership.userId === id &&
            membership.organizationId === organizationId,
        ) ?? null,
    ),
  };
  const resolveTenantContext = createResolveTenantContext({
    organizationRepository: repository,
  });
  const app = express();
  app.use((request, _response, next) => {
    if (authenticated) request.auth = { userId };
    next();
  });
  app.get(
    '/api/v1/organizations/:organizationId',
    createTenantContextMiddleware({ resolveTenantContext }),
    (request, response) => response.json({ data: request.tenantContext }),
  );
  app.use(errorHandler);
  return { app, repository };
}

describe('tenant context resolution', () => {
  const memberships = [
    { id: 'membership-a', userId: 'user-a', organizationId: A, role: 'ADMIN' },
    {
      id: 'membership-b',
      userId: 'user-b',
      organizationId: B,
      role: 'RECRUITER',
    },
  ];

  it.each([
    ['user-a', A, 'membership-a', 'ADMIN'],
    ['user-b', B, 'membership-b', 'RECRUITER'],
  ])(
    'attaches verified context for %s in its organization',
    async (userId, organizationId, membershipId, role) => {
      const { app, repository } = contextApp({ userId, memberships });
      const response = await request(app).get(
        `/api/v1/organizations/${organizationId}`,
      );
      expect(response.status).toBe(200);
      expect(response.body.data).toEqual({
        organizationId,
        membershipId,
        role,
      });
      expect(
        repository.findMembershipForUserAndOrganization,
      ).toHaveBeenCalledWith({
        userId,
        organizationId,
      });
    },
  );

  it.each([
    ['user-a', B],
    ['user-b', A],
  ])('denies cross-tenant access for %s', async (userId, organizationId) => {
    const { app } = contextApp({ userId, memberships });
    const response = await request(app).get(
      `/api/v1/organizations/${organizationId}`,
    );
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });

  it('rejects unauthenticated, malformed, and nonexistent requests safely', async () => {
    const unauthenticated = contextApp({
      userId: 'user-a',
      memberships,
      authenticated: false,
    });
    expect(
      (await request(unauthenticated.app).get(`/api/v1/organizations/${A}`))
        .status,
    ).toBe(401);

    const { app } = contextApp({ userId: 'user-a', memberships });
    expect(
      (await request(app).get('/api/v1/organizations/not-an-uuid')).status,
    ).toBe(400);
    expect(
      (
        await request(app).get(
          `/api/v1/organizations/${'01990b72-7c3a-7b2d-b6bb-9a6a7a1c0003'}`,
        )
      ).status,
    ).toBe(404);
  });
});
