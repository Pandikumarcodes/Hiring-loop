import { config } from '../../config/env.js';
import { getPrismaClient } from '../../database/client.js';
import { createTenantContextMiddleware } from '../../middleware/tenant-context.js';
import { authenticateSession, requireCsrf } from '../auth/auth-module.js';
import { createOrganizationRepository } from '../organizations/repositories/organization-repository.js';
import { createResolveTenantContext } from '../organizations/use-cases/resolve-tenant-context.js';
import { createScorecardRepository } from './repositories/scorecard-repository.js';
import { createScorecardRouter } from './routes/scorecard-routes.js';
import { createScorecardUseCases } from './use-cases/scorecard-use-cases.js';
import { createNotificationService } from '../notifications/notification-service.js';
const url =
  config.environment === 'test' ? config.testDatabaseUrl : config.databaseUrl;
const unavailable = async () => {
  throw new Error('Scorecard database is not configured');
};
const prisma = url ? getPrismaClient() : null;
const organizationRepository = prisma
  ? createOrganizationRepository(prisma)
  : { findMembershipForUserAndOrganization: unavailable };
const repository = prisma
  ? createScorecardRepository(prisma)
  : new Proxy({}, { get: () => unavailable });
export const scorecardRouter = createScorecardRouter({
  authenticateSession,
  requireCsrf,
  tenantContextMiddleware: createTenantContextMiddleware({
    resolveTenantContext: createResolveTenantContext({
      organizationRepository,
    }),
  }),
  useCases: createScorecardUseCases({
    repository,
    notificationService: prisma ? createNotificationService(prisma) : null,
  }),
});
