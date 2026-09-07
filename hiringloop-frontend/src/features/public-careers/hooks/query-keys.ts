export const publicCareerKeys = {
  all: ['public-careers'] as const,
  jobs: (organizationSlug: string, page: number, pageSize: number) =>
    [
      ...publicCareerKeys.all,
      organizationSlug,
      'jobs',
      { page, pageSize },
    ] as const,
  job: (organizationSlug: string, jobId: string) =>
    [...publicCareerKeys.all, organizationSlug, 'jobs', jobId] as const,
  applicationForm: (organizationSlug: string, jobId: string) =>
    [
      ...publicCareerKeys.all,
      organizationSlug,
      'jobs',
      jobId,
      'application-form',
    ] as const,
}
