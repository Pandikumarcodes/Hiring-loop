export function createTalentPoolRepository(prisma) {
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
    create: ({ id, organizationId, actorUserId, data }) =>
      prisma.talentPool.create({
        data: {
          id,
          organizationId,
          createdByUserId: actorUserId,
          name: data.name,
          description: data.description ?? null,
        },
        include: { _count: { select: { members: true } } },
      }),
    update: ({ organizationId, talentPoolId, data }) =>
      prisma.talentPool.updateMany({
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
    addMember: ({ id, organizationId, talentPoolId, actorUserId, data }) =>
      prisma.talentPoolMember.upsert({
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
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      }),
    removeMember: ({ organizationId, talentPoolId, candidateId }) =>
      prisma.talentPoolMember.deleteMany({
        where: { organizationId, talentPoolId, candidateId },
      }),
  };
}
