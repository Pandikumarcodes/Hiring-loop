import { z } from 'zod';

const uuid = z.uuid();
const text = (max) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => v || null);
export const jobParams = z.object({ organizationId: uuid, jobId: uuid });
export const interviewParams = z.object({
  organizationId: uuid,
  interviewId: uuid,
});
export const scorecardParams = interviewParams.extend({ scorecardId: uuid });
export const applicationParams = z.object({
  organizationId: uuid,
  applicationId: uuid,
});
export const noteParams = applicationParams.extend({ noteId: uuid });
export const emptyBody = z.object({}).strict();
export const templateUpdateBody = z
  .object({
    expectedRevision: z.number().int().min(1),
    title: z.string().trim().min(1).max(160),
    instructions: text(10000).optional(),
    criteria: z
      .array(
        z
          .object({
            id: uuid.optional(),
            label: z.string().trim().min(1).max(300),
            description: text(5000).optional(),
            type: z.enum(['RATING', 'TEXT']),
            required: z.boolean(),
            position: z.number().int().min(1),
          })
          .strict(),
      )
      .max(100),
  })
  .strict()
  .superRefine((v, ctx) => {
    const positions = v.criteria.map((c) => c.position);
    if (new Set(positions).size !== positions.length)
      ctx.addIssue({
        code: 'custom',
        message: 'Criterion positions must be unique',
      });
  });
export const revisionBody = z
  .object({ expectedRevision: z.number().int().min(1) })
  .strict();
const response = z
  .object({
    criterionId: uuid,
    ratingValue: z.number().int().min(1).max(5).nullable().optional(),
    textValue: text(10000).optional(),
    comment: text(5000).optional(),
  })
  .strict();
export const scorecardBody = z
  .object({
    expectedRevision: z.number().int().min(1).optional(),
    responses: z.array(response).max(100),
    overallRecommendation: z
      .enum(['STRONG_NO', 'NO', 'MIXED', 'YES', 'STRONG_YES'])
      .nullable()
      .optional(),
    overallComment: text(10000).optional(),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (
      new Set(v.responses.map((r) => r.criterionId)).size !== v.responses.length
    )
      ctx.addIssue({
        code: 'custom',
        message: 'Responses must be unique by criterion',
      });
  });
export const noteCreateBody = z
  .object({ body: z.string().trim().min(1).max(10000) })
  .strict();
export const noteUpdateBody = z
  .object({
    expectedRevision: z.number().int().min(1),
    body: z.string().trim().min(1).max(10000),
  })
  .strict();
