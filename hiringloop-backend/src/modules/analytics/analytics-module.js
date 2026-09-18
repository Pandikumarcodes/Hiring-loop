import { config } from '../../config/env.js';
import { getPrismaClient } from '../../database/client.js';
import { authenticateSession } from '../auth/auth-module.js';
import { createTenantContextMiddleware } from '../../middleware/tenant-context.js';
import { createOrganizationRepository } from '../organizations/repositories/organization-repository.js';
import { createResolveTenantContext } from '../organizations/use-cases/resolve-tenant-context.js';
import { createAnalyticsRepository } from './repositories/analytics-repository.js';
import { createAnalyticsUseCases } from './use-cases/analytics-use-cases.js';
import { createAnalyticsRouter } from './routes/analytics-routes.js';
const url =
  config.environment === 'test' ? config.testDatabaseUrl : config.databaseUrl;
const prisma = url ? getPrismaClient() : null;
const unavailable = async () => {
  throw new Error('Analytics database is not configured');
};
const organizationRepository = prisma
  ? createOrganizationRepository(prisma)
  : { findMembershipForUserAndOrganization: unavailable };
export const analyticsRouter = createAnalyticsRouter({
  authenticateSession,
  tenantContextMiddleware: createTenantContextMiddleware({
    resolveTenantContext: createResolveTenantContext({
      organizationRepository,
    }),
  }),
  useCases: prisma
    ? createAnalyticsUseCases({ repository: createAnalyticsRepository(prisma) })
    : {
        overview: unavailable,
        funnel: unavailable,
        pipeline: unavailable,
        interviews: unavailable,
        communications: unavailable,
        outcomes: unavailable,
        jobs: unavailable,
      },
});
