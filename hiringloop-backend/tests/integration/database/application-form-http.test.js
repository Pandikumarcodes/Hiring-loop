import { randomBytes } from 'node:crypto';

import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

process.env.NODE_ENV = 'test';

const { default: app } = await import('../../../src/app.js');
const { config } = await import('../../../src/config/env.js');
const { disconnectDatabase, getPrismaClient } =
  await import('../../../src/database/client.js');
const { createCsrfToken } = await import('../../../src/middleware/csrf.js');
const { authSecretHasher } =
  await import('../../../src/modules/auth/secrets/auth-secret.js');
const { createJobRepository } =
  await import('../../../src/modules/jobs/repositories/job-repository.js');
const { createJobUseCases } =
  await import('../../../src/modules/jobs/use-cases/job-use-cases.js');
const { generateEntityId } = await import('../../../src/utils/ids.js');

describe('Application form builder HTTP integration', () => {
  let prisma;
  let jobs;
  const organizationId = generateEntityId();
  const otherOrganizationId = generateEntityId();
  const users = {};
  const ownedUserIds = [];
  const jobIds = [];
  const base = (jobId, organization = organizationId) =>
    `/api/v1/organizations/${organization}/jobs/${jobId}/application-form`;

  beforeAll(async () => {
    prisma = getPrismaClient();
    await prisma.$connect();
    jobs = createJobUseCases({ jobRepository: createJobRepository(prisma) });
    await prisma.organization.createMany({
      data: [
        {
          id: organizationId,
          name: 'Forms HTTP',
          slug: `forms-http-${organizationId.slice(-12)}`,
        },
        {
          id: otherOrganizationId,
          name: 'Other Forms HTTP',
          slug: `other-forms-http-${otherOrganizationId.slice(-12)}`,
        },
      ],
    });
    for (const role of [
      'ADMIN',
      'RECRUITER',
      'HIRING_MANAGER',
      'INTERVIEWER',
    ]) {
      const userId = generateEntityId();
      const sessionId = generateEntityId();
      const secret = randomBytes(32).toString('base64url');
      ownedUserIds.push(userId);
      await prisma.user.create({
        data: {
          id: userId,
          email: `${role.toLowerCase()}-${userId}@example.test`,
        },
      });
      await prisma.organizationMembership.create({
        data: { id: generateEntityId(), organizationId, userId, role },
      });
      await prisma.authSession.create({
        data: {
          id: sessionId,
          userId,
          sessionSecretHash: authSecretHasher.hash(secret),
          expiresAt: new Date('2030-01-01T00:00:00.000Z'),
        },
      });
      users[role] = {
        cookie: `${config.authSession.cookieName}=${secret}`,
        csrf: createCsrfToken({ secret: config.authCsrfSecret, sessionId }),
      };
    }
  });

  afterAll(async () => {
    await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe('SET CONSTRAINTS ALL DEFERRED');
      await tx.applicationFormQuestionOption.deleteMany({
        where: {
          organizationId: { in: [organizationId, otherOrganizationId] },
        },
      });
      await tx.applicationFormQuestion.deleteMany({
        where: {
          organizationId: { in: [organizationId, otherOrganizationId] },
        },
      });
      await tx.$executeRawUnsafe(
        `DELETE FROM "ApplicationFormVersion" WHERE "organizationId" IN ('${organizationId}', '${otherOrganizationId}')`,
      );
      await tx.$executeRawUnsafe(
        `DELETE FROM "ApplicationForm" WHERE "organizationId" IN ('${organizationId}', '${otherOrganizationId}')`,
      );
    });
    await prisma.pipelineStage.deleteMany({
      where: { pipeline: { jobId: { in: jobIds } } },
    });
    await prisma.pipeline.deleteMany({ where: { jobId: { in: jobIds } } });
    await prisma.job.deleteMany({ where: { id: { in: jobIds } } });
    await prisma.organizationMembership.deleteMany({
      where: { userId: { in: ownedUserIds } },
    });
    await prisma.user.deleteMany({ where: { id: { in: ownedUserIds } } });
    await prisma.organization.deleteMany({
      where: { id: { in: [organizationId, otherOrganizationId] } },
    });
    await disconnectDatabase();
  });

  async function job(organization = organizationId) {
    const created = await jobs.create({
      organizationId: organization,
      data: { title: 'Application form role' },
    });
    jobIds.push(created.id);
    return created;
  }
  const authed = (method, url, role = 'ADMIN') =>
    request(app)[method](url).set('Cookie', users[role].cookie);
  const mutate = (method, url, body, role = 'ADMIN') =>
    authed(method, url, role).set('X-CSRF-Token', users[role].csrf).send(body);
  const question = (label, type = 'SHORT_TEXT') => ({
    type,
    label,
    required: false,
    ...(type.includes('SELECT')
      ? {
          options: [
            { label: 'One', value: 'one' },
            { label: 'Two', value: 'two' },
          ],
        }
      : {}),
  });

  it('mounts the full route, enforces authentication/CSRF, authorizes by Phase 07 job scope, and returns a safe builder DTO', async () => {
    const created = await job();
    expect((await request(app).get(base(created.id))).status).toBe(401);
    expect((await authed('get', base(created.id), 'INTERVIEWER')).status).toBe(
      403,
    );
    for (const role of ['ADMIN', 'RECRUITER', 'HIRING_MANAGER']) {
      const response = await authed('get', base(created.id), role);
      expect(response.status).toBe(200);
      expect(response.body.data.applicationForm).toMatchObject({
        jobId: created.id,
        draft: null,
        activeVersion: { versionNumber: 1, status: 'PUBLISHED', questions: [] },
      });
      expect(response.body.data.applicationForm).not.toHaveProperty(
        'organizationId',
      );
      expect(
        response.body.data.applicationForm.activeVersion,
      ).not.toHaveProperty('applicationFormId');
    }
    expect(
      (await authed('post', `${base(created.id)}/draft`).send({})).status,
    ).toBe(403);
    expect(
      (await mutate('post', `${base(created.id)}/draft`, {}, 'HIRING_MANAGER'))
        .status,
    ).toBe(403);
  });

  it('clones a draft, validates question operations, preserves immutable history, and publishes atomically', async () => {
    const created = await job();
    const form = await prisma.applicationForm.findUnique({
      where: { jobId: created.id },
      include: { activeVersion: true },
    });
    const sourceQuestion = await prisma.applicationFormQuestion.create({
      data: {
        id: generateEntityId(),
        organizationId,
        applicationFormVersionId: form.activeVersionId,
        questionKey: 'work-location',
        type: 'SINGLE_SELECT',
        label: 'Location',
        sortOrder: 1000,
        options: {
          create: [
            {
              id: generateEntityId(),
              organizationId,
              label: 'Remote',
              value: 'remote',
              sortOrder: 1000,
            },
            {
              id: generateEntityId(),
              organizationId,
              label: 'Office',
              value: 'office',
              sortOrder: 2000,
            },
          ],
        },
      },
      include: { options: true },
    });
    const first = await mutate('post', `${base(created.id)}/draft`, {});
    expect(first.status).toBe(201);
    const draft = first.body.data.applicationForm.draft;
    expect(draft).toMatchObject({
      versionNumber: 2,
      status: 'DRAFT',
      revision: 1,
    });
    expect(draft.questions[0]).toMatchObject({
      questionKey: sourceQuestion.questionKey,
      sortOrder: 1000,
    });
    expect(draft.questions[0].id).not.toBe(sourceQuestion.id);
    expect(draft.questions[0].options[0].id).not.toBe(
      sourceQuestion.options[0].id,
    );
    expect(
      (await mutate('post', `${base(created.id)}/draft`, {})).body.data
        .applicationForm.draft.id,
    ).toBe(draft.id);

    let revision = draft.revision;
    for (const type of [
      'SHORT_TEXT',
      'LONG_TEXT',
      'NUMBER',
      'YES_NO',
      'DATE',
      'URL',
      'MULTI_SELECT',
    ]) {
      const response = await mutate(
        'post',
        `${base(created.id)}/draft/questions`,
        { ...question(type, type), expectedRevision: revision++ },
      );
      expect(response.status).toBe(201);
    }
    expect(
      (
        await mutate('post', `${base(created.id)}/draft/questions`, {
          ...question('bad'),
          options: [],
          expectedRevision: revision,
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await mutate('post', `${base(created.id)}/draft/questions`, {
          ...question('bad choice', 'SINGLE_SELECT'),
          options: [
            { label: 'One', value: 'same' },
            { label: 'Two', value: 'same' },
          ],
          expectedRevision: revision,
        })
      ).status,
    ).toBe(400);
    const current = (await authed('get', base(created.id))).body.data
      .applicationForm.draft;
    const target = current.questions.at(-1);
    const changed = await mutate(
      'patch',
      `${base(created.id)}/draft/questions/${target.id}`,
      {
        ...question('Changed', 'SHORT_TEXT'),
        required: true,
        description: 'Description',
        placeholder: 'Placeholder',
        expectedRevision: current.revision,
      },
    );
    expect(changed.status).toBe(200);
    const afterChange = changed.body.data.applicationForm.draft;
    expect(
      afterChange.questions.find((item) => item.id === target.id),
    ).toMatchObject({ type: 'SHORT_TEXT', required: true, options: [] });
    const ordered = afterChange.questions.map((item) => item.id).reverse();
    const reordered = await mutate(
      'put',
      `${base(created.id)}/draft/questions/order`,
      { questionIds: ordered, expectedRevision: afterChange.revision },
    );
    expect(reordered.status).toBe(200);
    expect(
      reordered.body.data.applicationForm.draft.questions.map(
        (item) => item.id,
      ),
    ).toEqual(ordered);
    expect(
      reordered.body.data.applicationForm.draft.questions.map(
        (item) => item.sortOrder,
      ),
    ).toEqual(ordered.map((_id, index) => (index + 1) * 1000));
    const stale = await mutate(
      'delete',
      `${base(created.id)}/draft/questions/${target.id}`,
      { expectedRevision: afterChange.revision },
    );
    expect(stale).toMatchObject({
      status: 409,
      body: { error: { code: 'FORM_VERSION_CONFLICT' } },
    });
    const published = await mutate(
      'post',
      `${base(created.id)}/draft/publish`,
      { expectedRevision: reordered.body.data.applicationForm.draft.revision },
    );
    expect(published.status).toBe(200);
    expect(published.body.data.applicationForm).toMatchObject({
      draft: null,
      activeVersion: { id: draft.id, status: 'PUBLISHED' },
    });
    const stored = await prisma.applicationForm.findUnique({
      where: { id: form.id },
      include: {
        versions: { include: { questions: { include: { options: true } } } },
      },
    });
    expect(stored.activeVersionId).toBe(draft.id);
    expect(
      stored.versions.filter((item) => item.status === 'DRAFT'),
    ).toHaveLength(0);
    expect(
      stored.versions.filter((item) => item.status === 'PUBLISHED'),
    ).toHaveLength(2);
    expect(
      stored.versions.find((item) => item.id === form.activeVersionId)
        .questions[0].label,
    ).toBe('Location');
  });

  it('rejects stale concurrent writers and duplicate draft creation without leaking database errors', async () => {
    const created = await job();
    const pair = await Promise.all([
      mutate('post', `${base(created.id)}/draft`, {}),
      mutate('post', `${base(created.id)}/draft`, {}),
    ]);
    expect(
      pair.map((response) => response.status).every((status) => status === 201),
    ).toBe(true);
    const form = await prisma.applicationForm.findUnique({
      where: { jobId: created.id },
      include: { versions: true },
    });
    expect(
      form.versions.filter((item) => item.status === 'DRAFT'),
    ).toHaveLength(1);
    const revision = form.versions.find(
      (item) => item.status === 'DRAFT',
    ).revision;
    const writes = await Promise.all([
      mutate('post', `${base(created.id)}/draft/questions`, {
        ...question('winner'),
        expectedRevision: revision,
      }),
      mutate('post', `${base(created.id)}/draft/questions`, {
        ...question('loser'),
        expectedRevision: revision,
      }),
    ]);
    expect(writes.filter((response) => response.status === 201)).toHaveLength(
      1,
    );
    expect(writes.find((response) => response.status !== 201)).toMatchObject({
      status: 409,
      body: { error: { code: 'FORM_VERSION_CONFLICT' } },
    });
    expect(JSON.stringify(writes)).not.toMatch(
      /Prisma|ApplicationFormVersion_one_draft|constraint/i,
    );
  });

  it('makes publish versus a stale mutation safe and discards only the draft snapshot', async () => {
    const created = await job();
    await mutate('post', `${base(created.id)}/draft`, {});
    const added = await mutate('post', `${base(created.id)}/draft/questions`, {
      ...question('Disposable'),
      expectedRevision: 1,
    });
    const draft = added.body.data.applicationForm.draft;
    const attempts = await Promise.all([
      mutate('post', `${base(created.id)}/draft/publish`, {
        expectedRevision: draft.revision,
      }),
      mutate('post', `${base(created.id)}/draft/questions`, {
        ...question('late'),
        expectedRevision: draft.revision,
      }),
    ]);
    expect(attempts.filter((response) => response.status < 300)).toHaveLength(
      1,
    );
    expect(attempts.find((response) => response.status >= 300)).toMatchObject({
      status: 409,
      body: { error: { code: 'FORM_VERSION_CONFLICT' } },
    });
    let builder = (await authed('get', base(created.id))).body.data
      .applicationForm;
    if (builder.draft) {
      const response = await mutate(
        'post',
        `${base(created.id)}/draft/publish`,
        { expectedRevision: builder.draft.revision },
      );
      expect(response.status).toBe(200);
      builder = response.body.data.applicationForm;
    }
    const stored = await prisma.applicationForm.findUnique({
      where: { jobId: created.id },
      include: { activeVersion: true, versions: true },
    });
    expect(stored.activeVersion.status).toBe('PUBLISHED');
    expect(stored.activeVersion.publishedAt).toBeTruthy();
    expect(
      stored.versions.filter((item) => item.status === 'DRAFT'),
    ).toHaveLength(0);
    const next = await mutate('post', `${base(created.id)}/draft`, {});
    const discardedId = next.body.data.applicationForm.draft.id;
    const discarded = await mutate('delete', `${base(created.id)}/draft`, {
      expectedRevision: 1,
    });
    expect(discarded.status).toBe(200);
    expect(
      await prisma.applicationFormVersion.findUnique({
        where: { id: discardedId },
      }),
    ).toBeNull();
    expect(
      (
        await mutate('delete', `${base(created.id)}/draft`, {
          expectedRevision: 1,
        })
      ).body.error.code,
    ).toBe('APPLICATION_FORM_DRAFT_NOT_FOUND');
  });

  it('rejects a cross-form active version before it can be served', async () => {
    const first = await job();
    const second = await job();
    const [firstForm, secondForm] = await Promise.all([
      prisma.applicationForm.findUnique({ where: { jobId: first.id } }),
      prisma.applicationForm.findUnique({ where: { jobId: second.id } }),
    ]);
    const foreignVersionId = generateEntityId();
    await prisma.applicationFormVersion.create({
      data: {
        id: foreignVersionId,
        organizationId,
        applicationFormId: secondForm.id,
        versionNumber: 2,
        status: 'PUBLISHED',
        publishedAt: new Date(),
      },
    });
    await expect(
      prisma.applicationForm.update({
        where: { id: firstForm.id },
        data: { activeVersionId: foreignVersionId },
      }),
    ).rejects.toThrow();
    const response = await authed('get', base(first.id));
    expect(response.status).toBe(200);
    expect(JSON.stringify(response.body)).not.toMatch(/Prisma|constraint|SQL/i);
  });

  it('accepts question 100 and safely rejects question 101 without a revision or database write', async () => {
    const created = await job();
    const form = await prisma.applicationForm.findUnique({
      where: { jobId: created.id },
    });
    const draft = await mutate('post', `${base(created.id)}/draft`, {});
    const draftId = draft.body.data.applicationForm.draft.id;
    await prisma.applicationFormQuestion.createMany({
      data: Array.from({ length: 99 }, (_item, index) => ({
        id: generateEntityId(),
        organizationId,
        applicationFormVersionId: draftId,
        questionKey: generateEntityId(),
        type: 'SHORT_TEXT',
        label: `Seed question ${index + 1}`,
        sortOrder: (index + 1) * 1000,
      })),
    });
    const hundredth = await mutate(
      'post',
      `${base(created.id)}/draft/questions`,
      {
        ...question('Question 100'),
        expectedRevision: 1,
      },
    );
    expect(hundredth.status).toBe(201);
    expect(hundredth.body.data.applicationForm.draft.revision).toBe(2);
    const overflow = await mutate(
      'post',
      `${base(created.id)}/draft/questions`,
      {
        ...question('Question 101'),
        expectedRevision: 2,
      },
    );
    expect(overflow).toMatchObject({
      status: 400,
      body: { error: { code: 'APPLICATION_FORM_QUESTION_LIMIT_REACHED' } },
    });
    expect(JSON.stringify(overflow.body)).not.toMatch(/Prisma|constraint|SQL/i);
    expect(
      await prisma.applicationFormQuestion.count({
        where: { applicationFormVersionId: draftId },
      }),
    ).toBe(100);
    expect(
      await prisma.applicationFormVersion.findUnique({
        where: { id: draftId },
      }),
    ).toMatchObject({ applicationFormId: form.id, revision: 2 });
  });

  it('accepts exactly 50 choice options and rejects 51 without partial persistence', async () => {
    const created = await job();
    await mutate('post', `${base(created.id)}/draft`, {});
    const options = Array.from({ length: 50 }, (_item, index) => ({
      label: `Option ${index + 1}`,
      value: `option-${index + 1}`,
    }));
    const accepted = await mutate(
      'post',
      `${base(created.id)}/draft/questions`,
      {
        ...question('Fifty options', 'SINGLE_SELECT'),
        options,
        expectedRevision: 1,
      },
    );
    expect(accepted.status).toBe(201);
    const draft = accepted.body.data.applicationForm.draft;
    expect(draft.revision).toBe(2);
    expect(draft.questions[0].options).toHaveLength(50);
    const overflow = await mutate(
      'post',
      `${base(created.id)}/draft/questions`,
      {
        ...question('Fifty-one options', 'SINGLE_SELECT'),
        options: [...options, { label: 'Option 51', value: 'option-51' }],
        expectedRevision: 2,
      },
    );
    expect(overflow).toMatchObject({
      status: 400,
      body: { error: { code: 'VALIDATION_ERROR' } },
    });
    expect(JSON.stringify(overflow.body)).not.toMatch(/Prisma|constraint|SQL/i);
    const stored = await prisma.applicationFormVersion.findUnique({
      where: { id: draft.id },
      include: { questions: { include: { options: true } } },
    });
    expect(stored).toMatchObject({ revision: 2 });
    expect(stored.questions).toHaveLength(1);
    expect(stored.questions[0].options).toHaveLength(50);
  });

  it('rejects published question IDs on PATCH, DELETE, and reorder while preserving published history after republish', async () => {
    const created = await job();
    const form = await prisma.applicationForm.findUnique({
      where: { jobId: created.id },
      include: { activeVersion: true },
    });
    const publishedQuestion = await prisma.applicationFormQuestion.create({
      data: {
        id: generateEntityId(),
        organizationId,
        applicationFormVersionId: form.activeVersionId,
        questionKey: 'immutable-question',
        type: 'SHORT_TEXT',
        label: 'Historical label',
        sortOrder: 1000,
      },
    });
    const createdDraft = await mutate('post', `${base(created.id)}/draft`, {});
    const draft = createdDraft.body.data.applicationForm.draft;
    const patch = await mutate(
      'patch',
      `${base(created.id)}/draft/questions/${publishedQuestion.id}`,
      { ...question('Attempted rewrite'), expectedRevision: 1 },
    );
    const deletion = await mutate(
      'delete',
      `${base(created.id)}/draft/questions/${publishedQuestion.id}`,
      { expectedRevision: 1 },
    );
    const reorder = await mutate(
      'put',
      `${base(created.id)}/draft/questions/order`,
      { questionIds: [publishedQuestion.id], expectedRevision: 1 },
    );
    expect(patch).toMatchObject({
      status: 404,
      body: { error: { code: 'APPLICATION_FORM_QUESTION_NOT_FOUND' } },
    });
    expect(deletion).toMatchObject({
      status: 404,
      body: { error: { code: 'APPLICATION_FORM_QUESTION_NOT_FOUND' } },
    });
    expect(reorder).toMatchObject({
      status: 400,
      body: { error: { code: 'APPLICATION_FORM_INVALID_ORDER' } },
    });
    const draftQuestion = draft.questions[0];
    const edited = await mutate(
      'patch',
      `${base(created.id)}/draft/questions/${draftQuestion.id}`,
      {
        ...question('New version label'),
        expectedRevision: 1,
      },
    );
    const published = await mutate(
      'post',
      `${base(created.id)}/draft/publish`,
      {
        expectedRevision: edited.body.data.applicationForm.draft.revision,
      },
    );
    expect(published.status).toBe(200);
    const historical = await prisma.applicationFormQuestion.findUnique({
      where: { id: publishedQuestion.id },
    });
    expect(historical).toMatchObject({
      label: 'Historical label',
      sortOrder: 1000,
    });
  });

  it('enforces cross-organization and same-organization wrong-job isolation for every mutation shape', async () => {
    const first = await job();
    const second = await job();
    const foreign = await job(otherOrganizationId);
    await mutate('post', `${base(first.id)}/draft`, {});
    const draft = await mutate('post', `${base(second.id)}/draft`, {});
    const add = await mutate('post', `${base(second.id)}/draft/questions`, {
      ...question('Second'),
      expectedRevision: 1,
    });
    const secondQuestionId =
      add.body.data.applicationForm.draft.questions[0].id;
    const paths = [
      ['get', base(foreign.id, otherOrganizationId), undefined],
      ['post', `${base(foreign.id, otherOrganizationId)}/draft`, {}],
      [
        'post',
        `${base(foreign.id, otherOrganizationId)}/draft/questions`,
        { ...question('No'), expectedRevision: 1 },
      ],
      [
        'patch',
        `${base(foreign.id, otherOrganizationId)}/draft/questions/${secondQuestionId}`,
        { ...question('No'), expectedRevision: 1 },
      ],
      [
        'delete',
        `${base(foreign.id, otherOrganizationId)}/draft/questions/${secondQuestionId}`,
        { expectedRevision: 1 },
      ],
      [
        'put',
        `${base(foreign.id, otherOrganizationId)}/draft/questions/order`,
        { questionIds: [secondQuestionId], expectedRevision: 1 },
      ],
      [
        'post',
        `${base(foreign.id, otherOrganizationId)}/draft/publish`,
        { expectedRevision: 1 },
      ],
      [
        'delete',
        `${base(foreign.id, otherOrganizationId)}/draft`,
        { expectedRevision: 1 },
      ],
    ];
    for (const [method, url, body] of paths) {
      const response =
        body === undefined
          ? await authed(method, url)
          : await mutate(method, url, body);
      expect(response.status).toBe(404);
    }
    const wrongQuestion = await mutate(
      'patch',
      `${base(first.id)}/draft/questions/${secondQuestionId}`,
      { ...question('No'), expectedRevision: 1 },
    );
    expect(wrongQuestion).toMatchObject({
      status: 404,
      body: { error: { code: 'APPLICATION_FORM_QUESTION_NOT_FOUND' } },
    });
    const wrongOrder = await mutate(
      'put',
      `${base(first.id)}/draft/questions/order`,
      { questionIds: [secondQuestionId], expectedRevision: 1 },
    );
    expect(wrongOrder).toMatchObject({
      status: 400,
      body: { error: { code: 'APPLICATION_FORM_INVALID_ORDER' } },
    });
    expect(draft.status).toBe(201);
  });
});
