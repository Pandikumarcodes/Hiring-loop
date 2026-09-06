function pick(value, fields) {
  return Object.fromEntries(fields.map((field) => [field, value[field]]));
}

export const toPublicOrganizationDto = (organization) =>
  pick(organization, ['name', 'slug', 'website', 'description']);

export const toPublicJobSummaryDto = (job) =>
  pick(job, [
    'id',
    'title',
    'employmentType',
    'workplaceType',
    'location',
    'openings',
    'openedAt',
  ]);

export const toPublicJobDetailDto = (job) =>
  pick(job, [
    'id',
    'title',
    'description',
    'employmentType',
    'workplaceType',
    'location',
    'openings',
    'openedAt',
  ]);
