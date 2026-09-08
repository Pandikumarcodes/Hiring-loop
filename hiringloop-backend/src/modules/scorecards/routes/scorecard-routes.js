import express from 'express';
import { PERMISSIONS } from '../../../authorization/permissions.js';
import { requirePermission } from '../../../middleware/require-permission.js';
import { validateRequest } from '../../../middleware/validate-request.js';
import { createScorecardController } from '../controllers/scorecard-controller.js';
import {
  applicationParams,
  emptyBody,
  interviewParams,
  jobParams,
  noteCreateBody,
  noteParams,
  noteUpdateBody,
  revisionBody,
  scorecardBody,
  scorecardParams,
  templateUpdateBody,
} from '../schemas/scorecard-schemas.js';
export function createScorecardRouter({
  authenticateSession,
  requireCsrf,
  tenantContextMiddleware,
  useCases,
}) {
  const router = express.Router({ mergeParams: true });
  const c = createScorecardController(useCases);
  const ctx = (p, mutate = false) => [
    authenticateSession,
    ...(mutate ? [requireCsrf] : []),
    tenantContextMiddleware,
    requirePermission(p),
  ];
  router.get(
    '/jobs/:jobId/scorecard-template',
    ...ctx(PERMISSIONS.SCORECARD_TEMPLATE_VIEW),
    validateRequest({ params: jobParams }),
    c.getTemplate,
  );
  router.post(
    '/jobs/:jobId/scorecard-template/draft',
    ...ctx(PERMISSIONS.SCORECARD_TEMPLATE_MANAGE, true),
    validateRequest({ params: jobParams, body: emptyBody }),
    c.createDraft,
  );
  router.patch(
    '/jobs/:jobId/scorecard-template/draft',
    ...ctx(PERMISSIONS.SCORECARD_TEMPLATE_MANAGE, true),
    validateRequest({ params: jobParams, body: templateUpdateBody }),
    c.updateTemplate,
  );
  router.post(
    '/jobs/:jobId/scorecard-template/publish',
    ...ctx(PERMISSIONS.SCORECARD_TEMPLATE_MANAGE, true),
    validateRequest({ params: jobParams, body: revisionBody }),
    c.publishTemplate,
  );
  router.get(
    '/interviews/:interviewId/scorecards',
    ...ctx(PERMISSIONS.SCORECARD_VIEW_SUBMITTED),
    validateRequest({ params: interviewParams }),
    c.summary,
  );
  router.get(
    '/interviews/:interviewId/my-scorecard',
    ...ctx(PERMISSIONS.SCORECARD_COMPLETE),
    validateRequest({ params: interviewParams }),
    c.my,
  );
  router.patch(
    '/interviews/:interviewId/my-scorecard',
    ...ctx(PERMISSIONS.SCORECARD_COMPLETE, true),
    validateRequest({ params: interviewParams, body: scorecardBody }),
    c.saveMy,
  );
  router.post(
    '/interviews/:interviewId/my-scorecard/submit',
    ...ctx(PERMISSIONS.SCORECARD_COMPLETE, true),
    validateRequest({ params: interviewParams, body: scorecardBody }),
    c.submitMy,
  );
  router.get(
    '/interviews/:interviewId/scorecards/:scorecardId',
    ...ctx(PERMISSIONS.SCORECARD_VIEW_SUBMITTED),
    validateRequest({ params: scorecardParams }),
    c.submitted,
  );
  router.get(
    '/applications/:applicationId/scorecards',
    ...ctx(PERMISSIONS.SCORECARD_VIEW_SUBMITTED),
    validateRequest({ params: applicationParams }),
    c.application,
  );
  router.get(
    '/applications/:applicationId/notes',
    ...ctx(PERMISSIONS.APPLICATION_NOTE_MANAGE),
    validateRequest({ params: applicationParams }),
    c.listNotes,
  );
  router.post(
    '/applications/:applicationId/notes',
    ...ctx(PERMISSIONS.APPLICATION_NOTE_MANAGE, true),
    validateRequest({ params: applicationParams, body: noteCreateBody }),
    c.createNote,
  );
  router.patch(
    '/applications/:applicationId/notes/:noteId',
    ...ctx(PERMISSIONS.APPLICATION_NOTE_MANAGE, true),
    validateRequest({ params: noteParams, body: noteUpdateBody }),
    c.updateNote,
  );
  router.delete(
    '/applications/:applicationId/notes/:noteId',
    ...ctx(PERMISSIONS.APPLICATION_NOTE_MANAGE, true),
    validateRequest({ params: noteParams, body: emptyBody }),
    c.deleteNote,
  );
  return router;
}
