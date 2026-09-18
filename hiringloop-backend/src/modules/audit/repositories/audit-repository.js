import { generateEntityId } from '../../../utils/ids.js';

const select = {
  id: true,
  actorType: true,
  action: true,
  resourceType: true,
  resourceId: true,
  before: true,
  after: true,
  metadata: true,
  occurredAt: true,
  actor: { select: { id: true, email: true } },
};
export function createAuditRepository(prisma) {
  const create = async (input, db = prisma) =>
    db.auditEvent.create({
      data: {
        id: generateEntityId(),
        organizationId: input.organizationId,
        actorUserId: input.actorUserId ?? null,
        actorType: input.actorUserId ? 'USER' : 'SYSTEM',
        action: input.action,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        before: input.before ?? undefined,
        after: input.after ?? undefined,
        metadata: input.metadata ?? undefined,
        requestId: input.requestId ?? null,
        occurredAt: input.occurredAt ?? new Date(),
      },
    });
  return {
    create,
    async list({
      organizationId,
      page,
      pageSize,
      from,
      to,
      actorUserId,
      action,
      resourceType,
      resourceId,
    }) {
      const where = {
        organizationId,
        ...(from || to
          ? {
              occurredAt: {
                ...(from ? { gte: from } : {}),
                ...(to ? { lt: to } : {}),
              },
            }
          : {}),
        ...(actorUserId ? { actorUserId } : {}),
        ...(action ? { action } : {}),
        ...(resourceType ? { resourceType } : {}),
        ...(resourceId ? { resourceId } : {}),
      };
      const [rows, totalItems] = await prisma.$transaction([
        prisma.auditEvent.findMany({
          where,
          orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
          skip: (page - 1) * pageSize,
          take: pageSize,
          select,
        }),
        prisma.auditEvent.count({ where }),
      ]);
      return { rows, totalItems };
    },
    find({ organizationId, auditEventId }) {
      return prisma.auditEvent.findFirst({
        where: { id: auditEventId, organizationId },
        select,
      });
    },
  };
}
