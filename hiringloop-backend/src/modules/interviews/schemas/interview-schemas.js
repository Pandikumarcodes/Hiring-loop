import { z } from 'zod';

const organizationId = z.uuid();
const uuid = z.uuid();
const MAX_DURATION_MINUTES = 24 * 60;
const MAX_CALENDAR_RANGE_MS = 31 * 24 * 60 * 60 * 1000;

const supportedTimeZones = new Set(
  typeof Intl.supportedValuesOf === 'function'
    ? Intl.supportedValuesOf('timeZone')
    : [],
);

function isIanaTimeZone(value) {
  if (value === 'UTC') return true;
  if (supportedTimeZones.size > 0) return supportedTimeZones.has(value);
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value }).format();
    return value.includes('/');
  } catch {
    return false;
  }
}

const dateTime = z
  .string()
  .trim()
  .refine(
    (value) =>
      /(?:Z|[+-]\d{2}:\d{2})$/i.test(value) && !Number.isNaN(Date.parse(value)),
    'A timezone-aware ISO-8601 datetime is required',
  )
  .transform((value) => new Date(value));

const timeZone = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .refine(isIanaTimeZone, 'A valid IANA timezone is required');

const participantUserIds = z
  .array(uuid)
  .min(1)
  .max(50)
  .superRefine((ids, context) => {
    if (new Set(ids).size !== ids.length) {
      context.addIssue({
        code: 'custom',
        message: 'Participant user IDs must be unique',
      });
    }
  });

const nullableUrl = z
  .union([
    z
      .string()
      .trim()
      .max(2048)
      .url()
      .refine((value) => {
        const protocol = new URL(value).protocol;
        return protocol === 'http:' || protocol === 'https:';
      }, 'Meeting URL must use HTTP or HTTPS')
      .transform((value) => value || null),
    z.null(),
  ])
  .optional();
const nullableLocation = z
  .union([
    z
      .string()
      .trim()
      .max(240)
      .transform((value) => value || null),
    z.null(),
  ])
  .optional();

export const interviewOrganizationParamsSchema = z.object({ organizationId });
export const applicationInterviewParamsSchema = z.object({
  organizationId,
  applicationId: uuid,
});
export const interviewParamsSchema = z.object({
  organizationId,
  interviewId: uuid,
});

export const scheduleInterviewBodySchema = z
  .object({
    title: z.string().trim().min(1).max(160),
    format: z.enum(['VIDEO', 'PHONE', 'ONSITE']),
    scheduledStartAt: dateTime,
    durationMinutes: z.number().int().min(1).max(MAX_DURATION_MINUTES),
    timeZone,
    participantUserIds,
    meetingUrl: nullableUrl,
    location: nullableLocation,
  })
  .strict();

export const updateInterviewBodySchema = z
  .object({
    title: z.string().trim().min(1).max(160).optional(),
    format: z.enum(['VIDEO', 'PHONE', 'ONSITE']).optional(),
    participantUserIds: participantUserIds.optional(),
    meetingUrl: nullableUrl,
    location: nullableLocation,
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one editable field is required',
  });

export const rescheduleInterviewBodySchema = z
  .object({
    scheduledStartAt: dateTime,
    durationMinutes: z.number().int().min(1).max(MAX_DURATION_MINUTES),
    timeZone,
  })
  .strict();

export const cancelInterviewBodySchema = z
  .object({
    cancellationReason: z
      .string()
      .trim()
      .max(500)
      .transform((value) => value || null)
      .optional(),
  })
  .strict();

export const listInterviewsQuerySchema = z
  .object({
    from: dateTime,
    to: dateTime,
    mine: z
      .union([z.boolean(), z.enum(['true', 'false'])])
      .default(false)
      .transform((value) => value === true || value === 'true'),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.to <= value.from) {
      context.addIssue({
        code: 'custom',
        path: ['to'],
        message: 'The calendar range must end after it starts',
      });
    }
    if (value.to.getTime() - value.from.getTime() > MAX_CALENDAR_RANGE_MS) {
      context.addIssue({
        code: 'custom',
        path: ['to'],
        message: 'The calendar range cannot exceed 31 days',
      });
    }
  });

export { MAX_DURATION_MINUTES };
