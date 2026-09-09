import { Prisma } from '@prisma/client';

const applicationSummaryInclude = {
  job: { select: { id: true, title: true } },
  currentStage: { select: { id: true, name: true } },
};

export function createCandidateManagementRepository(prisma) {
  return {
    async list({
      organizationId,
      search,
      jobId,
      stageId,
      sort,
      page,
      pageSize,
    }) {
      const conditions = [Prisma.sql`c."organizationId" = ${organizationId}`];
      if (search) {
        const pattern = `%${search}%`;
        conditions.push(
          Prisma.sql`(c."firstName" ILIKE ${pattern} OR c."lastName" ILIKE ${pattern} OR c."email" ILIKE ${pattern})`,
        );
      }
      const applicationConditions = [
        Prisma.sql`a."organizationId" = c."organizationId"`,
        Prisma.sql`a."candidateId" = c.id`,
      ];
      if (jobId) applicationConditions.push(Prisma.sql`a."jobId" = ${jobId}`);
      if (stageId)
        applicationConditions.push(
          Prisma.sql`a."currentPipelineStageId" = ${stageId}`,
        );
      const orderBy = {
        newestApplication: Prisma.sql`latest."submittedAt" DESC, latest.id DESC`,
        oldestApplication: Prisma.sql`latest."submittedAt" ASC, latest.id ASC`,
        nameAsc: Prisma.sql`c."firstName" ASC, c."lastName" ASC, c.id ASC`,
        nameDesc: Prisma.sql`c."firstName" DESC, c."lastName" DESC, c.id DESC`,
      }[sort];
      const rows = await prisma.$queryRaw(Prisma.sql`
        SELECT c.id AS "candidateId", concat_ws(' ', c."firstName", c."lastName") AS name,
          c.email, latest.id AS "applicationId", latest."jobId" AS "jobId",
          j.title AS "jobTitle", latest."currentPipelineStageId" AS "stageId",
          s.name AS "stageName", latest."submittedAt" AS "submittedAt",
          (SELECT count(*)::int FROM "Application" count_app
             WHERE count_app."organizationId" = c."organizationId" AND count_app."candidateId" = c.id) AS "applicationCount",
          count(*) OVER()::int AS "totalItems"
        FROM "Candidate" c
        JOIN LATERAL (
          SELECT a.id, a."jobId", a."currentPipelineStageId", a."submittedAt"
          FROM "Application" a
          WHERE ${Prisma.join(applicationConditions, ' AND ')}
          ORDER BY a."submittedAt" ${sort === 'oldestApplication' ? Prisma.sql`ASC` : Prisma.sql`DESC`}, a.id ${sort === 'oldestApplication' ? Prisma.sql`ASC` : Prisma.sql`DESC`}
          LIMIT 1
        ) latest ON TRUE
        JOIN "Job" j ON j.id = latest."jobId" AND j."organizationId" = c."organizationId"
        JOIN "PipelineStage" s ON s.id = latest."currentPipelineStageId"
        WHERE ${Prisma.join(conditions, ' AND ')}
        ORDER BY ${orderBy}
        OFFSET ${(page - 1) * pageSize} LIMIT ${pageSize}
      `);
      return { candidates: rows, totalItems: rows[0]?.totalItems ?? 0 };
    },

    findCandidate({ organizationId, candidateId }) {
      return prisma.candidate.findFirst({
        where: { id: candidateId, organizationId },
        include: {
          applications: {
            orderBy: [{ submittedAt: 'desc' }, { id: 'desc' }],
            include: applicationSummaryInclude,
          },
        },
      });
    },

    findApplication({ organizationId, applicationId }) {
      return prisma.application.findFirst({
        where: { id: applicationId, organizationId },
        include: {
          candidate: true,
          job: { select: { id: true, title: true } },
          currentStage: { select: { id: true, name: true } },
          answers: {
            include: {
              question: {
                include: { options: { orderBy: { sortOrder: 'asc' } } },
              },
            },
          },
          documents: { orderBy: { createdAt: 'asc' } },
          stageHistory: {
            orderBy: [{ occurredAt: 'asc' }, { id: 'asc' }],
            include: {
              fromStage: { select: { id: true, name: true } },
              toStage: { select: { id: true, name: true } },
            },
          },
          outcomeEvents: {
            orderBy: [{ occurredAt: 'asc' }, { id: 'asc' }],
          },
        },
      });
    },

    findDocument({ organizationId, documentId }) {
      return prisma.candidateDocument.findFirst({
        where: { id: documentId, organizationId },
        select: {
          id: true,
          objectKey: true,
          originalFilename: true,
          mimeType: true,
        },
      });
    },
  };
}
