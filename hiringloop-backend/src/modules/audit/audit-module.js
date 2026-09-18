import { config } from '../../config/env.js';
import { getPrismaClient } from '../../database/client.js';
import { authenticateSession } from '../auth/auth-module.js';
import { createTenantContextMiddleware } from '../../middleware/tenant-context.js';
import { createOrganizationRepository } from '../organizations/repositories/organization-repository.js';
import { createResolveTenantContext } from '../organizations/use-cases/resolve-tenant-context.js';
import { createAuditRepository } from './repositories/audit-repository.js';
import { createAuditUseCases } from './use-cases/audit-use-cases.js';
import { createAuditRouter } from './routes/audit-routes.js';
const url =
  config.environment === 'test' ? config.testDatabaseUrl : config.databaseUrl;
const prisma = url ? getPrismaClient() : null;
const unavailable = async () => {
  throw new Error('Audit database is not configured');
};
const organizationRepository = prisma
  ? createOrganizationRepository(prisma)
  : { findMembershipForUserAndOrganization: unavailable };
export const auditRepository = prisma
  ? createAuditRepository(prisma)
  : { create: unavailable };
export const auditRouter = createAuditRouter({
  authenticateSession,
  tenantContextMiddleware: createTenantContextMiddleware({
    resolveTenantContext: createResolveTenantContext({
      organizationRepository,
    }),
  }),
  useCases: prisma
    ? createAuditUseCases({ repository: auditRepository })
    : { list: unavailable, get: unavailable },
});
