import express from 'express';

import { validateRequest } from '../../../middleware/validate-request.js';
import { createPublicCareerController } from '../controllers/public-career-controller.js';
import {
  publicCareerJobParamsSchema,
  publicCareerListQuerySchema,
  publicCareerOrganizationParamsSchema,
} from '../schemas/public-career-schemas.js';

export function createPublicCareerRouter({
  publicCareerUseCases,
  publicCareerReadRateLimiter,
}) {
  const router = express.Router();
  const controller = createPublicCareerController(publicCareerUseCases);

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
  return router;
}
