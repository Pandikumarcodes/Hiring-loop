import { config } from '../../config/env.js';
import { getPrismaClient } from '../../database/client.js';
import { authenticateSession, requireCsrf } from '../auth/auth-module.js';
import { createTenantContextMiddleware } from '../../middleware/tenant-context.js';
import { createOrganizationRepository } from '../organizations/repositories/organization-repository.js';
import { createResolveTenantContext } from '../organizations/use-cases/resolve-tenant-context.js';
import { createPipelineRepository } from './repositories/pipeline-repository.js';
import { createPipelineRouter } from './routes/pipeline-routes.js';
import { createPipelineUseCases } from './use-cases/pipeline-use-cases.js';

const databaseUrl =
  config.environment === 'test' ? config.testDatabaseUrl : config.databaseUrl;
const unavailable = async () => {
  throw new Error('Pipeline database is not configured');
};
const prisma = databaseUrl ? getPrismaClient() : null;
const organizationRepository = prisma
  ? createOrganizationRepository(prisma)
  : { findMembershipForUserAndOrganization: unavailable };
const pipelineRepository = prisma
  ? createPipelineRepository(prisma)
  : { findForJob: unavailable, mutate: unavailable };

export const pipelineRouter = createPipelineRouter({
  authenticateSession,
  requireCsrf,
  tenantContextMiddleware: createTenantContextMiddleware({
    resolveTenantContext: createResolveTenantContext({
      organizationRepository,
    }),
  }),
  pipelineUseCases: createPipelineUseCases({ pipelineRepository }),
});
