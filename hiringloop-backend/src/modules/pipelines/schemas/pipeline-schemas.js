import { z } from 'zod';

const expectedVersion = z.number().int().min(1);
const stageName = z.string().trim().min(1).max(80);

export const pipelineJobParamsSchema = z.object({
  organizationId: z.uuid(),
  jobId: z.uuid(),
});
export const pipelineStageParamsSchema = pipelineJobParamsSchema.extend({
  stageId: z.uuid(),
});
export const createPipelineStageBodySchema = z
  .object({ name: stageName, expectedVersion })
  .strict();
export const renamePipelineStageBodySchema = createPipelineStageBodySchema;
export const reorderPipelineStagesBodySchema = z
  .object({ expectedVersion, stageIds: z.array(z.uuid()).min(1).max(20) })
  .strict();
export const deletePipelineStageBodySchema = z
  .object({ expectedVersion })
  .strict();
