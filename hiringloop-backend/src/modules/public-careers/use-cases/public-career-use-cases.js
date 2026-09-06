import { notFoundError } from '../../../errors/application-error.js';
import {
  toPublicJobDetailDto,
  toPublicJobSummaryDto,
  toPublicOrganizationDto,
} from '../domain/public-career-dto.js';

export function createPublicCareerUseCases({
  organizationRepository,
  jobRepository,
}) {
  async function findOrganization(organizationSlug) {
    const organization =
      await organizationRepository.findPublicOrganizationBySlug(
        organizationSlug,
      );
    if (!organization) throw notFoundError();
    return organization;
  }

  return {
    async list({ organizationSlug, page, limit }) {
      const organization = await findOrganization(organizationSlug);
      const result = await jobRepository.listOpenPublicJobsForOrganization({
        organizationId: organization.id,
        page,
        limit,
      });
      return {
        organization: toPublicOrganizationDto(organization),
        jobs: result.jobs.map(toPublicJobSummaryDto),
        pagination: {
          page,
          pageSize: limit,
          totalItems: result.totalItems,
          totalPages: Math.ceil(result.totalItems / limit),
        },
      };
    },
    async detail({ organizationSlug, jobId }) {
      const organization = await findOrganization(organizationSlug);
      const job = await jobRepository.findOpenPublicJobForOrganization({
        organizationId: organization.id,
        jobId,
      });
      if (!job) throw notFoundError();
      return {
        organization: toPublicOrganizationDto(organization),
        job: toPublicJobDetailDto(job),
      };
    },
  };
}
