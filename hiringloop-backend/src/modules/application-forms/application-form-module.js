import { config } from '../../config/env.js';
import { getPrismaClient } from '../../database/client.js';
import { authenticateSession, requireCsrf } from '../auth/auth-module.js';
import { createTenantContextMiddleware } from '../../middleware/tenant-context.js';
import { createOrganizationRepository } from '../organizations/repositories/organization-repository.js';
import { createResolveTenantContext } from '../organizations/use-cases/resolve-tenant-context.js';
import { createApplicationFormRepository } from './repositories/application-form-repository.js';
import { createApplicationFormRouter } from './routes/application-form-routes.js';
import { createApplicationFormUseCases } from './use-cases/application-form-use-cases.js';
const url =
  config.environment === 'test' ? config.testDatabaseUrl : config.databaseUrl;
const unavailable = async () => {
  throw new Error('Application form database is not configured');
};
const prisma = url ? getPrismaClient() : null;
const organizationRepository = prisma
  ? createOrganizationRepository(prisma)
  : { findMembershipForUserAndOrganization: unavailable };
const repository = prisma
  ? createApplicationFormRepository(prisma)
  : { find: unavailable, createDraft: unavailable, mutate: unavailable };
export const applicationFormRouter = createApplicationFormRouter({
  authenticateSession,
  requireCsrf,
  tenantContextMiddleware: createTenantContextMiddleware({
    resolveTenantContext: createResolveTenantContext({
      organizationRepository,
    }),
  }),
  applicationFormUseCases: createApplicationFormUseCases({
    applicationFormRepository: repository,
  }),
});
