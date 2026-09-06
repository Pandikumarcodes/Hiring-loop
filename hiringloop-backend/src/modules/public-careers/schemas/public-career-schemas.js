import { z } from 'zod';

import { ORGANIZATION_SLUG_PATTERN } from '../../organizations/domain/organization-slug.js';

const organizationSlug = z
  .string()
  .regex(ORGANIZATION_SLUG_PATTERN, 'Invalid organization slug')
  .min(3)
  .max(63);

export const publicCareerOrganizationParamsSchema = z.object({
  organizationSlug,
});

export const publicCareerJobParamsSchema = z.object({
  organizationSlug,
  jobId: z.uuid(),
});

export const publicCareerListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict()
  .transform(({ page, pageSize }) => ({ page, limit: pageSize }));
