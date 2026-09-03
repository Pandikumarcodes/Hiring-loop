import { z } from 'zod';

const optionalText = (max) => z.string().trim().max(max).optional();

export const createOrganizationRequestSchema = z.object({
  name: z.string().trim().min(1).max(200),
  website: z.string().trim().url().max(2048).optional(),
  description: optionalText(2000),
});

export const organizationIdParamsSchema = z.object({
  organizationId: z.uuid(),
});
