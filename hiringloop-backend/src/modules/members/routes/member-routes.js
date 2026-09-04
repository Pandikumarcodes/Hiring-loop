import express from 'express';

import { PERMISSIONS } from '../../../authorization/permissions.js';
import { requirePermission } from '../../../middleware/require-permission.js';
import { validateRequest } from '../../../middleware/validate-request.js';
import { createMemberController } from '../controllers/member-controller.js';
import {
  memberParamsSchema,
  memberWithIdParamsSchema,
  updateMemberRoleRequestSchema,
} from '../schemas/member-schemas.js';

export function createMemberRouter({
  authenticateSession,
  requireCsrf,
  tenantContextMiddleware,
  listMembers,
  updateMemberRole,
  removeMember,
}) {
  const router = express.Router({ mergeParams: true });
  const controller = createMemberController({
    listMembers,
    updateMemberRole,
    removeMember,
  });

  router.get(
    '/',
    authenticateSession,
    tenantContextMiddleware,
    requirePermission(PERMISSIONS.MEMBER_READ),
    validateRequest({ params: memberParamsSchema }),
    controller.list,
  );
  router.patch(
    '/:membershipId/role',
    authenticateSession,
    requireCsrf,
    tenantContextMiddleware,
    requirePermission(PERMISSIONS.MEMBER_ROLE_CHANGE),
    validateRequest({
      params: memberWithIdParamsSchema,
      body: updateMemberRoleRequestSchema,
    }),
    controller.updateRole,
  );
  router.delete(
    '/:membershipId',
    authenticateSession,
    requireCsrf,
    tenantContextMiddleware,
    requirePermission(PERMISSIONS.MEMBER_REMOVE),
    validateRequest({ params: memberWithIdParamsSchema }),
    controller.remove,
  );

  return router;
}
