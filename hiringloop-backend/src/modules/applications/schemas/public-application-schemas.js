import { z } from 'zod';

import { validationError } from '../../../errors/application-error.js';
import { publicCareerJobParamsSchema } from '../../public-careers/schemas/public-career-schemas.js';

const filename = z
  .string()
  .trim()
  .min(1)
  .max(255)
  .refine(
    (value) => !/[\\/]/.test(value) && !value.includes('\0'),
    'Filename must not contain a path',
  );

export const publicApplicationParamsSchema = publicCareerJobParamsSchema;
export const applicationUploadBodySchema = z
  .object({
    filename,
    mimeType: z.string().trim().min(1).max(127),
    sizeBytes: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  })
  .strict();

export const applicationSubmissionBodySchema = z
  .object({
    candidate: z
      .object({
        firstName: z.string().trim().min(1).max(100),
        lastName: z.string().trim().min(1).max(100),
        email: z.string().trim().email().max(320),
        phone: z.string().trim().min(1).max(50).optional(),
      })
      .strict(),
    formVersionId: z.uuid(),
    answers: z
      .array(z.object({ questionId: z.uuid(), value: z.unknown() }).strict())
      .max(100),
    resumeUploadId: z.uuid(),
  })
  .strict();

const idempotencyKeySchema = z.uuid();

export function validateIdempotencyKey(request, _response, next) {
  const result = idempotencyKeySchema.safeParse(request.get('Idempotency-Key'));
  if (!result.success) {
    return next(
      validationError('A valid Idempotency-Key header is required', [
        { path: ['Idempotency-Key'], message: 'Expected a UUID' },
      ]),
    );
  }
  request.validated = {
    ...(request.validated ?? {}),
    headers: { idempotencyKey: result.data },
  };
  return next();
}
