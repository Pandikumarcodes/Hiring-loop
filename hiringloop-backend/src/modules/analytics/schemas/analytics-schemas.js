import { z } from 'zod';
const uuid = z.string().uuid();
// Reporting windows are instants, rather than calendar dates.  Requiring a
// UTC ISO timestamp keeps the API's inclusive-from/exclusive-to contract
// unambiguous for callers in every timezone.
const utcTimestamp = z.string().datetime({ offset: false });
const rangeInput = z
  .object({
    from: utcTimestamp.optional(),
    to: utcTimestamp.optional(),
    jobId: uuid.optional(),
  })
  .superRefine((value, ctx) => {
    if (Boolean(value.from) !== Boolean(value.to))
      ctx.addIssue({
        code: 'custom',
        message: 'from and to must be supplied together',
        path: value.from ? ['to'] : ['from'],
      });
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
        366 * 86400000
    )
      ctx.addIssue({
        code: 'custom',
        message: 'Date range must not exceed 366 days',
        path: ['to'],
      });
  });
const withDates = (schema) =>
  schema.transform((value) => ({
    ...value,
    ...(value.from ? { from: new Date(value.from) } : {}),
    ...(value.to ? { to: new Date(value.to) } : {}),
  }));
export const analyticsParamsSchema = z.object({ organizationId: uuid });
export const analyticsQuerySchema = withDates(rangeInput);
export const analyticsJobsQuerySchema = withDates(
  rangeInput.safeExtend({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(25),
  }),
);
