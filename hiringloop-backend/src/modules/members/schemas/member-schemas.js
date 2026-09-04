import { z } from 'zod';

import { ORGANIZATION_ROLES } from '../../../authorization/permissions.js';

export const memberParamsSchema = z.object({
  organizationId: z.uuid(),
});

export const memberWithIdParamsSchema = z.object({
  organizationId: z.uuid(),
  membershipId: z.uuid(),
});

export const updateMemberRoleRequestSchema = z.object({
  role: z.enum(Object.values(ORGANIZATION_ROLES)),
});
