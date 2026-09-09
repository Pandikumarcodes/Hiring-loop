import express from 'express';
import { z } from 'zod';
import { config } from '../../config/env.js';
import { getPrismaClient } from '../../database/client.js';
import { authenticateSession, requireCsrf } from '../auth/auth-module.js';
import { createTenantContextMiddleware } from '../../middleware/tenant-context.js';
import { createOrganizationRepository } from '../organizations/repositories/organization-repository.js';
import { createResolveTenantContext } from '../organizations/use-cases/resolve-tenant-context.js';
import { requirePermission } from '../../middleware/require-permission.js';
import { PERMISSIONS } from '../../authorization/permissions.js';
import { validateRequest } from '../../middleware/validate-request.js';
import { generateEntityId } from '../../utils/ids.js';
const uuid = z.string().uuid();
const org = z.object({ organizationId: uuid });
const item = z.object({ organizationId: uuid, notificationId: uuid });
const types = [
  'CANDIDATE_COMMUNICATION_FAILED',
  'INTERVIEW_SCHEDULED',
  'INTERVIEW_RESCHEDULED',
  'INTERVIEW_CANCELLED',
  'SCORECARD_SUBMITTED',
];
const preferences = z
  .object({
    preferences: z
      .array(
        z.object({ notificationType: z.enum(types), enabled: z.boolean() }),
      )
      .max(types.length),
  })
  .strict();
const pagination = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});
function notificationDto(row) {
  const { recipientUserId: _recipientUserId, ...dto } = row;
  return dto;
}
export function notificationRouter() {
  const url =
    config.environment === 'test' ? config.testDatabaseUrl : config.databaseUrl;
  const prisma = url ? getPrismaClient() : null;
  const tenant = createTenantContextMiddleware({
    resolveTenantContext: createResolveTenantContext({
      organizationRepository: createOrganizationRepository(prisma),
    }),
  });
  const r = express.Router({ mergeParams: true });
  const ctx = (p, m = false) => [
    authenticateSession,
    ...(m ? [requireCsrf] : []),
    tenant,
    requirePermission(p),
  ];
  r.get(
    '/notifications',
    ...ctx(PERMISSIONS.NOTIFICATION_VIEW_OWN),
    validateRequest({ params: org, query: pagination }),
    async (q, s, n) => {
      try {
        s.json({
          data: (
            await prisma.notification.findMany({
              where: {
                organizationId: q.validated.params.organizationId,
                recipientUserId: q.auth.userId,
              },
              orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
              skip: (q.validated.query.page - 1) * q.validated.query.pageSize,
              take: q.validated.query.pageSize,
            })
          ).map(notificationDto),
          pagination: {
            page: q.validated.query.page,
            pageSize: q.validated.query.pageSize,
          },
        });
      } catch (e) {
        n(e);
      }
    },
  );
  r.get(
    '/notifications/unread-count',
    ...ctx(PERMISSIONS.NOTIFICATION_VIEW_OWN),
    validateRequest({ params: org }),
    async (q, s, n) => {
      try {
        s.json({
          count: await prisma.notification.count({
            where: {
              organizationId: q.validated.params.organizationId,
              recipientUserId: q.auth.userId,
              readAt: null,
            },
          }),
        });
      } catch (e) {
        n(e);
      }
    },
  );
  r.patch(
    '/notifications/:notificationId/read',
    ...ctx(PERMISSIONS.NOTIFICATION_READ_OWN, true),
    validateRequest({ params: item }),
    async (q, s, n) => {
      try {
        await prisma.notification.updateMany({
          where: {
            id: q.validated.params.notificationId,
            organizationId: q.validated.params.organizationId,
            recipientUserId: q.auth.userId,
            readAt: null,
          },
          data: { readAt: new Date() },
        });
        const x = await prisma.notification.findFirst({
          where: {
            id: q.validated.params.notificationId,
            organizationId: q.validated.params.organizationId,
            recipientUserId: q.auth.userId,
          },
        });
        if (!x) return s.sendStatus(404);
        s.json({ data: notificationDto(x) });
      } catch (e) {
        n(e);
      }
    },
  );
  r.post(
    '/notifications/read-all',
    ...ctx(PERMISSIONS.NOTIFICATION_READ_OWN, true),
    validateRequest({ params: org }),
    async (q, s, n) => {
      try {
        const x = await prisma.notification.updateMany({
          where: {
            organizationId: q.validated.params.organizationId,
            recipientUserId: q.auth.userId,
            readAt: null,
          },
          data: { readAt: new Date() },
        });
        s.json({ updatedCount: x.count });
      } catch (e) {
        n(e);
      }
    },
  );
  r.get(
    '/notification-preferences',
    ...ctx(PERMISSIONS.NOTIFICATION_PREFERENCE_MANAGE_OWN),
    validateRequest({ params: org }),
    async (q, s, n) => {
      try {
        const x = await prisma.notificationPreference.findMany({
          where: {
            organizationId: q.validated.params.organizationId,
            userId: q.auth.userId,
          },
        });
        const map = new Map(x.map((v) => [v.notificationType, v.enabled]));
        s.json({
          data: types.map((notificationType) => ({
            notificationType,
            enabled: map.get(notificationType) ?? true,
          })),
        });
      } catch (e) {
        n(e);
      }
    },
  );
  r.put(
    '/notification-preferences',
    ...ctx(PERMISSIONS.NOTIFICATION_PREFERENCE_MANAGE_OWN, true),
    validateRequest({ params: org, body: preferences }),
    async (q, s, n) => {
      try {
        for (const p of q.validated.body.preferences)
          if (p.notificationType !== 'CANDIDATE_COMMUNICATION_FAILED')
            await prisma.notificationPreference.upsert({
              where: {
                organizationId_userId_notificationType: {
                  organizationId: q.validated.params.organizationId,
                  userId: q.auth.userId,
                  notificationType: p.notificationType,
                },
              },
              create: {
                id: generateEntityId(),
                organizationId: q.validated.params.organizationId,
                userId: q.auth.userId,
                ...p,
              },
              update: { enabled: p.enabled },
            });
        s.sendStatus(204);
      } catch (e) {
        n(e);
      }
    },
  );
  return r;
}
