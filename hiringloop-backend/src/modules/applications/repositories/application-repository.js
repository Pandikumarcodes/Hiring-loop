const publicVersionInclude = {
  questions: {
    orderBy: { sortOrder: 'asc' },
    include: { options: { orderBy: { sortOrder: 'asc' } } },
  },
};

const applicationConfirmationSelect = {
  id: true,
  submittedAt: true,
  job: { select: { id: true, title: true } },
  requestFingerprint: true,
};

export class UploadUnavailableDuringCommitError extends Error {}

export function createApplicationRepository(prisma) {
  return {
    findActivePublishedForm({ organizationId, jobId }) {
      return prisma.applicationForm.findFirst({
        where: {
          organizationId,
          jobId,
          activeVersion: { status: 'PUBLISHED' },
        },
        select: { id: true, activeVersion: { include: publicVersionInclude } },
      });
    },

    findPublishedFormVersion({ organizationId, jobId, formVersionId }) {
      return prisma.applicationFormVersion.findFirst({
        where: {
          id: formVersionId,
          organizationId,
          status: 'PUBLISHED',
          applicationForm: { organizationId, jobId },
        },
        include: publicVersionInclude,
      });
    },

    findInitialStage({ organizationId, jobId }) {
      return prisma.pipelineStage.findFirst({
        where: {
          kind: 'ENTRY',
          position: 1,
          pipeline: { jobId, job: { organizationId, status: 'OPEN' } },
        },
        select: { id: true, pipelineId: true },
      });
    },

    createUploadReservation(data) {
      return prisma.applicationUpload.create({ data });
    },

    findUpload({ organizationId, jobId, uploadId }) {
      return prisma.applicationUpload.findFirst({
        where: { id: uploadId, organizationId, jobId },
      });
    },

    findIdempotentApplication({ organizationId, jobId, idempotencyKey }) {
      return prisma.application.findFirst({
        where: { organizationId, jobId, idempotencyKey },
        select: applicationConfirmationSelect,
      });
    },

    findDuplicateApplication({ organizationId, jobId, candidateId }) {
      return prisma.application.findFirst({
        where: { organizationId, jobId, candidateId },
        select: { id: true },
      });
    },

    async createAtomicSubmission({
      organizationId,
      jobId,
      candidate,
      formVersionId,
      initialStageId,
      answers,
      upload,
      idempotencyKey,
      requestFingerprint,
      id,
      now,
    }) {
      return prisma.$transaction(async (transaction) => {
        const persistedCandidate = await transaction.candidate.upsert({
          where: {
            organizationId_normalizedEmail: {
              organizationId,
              normalizedEmail: candidate.normalizedEmail,
            },
          },
          create: {
            id: id(),
            organizationId,
            normalizedEmail: candidate.normalizedEmail,
            email: candidate.email,
            firstName: candidate.firstName,
            lastName: candidate.lastName,
            phone: candidate.phone,
          },
          update: {
            email: candidate.email,
            firstName: candidate.firstName,
            lastName: candidate.lastName,
            phone: candidate.phone,
          },
          select: { id: true },
        });

        const application = await transaction.application.create({
          data: {
            id: id(),
            organizationId,
            jobId,
            candidateId: persistedCandidate.id,
            applicationFormVersionId: formVersionId,
            currentPipelineStageId: initialStageId,
            submittedFirstName: candidate.firstName,
            submittedLastName: candidate.lastName,
            submittedEmail: candidate.email,
            submittedPhone: candidate.phone,
            idempotencyKey,
            requestFingerprint,
            submittedAt: now,
          },
          select: applicationConfirmationSelect,
        });

        if (answers.length) {
          await transaction.applicationAnswer.createMany({
            data: answers.map((answer) => ({
              id: id(),
              organizationId,
              applicationId: application.id,
              questionId: answer.questionId,
              value: answer.value,
            })),
          });
        }

        await transaction.candidateDocument.create({
          data: {
            id: id(),
            organizationId,
            candidateId: persistedCandidate.id,
            applicationId: application.id,
            type: 'RESUME',
            objectKey: upload.objectKey,
            originalFilename: upload.originalFilename,
            mimeType: upload.mimeType,
            sizeBytes: upload.declaredSizeBytes,
          },
        });
        await transaction.applicationStageHistory.create({
          data: {
            id: id(),
            organizationId,
            applicationId: application.id,
            toStageId: initialStageId,
            event: 'APPLICATION_SUBMITTED',
            occurredAt: now,
          },
        });
        const consumed = await transaction.applicationUpload.updateMany({
          where: {
            id: upload.id,
            organizationId,
            jobId,
            status: 'PENDING',
            expiresAt: { gt: now },
          },
          data: {
            status: 'CONSUMED',
            consumedAt: now,
            consumedApplicationId: application.id,
          },
        });
        if (consumed.count !== 1) {
          throw new UploadUnavailableDuringCommitError();
        }
        return application;
      });
    },
  };
}
