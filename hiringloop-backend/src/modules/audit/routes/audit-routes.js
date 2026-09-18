import express from 'express';
import { requirePermission } from '../../../middleware/require-permission.js';
import { PERMISSIONS } from '../../../authorization/permissions.js';
import { validateRequest } from '../../../middleware/validate-request.js';
import { createAuditController } from '../controllers/audit-controller.js';
import {
  auditParamsSchema,
  auditDetailParamsSchema,
  auditListQuerySchema,
} from '../schemas/audit-schemas.js';
export function createAuditRouter({
  authenticateSession,
  tenantContextMiddleware,
  useCases,
}) {
  const router = express.Router({ mergeParams: true });
  const controller = createAuditController(useCases);
  const access = [
    authenticateSession,
    tenantContextMiddleware,
    requirePermission(PERMISSIONS.AUDIT_VIEW),
  ];
  router.get(
    '/audit-events',
    ...access,
    validateRequest({ params: auditParamsSchema, query: auditListQuerySchema }),
    controller.list,
  );
  router.get(
    '/audit-events/:auditEventId',
    ...access,
    validateRequest({ params: auditDetailParamsSchema }),
    controller.get,
  );
  return router;
}
