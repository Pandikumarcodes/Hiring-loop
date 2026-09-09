import { z } from 'zod';
const id = z.uuid();
export const poolOrganizationParamsSchema = z.object({ organizationId: id });
export const poolParamsSchema = z.object({
  organizationId: id,
  talentPoolId: id,
});
export const memberParamsSchema = poolParamsSchema.extend({ candidateId: id });
export const poolBodySchema = z
  .object({
    name: z.string().trim().min(1).max(160),
    description: z.string().trim().max(1000).optional(),
  })
  .strict();
export const poolUpdateBodySchema = poolBodySchema
  .extend({ expectedRevision: z.number().int().positive() })
  .strict();
export const poolMemberBodySchema = z
  .object({
    candidateId: id,
    sourceApplicationId: id.optional(),
    note: z.string().trim().max(1000).optional(),
  })
  .strict();
export const poolPageSchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(25),
    search: z.string().trim().max(100).optional(),
  })
  .strict();
