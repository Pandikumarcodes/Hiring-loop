import { z } from 'zod';
const uuid = z.string().uuid();
const utcTimestamp = z.string().datetime({ offset: false });
export const auditParamsSchema = z.object({ organizationId: uuid });
export const auditDetailParamsSchema = z.object({
  organizationId: uuid,
  auditEventId: uuid,
});
export const auditListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(25),
    from: utcTimestamp.optional(),
    to: utcTimestamp.optional(),
    actorUserId: uuid.optional(),
    action: z.string().trim().min(1).max(64).optional(),
    resourceType: z.string().trim().min(1).max(64).optional(),
    resourceId: uuid.optional(),
  })
  .superRefine((value, ctx) => {
    if (
      value.from &&
      value.to &&
      new Date(value.from).getTime() >= new Date(value.to).getTime()
    )
      ctx.addIssue({
        code: 'custom',
        message: 'from must be before to',
        path: ['to'],
      });
    if (
      value.from &&
      value.to &&
      new Date(value.to).getTime() - new Date(value.from).getTime() >
        366 * 24 * 60 * 60 * 1000
    )
      ctx.addIssue({
        code: 'custom',
        message: 'Date range must not exceed 366 days',
        path: ['to'],
      });
  })
  .transform((value) => ({
    ...value,
    ...(value.from ? { from: new Date(value.from) } : {}),
    ...(value.to ? { to: new Date(value.to) } : {}),
  }));
