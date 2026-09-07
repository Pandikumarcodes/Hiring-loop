import express from 'express';
import { PERMISSIONS } from '../../../authorization/permissions.js';
import { requirePermission } from '../../../middleware/require-permission.js';
import { validateRequest } from '../../../middleware/validate-request.js';
import { createApplicationFormController } from '../controllers/application-form-controller.js';
import {
  createQuestionBodySchema,
  emptyBodySchema,
  formParamsSchema,
  questionParamsSchema,
  reorderQuestionsBodySchema,
  revisionBodySchema,
  updateQuestionBodySchema,
} from '../schemas/application-form-schemas.js';
export function createApplicationFormRouter({
  authenticateSession,
  requireCsrf,
  tenantContextMiddleware,
  applicationFormUseCases,
}) {
  const router = express.Router({ mergeParams: true });
  const controller = createApplicationFormController(applicationFormUseCases);
  const context = (permission, csrf = false) => [
    authenticateSession,
    ...(csrf ? [requireCsrf] : []),
    tenantContextMiddleware,
    requirePermission(permission),
  ];
  router.get(
    '/',
    ...context(PERMISSIONS.APPLICATION_FORM_VIEW),
    validateRequest({ params: formParamsSchema }),
    controller.get,
  );
  router.post(
    '/draft',
    ...context(PERMISSIONS.APPLICATION_FORM_CONFIGURE, true),
    validateRequest({ params: formParamsSchema, body: emptyBodySchema }),
    controller.createDraft,
  );
  router.post(
    '/draft/questions',
    ...context(PERMISSIONS.APPLICATION_FORM_CONFIGURE, true),
    validateRequest({
      params: formParamsSchema,
      body: createQuestionBodySchema,
    }),
    controller.addQuestion,
  );
  router.patch(
    '/draft/questions/:questionId',
    ...context(PERMISSIONS.APPLICATION_FORM_CONFIGURE, true),
    validateRequest({
      params: questionParamsSchema,
      body: updateQuestionBodySchema,
    }),
    controller.updateQuestion,
  );
  router.delete(
    '/draft/questions/:questionId',
    ...context(PERMISSIONS.APPLICATION_FORM_CONFIGURE, true),
    validateRequest({ params: questionParamsSchema, body: revisionBodySchema }),
    controller.deleteQuestion,
  );
  router.put(
    '/draft/questions/order',
    ...context(PERMISSIONS.APPLICATION_FORM_CONFIGURE, true),
    validateRequest({
      params: formParamsSchema,
      body: reorderQuestionsBodySchema,
    }),
    controller.reorderQuestions,
  );
  router.post(
    '/draft/publish',
    ...context(PERMISSIONS.APPLICATION_FORM_CONFIGURE, true),
    validateRequest({ params: formParamsSchema, body: revisionBodySchema }),
    controller.publish,
  );
  router.delete(
    '/draft',
    ...context(PERMISSIONS.APPLICATION_FORM_CONFIGURE, true),
    validateRequest({ params: formParamsSchema, body: revisionBodySchema }),
    controller.discard,
  );
  return router;
}
