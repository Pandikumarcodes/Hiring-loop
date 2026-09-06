import express from 'express';
import { PERMISSIONS } from '../../../authorization/permissions.js';
import { requirePermission } from '../../../middleware/require-permission.js';
import { validateRequest } from '../../../middleware/validate-request.js';
import { createPipelineController } from '../controllers/pipeline-controller.js';
import {
  createPipelineStageBodySchema,
  deletePipelineStageBodySchema,
  pipelineJobParamsSchema,
  pipelineStageParamsSchema,
  renamePipelineStageBodySchema,
  reorderPipelineStagesBodySchema,
} from '../schemas/pipeline-schemas.js';

export function createPipelineRouter({
  authenticateSession,
  requireCsrf,
  tenantContextMiddleware,
  pipelineUseCases,
}) {
  const router = express.Router({ mergeParams: true });
  const controller = createPipelineController(pipelineUseCases);
  const context = (permission, csrf = false) => [
    authenticateSession,
    ...(csrf ? [requireCsrf] : []),
    tenantContextMiddleware,
    requirePermission(permission),
  ];
  router.get(
    '/',
    ...context(PERMISSIONS.PIPELINE_VIEW),
    validateRequest({ params: pipelineJobParamsSchema }),
    controller.get,
  );
  router.post(
    '/stages',
    ...context(PERMISSIONS.PIPELINE_CONFIGURE, true),
    validateRequest({
      params: pipelineJobParamsSchema,
      body: createPipelineStageBodySchema,
    }),
    controller.createStage,
  );
  router.patch(
    '/stages/:stageId',
    ...context(PERMISSIONS.PIPELINE_CONFIGURE, true),
    validateRequest({
      params: pipelineStageParamsSchema,
      body: renamePipelineStageBodySchema,
    }),
    controller.renameStage,
  );
  router.put(
    '/stages/order',
    ...context(PERMISSIONS.PIPELINE_CONFIGURE, true),
    validateRequest({
      params: pipelineJobParamsSchema,
      body: reorderPipelineStagesBodySchema,
    }),
    controller.reorderStages,
  );
  router.delete(
    '/stages/:stageId',
    ...context(PERMISSIONS.PIPELINE_CONFIGURE, true),
    validateRequest({
      params: pipelineStageParamsSchema,
      body: deletePipelineStageBodySchema,
    }),
    controller.deleteStage,
  );
  return router;
}
