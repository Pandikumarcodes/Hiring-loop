import { z } from 'zod';

const optionalText = (max) => z.string().trim().max(max).optional();
const publicWebsite = z
  .string()
  .trim()
  .url()
  .max(2048)
  .refine(
    (value) => {
      const protocol = new URL(value).protocol;
      return protocol === 'http:' || protocol === 'https:';
    },
    { message: 'Website must use http or https.' },
  );

export const createOrganizationRequestSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    website: publicWebsite.optional(),
    description: optionalText(2000),
  })
  .strict();

export const organizationIdParamsSchema = z.object({
  organizationId: z.uuid(),
});
