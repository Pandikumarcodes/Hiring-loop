const BASE_FIELDS = [
  'id',
  'title',
  'department',
  'employmentType',
  'workplaceType',
  'location',
  'openings',
  'status',
  'openedAt',
  'closedAt',
  'archivedAt',
  'version',
  'createdAt',
  'updatedAt',
];

function pick(job, fields) {
  return Object.fromEntries(fields.map((field) => [field, job[field]]));
}

export const toJobListDto = (job) => pick(job, BASE_FIELDS);
export const toJobDetailDto = (job) => ({
  ...pick(job, BASE_FIELDS),
  description: job.description,
});
