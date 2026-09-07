import express from 'express';

import { PERMISSIONS } from '../../../authorization/permissions.js';
import { requirePermission } from '../../../middleware/require-permission.js';
import { validateRequest } from '../../../middleware/validate-request.js';
import { createCandidateManagementController } from '../controllers/candidate-management-controller.js';
import {
  applicationParamsSchema,
  candidateListParamsSchema,
  candidateListQuerySchema,
  candidateParamsSchema,
  documentParamsSchema,
} from '../schemas/candidate-management-schemas.js';

export function createCandidateManagementRouter({
  authenticateSession,
  requireCsrf,
  tenantContextMiddleware,
  useCases,
}) {
  const router = express.Router({ mergeParams: true });
  const controller = createCandidateManagementController(useCases);
  const readContext = (permission) => [
    authenticateSession,
    tenantContextMiddleware,
    requirePermission(permission),
  ];

  router.get(
    '/candidates',
    ...readContext(PERMISSIONS.CANDIDATE_LIST),
    validateRequest({
      params: candidateListParamsSchema,
      query: candidateListQuerySchema,
    }),
    controller.list,
  );
  router.get(
    '/candidates/:candidateId',
    ...readContext(PERMISSIONS.CANDIDATE_READ),
    validateRequest({ params: candidateParamsSchema }),
    controller.candidateDetail,
  );
  router.get(
    '/applications/:applicationId',
    ...readContext(PERMISSIONS.CANDIDATE_READ),
    validateRequest({ params: applicationParamsSchema }),
    controller.applicationDetail,
  );
  router.post(
    '/candidate-documents/:documentId/access',
    authenticateSession,
    requireCsrf,
    tenantContextMiddleware,
    requirePermission(PERMISSIONS.CANDIDATE_DOCUMENT_ACCESS),
    validateRequest({ params: documentParamsSchema }),
    controller.accessDocument,
  );
  return router;
}
