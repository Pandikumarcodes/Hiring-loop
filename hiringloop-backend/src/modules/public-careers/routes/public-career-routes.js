import express from 'express';

import { validateRequest } from '../../../middleware/validate-request.js';
import { createPublicCareerController } from '../controllers/public-career-controller.js';
import { createPublicApplicationController } from '../../applications/controllers/public-application-controller.js';
import {
  applicationSubmissionBodySchema,
  applicationUploadBodySchema,
  publicApplicationParamsSchema,
  validateIdempotencyKey,
} from '../../applications/schemas/public-application-schemas.js';
import {
  publicCareerJobParamsSchema,
  publicCareerListQuerySchema,
  publicCareerOrganizationParamsSchema,
} from '../schemas/public-career-schemas.js';

export function createPublicCareerRouter({
  publicCareerUseCases,
  publicCareerReadRateLimiter,
  publicApplicationUseCases,
  publicApplicationRateLimiters,
}) {
  const router = express.Router();
  const controller = createPublicCareerController(publicCareerUseCases);
  const applicationController = publicApplicationUseCases
    ? createPublicApplicationController(publicApplicationUseCases)
    : null;

  router.get(
    '/careers/:organizationSlug/jobs',
    publicCareerReadRateLimiter,
    validateRequest({
      params: publicCareerOrganizationParamsSchema,
      query: publicCareerListQuerySchema,
    }),
    controller.list,
  );
  router.get(
    '/careers/:organizationSlug/jobs/:jobId',
    publicCareerReadRateLimiter,
    validateRequest({ params: publicCareerJobParamsSchema }),
    controller.detail,
  );
  if (applicationController) {
    router.get(
      '/careers/:organizationSlug/jobs/:jobId/application-form',
      publicApplicationRateLimiters.applicationFormRateLimiter,
      validateRequest({ params: publicApplicationParamsSchema }),
      applicationController.form,
    );
    router.post(
      '/careers/:organizationSlug/jobs/:jobId/application-uploads',
      publicApplicationRateLimiters.applicationUploadRateLimiter,
      validateRequest({
        params: publicApplicationParamsSchema,
        body: applicationUploadBodySchema,
      }),
      applicationController.authorizeUpload,
    );
    router.post(
      '/careers/:organizationSlug/jobs/:jobId/applications',
      publicApplicationRateLimiters.applicationSubmissionRateLimiter,
      validateRequest({
        params: publicApplicationParamsSchema,
        body: applicationSubmissionBodySchema,
      }),
      validateIdempotencyKey,
      applicationController.submit,
    );
  }
  return router;
}
