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
  getOrganizationForUser,
}) {
  const router = express.Router();
  const controller = createOrganizationController({
    createOrganizationForUser,
    listOrganizationsForUser,
    getOrganizationForUser,
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
    controller.get,
  );

  return router;
}
