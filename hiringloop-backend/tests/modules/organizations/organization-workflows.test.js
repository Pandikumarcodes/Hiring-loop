import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import {
  csrfInvalidError,
  unauthenticatedError,
} from '../../../src/errors/application-error.js';
import { errorHandler } from '../../../src/middleware/error-handler.js';
import { createOrganizationRouter } from '../../../src/modules/organizations/routes/organization-routes.js';
import { createCreateOrganizationForUser } from '../../../src/modules/organizations/use-cases/create-organization-for-user.js';
import { createGetOrganizationById } from '../../../src/modules/organizations/use-cases/get-organization-by-id.js';

const organization = {
  id: '01990b72-7c3a-7b2d-b6bb-9a6a7a1c0001',
  name: 'HiringLoop',
  website: 'https://hiringloop.example',
  description: 'Recruiting workspace',
  createdAt: new Date('2026-09-03T00:00:00.000Z'),
  updatedAt: new Date('2026-09-03T00:00:00.000Z'),
};

function makeApp(overrides = {}, { authenticated = true } = {}) {
  const services = {
    createOrganizationForUser: vi.fn(async () => organization),
    listOrganizationsForUser: vi.fn(async () => [organization]),
    getOrganizationById: vi.fn(async () => organization),
    ...overrides,
  };
  const authenticateSession = (request, _response, next) => {
    if (!authenticated) {
      next(unauthenticatedError());
      return;
    }
    request.auth = { userId: 'user-a', sessionId: 'session-a' };
    next();
  };
  const requireCsrf = (request, _response, next) => {
    if (request.get('x-csrf-token') !== 'valid-csrf') {
      next(csrfInvalidError());
      return;
    }
    next();
  };
  const tenantContextMiddleware = (request, _response, next) => {
    request.tenantContext = {
      organizationId: request.params.organizationId,
      membershipId: 'membership-a',
      role: 'ADMIN',
    };
    next();
  };
  const app = express();
  app.use(express.json());
  app.use(
    '/api/v1/organizations',
    createOrganizationRouter({
      ...services,
      authenticateSession,
      requireCsrf,
      tenantContextMiddleware,
    }),
  );
  app.use(errorHandler);
  return { app, services };
}

describe('organization use cases and routes', () => {
  it('adds current membership permissions to organization detail without exposing a role', async () => {
    const getOrganizationById = createGetOrganizationById({
      organizationRepository: {
        findOrganizationById: vi.fn(async () => organization),
      },
    });
    const result = await getOrganizationById({
      organizationId: organization.id,
      role: 'HIRING_MANAGER',
    });
    expect(result).not.toHaveProperty('role');
    expect(result.permissions).toContain('job:list');
    expect(result.permissions).not.toContain('job:archive');
  });

  it('creates the organization and ADMIN membership in one repository transaction', async () => {
    const organizationRepository = {
      createOrganizationWithAdminMembership: vi.fn(async (input) => {
        expect(input).toEqual({
          userId: 'user-a',
          name: 'HiringLoop',
        });
        return organization;
      }),
    };
    const createOrganizationForUser = createCreateOrganizationForUser({
      organizationRepository,
    });

    await expect(
      createOrganizationForUser({
        userId: 'user-a',
        organizationInput: { name: 'HiringLoop' },
      }),
    ).resolves.toMatchObject({ id: organization.id, name: organization.name });
    expect(
      organizationRepository.createOrganizationWithAdminMembership,
    ).toHaveBeenCalledTimes(1);
  });

  it('translates membership uniqueness failures into a conflict', async () => {
    const createOrganizationForUser = createCreateOrganizationForUser({
      organizationRepository: {
        createOrganizationWithAdminMembership: vi.fn(async () => {
          const error = new Error('duplicate');
          error.code = 'P2002';
          throw error;
        }),
      },
    });
    await expect(
      createOrganizationForUser({
        userId: 'user-a',
        organizationInput: { name: 'HiringLoop' },
      }),
    ).rejects.toMatchObject({ status: 409, code: 'CONFLICT' });
  });

  it('requires authentication and CSRF for creation and validates input', async () => {
    const { app, services } = makeApp();
    const invalid = await request(app)
      .post('/api/v1/organizations')
      .set('x-csrf-token', 'valid-csrf')
      .send({ name: '' });
    expect(invalid.status).toBe(400);
    expect(services.createOrganizationForUser).not.toHaveBeenCalled();

    const missingCsrf = await request(app)
      .post('/api/v1/organizations')
      .send({ name: 'HiringLoop' });
    expect(missingCsrf.status).toBe(403);

    const created = await request(app)
      .post('/api/v1/organizations')
      .set('x-csrf-token', 'valid-csrf')
      .send({ name: 'HiringLoop', website: 'https://hiringloop.example' });
    expect(created.status).toBe(201);
    expect(created.body.data.organization).not.toHaveProperty('role');

    const unauthenticated = makeApp({}, { authenticated: false });
    const denied = await request(unauthenticated.app)
      .post('/api/v1/organizations')
      .set('x-csrf-token', 'valid-csrf')
      .send({ name: 'HiringLoop' });
    expect(denied.status).toBe(401);
  });

  it('lists only service-authorized organizations and safely rejects malformed ids', async () => {
    const { app, services } = makeApp({
      listOrganizationsForUser: vi.fn(async (userId) => {
        expect(userId).toBe('user-a');
        return [organization];
      }),
    });
    const listed = await request(app).get('/api/v1/organizations');
    expect(listed.status).toBe(200);
    expect(listed.body.data.organizations).toHaveLength(1);
    expect(services.listOrganizationsForUser).toHaveBeenCalledWith('user-a');

    const malformed = await request(app).get(
      '/api/v1/organizations/not-an-uuid',
    );
    expect(malformed.status).toBe(400);
    expect(services.getOrganizationById).not.toHaveBeenCalled();
  });

  it('returns a non-disclosing not-found result when membership lookup denies access', async () => {
    const { app } = makeApp({
      getOrganizationById: vi.fn(async () => null),
    });
    const response = await request(app).get(
      '/api/v1/organizations/01990b72-7c3a-7b2d-b6bb-9a6a7a1c0002',
    );
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });
});
