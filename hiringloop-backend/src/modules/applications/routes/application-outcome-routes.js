import express from 'express';
import { requirePermission } from '../../../middleware/require-permission.js';
import { PERMISSIONS } from '../../../authorization/permissions.js';
import { validateRequest } from '../../../middleware/validate-request.js';
import { createApplicationOutcomeController } from '../controllers/application-outcome-controller.js';
import {
  outcomeApplicationParamsSchema,
  outcomeRevisionSchema,
  rejectApplicationBodySchema,
  reopenApplicationBodySchema,
} from '../schemas/outcome-schemas.js';
export function createApplicationOutcomeRouter({
  authenticateSession,
  requireCsrf,
  tenantContextMiddleware,
  outcomeUseCases,
}) {
  const router = express.Router({ mergeParams: true });
  const controller = createApplicationOutcomeController(outcomeUseCases);
  const write = (permission) => [
    authenticateSession,
    requireCsrf,
    tenantContextMiddleware,
    requirePermission(permission),
  ];
  router.post(
    '/applications/:applicationId/hire',
    ...write(PERMISSIONS.APPLICATION_HIRE),
    validateRequest({
      params: outcomeApplicationParamsSchema,
      body: outcomeRevisionSchema,
    }),
    controller.hire,
  );
  router.post(
    '/applications/:applicationId/reject',
    ...write(PERMISSIONS.APPLICATION_REJECT),
    validateRequest({
      params: outcomeApplicationParamsSchema,
      body: rejectApplicationBodySchema,
    }),
    controller.reject,
  );
  router.post(
    '/applications/:applicationId/reopen',
    ...write(PERMISSIONS.APPLICATION_REOPEN),
    validateRequest({
      params: outcomeApplicationParamsSchema,
      body: reopenApplicationBodySchema,
    }),
    controller.reopen,
  );
  return router;
}
