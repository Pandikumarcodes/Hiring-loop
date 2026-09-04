import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import {
  ORGANIZATION_ROLES,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  hasPermission,
} from '../../src/authorization/permissions.js';
import { errorHandler } from '../../src/middleware/error-handler.js';
import { requirePermission } from '../../src/middleware/require-permission.js';

const organizationA = '01990b72-7c3a-7b2d-b6bb-9a6a7a1c0001';
const organizationB = '01990b72-7c3a-7b2d-b6bb-9a6a7a1c0002';

function permissionApp({ tenantContext, authenticated = true, permission }) {
  const app = express();
  app.use((request, _response, next) => {
    if (authenticated) request.auth = { userId: 'user-1' };
    request.tenantContext = tenantContext;
    next();
  });
  app.get('/protected', requirePermission(permission), (_request, response) => {
    response.json({ data: 'allowed' });
  });
  app.use(errorHandler);
  return app;
}

describe('static permission evaluation', () => {
  it('grants all Phase 07B team-management permissions to ADMIN', () => {
    for (const permission of Object.values(PERMISSIONS)) {
      expect(
        hasPermission({ role: ORGANIZATION_ROLES.ADMIN, permission }),
      ).toBe(true);
    }
  });

  it('fails closed for non-admin roles, unknown roles, and unknown permissions', () => {
    for (const role of [
      ORGANIZATION_ROLES.RECRUITER,
      ORGANIZATION_ROLES.HIRING_MANAGER,
      ORGANIZATION_ROLES.INTERVIEWER,
    ]) {
      expect(ROLE_PERMISSIONS[role]).toEqual([]);
      expect(hasPermission({ role, permission: PERMISSIONS.MEMBER_READ })).toBe(
        false,
      );
    }
    expect(
      hasPermission({ role: 'OWNER', permission: PERMISSIONS.MEMBER_READ }),
    ).toBe(false);
    expect(
      hasPermission({ role: ORGANIZATION_ROLES.ADMIN, permission: 'member:*' }),
    ).toBe(false);
  });
});

describe('requirePermission middleware', () => {
  const adminContext = {
    organizationId: organizationA,
    membershipId: 'membership-a',
    role: ORGANIZATION_ROLES.ADMIN,
  };

  it('calls the controller path for an allowed trusted context', async () => {
    const response = await request(
      permissionApp({
        tenantContext: adminContext,
        permission: PERMISSIONS.MEMBER_INVITE,
      }),
    ).get('/protected');

    expect(response.status).toBe(200);
  });

  it('returns the standard 403 response for a missing permission', async () => {
    const response = await request(
      permissionApp({
        tenantContext: {
          ...adminContext,
          role: ORGANIZATION_ROLES.INTERVIEWER,
        },
        permission: PERMISSIONS.MEMBER_INVITE,
      }),
    ).get('/protected');

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it('fails safely when tenant context is absent or malformed', async () => {
    for (const tenantContext of [
      undefined,
      { ...adminContext, role: 'OWNER' },
    ]) {
      const response = await request(
        permissionApp({
          tenantContext,
          permission: PERMISSIONS.MEMBER_READ,
        }),
      ).get('/protected');
      expect(response.status).toBe(403);
    }
  });

  it('requires authentication before evaluating tenant permissions', async () => {
    const response = await request(
      permissionApp({
        authenticated: false,
        tenantContext: adminContext,
        permission: PERMISSIONS.MEMBER_READ,
      }),
    ).get('/protected');

    expect(response.status).toBe(401);
  });

  it('uses the current organization membership role, without global-user leakage', async () => {
    const permission = PERMISSIONS.MEMBER_ROLE_CHANGE;
    const organizationAResponse = await request(
      permissionApp({
        tenantContext: {
          organizationId: organizationA,
          membershipId: 'membership-a',
          role: ORGANIZATION_ROLES.ADMIN,
        },
        permission,
      }),
    ).get('/protected');
    const organizationBResponse = await request(
      permissionApp({
        tenantContext: {
          organizationId: organizationB,
          membershipId: 'membership-b',
          role: ORGANIZATION_ROLES.INTERVIEWER,
        },
        permission,
      }),
    ).get('/protected');

    expect(organizationAResponse.status).toBe(200);
    expect(organizationBResponse.status).toBe(403);
  });
});
