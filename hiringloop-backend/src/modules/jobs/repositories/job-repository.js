const LIST_SELECT = {
  id: true,
  title: true,
  department: true,
  employmentType: true,
  workplaceType: true,
  location: true,
  openings: true,
  status: true,
  openedAt: true,
  closedAt: true,
  archivedAt: true,
  version: true,
  createdAt: true,
  updatedAt: true,
};
const DETAIL_SELECT = { ...LIST_SELECT, description: true };

export function createJobRepository(prisma) {
  const findByIdForOrganization = ({ organizationId, jobId }) =>
    prisma.job.findFirst({
      where: { id: jobId, organizationId },
      select: DETAIL_SELECT,
    });

  async function mutate({
    organizationId,
    jobId,
    expectedVersion,
    status,
    data,
  }) {
    return prisma.$transaction(async (transaction) => {
      const updated = await transaction.job.updateManyAndReturn({
        where: {
          id: jobId,
          organizationId,
          version: expectedVersion,
          ...(status ? { status } : {}),
        },
        data: { ...data, version: { increment: 1 } },
        select: DETAIL_SELECT,
      });
      if (updated.length === 1) return { outcome: 'updated', job: updated[0] };
      const current = await transaction.job.findFirst({
        where: { id: jobId, organizationId },
        select: DETAIL_SELECT,
      });
      return { outcome: 'not_updated', current };
    });
  }

  return {
    async create({ organizationId, id, data }) {
      return prisma.job.create({
        data: { id, organizationId, ...data },
        select: DETAIL_SELECT,
      });
    },
    findByIdForOrganization,
    async list({
      organizationId,
      page,
      limit,
      search,
      status,
      employmentType,
      workplaceType,
      sortBy,
      sortOrder,
    }) {
      const where = {
        organizationId,
        ...(search
          ? {
              OR: ['title', 'department', 'location'].map((field) => ({
                [field]: { contains: search, mode: 'insensitive' },
              })),
            }
          : {}),
        ...(status ? { status } : {}),
        ...(employmentType ? { employmentType } : {}),
        ...(workplaceType ? { workplaceType } : {}),
      };
      const [jobs, totalItems] = await prisma.$transaction([
        prisma.job.findMany({
          where,
          select: LIST_SELECT,
          orderBy: { [sortBy]: sortOrder },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.job.count({ where }),
      ]);
      return { jobs, totalItems };
    },
    mutate,
  };
}
