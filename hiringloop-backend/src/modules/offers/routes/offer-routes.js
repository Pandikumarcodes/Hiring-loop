import express from 'express';
import { requirePermission } from '../../../middleware/require-permission.js';
import { PERMISSIONS } from '../../../authorization/permissions.js';
import { validateRequest } from '../../../middleware/validate-request.js';
import { createOfferController } from '../controllers/offer-controller.js';
import {
  offerApplicationParamsSchema,
  offerParamsSchema,
  createOfferBodySchema,
  editOfferBodySchema,
  offerRevisionSchema,
  sendOfferBodySchema,
} from '../schemas/offer-schemas.js';
export function createOfferRouter({
  authenticateSession,
  requireCsrf,
  tenantContextMiddleware,
  offerUseCases,
}) {
  const router = express.Router({ mergeParams: true });
  const tenant = tenantContextMiddleware;
  const controller = createOfferController(offerUseCases);
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
    '/applications/:applicationId/offer',
    ...read(PERMISSIONS.OFFER_VIEW),
    validateRequest({ params: offerApplicationParamsSchema }),
    controller.byApplication,
  );
  router.post(
    '/applications/:applicationId/offer',
    ...write(PERMISSIONS.OFFER_CREATE),
    validateRequest({
      params: offerApplicationParamsSchema,
      body: createOfferBodySchema,
    }),
    controller.create,
  );
  router.get(
    '/offers/:offerId',
    ...read(PERMISSIONS.OFFER_VIEW),
    validateRequest({ params: offerParamsSchema }),
    controller.byId,
  );
  router.patch(
    '/offers/:offerId/draft',
    ...write(PERMISSIONS.OFFER_UPDATE),
    validateRequest({ params: offerParamsSchema, body: editOfferBodySchema }),
    controller.editDraft,
  );
  router.post(
    '/offers/:offerId/revisions',
    ...write(PERMISSIONS.OFFER_REVISE),
    validateRequest({ params: offerParamsSchema, body: editOfferBodySchema }),
    controller.revise,
  );
  router.post(
    '/offers/:offerId/send',
    ...write(PERMISSIONS.OFFER_SEND),
    validateRequest({ params: offerParamsSchema, body: sendOfferBodySchema }),
    controller.send,
  );
  for (const [name, permission] of [
    ['accept', PERMISSIONS.OFFER_RECORD_ACCEPTANCE],
    ['decline', PERMISSIONS.OFFER_RECORD_DECLINE],
    ['withdraw', PERMISSIONS.OFFER_WITHDRAW],
  ])
    router.post(
      `/offers/:offerId/${name}`,
      ...write(permission),
      validateRequest({ params: offerParamsSchema, body: offerRevisionSchema }),
      controller[name],
    );
  return router;
}
