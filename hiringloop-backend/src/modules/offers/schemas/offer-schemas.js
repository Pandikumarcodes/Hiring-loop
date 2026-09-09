import { z } from 'zod';

const id = z.uuid();
export const offerApplicationParamsSchema = z.object({
  organizationId: id,
  applicationId: id,
});
export const offerParamsSchema = z.object({ organizationId: id, offerId: id });
export const offerTermsSchema = z
  .object({
    jobTitle: z.string().trim().min(1).max(160),
    currency: z.string().regex(/^[A-Z]{3}$/),
    baseCompensationMinor: z.coerce.bigint().nonnegative(),
    bonusCompensationMinor: z.coerce.bigint().nonnegative().optional(),
    additionalCompensationText: z.string().trim().max(10000).optional(),
    startDate: z.coerce.date().optional(),
    expirationDate: z.coerce.date().optional(),
    location: z.string().trim().max(160).optional(),
    workplaceType: z.enum(['ONSITE', 'HYBRID', 'REMOTE']).optional(),
    additionalTerms: z.string().trim().max(10000).optional(),
  })
  .strict()
  .refine(
    (value) =>
      !value.startDate ||
      !value.expirationDate ||
      value.expirationDate >= value.startDate,
    { message: 'expirationDate must not precede startDate' },
  );
export const offerRevisionSchema = z
  .object({ expectedRevision: z.number().int().positive() })
  .strict();
export const createOfferBodySchema = offerTermsSchema
  .extend({ idempotencyKey: id.optional() })
  .strict();
export const editOfferBodySchema = offerTermsSchema
  .extend(offerRevisionSchema.shape)
  .strict();
export const sendOfferBodySchema = offerRevisionSchema
  .extend({ idempotencyKey: id })
  .strict();
