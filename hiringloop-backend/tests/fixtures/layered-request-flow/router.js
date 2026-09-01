import express from 'express';
import { z } from 'zod';

import { errorHandler } from '../../../src/middleware/error-handler.js';
import { validateRequest } from '../../../src/middleware/validate-request.js';

export const foundationRequestSchema = z.object({
  name: z.string().trim().min(1),
});

export function createFoundationApp({ controller }) {
  const router = express.Router();
  router.post(
    '/boundary-fixture',
    validateRequest({ body: foundationRequestSchema }),
    controller,
  );

  const app = express();
  app.use(express.json());
  app.use('/api/v1', router);
  app.use(errorHandler);
  return app;
}
