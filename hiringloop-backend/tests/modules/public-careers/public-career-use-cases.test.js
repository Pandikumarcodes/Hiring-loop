import { describe, expect, it } from 'vitest';

import { createPublicCareerUseCases } from '../../../src/modules/public-careers/use-cases/public-career-use-cases.js';

const organization = {
  id: 'org-a',
  name: 'Acme',
  slug: 'acme',
  website: 'https://acme.example.test',
  description: 'Builds things',
  createdAt: new Date(),
};
const openJob = {
  id: 'job-a',
  organizationId: 'org-a',
  title: 'Engineer',
  description: 'Build product',
  employmentType: 'FULL_TIME',
  workplaceType: 'REMOTE',
  location: null,
  openings: 1,
  openedAt: new Date(),
  status: 'OPEN',
  version: 2,
  closedAt: null,
  archivedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  pipeline: { id: 'pipeline-a' },
};

describe('Public career use cases', () => {
  it('allowlists public DTOs and sends database pagination only approved concerns', async () => {
    const organizationRepository = {
      findPublicOrganizationBySlug: async () => organization,
    };
    const jobRepository = {
      listOpenPublicJobsForOrganization: async (input) => {
        expect(input).toEqual({ organizationId: 'org-a', page: 1, limit: 20 });
        return { jobs: [openJob], totalItems: 1 };
      },
      findOpenPublicJobForOrganization: async (input) => {
        expect(input).toEqual({ organizationId: 'org-a', jobId: 'job-a' });
        return openJob;
      },
    };
    const careers = createPublicCareerUseCases({
      organizationRepository,
      jobRepository,
    });
    const list = await careers.list({
      organizationSlug: 'acme',
      page: 1,
      limit: 20,
    });
    const detail = await careers.detail({
      organizationSlug: 'acme',
      jobId: 'job-a',
    });
    expect(list.pagination).toEqual({
      page: 1,
      pageSize: 20,
      totalItems: 1,
      totalPages: 1,
    });
    expect(list.jobs[0]).not.toHaveProperty('description');
    for (const value of [list.organization, list.jobs[0], detail.job]) {
      for (const field of [
        'organizationId',
        'version',
        'closedAt',
        'archivedAt',
        'createdAt',
        'updatedAt',
        'status',
        'pipeline',
        'id',
      ]) {
        if (value === list.jobs[0] || value === detail.job) {
          if (field === 'id') continue;
        }
        expect(value).not.toHaveProperty(field);
      }
    }
    expect(detail.job.description).toBe('Build product');
    expect(detail.job).toHaveProperty('id', 'job-a');
  });

  it('uses the same safe not-found response for unavailable organizations and jobs', async () => {
    const careers = createPublicCareerUseCases({
      organizationRepository: {
        findPublicOrganizationBySlug: async () => null,
      },
      jobRepository: {},
    });
    await expect(
      careers.list({ organizationSlug: 'missing', page: 1, limit: 20 }),
    ).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' });
    const missingJob = createPublicCareerUseCases({
      organizationRepository: {
        findPublicOrganizationBySlug: async () => organization,
      },
      jobRepository: { findOpenPublicJobForOrganization: async () => null },
    });
    await expect(
      missingJob.detail({ organizationSlug: 'acme', jobId: 'missing' }),
    ).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' });
  });
});
