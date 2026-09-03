import express from 'express';

import { validateRequest } from '../../../middleware/validate-request.js';
import {
  createOrganizationRequestSchema,
  organizationIdParamsSchema,
} from '../schemas/organization-schemas.js';
import { createOrganizationController } from '../controllers/organization-controller.js';

export function createOrganizationRouter({
  authenticateSession,
  requireCsrf,
  createOrganizationForUser,
  listOrganizationsForUser,
  getOrganizationById,
  tenantContextMiddleware,
}) {
  const router = express.Router();
  const controller = createOrganizationController({
    createOrganizationForUser,
    listOrganizationsForUser,
    getOrganizationById,
  });

  router.get('/', authenticateSession, controller.list);
  router.post(
    '/',
    authenticateSession,
    requireCsrf,
    validateRequest({ body: createOrganizationRequestSchema }),
    controller.create,
  );
  router.get(
    '/:organizationId',
    authenticateSession,
    validateRequest({ params: organizationIdParamsSchema }),
    tenantContextMiddleware,
    controller.get,
  );

  return router;
}
