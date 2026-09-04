import { z } from 'zod';

import { ORGANIZATION_ROLES } from '../../../authorization/permissions.js';

export const invitationParamsSchema = z.object({
  organizationId: z.uuid(),
});

export const invitationWithIdParamsSchema = z.object({
  organizationId: z.uuid(),
  invitationId: z.uuid(),
});

export const createInvitationRequestSchema = z.object({
  email: z.string().trim().email().max(320),
  role: z.enum(Object.values(ORGANIZATION_ROLES)),
});

export const acceptInvitationRequestSchema = z.object({
  token: z.string().min(1).max(512),
});
