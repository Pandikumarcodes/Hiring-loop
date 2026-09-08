const versionInclude = { criteria: { orderBy: { position: 'asc' } } };
const templateInclude = {
  activeVersion: { include: versionInclude },
  versions: { where: { status: 'DRAFT' }, include: versionInclude },
};
const scorecardInclude = {
  participant: { include: { user: { select: { id: true, email: true } } } },
  templateVersion: { include: versionInclude },
  responses: { orderBy: { criterionId: 'asc' } },
};
export function createScorecardRepository(prisma) {
  const template = (input, db = prisma) =>
    db.scorecardTemplate.findFirst({
      where: { organizationId: input.organizationId, jobId: input.jobId },
      include: templateInclude,
    });
  return {
    findTemplate: template,
    transaction: (work) => prisma.$transaction(work),
    findInterview({ organizationId, interviewId }, db = prisma) {
      return db.interview.findFirst({
        where: { id: interviewId, organizationId },
        select: {
          id: true,
          applicationId: true,
          application: { select: { jobId: true } },
          participants: { select: { id: true, userId: true } },
        },
      });
    },
    findMy({ organizationId, interviewId, userId }, db = prisma) {
      return db.interview.findFirst({
        where: {
          id: interviewId,
          organizationId,
          participants: { some: { userId } },
        },
        select: {
          id: true,
          applicationId: true,
          application: { select: { jobId: true } },
          participants: {
            where: { userId },
            select: {
              id: true,
              userId: true,
              scorecard: { include: scorecardInclude },
            },
          },
        },
      });
    },
    async createDraft({ organizationId, jobId, actorUserId, id }) {
      return prisma.$transaction(async (tx) => {
        let t = await template({ organizationId, jobId }, tx);
        if (!t) {
          const templateId = id();
          const versionId = id();
          await tx.scorecardTemplate.create({
            data: {
              id: templateId,
              organizationId,
              jobId,
              activeVersionId: null,
              versions: {
                create: {
                  id: versionId,
                  organizationId,
                  versionNumber: 1,
                  status: 'DRAFT',
                  title: 'Interview scorecard',
                  createdByUserId: actorUserId,
                },
              },
            },
          });
        } else if (!t.versions.length) {
          const source = t.activeVersion;
          if (!source) return null;
          await tx.scorecardTemplateVersion.create({
            data: {
              id: id(),
              organizationId,
              templateId: t.id,
              versionNumber: source.versionNumber + 1,
              status: 'DRAFT',
              title: source.title,
              instructions: source.instructions,
              createdByUserId: actorUserId,
              criteria: {
                create: source.criteria.map((c) => ({
                  id: id(),
                  organizationId,
                  label: c.label,
                  description: c.description,
                  type: c.type,
                  required: c.required,
                  position: c.position,
                })),
              },
            },
          });
        }
        return template({ organizationId, jobId }, tx);
      });
    },
    async mutateTemplate(input, apply) {
      return prisma.$transaction(async (tx) => {
        const t = await template(input, tx);
        const d = t?.versions[0];
        if (!t) return { outcome: 'not_found' };
        if (!d) return { outcome: 'no_draft' };
        const lock = await tx.scorecardTemplateVersion.updateMany({
          where: {
            id: d.id,
            organizationId: input.organizationId,
            status: 'DRAFT',
            revision: input.expectedRevision,
          },
          data: { revision: { increment: 1 } },
        });
        if (lock.count !== 1) return { outcome: 'conflict' };
        await apply(tx, t, d);
        return { outcome: 'updated', template: await template(input, tx) };
      });
    },
    findScorecards({ organizationId, interviewId }) {
      return prisma.scorecard.findMany({
        where: { organizationId, interviewId },
        include: scorecardInclude,
        orderBy: { createdAt: 'asc' },
      });
    },
    findSubmitted({ organizationId, interviewId, scorecardId }) {
      return prisma.scorecard.findFirst({
        where: {
          id: scorecardId,
          organizationId,
          interviewId,
          status: 'SUBMITTED',
        },
        include: scorecardInclude,
      });
    },
    async saveMy(input, client) {
      const work = async (tx) => {
        const mine = await this.findMy(input, tx);
        const participant = mine?.participants[0];
        if (!mine || !participant) return { outcome: 'not_found' };
        let s = participant.scorecard;
        if (!s) {
          if (input.expectedRevision !== undefined)
            return { outcome: 'conflict' };
          const t = await template(
            {
              organizationId: input.organizationId,
              jobId: mine.application.jobId,
            },
            tx,
          );
          if (!t?.activeVersion) return { outcome: 'no_template' };
          try {
            s = await tx.scorecard.create({
              data: {
                id: input.id(),
                organizationId: input.organizationId,
                interviewId: mine.id,
                interviewParticipantId: participant.id,
                templateVersionId: t.activeVersion.id,
                overallRecommendation: input.overallRecommendation ?? null,
                overallComment: input.overallComment ?? null,
              },
              include: scorecardInclude,
            });
          } catch {
            return { outcome: 'conflict' };
          }
        } else {
          if (s.status !== 'DRAFT') return { outcome: 'submitted' };
          if (s.revision !== input.expectedRevision)
            return { outcome: 'conflict' };
          const lock = await tx.scorecard.updateMany({
            where: {
              id: s.id,
              organizationId: input.organizationId,
              status: 'DRAFT',
              revision: input.expectedRevision,
            },
            data: {
              overallRecommendation: input.overallRecommendation ?? null,
              overallComment: input.overallComment ?? null,
              revision: { increment: 1 },
            },
          });
          if (lock.count !== 1) return { outcome: 'conflict' };
          s = await tx.scorecard.findUnique({
            where: { id: s.id },
            include: scorecardInclude,
          });
        }
        const criteria = new Map(
          s.templateVersion.criteria.map((c) => [c.id, c]),
        );
        if (input.responses.some((r) => !criteria.has(r.criterionId)))
          return { outcome: 'invalid_response' };
        await tx.scorecardResponse.deleteMany({
          where: {
            scorecardId: s.id,
            criterionId: { notIn: input.responses.map((r) => r.criterionId) },
          },
        });
        for (const r of input.responses) {
          const c = criteria.get(r.criterionId);
          if (
            (c.type === 'RATING' &&
              (r.ratingValue == null || r.textValue != null)) ||
            (c.type === 'TEXT' &&
              (r.ratingValue != null || r.textValue == null))
          )
            return { outcome: 'invalid_response' };
          await tx.scorecardResponse.upsert({
            where: {
              scorecardId_criterionId: {
                scorecardId: s.id,
                criterionId: r.criterionId,
              },
            },
            create: {
              id: input.id(),
              organizationId: input.organizationId,
              scorecardId: s.id,
              criterionId: r.criterionId,
              ratingValue: r.ratingValue ?? null,
              textValue: r.textValue ?? null,
              comment: r.comment ?? null,
            },
            update: {
              ratingValue: r.ratingValue ?? null,
              textValue: r.textValue ?? null,
              comment: r.comment ?? null,
            },
          });
        }
        return {
          outcome: 'saved',
          scorecard: await tx.scorecard.findUnique({
            where: { id: s.id },
            include: scorecardInclude,
          }),
          interview: mine,
          participant,
        };
      };
      return client ? work(client) : prisma.$transaction(work);
    },
    async submitMy(input) {
      return prisma.$transaction(async (tx) => {
        const saved = await this.saveMy(input, tx);
        if (saved.outcome !== 'saved') return saved;
        const s = saved.scorecard;
        const responses = new Map(s.responses.map((r) => [r.criterionId, r]));
        const missing = s.templateVersion.criteria.some(
          (c) => c.required && !responses.has(c.id),
        );
        if (missing || !s.overallRecommendation)
          return { outcome: 'incomplete' };
        const lock = await tx.scorecard.updateMany({
          where: {
            id: s.id,
            organizationId: input.organizationId,
            status: 'DRAFT',
            revision: s.revision,
          },
          data: {
            status: 'SUBMITTED',
            submittedAt: input.clock(),
            revision: { increment: 1 },
          },
        });
        if (lock.count !== 1) return { outcome: 'conflict' };
        return {
          outcome: 'submitted',
          scorecard: await tx.scorecard.findUnique({
            where: { id: s.id },
            include: scorecardInclude,
          }),
          interview: saved.interview,
          participant: saved.participant,
        };
      });
    },
    findApplication({ organizationId, applicationId }) {
      return prisma.application.findFirst({
        where: { id: applicationId, organizationId },
        select: { id: true },
      });
    },
    applicationScorecards({ organizationId, applicationId }) {
      return prisma.interview.findMany({
        where: { organizationId, applicationId },
        orderBy: { scheduledStartAt: 'asc' },
        select: {
          id: true,
          title: true,
          scheduledStartAt: true,
          participants: {
            select: {
              id: true,
              user: { select: { id: true, email: true } },
              scorecard: {
                where: { status: 'SUBMITTED' },
                include: scorecardInclude,
              },
            },
          },
        },
      });
    },
    notes({ organizationId, applicationId }) {
      return prisma.note.findMany({
        where: { organizationId, applicationId },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        include: { author: { select: { id: true, email: true } } },
      });
    },
    createNote(input) {
      return prisma.note.create({
        data: {
          id: input.id(),
          organizationId: input.organizationId,
          applicationId: input.applicationId,
          authorUserId: input.actorUserId,
          body: input.body,
        },
        include: { author: { select: { id: true, email: true } } },
      });
    },
    updateNote(input) {
      return prisma.note.updateMany({
        where: {
          id: input.noteId,
          organizationId: input.organizationId,
          applicationId: input.applicationId,
          authorUserId: input.authorOnly ? input.actorUserId : undefined,
          revision: input.expectedRevision,
        },
        data: { body: input.body, revision: { increment: 1 } },
      });
    },
    deleteNote(input) {
      return prisma.note.deleteMany({
        where: {
          id: input.noteId,
          organizationId: input.organizationId,
          applicationId: input.applicationId,
          authorUserId: input.authorOnly ? input.actorUserId : undefined,
        },
      });
    },
  };
}
