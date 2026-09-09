import express from 'express';
import { requirePermission } from '../../../middleware/require-permission.js';
import { PERMISSIONS } from '../../../authorization/permissions.js';
import { validateRequest } from '../../../middleware/validate-request.js';
import { createTalentPoolController } from '../controllers/talent-pool-controller.js';
import {
  poolOrganizationParamsSchema,
  poolParamsSchema,
  memberParamsSchema,
  poolBodySchema,
  poolUpdateBodySchema,
  poolMemberBodySchema,
  poolPageSchema,
} from '../schemas/talent-pool-schemas.js';
export function createTalentPoolRouter({
  authenticateSession,
  requireCsrf,
  tenantContextMiddleware,
  talentPoolUseCases,
}) {
  const router = express.Router({ mergeParams: true });
  const tenant = tenantContextMiddleware;
  const controller = createTalentPoolController(talentPoolUseCases);
  const read = (permission) => [
    authenticateSession,
    tenant,
    requirePermission(permission),
  ];
  const write = (permission) => [
    authenticateSession,
    requireCsrf,
    tenant,
    requirePermission(permission),
  ];
  router.get(
    '/talent-pools',
    ...read(PERMISSIONS.TALENT_POOL_VIEW),
    validateRequest({
      params: poolOrganizationParamsSchema,
      query: poolPageSchema,
    }),
    controller.list,
  );
  router.post(
    '/talent-pools',
    ...write(PERMISSIONS.TALENT_POOL_MANAGE),
    validateRequest({
      params: poolOrganizationParamsSchema,
      body: poolBodySchema,
    }),
    controller.create,
  );
  router.patch(
    '/talent-pools/:talentPoolId',
    ...write(PERMISSIONS.TALENT_POOL_MANAGE),
    validateRequest({ params: poolParamsSchema, body: poolUpdateBodySchema }),
    controller.update,
  );
  router.get(
    '/talent-pools/:talentPoolId/members',
    ...read(PERMISSIONS.TALENT_POOL_VIEW),
    validateRequest({ params: poolParamsSchema, query: poolPageSchema }),
    controller.listMembers,
  );
  router.post(
    '/talent-pools/:talentPoolId/members',
    ...write(PERMISSIONS.TALENT_POOL_MEMBER_MANAGE),
    validateRequest({ params: poolParamsSchema, body: poolMemberBodySchema }),
    controller.addMember,
  );
  router.delete(
    '/talent-pools/:talentPoolId/members/:candidateId',
    ...write(PERMISSIONS.TALENT_POOL_MEMBER_MANAGE),
    validateRequest({ params: memberParamsSchema }),
    controller.removeMember,
  );
  return router;
}
