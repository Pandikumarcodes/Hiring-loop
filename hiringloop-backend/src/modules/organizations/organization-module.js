import { config } from '../../config/env.js';
import { getPrismaClient } from '../../database/client.js';
import {
  authenticateSession,
  authEmailDelivery,
  requireCsrf,
} from '../auth/auth-module.js';
import { createOrganizationRepository } from './repositories/organization-repository.js';
import { createCreateOrganizationForUser } from './use-cases/create-organization-for-user.js';
import { createOrganizationRouter } from './routes/organization-routes.js';
import { createResolveTenantContext } from './use-cases/resolve-tenant-context.js';
import { createTenantContextMiddleware } from '../../middleware/tenant-context.js';
import { createGetOrganizationById } from './use-cases/get-organization-by-id.js';
import { createInvitationRepository } from '../invitations/repositories/invitation-repository.js';
import { createInvitationRouter } from '../invitations/routes/invitation-routes.js';
import { createCreateInvitation } from '../invitations/use-cases/create-invitation.js';
import { createListInvitations } from '../invitations/use-cases/list-invitations.js';
import { createRevokeInvitation } from '../invitations/use-cases/revoke-invitation.js';
import { createAcceptInvitation } from '../invitations/use-cases/accept-invitation.js';
import { createInvitationAcceptanceRouter } from '../invitations/routes/invitation-routes.js';
import {
  authSecretGenerator,
  authSecretHasher,
} from '../auth/secrets/auth-secret.js';
import { createMemberRepository } from '../members/repositories/member-repository.js';
import { createMemberRouter } from '../members/routes/member-routes.js';
import { createListMembers } from '../members/use-cases/list-members.js';
import { createUpdateMemberRole } from '../members/use-cases/update-member-role.js';
import { createRemoveMember } from '../members/use-cases/remove-member.js';

const databaseUrl =
  config.environment === 'test' ? config.testDatabaseUrl : config.databaseUrl;
const repository = databaseUrl
  ? createOrganizationRepository(getPrismaClient())
  : {
      async createOrganizationWithAdminMembership() {
        throw new Error('Organization database is not configured');
      },
      async listOrganizationsForUser() {
        throw new Error('Organization database is not configured');
      },
      async findOrganizationForUser() {
        throw new Error('Organization database is not configured');
      },
      async findMembershipForUserAndOrganization() {
        throw new Error('Organization database is not configured');
      },
      async findOrganizationById() {
        throw new Error('Organization database is not configured');
      },
    };
const invitationRepository = databaseUrl
  ? createInvitationRepository(getPrismaClient())
  : {
      async findMemberByEmail() {
        throw new Error('Invitation database is not configured');
      },
      async createOrRotateInvitation() {
        throw new Error('Invitation database is not configured');
      },
      async listInvitations() {
        throw new Error('Invitation database is not configured');
      },
      async findInvitation() {
        throw new Error('Invitation database is not configured');
      },
      async revokeInvitation() {
        throw new Error('Invitation database is not configured');
      },
      async acceptInvitation() {
        throw new Error('Invitation database is not configured');
      },
    };
const memberRepository = databaseUrl
  ? createMemberRepository(getPrismaClient())
  : {
      async listMembers() {
        throw new Error('Member database is not configured');
      },
      async updateMembershipRole() {
        throw new Error('Member database is not configured');
      },
      async removeMembership() {
        throw new Error('Member database is not configured');
      },
    };

const createOrganizationForUser = createCreateOrganizationForUser({
  organizationRepository: repository,
});
const resolveTenantContext = createResolveTenantContext({
  organizationRepository: repository,
});
const tenantContextMiddleware = createTenantContextMiddleware({
  resolveTenantContext,
});
const getOrganizationById = createGetOrganizationById({
  organizationRepository: repository,
});
const invitationRouter = createInvitationRouter({
  authenticateSession,
  requireCsrf,
  tenantContextMiddleware,
  createInvitation: createCreateInvitation({
    invitationRepository,
    authSecretGenerator,
    authSecretHasher,
    findOrganization: (organizationId) =>
      repository.findOrganizationById(organizationId),
    deliverInvitation: ({
      email,
      organizationName,
      role,
      expiresAt,
      rawToken,
    }) =>
      authEmailDelivery.sendInvitation({
        email,
        organizationName,
        role,
        expiresAt,
        invitationToken: rawToken,
      }),
  }),
  listInvitations: createListInvitations({ invitationRepository }),
  revokeInvitation: createRevokeInvitation({ invitationRepository }),
});
const memberRouter = createMemberRouter({
  authenticateSession,
  requireCsrf,
  tenantContextMiddleware,
  listMembers: createListMembers({ memberRepository }),
  updateMemberRole: createUpdateMemberRole({ memberRepository }),
  removeMember: createRemoveMember({ memberRepository }),
});

export const invitationAcceptanceRouter = createInvitationAcceptanceRouter({
  authenticateSession,
  requireCsrf,
  acceptInvitation: createAcceptInvitation({
    invitationRepository,
    authSecretHasher,
  }),
});

export const organizationRouter = createOrganizationRouter({
  authenticateSession,
  requireCsrf,
  createOrganizationForUser,
  listOrganizationsForUser: (userId) =>
    repository.listOrganizationsForUser(userId),
  getOrganizationById,
  tenantContextMiddleware,
  invitationRouter,
  memberRouter,
});
