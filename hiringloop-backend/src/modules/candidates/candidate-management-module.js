import { config } from '../../config/env.js';
import { getPrismaClient } from '../../database/client.js';
import { authenticateSession, requireCsrf } from '../auth/auth-module.js';
import { createAwsS3ApplicationStorage } from '../applications/storage/aws-s3-application-storage.js';
import { createUnavailableApplicationStorage } from '../applications/storage/application-storage.js';
import { createOrganizationRepository } from '../organizations/repositories/organization-repository.js';
import { createResolveTenantContext } from '../organizations/use-cases/resolve-tenant-context.js';
import { createTenantContextMiddleware } from '../../middleware/tenant-context.js';
import { createCandidateManagementRepository } from './repositories/candidate-management-repository.js';
import { createCandidateManagementRouter } from './routes/candidate-management-routes.js';
import { createCandidateManagementUseCases } from './use-cases/candidate-management-use-cases.js';

const databaseUrl =
  config.environment === 'test' ? config.testDatabaseUrl : config.databaseUrl;
const unavailable = async () => {
  throw new Error('Candidate management database is not configured');
};
const prisma = databaseUrl ? getPrismaClient() : null;
const organizationRepository = prisma
  ? createOrganizationRepository(prisma)
  : { findMembershipForUserAndOrganization: unavailable };
const repository = prisma
  ? createCandidateManagementRepository(prisma)
  : {
      list: unavailable,
      findCandidate: unavailable,
      findApplication: unavailable,
      findDocument: unavailable,
    };
const storage = config.applicationUploads.enabled
  ? createAwsS3ApplicationStorage({
      bucket: config.applicationUploads.bucket,
      region: config.applicationUploads.region,
      expiresIn: config.applicationUploads.signedUrlTtlSeconds,
    })
  : createUnavailableApplicationStorage();

export const candidateManagementRouter = createCandidateManagementRouter({
  authenticateSession,
  requireCsrf,
  tenantContextMiddleware: createTenantContextMiddleware({
    resolveTenantContext: createResolveTenantContext({
      organizationRepository,
    }),
  }),
  useCases: createCandidateManagementUseCases({ repository, storage }),
});
