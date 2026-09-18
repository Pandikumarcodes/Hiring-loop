export function createTalentPoolRepository(prisma, auditRepository) {
  const one = ({ organizationId, talentPoolId }) =>
    prisma.talentPool.findFirst({
      where: { id: talentPoolId, organizationId },
      include: { _count: { select: { members: true } } },
    });
  return {
    find: one,
    list: async ({ organizationId, page, pageSize, search }) => {
      const where = {
        organizationId,
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      };
      const [pools, totalItems] = await prisma.$transaction([
        prisma.talentPool.findMany({
          where,
          orderBy: [{ name: 'asc' }, { id: 'asc' }],
          skip: (page - 1) * pageSize,
          take: pageSize,
          include: { _count: { select: { members: true } } },
        }),
        prisma.talentPool.count({ where }),
      ]);
      return { pools, totalItems };
    },
    create: ({ id, organizationId, actorUserId, requestId, data }) =>
      prisma.$transaction(async (db) => {
        const pool = await db.talentPool.create({
          data: {
            id,
            organizationId,
            createdByUserId: actorUserId,
            name: data.name,
            description: data.description ?? null,
          },
          include: { _count: { select: { members: true } } },
        });
        await auditRepository?.create(
          {
            organizationId,
            actorUserId,
            requestId,
            action: 'TALENT_POOL_CREATED',
            resourceType: 'TALENT_POOL',
            resourceId: pool.id,
            after: { name: pool.name },
          },
          db,
        );
        return pool;
      }),
    update: ({ organizationId, talentPoolId, actorUserId, requestId, data }) =>
      prisma.$transaction(async (db) => {
        const before = await db.talentPool.findFirst({
          where: { id: talentPoolId, organizationId },
          select: { name: true },
        });
        const changed = await db.talentPool.updateMany({
          where: {
            id: talentPoolId,
            organizationId,
            revision: data.expectedRevision,
          },
          data: {
            name: data.name,
            description: data.description ?? null,
            revision: { increment: 1 },
          },
        });
        if (changed.count)
          await auditRepository?.create(
            {
              organizationId,
              actorUserId,
              requestId,
              action: 'TALENT_POOL_UPDATED',
              resourceType: 'TALENT_POOL',
              resourceId: talentPoolId,
              before: { name: before.name },
              after: { name: data.name },
            },
            db,
          );
        return changed;
      }),
    listMembers: ({ organizationId, talentPoolId, page, pageSize, search }) =>
      prisma.talentPoolMember.findMany({
        where: {
          organizationId,
          talentPoolId,
          candidate: search
            ? {
                OR: ['firstName', 'lastName', 'email'].map((field) => ({
                  [field]: { contains: search, mode: 'insensitive' },
                })),
              }
            : undefined,
        },
        include: {
          candidate: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    candidate: ({ organizationId, candidateId }) =>
      prisma.candidate.findFirst({
        where: { id: candidateId, organizationId },
      }),
    sourceApplication: ({ organizationId, sourceApplicationId, candidateId }) =>
      prisma.application.findFirst({
        where: { id: sourceApplicationId, organizationId, candidateId },
      }),
    addMember: ({
      id,
      organizationId,
      talentPoolId,
      actorUserId,
      requestId,
      data,
    }) =>
      prisma.$transaction(async (db) => {
        const existing = await db.talentPoolMember.findFirst({
          where: {
            organizationId,
            talentPoolId,
            candidateId: data.candidateId,
          },
        });
        const member = await db.talentPoolMember.upsert({
          where: {
            talentPoolId_candidateId: {
              talentPoolId,
              candidateId: data.candidateId,
            },
          },
          create: {
            id,
            organizationId,
            talentPoolId,
            candidateId: data.candidateId,
            sourceApplicationId: data.sourceApplicationId ?? null,
            addedByUserId: actorUserId,
            note: data.note ?? null,
          },
          update: {},
          include: {
            candidate: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        });
        if (!existing)
          await auditRepository?.create(
            {
              organizationId,
              actorUserId,
              requestId,
              action: 'TALENT_POOL_MEMBER_ADDED',
              resourceType: 'TALENT_POOL_MEMBER',
              resourceId: member.id,
              metadata: {
                talentPoolId,
                candidateId: data.candidateId,
                hasSourceApplication: Boolean(data.sourceApplicationId),
              },
            },
            db,
          );
        return member;
      }),
    removeMember: ({
      organizationId,
      talentPoolId,
      candidateId,
      actorUserId,
      requestId,
    }) =>
      prisma.$transaction(async (db) => {
        const member = await db.talentPoolMember.findFirst({
          where: { organizationId, talentPoolId, candidateId },
        });
        const deleted = await db.talentPoolMember.deleteMany({
          where: { organizationId, talentPoolId, candidateId },
        });
        if (deleted.count)
          await auditRepository?.create(
            {
              organizationId,
              actorUserId,
              requestId,
              action: 'TALENT_POOL_MEMBER_REMOVED',
              resourceType: 'TALENT_POOL_MEMBER',
              resourceId: member.id,
              metadata: { talentPoolId, candidateId },
            },
            db,
          );
        return deleted;
      }),
  };
}
