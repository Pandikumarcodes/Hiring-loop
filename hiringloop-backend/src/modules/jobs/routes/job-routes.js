import express from 'express';

import { PERMISSIONS } from '../../../authorization/permissions.js';
import { requirePermission } from '../../../middleware/require-permission.js';
import { validateRequest } from '../../../middleware/validate-request.js';
import { createJobController } from '../controllers/job-controller.js';
import {
  createJobBodySchema,
  jobMutationBodySchema,
  jobOrganizationParamsSchema,
  jobParamsSchema,
  listJobsQuerySchema,
  updateJobBodySchema,
} from '../schemas/job-schemas.js';

export function createJobRouter({
  authenticateSession,
  requireCsrf,
  tenantContextMiddleware,
  jobUseCases,
}) {
  const router = express.Router({ mergeParams: true });
  const controller = createJobController(jobUseCases);
  const context = (permission) => [
    authenticateSession,
    tenantContextMiddleware,
    requirePermission(permission),
  ];
  const mutationContext = (permission) => [
    authenticateSession,
    requireCsrf,
    tenantContextMiddleware,
    requirePermission(permission),
  ];

  router.post(
    '/',
    ...mutationContext(PERMISSIONS.JOB_CREATE),
    validateRequest({
      params: jobOrganizationParamsSchema,
      body: createJobBodySchema,
    }),
    controller.create,
  );
  router.get(
    '/',
    ...context(PERMISSIONS.JOB_LIST),
    validateRequest({
      params: jobOrganizationParamsSchema,
      query: listJobsQuerySchema,
    }),
    controller.list,
  );
  router.get(
    '/:jobId',
    ...context(PERMISSIONS.JOB_READ),
    validateRequest({ params: jobParamsSchema }),
    controller.detail,
  );
  router.patch(
    '/:jobId',
    ...mutationContext(PERMISSIONS.JOB_UPDATE),
    validateRequest({ params: jobParamsSchema, body: updateJobBodySchema }),
    controller.update,
  );
  for (const [operation, permission] of [
    ['open', PERMISSIONS.JOB_OPEN],
    ['close', PERMISSIONS.JOB_CLOSE],
    ['reopen', PERMISSIONS.JOB_REOPEN],
    ['archive', PERMISSIONS.JOB_ARCHIVE],
  ]) {
    router.post(
      `/:jobId/${operation}`,
      ...mutationContext(permission),
      validateRequest({
        params: jobParamsSchema,
        body: jobMutationBodySchema,
      }),
      controller[operation],
    );
  }
  return router;
}
