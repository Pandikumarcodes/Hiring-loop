import { config } from '../../config/env.js';
import { getPrismaClient } from '../../database/client.js';
import { authenticateSession, requireCsrf } from '../auth/auth-module.js';
import { createTenantContextMiddleware } from '../../middleware/tenant-context.js';
import { createResolveTenantContext } from '../organizations/use-cases/resolve-tenant-context.js';
import { createOrganizationRepository } from '../organizations/repositories/organization-repository.js';
import { createJobRepository } from './repositories/job-repository.js';
import { createJobUseCases } from './use-cases/job-use-cases.js';
import { createJobRouter } from './routes/job-routes.js';

const databaseUrl =
  config.environment === 'test' ? config.testDatabaseUrl : config.databaseUrl;

let organizationRepository;
let jobRepository;
if (databaseUrl) {
  const prisma = getPrismaClient();
  organizationRepository = createOrganizationRepository(prisma);
  jobRepository = createJobRepository(prisma);
} else {
  const unavailable = async () => {
    throw new Error('Job database is not configured');
  };
  organizationRepository = {
    findMembershipForUserAndOrganization: unavailable,
  };
  jobRepository = {
    create: unavailable,
    list: unavailable,
    findByIdForOrganization: unavailable,
    mutate: unavailable,
  };
}

export const jobRouter = createJobRouter({
  authenticateSession,
  requireCsrf,
  tenantContextMiddleware: createTenantContextMiddleware({
    resolveTenantContext: createResolveTenantContext({
      organizationRepository,
    }),
  }),
  jobUseCases: createJobUseCases({ jobRepository }),
});
