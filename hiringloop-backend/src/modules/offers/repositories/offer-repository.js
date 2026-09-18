const OFFER_INCLUDE = {
  currentVersion: true,
  versions: { orderBy: { versionNumber: 'desc' } },
};
const SEND_INCLUDE = {
  currentVersion: true,
  application: { include: { candidate: true } },
};
export function createOfferRepository(prisma, auditRepository) {
  const audit = (input, db) => auditRepository?.create(input, db);
  const findById = ({ organizationId, offerId }) =>
    prisma.offer.findFirst({
      where: { id: offerId, organizationId },
      include: OFFER_INCLUDE,
    });
  const findByApplication = ({ organizationId, applicationId }) =>
    prisma.offer.findFirst({
      where: { organizationId, applicationId },
      include: OFFER_INCLUDE,
    });
  return {
    findById,
    findByApplication,
    async createWithInitialVersion({
      organizationId,
      applicationId,
      actorUserId,
      offerId,
      versionId,
      terms,
      requestId,
    }) {
      return prisma.$transaction(async (db) => {
        const application = await db.application.findFirst({
          where: { id: applicationId, organizationId },
        });
        if (!application) return { outcome: 'application_missing' };
        const offer = await db.offer.create({
          data: {
            id: offerId,
            organizationId,
            applicationId,
            createdByUserId: actorUserId,
          },
        });
        await db.offerVersion.create({
          data: {
            id: versionId,
            organizationId,
            offerId,
            versionNumber: 1,
            createdByUserId: actorUserId,
            ...terms,
          },
        });
        await audit(
          {
            organizationId,
            actorUserId,
            requestId,
            action: 'OFFER_CREATED',
            resourceType: 'OFFER',
            resourceId: offerId,
            after: { status: 'DRAFT', versionNumber: 1 },
          },
          db,
        );
        return {
          outcome: 'created',
          offer: await db.offer.update({
            where: { id: offer.id },
            data: { currentVersionId: versionId },
            include: OFFER_INCLUDE,
          }),
        };
      });
    },
    updateDraftVersion: ({
      organizationId,
      offerId,
      versionId,
      expectedRevision,
      terms,
    }) =>
      prisma.offerVersion.updateMany({
        where: {
          id: versionId,
          organizationId,
          offerId,
          revision: expectedRevision,
          issuedAt: null,
        },
        data: { ...terms, revision: { increment: 1 } },
      }),
    getVersion: ({ organizationId, versionId }) =>
      prisma.offerVersion.findFirst({
        where: { id: versionId, organizationId },
      }),
    async createRevision({
      organizationId,
      offerId,
      actorUserId,
      expectedRevision,
      versionId,
      terms,
      requestId,
    }) {
      return prisma.$transaction(async (db) => {
        const offer = await db.offer.findFirst({
          where: { id: offerId, organizationId },
          include: { versions: true },
        });
        if (!offer) return { outcome: 'missing' };
        if (
          offer.revision !== expectedRevision ||
          ['ACCEPTED', 'DECLINED', 'WITHDRAWN'].includes(offer.status)
        )
          return { outcome: 'conflict' };
        const version = await db.offerVersion.create({
          data: {
            id: versionId,
            organizationId,
            offerId,
            versionNumber:
              Math.max(0, ...offer.versions.map((item) => item.versionNumber)) +
              1,
            createdByUserId: actorUserId,
            ...terms,
          },
        });
        await db.offer.update({
          where: { id: offerId },
          data: { currentVersionId: version.id, revision: { increment: 1 } },
        });
        await audit(
          {
            organizationId,
            actorUserId,
            requestId,
            action: 'OFFER_REVISED',
            resourceType: 'OFFER',
            resourceId: offerId,
            after: {
              status: offer.status,
              versionNumber: version.versionNumber,
            },
          },
          db,
        );
        return {
          outcome: 'created',
          offer: await db.offer.findFirst({
            where: { id: offerId, organizationId },
            include: OFFER_INCLUDE,
          }),
        };
      });
    },
    async prepareSend({
      organizationId,
      offerId,
      actorUserId,
      expectedRevision,
      idempotencyKey,
      payloadHash,
      communicationId,
      provider,
      now,
      requestId,
    }) {
      return prisma.$transaction(async (db) => {
        const offer = await db.offer.findFirst({
          where: { id: offerId, organizationId },
          include: SEND_INCLUDE,
        });
        if (!offer) return { outcome: 'missing' };
        const existing = await db.communication.findFirst({
          where: {
            organizationId,
            applicationId: offer.applicationId,
            createdByUserId: actorUserId,
            idempotencyKey,
          },
        });
        if (existing)
          return { outcome: 'existing', offer, communication: existing };
        if (
          offer.revision !== expectedRevision ||
          !['DRAFT', 'SENT'].includes(offer.status) ||
          !offer.currentVersion ||
          offer.currentVersion.issuedAt
        )
          return { outcome: 'invalid' };
        if (!offer.application.candidate.email)
          return { outcome: 'recipient_missing' };
        const communication = await db.communication.create({
          data: {
            id: communicationId,
            organizationId,
            applicationId: offer.applicationId,
            createdByUserId: actorUserId,
            recipientEmail: offer.application.candidate.email,
            subject: `Offer: ${offer.currentVersion.jobTitle}`,
            body: 'Your offer is available from HiringLoop.',
            provider,
            idempotencyKey,
            payloadHash,
            offerVersionId: offer.currentVersion.id,
          },
        });
        await db.offerVersion.update({
          where: { id: offer.currentVersion.id },
          data: { issuedAt: now },
        });
        await db.offer.update({
          where: { id: offer.id },
          data: { status: 'SENT', sentAt: now, revision: { increment: 1 } },
        });
        await audit(
          {
            organizationId,
            actorUserId,
            requestId,
            action: 'OFFER_SENT',
            resourceType: 'OFFER',
            resourceId: offer.id,
            before: { status: offer.status },
            after: {
              status: 'SENT',
              versionNumber: offer.currentVersion.versionNumber,
            },
          },
          db,
        );
        return { outcome: 'prepared', offer, communication };
      });
    },
    findCommunication: ({
      organizationId,
      applicationId,
      actorUserId,
      idempotencyKey,
    }) =>
      prisma.communication.findFirst({
        where: {
          organizationId,
          applicationId,
          createdByUserId: actorUserId,
          idempotencyKey,
        },
      }),
    claimFailedCommunication: ({ communicationId }) =>
      prisma.communication.updateMany({
        where: { id: communicationId, status: 'FAILED' },
        data: { status: 'PENDING', failedAt: null, failureCategory: null },
      }),
    async transition({
      organizationId,
      offerId,
      actorUserId,
      expectedRevision,
      from,
      to,
      timestampField,
      now,
      requiresIssuedVersion = false,
      requestId,
    }) {
      return prisma.$transaction(async (db) => {
        const existing = await db.offer.findFirst({
          where: { id: offerId, organizationId },
          select: {
            status: true,
            currentVersion: { select: { versionNumber: true } },
          },
        });
        const result = await db.offer.updateMany({
          where: {
            id: offerId,
            organizationId,
            revision: expectedRevision,
            status: { in: from },
            ...(requiresIssuedVersion
              ? { currentVersion: { is: { issuedAt: { not: null } } } }
              : {}),
          },
          data: {
            status: to,
            [timestampField]: now,
            [`${timestampField.slice(0, -2)}ByUserId`]: actorUserId,
            revision: { increment: 1 },
          },
        });
        if (!result.count) return null;
        const action = {
          ACCEPTED: 'OFFER_ACCEPTED',
          DECLINED: 'OFFER_DECLINED',
          WITHDRAWN: 'OFFER_WITHDRAWN',
        }[to];
        await audit(
          {
            organizationId,
            actorUserId,
            requestId,
            action,
            resourceType: 'OFFER',
            resourceId: offerId,
            before: { status: existing.status },
            after: {
              status: to,
              versionNumber: existing.currentVersion?.versionNumber ?? null,
            },
          },
          db,
        );
        return findById({ organizationId, offerId });
      });
    },
  };
}
