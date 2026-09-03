import { config } from '../../config/env.js';
import { getPrismaClient } from '../../database/client.js';
import { authenticateSession, requireCsrf } from '../auth/auth-module.js';
import { createOrganizationRepository } from './repositories/organization-repository.js';
import { createCreateOrganizationForUser } from './use-cases/create-organization-for-user.js';
import { createOrganizationRouter } from './routes/organization-routes.js';
import { createResolveTenantContext } from './use-cases/resolve-tenant-context.js';
import { createTenantContextMiddleware } from '../../middleware/tenant-context.js';
import { createGetOrganizationById } from './use-cases/get-organization-by-id.js';

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

export const organizationRouter = createOrganizationRouter({
  authenticateSession,
  requireCsrf,
  createOrganizationForUser,
  listOrganizationsForUser: (userId) =>
    repository.listOrganizationsForUser(userId),
  getOrganizationById,
  tenantContextMiddleware,
});
