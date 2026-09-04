import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { errorHandler } from '../../../src/middleware/error-handler.js';
import {
  createInvitationAcceptanceRouter,
  createInvitationRouter,
} from '../../../src/modules/invitations/routes/invitation-routes.js';
import { createCreateInvitation } from '../../../src/modules/invitations/use-cases/create-invitation.js';
import { createListInvitations } from '../../../src/modules/invitations/use-cases/list-invitations.js';
import { createRevokeInvitation } from '../../../src/modules/invitations/use-cases/revoke-invitation.js';

const organizationId = '01990b72-7c3a-7b2d-b6bb-9a6a7a1c0001';
const invitationId = '01990b72-7c3a-7b2d-b6bb-9a6a7a1c0002';
const now = new Date('2026-09-04T00:00:00.000Z');

const invitation = {
  id: invitationId,
  organizationId,
  email: 'person@example.com',
  role: 'RECRUITER',
  tokenHash: 'never-return-this',
  expiresAt: new Date('2026-09-11T00:00:00.000Z'),
  acceptedAt: null,
  revokedAt: null,
  inviterMembershipId: '01990b72-7c3a-7b2d-b6bb-9a6a7a1c0003',
  createdAt: now,
  updatedAt: now,
};

function makeApp({ role = 'ADMIN', services = {} } = {}) {
  const publicInvitation = {
    ...invitation,
    tokenHash: undefined,
  };
  delete publicInvitation.tokenHash;
  const authenticateSession = (request, _response, next) => {
    request.auth = { userId: 'user-a', sessionId: 'session-a' };
    next();
  };
  const tenantContextMiddleware = (request, _response, next) => {
    request.tenantContext = {
      organizationId: request.params.organizationId,
      membershipId: '01990b72-7c3a-7b2d-b6bb-9a6a7a1c0004',
      role,
    };
    next();
  };
  const requireCsrf = (request, _response, next) => {
    if (request.get('x-csrf-token') !== 'valid') {
      next(new Error('csrf test failure'));
      return;
    }
    next();
  };
  const app = express();
  app.use(express.json());
  app.use(
    '/api/v1/organizations/:organizationId/invitations',
    createInvitationRouter({
      authenticateSession,
      requireCsrf,
      tenantContextMiddleware,
      createInvitation: vi.fn(async () => publicInvitation),
      listInvitations: vi.fn(async () => [publicInvitation]),
      revokeInvitation: vi.fn(async () => publicInvitation),
      ...services,
    }),
  );
  app.use(errorHandler);
  return app;
}

describe('invitation creation', () => {
  it('normalizes email, hashes the raw token, assigns expiry, and tracks inviter', async () => {
    const repository = {
      findMemberByEmail: vi.fn(async () => null),
      createOrRotateInvitation: vi.fn(async (input) => ({
        ...invitation,
        email: input.email,
        role: input.role,
        expiresAt: input.expiresAt,
        inviterMembershipId: input.inviterMembershipId,
        tokenHash: input.tokenHash,
      })),
    };
    const deliverInvitation = vi.fn();
    const createInvitation = createCreateInvitation({
      invitationRepository: repository,
      authSecretGenerator: { generate: () => 'raw-secret' },
      authSecretHasher: { hash: (value) => `hash:${value}` },
      deliverInvitation,
      clock: () => now,
    });

    const result = await createInvitation({
      organizationId,
      inviterMembershipId: invitation.inviterMembershipId,
      email: '  PERSON@Example.COM ',
      role: 'RECRUITER',
    });

    expect(repository.findMemberByEmail).toHaveBeenCalledWith({
      organizationId,
      email: 'person@example.com',
    });
    expect(repository.createOrRotateInvitation).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'person@example.com',
        tokenHash: 'hash:raw-secret',
        inviterMembershipId: invitation.inviterMembershipId,
        expiresAt: new Date('2026-09-11T00:00:00.000Z'),
      }),
    );
    expect(deliverInvitation).toHaveBeenCalledWith(
      expect.objectContaining({ rawToken: 'raw-secret' }),
    );
    expect(deliverInvitation.mock.calls[0][0]).not.toHaveProperty('tokenHash');
    expect(deliverInvitation.mock.calls[0][0]).not.toHaveProperty('invitation');
    expect(result).not.toHaveProperty('tokenHash');
    expect(result).not.toHaveProperty('rawToken');
  });

  it('rejects an existing organization member', async () => {
    const createInvitation = createCreateInvitation({
      invitationRepository: {
        findMemberByEmail: vi.fn(async () => ({ id: 'm' })),
      },
      authSecretGenerator: { generate: () => 'raw-secret' },
      authSecretHasher: { hash: () => 'hash' },
    });

    await expect(
      createInvitation({
        organizationId,
        inviterMembershipId: invitation.inviterMembershipId,
        email: 'person@example.com',
        role: 'RECRUITER',
      }),
    ).rejects.toMatchObject({ status: 409, code: 'CONFLICT' });
  });

  it('returns 503 after persistence when transient delivery fails', async () => {
    const repository = {
      findMemberByEmail: vi.fn(async () => null),
      createOrRotateInvitation: vi.fn(async () => invitation),
    };
    const createInvitation = createCreateInvitation({
      invitationRepository: repository,
      authSecretGenerator: { generate: () => 'raw-secret' },
      authSecretHasher: { hash: () => 'hash' },
      deliverInvitation: vi.fn(async () => {
        throw new Error('provider unavailable');
      }),
      clock: () => now,
    });

    await expect(
      createInvitation({
        organizationId,
        inviterMembershipId: invitation.inviterMembershipId,
        email: 'person@example.com',
        role: 'RECRUITER',
      }),
    ).rejects.toMatchObject({
      status: 503,
      code: 'EMAIL_DELIVERY_FAILED',
      message: 'Invitation email could not be sent',
    });
    expect(repository.createOrRotateInvitation).toHaveBeenCalledOnce();
  });
});

describe('invitation routes', () => {
  it('protects create, list, and revoke operations with Phase 07B permissions', async () => {
    const denied = makeApp({ role: 'INTERVIEWER' });
    expect(
      (
        await request(denied).get(
          `/api/v1/organizations/${organizationId}/invitations`,
        )
      ).status,
    ).toBe(403);

    const allowed = makeApp();
    const listed = await request(allowed).get(
      `/api/v1/organizations/${organizationId}/invitations`,
    );
    expect(listed.status).toBe(200);
    expect(listed.body.data.invitations[0]).not.toHaveProperty('tokenHash');

    const created = await request(allowed)
      .post(`/api/v1/organizations/${organizationId}/invitations`)
      .set('x-csrf-token', 'valid')
      .send({ email: 'new@example.com', role: 'RECRUITER' });
    expect(created.status).toBe(201);

    const revoked = await request(allowed)
      .delete(
        `/api/v1/organizations/${organizationId}/invitations/${invitationId}`,
      )
      .set('x-csrf-token', 'valid');
    expect(revoked.status).toBe(200);
  });
});

describe('invitation lifecycle use cases', () => {
  it('keeps revoke tenant-scoped and handles revoked, accepted, and expired records', async () => {
    const repository = {
      findInvitation: vi
        .fn()
        .mockResolvedValueOnce({ ...invitation, revokedAt: now })
        .mockResolvedValueOnce({ ...invitation, acceptedAt: now })
        .mockResolvedValueOnce({
          ...invitation,
          expiresAt: new Date('2026-09-03T00:00:00.000Z'),
        }),
      revokeInvitation: vi.fn(),
    };
    const revokeInvitation = createRevokeInvitation({
      invitationRepository: repository,
      clock: () => now,
    });

    await expect(
      revokeInvitation({ organizationId, invitationId }),
    ).resolves.toMatchObject({ revokedAt: now });
    await expect(
      revokeInvitation({ organizationId, invitationId }),
    ).rejects.toMatchObject({ status: 409 });
    await expect(
      revokeInvitation({ organizationId, invitationId }),
    ).rejects.toMatchObject({ status: 409 });
    expect(repository.revokeInvitation).not.toHaveBeenCalled();
    expect(repository.findInvitation).toHaveBeenCalledWith({
      organizationId,
      invitationId,
    });
  });

  it('maps listing results through sanitized DTOs', async () => {
    const listInvitations = createListInvitations({
      invitationRepository: {
        listInvitations: vi.fn(async ({ organizationId: id }) => {
          expect(id).toBe(organizationId);
          return [invitation];
        }),
      },
    });
    const result = await listInvitations({ organizationId });
    expect(result[0]).not.toHaveProperty('tokenHash');
    expect(result[0]).toMatchObject({
      email: invitation.email,
      role: invitation.role,
    });
  });
});

describe('invitation acceptance route', () => {
  it('uses authentication and CSRF but does not require tenant context', async () => {
    const acceptInvitation = vi.fn(async () => ({
      organization: { id: organizationId, name: 'Acme' },
      membership: { id: 'membership-1', organizationId, role: 'RECRUITER' },
    }));
    const app = express();
    app.use(express.json());
    app.use((request, _response, next) => {
      request.auth = {
        userId: 'user-a',
        user: {
          email: 'person@example.com',
          emailVerified: true,
        },
      };
      next();
    });
    app.use(
      '/api/v1/invitations',
      createInvitationAcceptanceRouter({
        authenticateSession: (_request, _response, next) => next(),
        requireCsrf: (_request, _response, next) => next(),
        acceptInvitation,
      }),
    );
    app.use(errorHandler);

    const response = await request(app)
      .post('/api/v1/invitations/accept')
      .send({ token: 'raw-token' });

    expect(response.status).toBe(200);
    expect(acceptInvitation).toHaveBeenCalledWith({
      token: 'raw-token',
      auth: expect.objectContaining({ userId: 'user-a' }),
    });
  });
});
