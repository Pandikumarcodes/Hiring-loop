import { z } from 'zod';
const id = z.uuid();
export const outcomeApplicationParamsSchema = z.object({
  organizationId: id,
  applicationId: id,
});
export const outcomeRevisionSchema = z
  .object({ expectedRevision: z.number().int().positive() })
  .strict();
export const rejectApplicationBodySchema = outcomeRevisionSchema
  .extend({
    reasonCode: z.enum([
      'ROLE_CLOSED',
      'CANDIDATE_WITHDREW',
      'QUALIFICATIONS',
      'INTERVIEW_FEEDBACK',
      'OTHER',
    ]),
    reasonDetails: z.string().trim().max(1000).optional(),
    talentPoolId: id.optional(),
  })
  .strict();
export const reopenApplicationBodySchema = outcomeRevisionSchema
  .extend({ reasonDetails: z.string().trim().min(1).max(1000) })
  .strict();
