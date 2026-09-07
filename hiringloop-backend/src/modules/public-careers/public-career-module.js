import { config } from '../../config/env.js';
import { getPrismaClient } from '../../database/client.js';
import { publicCareerReadRateLimiter } from '../../middleware/rate-limit.js';
import { publicApplicationRateLimiters } from '../../middleware/rate-limit.js';
import { createJobRepository } from '../jobs/repositories/job-repository.js';
import { createOrganizationRepository } from '../organizations/repositories/organization-repository.js';
import { createPublicCareerRouter } from './routes/public-career-routes.js';
import { createPublicCareerUseCases } from './use-cases/public-career-use-cases.js';
import { createApplicationRepository } from '../applications/repositories/application-repository.js';
import { createPublicApplicationUseCases } from '../applications/use-cases/public-application-use-cases.js';
import { createAwsS3ApplicationStorage } from '../applications/storage/aws-s3-application-storage.js';
import { createUnavailableApplicationStorage } from '../applications/storage/application-storage.js';

const databaseUrl =
  config.environment === 'test' ? config.testDatabaseUrl : config.databaseUrl;
const unavailable = async () => {
  throw new Error('Public career database is not configured');
};
const prisma = databaseUrl ? getPrismaClient() : null;
const organizationRepository = databaseUrl
  ? createOrganizationRepository(prisma)
  : { findPublicOrganizationBySlug: unavailable };
const jobRepository = databaseUrl
  ? createJobRepository(prisma)
  : {
      listOpenPublicJobsForOrganization: unavailable,
      findOpenPublicJobForOrganization: unavailable,
      findPublicApplicationJobForOrganization: unavailable,
    };
const applicationRepository = prisma
  ? createApplicationRepository(prisma)
  : {
      findActivePublishedForm: unavailable,
      findPublishedFormVersion: unavailable,
      findInitialStage: unavailable,
      createUploadReservation: unavailable,
      findUpload: unavailable,
      findIdempotentApplication: unavailable,
      createAtomicSubmission: unavailable,
    };
const applicationStorage = config.applicationUploads.enabled
  ? createAwsS3ApplicationStorage({
      bucket: config.applicationUploads.bucket,
      region: config.applicationUploads.region,
      expiresIn: config.applicationUploads.signedUrlTtlSeconds,
    })
  : createUnavailableApplicationStorage();

export const publicCareerRouter = createPublicCareerRouter({
  publicCareerUseCases: createPublicCareerUseCases({
    organizationRepository,
    jobRepository,
  }),
  publicCareerReadRateLimiter,
  publicApplicationUseCases: createPublicApplicationUseCases({
    organizationRepository,
    jobRepository,
    applicationRepository,
    storage: applicationStorage,
    uploadTtlSeconds: config.applicationUploads.signedUrlTtlSeconds,
    maxUploadBytes: config.applicationUploads.maxBytes,
  }),
  publicApplicationRateLimiters,
});
