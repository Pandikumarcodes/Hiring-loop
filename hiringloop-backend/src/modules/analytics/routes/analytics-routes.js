import express from 'express';
import { requirePermission } from '../../../middleware/require-permission.js';
import { PERMISSIONS } from '../../../authorization/permissions.js';
import { validateRequest } from '../../../middleware/validate-request.js';
import {
  analyticsParamsSchema,
  analyticsQuerySchema,
  analyticsJobsQuerySchema,
} from '../schemas/analytics-schemas.js';
import { createAnalyticsController } from '../controllers/analytics-controller.js';
export function createAnalyticsRouter({
  authenticateSession,
  tenantContextMiddleware,
  useCases,
}) {
  const router = express.Router({ mergeParams: true });
  const controller = createAnalyticsController(useCases);
  const access = [
    authenticateSession,
    tenantContextMiddleware,
    requirePermission(PERMISSIONS.ANALYTICS_VIEW),
  ];
  for (const name of [
    'overview',
    'funnel',
    'pipeline',
    'interviews',
    'communications',
    'outcomes',
  ])
    router.get(
      `/analytics/${name}`,
      ...access,
      validateRequest({
        params: analyticsParamsSchema,
        query: analyticsQuerySchema,
      }),
      controller[name],
    );
  router.get(
    '/analytics/jobs',
    ...access,
    validateRequest({
      params: analyticsParamsSchema,
      query: analyticsJobsQuerySchema,
    }),
    controller.jobs,
  );
  return router;
}
