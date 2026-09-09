import { config } from '../../config/env.js';
import { getPrismaClient } from '../../database/client.js';
import { authenticateSession, requireCsrf } from '../auth/auth-module.js';
import { createTenantContextMiddleware } from '../../middleware/tenant-context.js';
import { createOrganizationRepository } from '../organizations/repositories/organization-repository.js';
import { createResolveTenantContext } from '../organizations/use-cases/resolve-tenant-context.js';
import { createTalentPoolRepository } from './repositories/talent-pool-repository.js';
import { createTalentPoolUseCases } from './use-cases/talent-pool-use-cases.js';
import { createTalentPoolRouter } from './routes/talent-pool-routes.js';
const url =
  config.environment === 'test' ? config.testDatabaseUrl : config.databaseUrl;
const unavailable = async () => {
  throw new Error('Talent pool database is not configured');
};
const prisma = url ? getPrismaClient() : null;
const organizationRepository = prisma
  ? createOrganizationRepository(prisma)
  : { findMembershipForUserAndOrganization: unavailable };
const talentPoolUseCases = prisma
  ? createTalentPoolUseCases({ repository: createTalentPoolRepository(prisma) })
  : {
      list: unavailable,
      create: unavailable,
      update: unavailable,
      listMembers: unavailable,
      addMember: unavailable,
      removeMember: unavailable,
    };
export const talentPoolRouter = createTalentPoolRouter({
  authenticateSession,
  requireCsrf,
  tenantContextMiddleware: createTenantContextMiddleware({
    resolveTenantContext: createResolveTenantContext({
      organizationRepository,
    }),
  }),
  talentPoolUseCases,
});
