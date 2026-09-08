import express from 'express';

import { PERMISSIONS } from '../../../authorization/permissions.js';
import { requirePermission } from '../../../middleware/require-permission.js';
import { validateRequest } from '../../../middleware/validate-request.js';
import { createInterviewController } from '../controllers/interview-controller.js';
import {
  applicationInterviewParamsSchema,
  cancelInterviewBodySchema,
  interviewOrganizationParamsSchema,
  interviewParamsSchema,
  listInterviewsQuerySchema,
  rescheduleInterviewBodySchema,
  scheduleInterviewBodySchema,
  updateInterviewBodySchema,
} from '../schemas/interview-schemas.js';

export function createInterviewRouter({
  authenticateSession,
  requireCsrf,
  tenantContextMiddleware,
  useCases,
}) {
  const router = express.Router({ mergeParams: true });
  const controller = createInterviewController(useCases);
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
    '/applications/:applicationId/interviews',
    ...mutationContext(PERMISSIONS.INTERVIEW_CREATE),
    validateRequest({
      params: applicationInterviewParamsSchema,
      body: scheduleInterviewBodySchema,
    }),
    controller.schedule,
  );
  router.get(
    '/applications/:applicationId/interviews',
    ...context(PERMISSIONS.INTERVIEW_VIEW_ASSIGNED),
    validateRequest({ params: applicationInterviewParamsSchema }),
    controller.listForApplication,
  );
  router.get(
    '/interviews',
    ...context(PERMISSIONS.INTERVIEW_VIEW_ASSIGNED),
    validateRequest({
      params: interviewOrganizationParamsSchema,
      query: listInterviewsQuerySchema,
    }),
    controller.listForOrganization,
  );
  router.get(
    '/interviews/:interviewId',
    ...context(PERMISSIONS.INTERVIEW_VIEW_ASSIGNED),
    validateRequest({ params: interviewParamsSchema }),
    controller.detail,
  );
  router.patch(
    '/interviews/:interviewId',
    ...mutationContext(PERMISSIONS.INTERVIEW_UPDATE),
    validateRequest({
      params: interviewParamsSchema,
      body: updateInterviewBodySchema,
    }),
    controller.update,
  );
  router.post(
    '/interviews/:interviewId/reschedule',
    ...mutationContext(PERMISSIONS.INTERVIEW_RESCHEDULE),
    validateRequest({
      params: interviewParamsSchema,
      body: rescheduleInterviewBodySchema,
    }),
    controller.reschedule,
  );
  router.post(
    '/interviews/:interviewId/cancel',
    ...mutationContext(PERMISSIONS.INTERVIEW_CANCEL),
    validateRequest({
      params: interviewParamsSchema,
      body: cancelInterviewBodySchema,
    }),
    controller.cancel,
  );

  return router;
}
