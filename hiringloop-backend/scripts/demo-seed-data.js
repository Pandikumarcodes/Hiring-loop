import { createHash } from 'node:crypto';
import { v5 as uuidv5 } from 'uuid';
import { createDefaultPipelineData } from '../src/modules/pipelines/domain/pipeline-defaults.js';
import { createDefaultApplicationFormData } from '../src/modules/application-forms/domain/default-application-form.js';

// Reserved fixture namespace; production entities continue to use generateEntityId.
export function fixtureId(key) {
  return uuidv5(
    `hiringloop-demo-v1:${key}`,
    'e7c9f222-518b-4f7d-a9a0-0ada882bc77a',
  );
}
export const organizationId = fixtureId('organization');
export const slug = 'acme-talent-technologies-demo';

export function buildDemoData(anchor = new Date(), adminId = null) {
  const rows = [];
  const date = (days) => new Date(anchor.getTime() + days * 86400000);
  const add = (model, key, fields, tenant = true) => {
    const data = {
      id: fixtureId(key),
      ...(tenant ? { organizationId } : {}),
      ...fields,
    };
    rows.push({ model, data });
    return data;
  };
  add(
    'organization',
    'organization',
    {
      name: 'Acme Talent Technologies',
      slug,
      website: 'https://acme.example',
      description: 'Fictional development demo dataset v1.',
      createdAt: date(-60),
    },
    false,
  );
  const roles = [
    'ADMIN',
    'RECRUITER',
    'RECRUITER',
    'HIRING_MANAGER',
    'INTERVIEWER',
  ];
  const users = ['avery', 'jordan', 'morgan', 'riley', 'casey'].map(
    (name, i) => {
      const user = add(
        'user',
        `user-${i}`,
        { email: `${name}@acme-demo.example` },
        false,
      );
      add('organizationMembership', `membership-${i}`, {
        userId: user.id,
        role: roles[i],
      });
      return user;
    },
  );
  if (adminId)
    add('organizationMembership', 'existing-admin-membership', {
      userId: adminId,
      role: 'ADMIN',
    });
  const titles = [
    'Senior Backend Engineer',
    'Frontend Engineer',
    'Product Designer',
    'Data Analyst',
    'Quality Engineer',
    'Customer Success Manager',
    'Technical Recruiter',
    'Engineering Intern',
  ];
  const jobs = titles.map((title, i) => {
    const job = add('job', `job-${i}`, {
      title,
      department: i < 5 ? 'Product and Engineering' : 'Operations',
      employmentType: i === 7 ? 'INTERNSHIP' : 'FULL_TIME',
      workplaceType: i % 2 ? 'HYBRID' : 'REMOTE',
      location: 'Bengaluru',
      description: `Join our fictional team as a ${title}. Collaborate across functions, improve customer experiences, and deliver thoughtful, reliable work.`,
      openings: i < 2 ? 2 : 1,
      status: i === 7 ? 'DRAFT' : i === 6 ? 'CLOSED' : 'OPEN',
      openedAt: i === 7 ? null : date(-50),
      closedAt: i === 6 ? date(-2) : null,
      createdAt: date(-55),
    });
    const defaults = createDefaultPipelineData();
    const pipeline = add('pipeline', `pipeline-${i}`, { jobId: job.id }, false);
    const stages = defaults.stages.map((s, index) =>
      add(
        'pipelineStage',
        `stage-${i}-${index}`,
        {
          pipelineId: pipeline.id,
          name: s.name,
          normalizedName: s.normalizedName,
          kind: s.kind,
          position: s.position,
        },
        false,
      ),
    );
    const defaultsForm = createDefaultApplicationFormData(date(-50));
    const form = add('applicationForm', `form-${i}`, {
      jobId: job.id,
      activeVersionId: fixtureId(`form-version-${i}`),
    });
    const version = add('applicationFormVersion', `form-version-${i}`, {
      ...defaultsForm.version,
      id: fixtureId(`form-version-${i}`),
      applicationFormId: form.id,
    });
    const template = add('scorecardTemplate', `template-${i}`, {
      jobId: job.id,
    });
    const templateVersion = add(
      'scorecardTemplateVersion',
      `template-version-${i}`,
      {
        templateId: template.id,
        versionNumber: 1,
        status: 'DRAFT',
        title: `${title} evaluation`,
        createdByUserId: users[1].id,
      },
    );
    const criterion = add('scorecardCriterion', `criterion-${i}`, {
      templateVersionId: templateVersion.id,
      label: 'Role skills and problem solving',
      type: 'RATING',
      required: true,
      position: 1,
    });
    return { ...job, stages, version, template, templateVersion, criterion };
  });
  const firstNames = [
    'Amara',
    'Dev',
    'Elena',
    'Felix',
    'Hana',
    'Ishan',
    'Jules',
    'Kiran',
    'Lena',
    'Milo',
  ];
  const lastNames = ['Vale', 'Rowan', 'Briar'];
  const candidates = Array.from({ length: 30 }, (_, i) =>
    add('candidate', `candidate-${i}`, {
      firstName: firstNames[i % 10],
      lastName: lastNames[Math.floor(i / 10)],
      email: `candidate.${i + 1}@acme-demo.example`,
      normalizedEmail: `candidate.${i + 1}@acme-demo.example`,
      createdAt: date(-40 + i / 2),
    }),
  );
  const applications = Array.from({ length: 40 }, (_, i) => {
    const candidate = candidates[i % 30];
    const job = jobs[i < 30 ? i % 6 : (i - 30 + 1) % 6];
    const application = add('application', `application-${i}`, {
      jobId: job.id,
      candidateId: candidate.id,
      applicationFormVersionId: job.version.id,
      currentPipelineStageId: job.stages[i % 4].id,
      submittedFirstName: candidate.firstName,
      submittedLastName: candidate.lastName,
      submittedEmail: candidate.email,
      idempotencyKey: fixtureId(`submission-${i}`),
      requestFingerprint: createHash('sha256')
        .update(`demo-application-${i}`)
        .digest('hex'),
      submittedAt: date(-30 + i / 2),
      createdAt: date(-30 + i / 2),
      outcomeUpdatedAt: date(-30 + i / 2),
    });
    add('applicationStageHistory', `history-${i}`, {
      applicationId: application.id,
      toStageId: job.stages[0].id,
      event: 'APPLICATION_SUBMITTED',
      occurredAt: application.submittedAt,
    });
    return { ...application, job };
  });
  for (let i = 0; i < 12; i++) {
    const application = applications[i];
    const start = date(i < 8 ? -8 + i / 2 : i - 6);
    const interview = add('interview', `interview-${i}`, {
      applicationId: application.id,
      title: `${application.job.title} — skills discussion`,
      format: 'VIDEO',
      scheduledStartAt: start,
      scheduledEndAt: new Date(+start + 3600000),
      timeZone: 'Asia/Kolkata',
      meetingUrl: 'https://meet.example/demo',
      createdByUserId: users[1].id,
      createdAt: date(-9),
    });
    const participant = add(
      'interviewParticipant',
      `participant-${i}`,
      {
        interviewId: interview.id,
        userId: users[4].id,
      },
      false,
    );
    if (i < 8) {
      const card = add('scorecard', `scorecard-${i}`, {
        interviewId: interview.id,
        interviewParticipantId: participant.id,
        templateVersionId: application.job.templateVersion.id,
        status: 'DRAFT',
        overallRecommendation: i % 2 ? 'YES' : 'MIXED',
        overallComment:
          'Clear communication; follow up on tradeoffs and delivery experience.',
      });
      add('scorecardResponse', `response-${i}`, {
        scorecardId: card.id,
        criterionId: application.job.criterion.id,
        ratingValue: 3 + (i % 2),
        comment: 'Explained the approach with relevant examples.',
      });
    }
    add('notification', `notification-${i}`, {
      recipientUserId: users[4].id,
      type: 'INTERVIEW_SCHEDULED',
      title: 'Interview scheduled',
      message: 'A fictional skills discussion is on your calendar.',
      applicationId: application.id,
      interviewId: interview.id,
      readAt: i < 4 ? date(-1) : null,
    });
    add('auditEvent', `audit-interview-${i}`, {
      actorUserId: users[1].id,
      actorType: 'USER',
      action: 'INTERVIEW_SCHEDULED',
      resourceType: 'INTERVIEW',
      resourceId: interview.id,
      metadata: { demoSeed: 'v1' },
    });
  }
  for (let i = 0; i < 5; i++) {
    const application = applications[3 + i * 4];
    const offer = add('offer', `offer-${i}`, {
      applicationId: application.id,
      status: 'DRAFT',
      createdByUserId: users[1].id,
    });
    add('offerVersion', `offer-version-${i}`, {
      offerId: offer.id,
      versionNumber: 1,
      jobTitle: application.job.title,
      currency: 'INR',
      baseCompensationMinor: BigInt(180000000 + i * 15000000),
      workplaceType: application.job.workplaceType,
      location: 'Bengaluru',
      additionalTerms: 'Fictional demo draft; not an employment commitment.',
      createdByUserId: users[1].id,
    });
    add('auditEvent', `audit-offer-${i}`, {
      actorUserId: users[1].id,
      actorType: 'USER',
      action: 'OFFER_CREATED',
      resourceType: 'OFFER',
      resourceId: offer.id,
      metadata: { demoSeed: 'v1' },
    });
  }
  ['Engineering prospects', 'Design community', 'Future opportunities'].forEach(
    (name, i) => {
      const pool = add('talentPool', `pool-${i}`, {
        name,
        description: 'Fictional candidates for future roles.',
        createdByUserId: users[1].id,
      });
      for (let j = 0; j < 5; j++)
        add('talentPoolMember', `pool-member-${i}-${j}`, {
          talentPoolId: pool.id,
          candidateId: candidates[i * 5 + j].id,
          sourceApplicationId: applications[i * 5 + j].id,
          addedByUserId: users[1].id,
          note: 'Keep in touch for future opportunities.',
        });
    },
  );
  return rows;
}

export function countRows(rows) {
  return rows.reduce(
    (counts, { model }) => ({ ...counts, [model]: (counts[model] ?? 0) + 1 }),
    {},
  );
}
