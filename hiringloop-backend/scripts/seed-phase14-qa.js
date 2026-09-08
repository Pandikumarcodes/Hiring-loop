if (process.env.NODE_ENV === 'production') {
  throw new Error('QA seed refuses to run when NODE_ENV=production.');
}

const QA = Object.freeze({
  userEmail: 'qa-hiringloop@example.com',
  password: 'Phase14Qa!2026',
  interviewerEmail: 'qa-interviewer@example.com',
  interviewerPassword: 'Phase14Interviewer!2026',
  organizationName: 'Phase 14 QA Organization',
  organizationSlug: 'phase-14-qa-organization',
  jobTitle: 'Phase 14 Interview QA Job',
  candidateEmail: 'candidate.phase14@example.com',
  candidateFirstName: 'Phase',
  candidateLastName: 'Fourteen',
});

const { config } = await import('../src/config/env.js');
if (config.environment === 'production') {
  throw new Error('QA seed refuses to run in production.');
}

const { disconnectDatabase, getPrismaClient } =
  await import('../src/database/client.js');
const { passwordHasher } =
  await import('../src/modules/auth/password/argon2-password-hasher.js');
const { createJobRepository } =
  await import('../src/modules/jobs/repositories/job-repository.js');
const { createJobUseCases } =
  await import('../src/modules/jobs/use-cases/job-use-cases.js');
const { createCandidateManagementRepository } =
  await import('../src/modules/candidates/repositories/candidate-management-repository.js');
const { generateEntityId } = await import('../src/utils/ids.js');

const jobData = Object.freeze({
  title: QA.jobTitle,
  employmentType: 'FULL_TIME',
  workplaceType: 'REMOTE',
  description: 'Development-only QA job for Phase 14 interview scheduling.',
  openings: 1,
});

function changedJobFields(job) {
  return Object.fromEntries(
    Object.entries(jobData).filter(([key, value]) => job[key] !== value),
  );
}

async function main() {
  const prisma = getPrismaClient();
  const jobs = createJobUseCases({
    jobRepository: createJobRepository(prisma),
  });

  const passwordHash = await passwordHasher.hash(QA.password);
  const user = await prisma.user.upsert({
    where: { email: QA.userEmail },
    create: {
      id: generateEntityId(),
      email: QA.userEmail,
      emailVerifiedAt: new Date(),
      passwordCredential: {
        create: {
          id: generateEntityId(),
          passwordHash,
          passwordChangedAt: new Date(),
        },
      },
    },
    update: {
      emailVerifiedAt: new Date(),
      passwordCredential: {
        upsert: {
          create: {
            id: generateEntityId(),
            passwordHash,
            passwordChangedAt: new Date(),
          },
          update: { passwordHash, passwordChangedAt: new Date() },
        },
      },
    },
    select: { id: true, email: true },
  });

  const organization = await prisma.organization.upsert({
    where: { slug: QA.organizationSlug },
    create: {
      id: generateEntityId(),
      name: QA.organizationName,
      slug: QA.organizationSlug,
    },
    update: { name: QA.organizationName },
    select: { id: true, name: true },
  });
  await prisma.organizationMembership.upsert({
    where: {
      organizationId_userId: {
        organizationId: organization.id,
        userId: user.id,
      },
    },
    create: {
      id: generateEntityId(),
      organizationId: organization.id,
      userId: user.id,
      role: 'ADMIN',
    },
    update: { role: 'ADMIN' },
  });

  const interviewerPasswordHash = await passwordHasher.hash(
    QA.interviewerPassword,
  );
  const interviewer = await prisma.user.upsert({
    where: { email: QA.interviewerEmail },
    create: {
      id: generateEntityId(),
      email: QA.interviewerEmail,
      emailVerifiedAt: new Date(),
      passwordCredential: {
        create: {
          id: generateEntityId(),
          passwordHash: interviewerPasswordHash,
          passwordChangedAt: new Date(),
        },
      },
    },
    update: {
      emailVerifiedAt: new Date(),
      passwordCredential: {
        upsert: {
          create: {
            id: generateEntityId(),
            passwordHash: interviewerPasswordHash,
            passwordChangedAt: new Date(),
          },
          update: {
            passwordHash: interviewerPasswordHash,
            passwordChangedAt: new Date(),
          },
        },
      },
    },
    select: { id: true, email: true },
  });
  await prisma.organizationMembership.upsert({
    where: {
      organizationId_userId: {
        organizationId: organization.id,
        userId: interviewer.id,
      },
    },
    create: {
      id: generateEntityId(),
      organizationId: organization.id,
      userId: interviewer.id,
      role: 'INTERVIEWER',
    },
    update: { role: 'INTERVIEWER' },
  });

  let job = await prisma.job.findFirst({
    where: { organizationId: organization.id, title: QA.jobTitle },
  });
  if (!job) {
    const created = await jobs.create({
      organizationId: organization.id,
      data: jobData,
    });
    job = await prisma.job.findUniqueOrThrow({ where: { id: created.id } });
  }
  const updates = changedJobFields(job);
  if (Object.keys(updates).length) {
    await jobs.update({
      organizationId: organization.id,
      jobId: job.id,
      expectedVersion: job.version,
      data: updates,
    });
    job = await prisma.job.findUniqueOrThrow({ where: { id: job.id } });
  }
  if (job.status === 'DRAFT') {
    await jobs.open({
      organizationId: organization.id,
      jobId: job.id,
      expectedVersion: job.version,
    });
  } else if (job.status === 'CLOSED') {
    await jobs.reopen({
      organizationId: organization.id,
      jobId: job.id,
      expectedVersion: job.version,
    });
  } else if (job.status === 'ARCHIVED') {
    throw new Error(
      'The QA job is archived; unarchive it manually rather than creating a duplicate.',
    );
  }
  job = await prisma.job.findUniqueOrThrow({ where: { id: job.id } });

  const [form, entryStage] = await Promise.all([
    prisma.applicationForm.findUnique({
      where: { jobId: job.id },
      include: { activeVersion: { select: { id: true, status: true } } },
    }),
    prisma.pipelineStage.findFirst({
      where: { pipeline: { jobId: job.id }, kind: 'ENTRY', position: 1 },
      select: { id: true, pipelineId: true, name: true },
    }),
  ]);
  if (!form || form.activeVersion.status !== 'PUBLISHED' || !entryStage) {
    throw new Error(
      'The QA job is missing its required default pipeline or published application form.',
    );
  }

  const candidate = await prisma.candidate.upsert({
    where: {
      organizationId_normalizedEmail: {
        organizationId: organization.id,
        normalizedEmail: QA.candidateEmail,
      },
    },
    create: {
      id: generateEntityId(),
      organizationId: organization.id,
      normalizedEmail: QA.candidateEmail,
      email: QA.candidateEmail,
      firstName: QA.candidateFirstName,
      lastName: QA.candidateLastName,
    },
    update: {
      email: QA.candidateEmail,
      firstName: QA.candidateFirstName,
      lastName: QA.candidateLastName,
    },
  });
  const application = await prisma.application.upsert({
    where: {
      organizationId_jobId_candidateId: {
        organizationId: organization.id,
        jobId: job.id,
        candidateId: candidate.id,
      },
    },
    create: {
      id: generateEntityId(),
      organizationId: organization.id,
      jobId: job.id,
      candidateId: candidate.id,
      applicationFormVersionId: form.activeVersionId,
      currentPipelineStageId: entryStage.id,
      submittedFirstName: QA.candidateFirstName,
      submittedLastName: QA.candidateLastName,
      submittedEmail: QA.candidateEmail,
      idempotencyKey: generateEntityId(),
      requestFingerprint: '0'.repeat(64),
    },
    update: {
      applicationFormVersionId: form.activeVersionId,
      currentPipelineStageId: entryStage.id,
      submittedFirstName: QA.candidateFirstName,
      submittedLastName: QA.candidateLastName,
      submittedEmail: QA.candidateEmail,
    },
    select: { id: true },
  });

  const [verifiedApplication, documentCount, interviewerMembershipCount] =
    await Promise.all([
      prisma.application.findFirst({
        where: {
          id: application.id,
          organizationId: organization.id,
          jobId: job.id,
          candidateId: candidate.id,
          currentPipelineStageId: entryStage.id,
        },
        include: { currentStage: { select: { id: true, name: true } } },
      }),
      prisma.candidateDocument.count({
        where: { organizationId: organization.id, candidateId: candidate.id },
      }),
      prisma.organizationMembership.count({
        where: {
          organizationId: organization.id,
          role: 'INTERVIEWER',
        },
      }),
    ]);
  const candidatePage = await createCandidateManagementRepository(prisma).list({
    organizationId: organization.id,
    search: QA.candidateEmail,
    jobId: job.id,
    stageId: entryStage.id,
    sort: 'newestApplication',
    page: 1,
    pageSize: 25,
  });
  if (
    !verifiedApplication ||
    documentCount !== 0 ||
    interviewerMembershipCount !== 1 ||
    job.status !== 'OPEN' ||
    !candidatePage.candidates.some(
      (item) =>
        item.candidateId === candidate.id &&
        item.applicationId === application.id,
    )
  ) {
    throw new Error('QA seed verification failed.');
  }

  console.log(`QA user email: ${user.email}`);
  console.log(`QA interviewer email: ${interviewer.email}`);
  console.log(`QA interviewer password: ${QA.interviewerPassword}`);
  console.log(`Organization: ${organization.name}`);
  console.log(`Job: ${job.title}`);
  console.log(
    `Candidate: ${QA.candidateFirstName} ${QA.candidateLastName} (${QA.candidateEmail})`,
  );
  console.log(`Application ID: ${application.id}`);
  console.log(
    `Recruiter route: /app/organizations/${organization.id}/applications/${application.id}`,
  );
}

try {
  await main();
} finally {
  await disconnectDatabase();
}
