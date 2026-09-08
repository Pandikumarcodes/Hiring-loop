import { config } from '../../config/env.js';
import { getPrismaClient } from '../../database/client.js';
import { createTenantContextMiddleware } from '../../middleware/tenant-context.js';
import { createOrganizationRepository } from '../organizations/repositories/organization-repository.js';
import { createResolveTenantContext } from '../organizations/use-cases/resolve-tenant-context.js';
import { authenticateSession, requireCsrf } from '../auth/auth-module.js';
import { createInterviewRepository } from './repositories/interview-repository.js';
import { createInterviewRouter } from './routes/interview-routes.js';
import { createInterviewUseCases } from './use-cases/interview-use-cases.js';

const databaseUrl =
  config.environment === 'test' ? config.testDatabaseUrl : config.databaseUrl;
const unavailable = async () => {
  throw new Error('Interview database is not configured');
};

const prisma = databaseUrl ? getPrismaClient() : null;
const organizationRepository = prisma
  ? createOrganizationRepository(prisma)
  : { findMembershipForUserAndOrganization: unavailable };
const repository = prisma
  ? createInterviewRepository(prisma)
  : {
      findApplicationForOrganization: unavailable,
      findOrganizationMembers: unavailable,
      findByIdForAccess: unavailable,
      listByApplication: unavailable,
      listForOrganization: unavailable,
      create: unavailable,
      updateMetadata: unavailable,
      reschedule: unavailable,
      cancel: unavailable,
    };

export const interviewRouter = createInterviewRouter({
  authenticateSession,
  requireCsrf,
  tenantContextMiddleware: createTenantContextMiddleware({
    resolveTenantContext: createResolveTenantContext({
      organizationRepository,
    }),
  }),
  useCases: createInterviewUseCases({ repository }),
});
