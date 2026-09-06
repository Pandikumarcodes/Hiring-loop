const PIPELINE_SELECT = {
  id: true,
  jobId: true,
  version: true,
  createdAt: true,
  updatedAt: true,
  stages: {
    select: {
      id: true,
      name: true,
      normalizedName: true,
      kind: true,
      position: true,
    },
    orderBy: { position: 'asc' },
  },
};

const scopedWhere = ({ organizationId, jobId }) => ({
  jobId,
  job: { organizationId },
});

export function createPipelineRepository(prisma) {
  const findForJob = ({ organizationId, jobId }) =>
    prisma.pipeline.findFirst({
      where: scopedWhere({ organizationId, jobId }),
      select: PIPELINE_SELECT,
    });

  async function mutate({ organizationId, jobId, expectedVersion, apply }) {
    return prisma.$transaction(async (transaction) => {
      const current = await transaction.pipeline.findFirst({
        where: scopedWhere({ organizationId, jobId }),
        select: { ...PIPELINE_SELECT, job: { select: { status: true } } },
      });
      if (!current) return { outcome: 'not_found' };
      if (!['DRAFT', 'OPEN'].includes(current.job.status))
        return { outcome: 'lifecycle', status: current.job.status };
      if (current.version !== expectedVersion) return { outcome: 'conflict' };

      const touched = await transaction.pipeline.updateMany({
        where: {
          ...scopedWhere({ organizationId, jobId }),
          version: expectedVersion,
        },
        data: { version: { increment: 1 } },
      });
      if (touched.count !== 1) return { outcome: 'conflict' };

      await apply(transaction, current);
      const pipeline = await transaction.pipeline.findFirst({
        where: scopedWhere({ organizationId, jobId }),
        select: PIPELINE_SELECT,
      });
      return { outcome: 'updated', pipeline };
    });
  }

  return {
    findForJob,
    mutate,
  };
}
