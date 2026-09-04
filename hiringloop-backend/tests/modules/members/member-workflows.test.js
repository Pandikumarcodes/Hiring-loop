import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { errorHandler } from '../../../src/middleware/error-handler.js';
import { createMemberRouter } from '../../../src/modules/members/routes/member-routes.js';
import { toMemberDto } from '../../../src/modules/members/domain/member-dto.js';
import { createRemoveMember } from '../../../src/modules/members/use-cases/remove-member.js';
import { createUpdateMemberRole } from '../../../src/modules/members/use-cases/update-member-role.js';

const organizationId = '01990b72-7c3a-7b2d-b6bb-9a6a7a1c0001';
const membershipId = '01990b72-7c3a-7b2d-b6bb-9a6a7a1c0002';
const member = {
  id: membershipId,
  organizationId,
  role: 'RECRUITER',
  createdAt: new Date('2026-09-04T00:00:00.000Z'),
  user: {
    id: '01990b72-7c3a-7b2d-b6bb-9a6a7a1c0003',
    email: 'member@example.test',
  },
};

function makeApp({ role = 'ADMIN', services = {} } = {}) {
  const app = express();
  app.use(express.json());
  app.use((request, _response, next) => {
    request.auth = { userId: 'actor-user', sessionId: 'session-1' };
    next();
  });
  app.use(
    '/api/v1/organizations/:organizationId/members',
    createMemberRouter({
      authenticateSession: (_request, _response, next) => next(),
      requireCsrf: (_request, _response, next) => next(),
      tenantContextMiddleware: (request, _response, next) => {
        request.tenantContext = {
          organizationId: request.params.organizationId,
          membershipId: '01990b72-7c3a-7b2d-b6bb-9a6a7a1c0004',
          role,
        };
        next();
      },
      listMembers: vi.fn(async () => [toMemberDto(member)]),
      updateMemberRole: vi.fn(async () => member),
      removeMember: vi.fn(async () => ({ removed: true, membershipId })),
      ...services,
    }),
  );
  app.use(errorHandler);
  return app;
}

describe('member management routes', () => {
  it('lists sanitized members for an Admin and denies the current non-admin matrix', async () => {
    const adminResponse = await request(makeApp()).get(
      `/api/v1/organizations/${organizationId}/members`,
    );
    expect(adminResponse.status).toBe(200);
    expect(adminResponse.body.data.members[0]).toEqual({
      id: membershipId,
      role: 'RECRUITER',
      joinedAt: member.createdAt.toISOString(),
      user: member.user,
    });

    const recruiterResponse = await request(makeApp({ role: 'RECRUITER' })).get(
      `/api/v1/organizations/${organizationId}/members`,
    );
    expect(recruiterResponse.status).toBe(403);
  });

  it('requires CSRF and approved role input for mutations', async () => {
    const services = {
      updateMemberRole: vi.fn(async () => member),
    };
    const response = await request(makeApp({ services }))
      .patch(
        `/api/v1/organizations/${organizationId}/members/${membershipId}/role`,
      )
      .send({ role: 'OWNER' });
    expect(response.status).toBe(400);
    expect(services.updateMemberRole).not.toHaveBeenCalled();
  });

  it('uses tenant context for role updates and removal', async () => {
    const services = {
      updateMemberRole: vi.fn(async (input) => {
        expect(input).toEqual({ organizationId, membershipId, role: 'ADMIN' });
        return member;
      }),
      removeMember: vi.fn(async (input) => {
        expect(input).toEqual({ organizationId, membershipId });
        return { removed: true, membershipId };
      }),
    };
    const app = makeApp({ services });
    const updated = await request(app)
      .patch(
        `/api/v1/organizations/${organizationId}/members/${membershipId}/role`,
      )
      .send({ role: 'ADMIN' });
    const removed = await request(app).delete(
      `/api/v1/organizations/${organizationId}/members/${membershipId}`,
    );
    expect(updated.status).toBe(200);
    expect(removed.status).toBe(200);
  });
});

describe('member management use cases', () => {
  it('maps final-Admin protection to a conflict', async () => {
    const updateMemberRole = createUpdateMemberRole({
      memberRepository: {
        updateMembershipRole: vi.fn(async () => ({ outcome: 'final_admin' })),
      },
    });
    const removeMember = createRemoveMember({
      memberRepository: {
        removeMembership: vi.fn(async () => ({ outcome: 'final_admin' })),
      },
    });
    await expect(
      updateMemberRole({ organizationId, membershipId, role: 'RECRUITER' }),
    ).rejects.toMatchObject({ status: 409 });
    await expect(
      removeMember({ organizationId, membershipId }),
    ).rejects.toMatchObject({
      status: 409,
    });
  });

  it('maps foreign or missing members to non-disclosing not-found errors', async () => {
    const removeMember = createRemoveMember({
      memberRepository: {
        removeMembership: vi.fn(async () => ({ outcome: 'missing' })),
      },
    });
    await expect(
      removeMember({ organizationId, membershipId }),
    ).rejects.toMatchObject({
      status: 404,
    });
  });
});
