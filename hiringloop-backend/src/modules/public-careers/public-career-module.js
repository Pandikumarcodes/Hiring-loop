import { config } from '../../config/env.js';
import { getPrismaClient } from '../../database/client.js';
import { publicCareerReadRateLimiter } from '../../middleware/rate-limit.js';
import { createJobRepository } from '../jobs/repositories/job-repository.js';
import { createOrganizationRepository } from '../organizations/repositories/organization-repository.js';
import { createPublicCareerRouter } from './routes/public-career-routes.js';
import { createPublicCareerUseCases } from './use-cases/public-career-use-cases.js';

const databaseUrl =
  config.environment === 'test' ? config.testDatabaseUrl : config.databaseUrl;
const unavailable = async () => {
  throw new Error('Public career database is not configured');
};
const organizationRepository = databaseUrl
  ? createOrganizationRepository(getPrismaClient())
  : { findPublicOrganizationBySlug: unavailable };
const jobRepository = databaseUrl
  ? createJobRepository(getPrismaClient())
  : {
      listOpenPublicJobsForOrganization: unavailable,
      findOpenPublicJobForOrganization: unavailable,
    };

export const publicCareerRouter = createPublicCareerRouter({
  publicCareerUseCases: createPublicCareerUseCases({
    organizationRepository,
    jobRepository,
  }),
  publicCareerReadRateLimiter,
});
