import express from 'express';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { getPrismaClient } from '../../database/client.js';
import { config } from '../../config/env.js';
import {
  authenticateSession,
  requireCsrf,
  authEmailDelivery,
} from '../auth/auth-module.js';
import { createTenantContextMiddleware } from '../../middleware/tenant-context.js';
import { createOrganizationRepository } from '../organizations/repositories/organization-repository.js';
import { createResolveTenantContext } from '../organizations/use-cases/resolve-tenant-context.js';
import { requirePermission } from '../../middleware/require-permission.js';
import { PERMISSIONS } from '../../authorization/permissions.js';
import { validateRequest } from '../../middleware/validate-request.js';
import { generateEntityId } from '../../utils/ids.js';
import { ApplicationError } from '../../errors/application-error.js';
import { communicationSendRateLimiter } from '../../middleware/rate-limit.js';

const id = z.string().uuid();
const params = z.object({ organizationId: id, applicationId: id });
const orgParams = z.object({ organizationId: id });
const templateParams = z.object({ organizationId: id, templateId: id });
const sendBody = z
  .object({
    subject: z.string().trim().min(1).max(998),
    body: z.string().trim().min(1).max(100000),
    idempotencyKey: id,
  })
  .strict();
const templateBody = z
  .object({
    name: z.string().trim().min(1).max(160),
    subject: z.string().trim().min(1).max(998),
    body: z.string().trim().min(1).max(100000),
    expectedRevision: z.number().int().positive().optional(),
  })
  .strict();
const page = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});
const failure = () =>
  new ApplicationError({
    status: 502,
    code: 'EMAIL_DELIVERY_FAILED',
    message: 'Email delivery failed',
  });
const conflict = () =>
  new ApplicationError({
    status: 409,
    code: 'COMMUNICATION_IDEMPOTENCY_CONFLICT',
    message: 'Idempotency key was reused with a different communication',
  });

function dto(row) {
  return {
    id: row.id,
    recipientEmail: row.recipientEmail,
    subject: row.subject,
    body: row.body,
    status: row.status,
    provider: row.provider,
    failureCategory: row.failureCategory,
    sender: row.createdBy
      ? { id: row.createdBy.id, email: row.createdBy.email }
      : undefined,
    sentAt: row.sentAt,
    failedAt: row.failedAt,
    createdAt: row.createdAt,
  };
}
export function communicationRouter() {
  const databaseUrl =
    config.environment === 'test' ? config.testDatabaseUrl : config.databaseUrl;
  const prisma = databaseUrl ? getPrismaClient() : null;
  const orgRepo = prisma ? createOrganizationRepository(prisma) : {};
  const tenant = createTenantContextMiddleware({
    resolveTenantContext: createResolveTenantContext({
      organizationRepository: orgRepo,
    }),
  });
  const r = express.Router({ mergeParams: true });
  const ctx = (p, m = false) => [
    authenticateSession,
    ...(m ? [requireCsrf] : []),
    tenant,
    requirePermission(p),
  ];
  r.post(
    '/applications/:applicationId/communications',
    ...ctx(PERMISSIONS.COMMUNICATION_SEND, true),
    communicationSendRateLimiter,
    validateRequest({ params, body: sendBody }),
    async (req, res, next) => {
      try {
        const { organizationId, applicationId } = req.validated.params;
        const { subject, body, idempotencyKey } = req.validated.body;
        const createdByUserId = req.auth.userId;
        const app = await prisma.application.findFirst({
          where: { id: applicationId, organizationId },
          include: { candidate: true },
        });
        if (!app)
          throw new ApplicationError({
            status: 404,
            code: 'APPLICATION_NOT_FOUND',
            message: 'Application not found',
          });
        const payloadHash = createHash('sha256')
          .update(`${subject}\n${body}`)
          .digest('hex');
        const existing = await prisma.communication.findFirst({
          where: {
            organizationId,
            applicationId,
            createdByUserId,
            idempotencyKey,
          },
          include: { createdBy: { select: { id: true, email: true } } },
        });
        if (existing) {
          if (existing.payloadHash !== payloadHash) throw conflict();
          return res
            .status(200)
            .json({ data: { communication: dto(existing) } });
        }
        let c;
        try {
          c = await prisma.communication.create({
            data: {
              id: generateEntityId(),
              organizationId,
              applicationId,
              createdByUserId,
              recipientEmail: app.candidate.email,
              subject,
              body,
              provider: config.email.provider,
              payloadHash,
              idempotencyKey,
            },
            include: { createdBy: { select: { id: true, email: true } } },
          });
        } catch (error) {
          if (error?.code !== 'P2002') throw error;
          const concurrent = await prisma.communication.findFirst({
            where: {
              organizationId,
              applicationId,
              createdByUserId,
              idempotencyKey,
            },
            include: { createdBy: { select: { id: true, email: true } } },
          });
          if (!concurrent) throw error;
          if (concurrent.payloadHash !== payloadHash) throw conflict();
          return res
            .status(200)
            .json({ data: { communication: dto(concurrent) } });
        }
        try {
          const result = await authEmailDelivery.sendCandidateEmail({
            to: c.recipientEmail,
            subject,
            text: body,
          });
          const updated = await prisma.communication.update({
            where: { id: c.id },
            data: {
              status: 'SENT',
              sentAt: new Date(),
              providerMessageId: result?.providerMessageId ?? null,
            },
            include: { createdBy: { select: { id: true, email: true } } },
          });
          return res
            .status(201)
            .json({ data: { communication: dto(updated) } });
        } catch (error) {
          if (error?.category === 'ambiguous')
            return res.status(202).json({
              data: { communication: dto(c), deliveryState: 'UNCONFIRMED' },
            });
          await prisma.communication.update({
            where: { id: c.id },
            data: {
              status: 'FAILED',
              failedAt: new Date(),
              failureCategory: error?.category ?? 'provider-error',
            },
          });
          await prisma.notification
            .create({
              data: {
                id: generateEntityId(),
                organizationId,
                recipientUserId: createdByUserId,
                type: 'CANDIDATE_COMMUNICATION_FAILED',
                title: 'Candidate email failed',
                message: 'A candidate email could not be delivered.',
                applicationId,
              },
            })
            .catch((notificationError) => {
              console.error(
                'Candidate communication failure notification creation failed',
                {
                  organizationId,
                  recipientUserId: createdByUserId,
                  applicationId,
                  cause: notificationError?.message,
                },
              );
            });
          throw failure();
        }
      } catch (e) {
        next(e);
      }
    },
  );
  r.get(
    '/applications/:applicationId/communications',
    ...ctx(PERMISSIONS.COMMUNICATION_VIEW),
    validateRequest({ params, query: page }),
    async (req, res, next) => {
      try {
        const { organizationId, applicationId } = req.validated.params;
        const application = await prisma.application.findFirst({
          where: { id: applicationId, organizationId },
          select: { id: true },
        });
        if (!application)
          throw new ApplicationError({
            status: 404,
            code: 'APPLICATION_NOT_FOUND',
            message: 'Application not found',
          });
        const rows = await prisma.communication.findMany({
          where: { organizationId, applicationId },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          skip: (req.validated.query.page - 1) * req.validated.query.pageSize,
          take: req.validated.query.pageSize,
          include: { createdBy: { select: { id: true, email: true } } },
        });
        res.json({
          data: rows.map(dto),
          pagination: {
            page: req.validated.query.page,
            pageSize: req.validated.query.pageSize,
          },
        });
      } catch (e) {
        next(e);
      }
    },
  );
  r.get(
    '/communication-templates',
    ...ctx(PERMISSIONS.COMMUNICATION_TEMPLATE_VIEW),
    validateRequest({ params: orgParams, query: page }),
    async (req, res, next) => {
      try {
        const rows = await prisma.communicationTemplate.findMany({
          where: { organizationId: req.validated.params.organizationId },
          orderBy: [{ name: 'asc' }, { id: 'asc' }],
          skip: (req.validated.query.page - 1) * req.validated.query.pageSize,
          take: req.validated.query.pageSize,
        });
        res.json({
          data: rows,
          pagination: {
            page: req.validated.query.page,
            pageSize: req.validated.query.pageSize,
          },
        });
      } catch (e) {
        next(e);
      }
    },
  );
  r.post(
    '/communication-templates',
    ...ctx(PERMISSIONS.COMMUNICATION_TEMPLATE_MANAGE, true),
    validateRequest({ params: orgParams, body: templateBody }),
    async (req, res, next) => {
      try {
        const x = await prisma.communicationTemplate.create({
          data: {
            id: generateEntityId(),
            organizationId: req.validated.params.organizationId,
            createdByUserId: req.auth.userId,
            name: req.validated.body.name,
            subject: req.validated.body.subject,
            body: req.validated.body.body,
          },
        });
        res.status(201).json({ data: x });
      } catch (e) {
        if (e?.code === 'P2002') {
          return next(
            new ApplicationError({
              status: 409,
              code: 'COMMUNICATION_TEMPLATE_CONFLICT',
              message: 'A template with this name already exists',
            }),
          );
        }
        next(e);
      }
    },
  );
  r.patch(
    '/communication-templates/:templateId',
    ...ctx(PERMISSIONS.COMMUNICATION_TEMPLATE_MANAGE, true),
    validateRequest({ params: templateParams, body: templateBody }),
    async (req, res, next) => {
      try {
        const b = req.validated.body;
        const q = await prisma.communicationTemplate.updateMany({
          where: {
            id: req.validated.params.templateId,
            organizationId: req.validated.params.organizationId,
            revision: b.expectedRevision,
          },
          data: {
            name: b.name,
            subject: b.subject,
            body: b.body,
            revision: { increment: 1 },
          },
        });
        if (!q.count)
          throw new ApplicationError({
            status: 409,
            code: 'COMMUNICATION_TEMPLATE_CONFLICT',
            message: 'Template was changed or not found',
          });
        res.json({
          data: await prisma.communicationTemplate.findFirst({
            where: {
              id: req.validated.params.templateId,
              organizationId: req.validated.params.organizationId,
            },
          }),
        });
      } catch (e) {
        next(e);
      }
    },
  );
  r.delete(
    '/communication-templates/:templateId',
    ...ctx(PERMISSIONS.COMMUNICATION_TEMPLATE_MANAGE, true),
    validateRequest({ params: templateParams }),
    async (req, res, next) => {
      try {
        const q = await prisma.communicationTemplate.deleteMany({
          where: {
            id: req.validated.params.templateId,
            organizationId: req.validated.params.organizationId,
          },
        });
        if (!q.count)
          throw new ApplicationError({
            status: 404,
            code: 'COMMUNICATION_TEMPLATE_NOT_FOUND',
            message: 'Template not found',
          });
        res.status(204).end();
      } catch (e) {
        next(e);
      }
    },
  );
  return r;
}
