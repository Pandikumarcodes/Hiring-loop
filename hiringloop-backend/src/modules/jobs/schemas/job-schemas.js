import { z } from 'zod';

const nullableText = (maximum) =>
  z
    .union([
      z
        .string()
        .trim()
        .max(maximum)
        .transform((value) => value || null),
      z.null(),
    ])
    .optional();
const optionalDescription = z
  .union([
    z
      .string()
      .max(50_000)
      .transform((value) => (value.trim() === '' ? null : value.trim())),
    z.null(),
  ])
  .optional();

const createFields = {
  title: z.string().trim().max(160),
  department: nullableText(100),
  employmentType: z
    .enum([
      'FULL_TIME',
      'PART_TIME',
      'CONTRACT',
      'TEMPORARY',
      'INTERNSHIP',
      'OTHER',
    ])
    .optional(),
  workplaceType: z.enum(['ONSITE', 'HYBRID', 'REMOTE']).optional(),
  location: nullableText(160),
  description: optionalDescription,
  openings: z.number().int().min(1).max(1000).optional(),
};

export const jobOrganizationParamsSchema = z.object({
  organizationId: z.uuid(),
});
export const jobParamsSchema = z.object({
  organizationId: z.uuid(),
  jobId: z.uuid(),
});
export const createJobBodySchema = z.object(createFields).strict();
export const updateJobBodySchema = z
  .object({
    ...Object.fromEntries(
      Object.entries(createFields).map(([key, schema]) => [
        key,
        schema.optional(),
      ]),
    ),
    expectedVersion: z.number().int().min(1),
  })
  .strict()
  .refine(
    (value) => Object.keys(value).some((key) => key !== 'expectedVersion'),
    { message: 'At least one editable field is required' },
  );
export const jobMutationBodySchema = z
  .object({ expectedVersion: z.number().int().min(1) })
  .strict();
export const listJobsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().trim().min(1).max(160).optional(),
    status: z.enum(['DRAFT', 'OPEN', 'CLOSED', 'ARCHIVED']).optional(),
    employmentType: z
      .enum([
        'FULL_TIME',
        'PART_TIME',
        'CONTRACT',
        'TEMPORARY',
        'INTERNSHIP',
        'OTHER',
      ])
      .optional(),
    workplaceType: z.enum(['ONSITE', 'HYBRID', 'REMOTE']).optional(),
    sortBy: z
      .enum(['updatedAt', 'createdAt', 'title', 'openedAt'])
      .default('updatedAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  })
  .strict();
