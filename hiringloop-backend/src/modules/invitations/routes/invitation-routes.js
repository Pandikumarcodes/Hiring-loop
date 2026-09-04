import express from 'express';

import { requirePermission } from '../../../middleware/require-permission.js';
import { validateRequest } from '../../../middleware/validate-request.js';
import { PERMISSIONS } from '../../../authorization/permissions.js';
import {
  createInvitationRequestSchema,
  invitationParamsSchema,
  invitationWithIdParamsSchema,
  acceptInvitationRequestSchema,
} from '../schemas/invitation-schemas.js';
import { createInvitationController } from '../controllers/invitation-controller.js';

export function createInvitationRouter({
  authenticateSession,
  requireCsrf,
  tenantContextMiddleware,
  createInvitation,
  listInvitations,
  revokeInvitation,
}) {
  const router = express.Router({ mergeParams: true });
  const controller = createInvitationController({
    createInvitation,
    listInvitations,
    revokeInvitation,
  });

  router.post(
    '/',
    authenticateSession,
    requireCsrf,
    tenantContextMiddleware,
    requirePermission(PERMISSIONS.MEMBER_INVITE),
    validateRequest({
      params: invitationParamsSchema,
      body: createInvitationRequestSchema,
    }),
    controller.create,
  );
  router.get(
    '/',
    authenticateSession,
    tenantContextMiddleware,
    requirePermission(PERMISSIONS.INVITATION_READ),
    validateRequest({ params: invitationParamsSchema }),
    controller.list,
  );
  router.delete(
    '/:invitationId',
    authenticateSession,
    requireCsrf,
    tenantContextMiddleware,
    requirePermission(PERMISSIONS.INVITATION_REVOKE),
    validateRequest({ params: invitationWithIdParamsSchema }),
    controller.revoke,
  );

  return router;
}

export function createInvitationAcceptanceRouter({
  authenticateSession,
  requireCsrf,
  acceptInvitation,
}) {
  const router = express.Router();
  const controller = createInvitationController({ acceptInvitation });

  router.post(
    '/accept',
    authenticateSession,
    requireCsrf,
    validateRequest({ body: acceptInvitationRequestSchema }),
    controller.accept,
  );
  return router;
}
