import { z } from 'zod';

const organizationId = z.uuid();

export const candidateListParamsSchema = z.object({ organizationId });
export const candidateParamsSchema = z.object({
  organizationId,
  candidateId: z.uuid(),
});
export const applicationParamsSchema = z.object({
  organizationId,
  applicationId: z.uuid(),
});
export const documentParamsSchema = z.object({
  organizationId,
  documentId: z.uuid(),
});

export const candidateListQuerySchema = z
  .object({
    search: z.string().trim().min(1).max(320).optional(),
    jobId: z.uuid().optional(),
    stageId: z.uuid().optional(),
    sort: z
      .enum(['newestApplication', 'oldestApplication', 'nameAsc', 'nameDesc'])
      .default('newestApplication'),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(25),
  })
  .strict();
