import { describe, expect, it, vi } from 'vitest';

import { createAcceptInvitation } from '../../../src/modules/invitations/use-cases/accept-invitation.js';

const now = new Date('2026-09-04T00:00:00.000Z');
const invitation = {
  organization: {
    id: '01990b72-7c3a-7b2d-b6bb-9a6a7a1c0001',
    name: 'Acme Hiring',
    website: null,
    description: null,
    createdAt: now,
    updatedAt: now,
  },
};

function makeAccept(
  result = {
    outcome: 'accepted',
    invitation,
    membership: {
      id: 'membership-1',
      organizationId: invitation.organization.id,
      userId: 'user-1',
      role: 'RECRUITER',
    },
  },
) {
  const repository = { acceptInvitation: vi.fn(async () => result) };
  const accept = createAcceptInvitation({
    invitationRepository: repository,
    authSecretHasher: { hash: (token) => `hash:${token}` },
    clock: () => now,
  });
  return { accept, repository };
}

const verifiedAuth = {
  userId: 'user-1',
  user: {
    id: 'user-1',
    email: 'Person@Example.com',
    emailVerified: true,
  },
};

describe('accept invitation use case', () => {
  it('hashes the token, enforces verified email identity, and returns safe data', async () => {
    const { accept, repository } = makeAccept();
    const result = await accept({ token: 'raw-token', auth: verifiedAuth });

    expect(repository.acceptInvitation).toHaveBeenCalledWith({
      tokenHash: 'hash:raw-token',
      userId: 'user-1',
      normalizedEmail: 'person@example.com',
      now,
    });
    expect(result).toEqual({
      organization: invitation.organization,
      membership: {
        id: 'membership-1',
        organizationId: invitation.organization.id,
        role: 'RECRUITER',
      },
    });
    expect(JSON.stringify(result)).not.toContain('token');
  });

  it('rejects unverified identities before token resolution', async () => {
    const { accept, repository } = makeAccept();
    await expect(
      accept({
        token: 'raw-token',
        auth: {
          ...verifiedAuth,
          user: { ...verifiedAuth.user, emailVerified: false },
        },
      }),
    ).rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' });
    expect(repository.acceptInvitation).not.toHaveBeenCalled();
  });

  it('maps identity mismatch and invalid lifecycle states safely', async () => {
    const mismatch = makeAccept({ outcome: 'identity_mismatch' });
    await expect(
      mismatch.accept({ token: 'raw-token', auth: verifiedAuth }),
    ).rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' });

    const invalid = makeAccept({ outcome: 'invalid' });
    await expect(
      invalid.accept({ token: 'raw-token', auth: verifiedAuth }),
    ).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' });
  });
});
