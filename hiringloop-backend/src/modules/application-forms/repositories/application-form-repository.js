const include = {
  activeVersion: {
    include: {
      questions: {
        orderBy: { sortOrder: 'asc' },
        include: { options: { orderBy: { sortOrder: 'asc' } } },
      },
    },
  },
  versions: {
    where: { status: 'DRAFT' },
    include: {
      questions: {
        orderBy: { sortOrder: 'asc' },
        include: { options: { orderBy: { sortOrder: 'asc' } } },
      },
    },
  },
};
const where = ({ organizationId, jobId }) => ({ organizationId, jobId });
export function createApplicationFormRepository(prisma) {
  const find = (input, client = prisma) =>
    client.applicationForm.findFirst({ where: where(input), include });
  return {
    find,
    transaction: (work) => prisma.$transaction(work),
    async createDraft(input) {
      return prisma.$transaction(async (tx) => {
        const form = await find(input, tx);
        if (!form) return null;
        const existing = form.versions[0];
        if (existing) return find(input, tx);
        const source = form.activeVersion;
        if (
          !source ||
          source.applicationFormId !== form.id ||
          source.organizationId !== form.organizationId ||
          source.status !== 'PUBLISHED'
        )
          return { invalid: true };
        await tx.applicationFormVersion.create({
          data: {
            id: input.id(),
            organizationId: input.organizationId,
            applicationFormId: form.id,
            versionNumber:
              Math.max(
                source.versionNumber,
                ...(
                  await tx.applicationFormVersion.findMany({
                    where: { applicationFormId: form.id },
                    select: { versionNumber: true },
                  })
                ).map((v) => v.versionNumber),
              ) + 1,
            status: 'DRAFT',
            revision: 1,
            questions: {
              create: source.questions.map((q) => ({
                id: input.id(),
                organizationId: input.organizationId,
                questionKey: q.questionKey,
                type: q.type,
                label: q.label,
                description: q.description,
                placeholder: q.placeholder,
                required: q.required,
                sortOrder: q.sortOrder,
                options: {
                  create: q.options.map((o) => ({
                    id: input.id(),
                    organizationId: input.organizationId,
                    label: o.label,
                    value: o.value,
                    sortOrder: o.sortOrder,
                  })),
                },
              })),
            },
          },
        });
        return find(input, tx);
      });
    },
    async mutate(input, apply) {
      return prisma.$transaction(async (tx) => {
        const form = await find(input, tx);
        if (!form) return { outcome: 'not_found' };
        const draft = form.versions[0];
        if (!draft) return { outcome: 'no_draft' };
        if (draft.revision !== input.expectedRevision)
          return { outcome: 'conflict' };
        const locked = await tx.applicationFormVersion.updateMany({
          where: {
            id: draft.id,
            applicationFormId: form.id,
            organizationId: input.organizationId,
            status: 'DRAFT',
            revision: input.expectedRevision,
          },
          data: { revision: { increment: 1 } },
        });
        if (locked.count !== 1) return { outcome: 'conflict' };
        await apply(tx, form, draft);
        return { outcome: 'updated', form: await find(input, tx) };
      });
    },
  };
}
