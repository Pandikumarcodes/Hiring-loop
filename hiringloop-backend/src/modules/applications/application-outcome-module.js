import { config } from '../../config/env.js';
import { getPrismaClient } from '../../database/client.js';
import { authenticateSession, requireCsrf } from '../auth/auth-module.js';
import { createTenantContextMiddleware } from '../../middleware/tenant-context.js';
import { createOrganizationRepository } from '../organizations/repositories/organization-repository.js';
import { createResolveTenantContext } from '../organizations/use-cases/resolve-tenant-context.js';
import { createApplicationOutcomeRepository } from './repositories/application-outcome-repository.js';
import { createApplicationOutcomeUseCases } from './use-cases/application-outcome-use-cases.js';
import { createApplicationOutcomeRouter } from './routes/application-outcome-routes.js';
const url =
  config.environment === 'test' ? config.testDatabaseUrl : config.databaseUrl;
const unavailable = async () => {
  throw new Error('Application outcome database is not configured');
};
const prisma = url ? getPrismaClient() : null;
const organizationRepository = prisma
  ? createOrganizationRepository(prisma)
  : { findMembershipForUserAndOrganization: unavailable };
const outcomeUseCases = prisma
  ? createApplicationOutcomeUseCases({
      outcomeRepository: createApplicationOutcomeRepository(prisma),
    })
  : { hire: unavailable, reject: unavailable, reopen: unavailable };
export const applicationOutcomeRouter = createApplicationOutcomeRouter({
  authenticateSession,
  requireCsrf,
  tenantContextMiddleware: createTenantContextMiddleware({
    resolveTenantContext: createResolveTenantContext({
      organizationRepository,
    }),
  }),
  outcomeUseCases,
});
