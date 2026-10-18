import assert from 'node:assert/strict';
import { randomUUID, timingSafeEqual } from 'node:crypto';
import { Client } from 'pg';
import express from 'express';
import cors from 'cors';

// This launcher is never imported by the normal server. Only the DB URL is
// loaded from .env; provider credentials are removed before application imports.
assert.equal(process.env.HIRINGLOOP_E2E, '1', 'Use the Playwright launcher');
process.loadEnvFile('.env');
const target = new URL(process.env.TEST_DATABASE_URL);
assert.equal(target.pathname, '/hiringloop_test');
assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(target.hostname));
const runId = process.env.E2E_RUN_ID;
const secret = process.env.E2E_CONTROL_TOKEN;
assert.match(runId ?? '', /^[a-f0-9-]{36}$/);
assert.ok(secret?.length >= 32);
for (const key of Object.keys(process.env)) {
  if (
    /^(SENDGRID_|S3_|AWS_|GOOGLE_OIDC_|AUTH_EMAIL_FROM|DATABASE_URL$)/.test(key)
  )
    delete process.env[key];
}
Object.assign(process.env, {
  NODE_ENV: 'test',
  EMAIL_PROVIDER: 'console',
  FRONTEND_ORIGIN: 'http://127.0.0.1:4173',
  AUTH_CSRF_SECRET: 'e2e-local-only-csrf-secret-at-least-32-characters',
  PORT: '4700',
});
const db = new Client({ connectionString: target.href });
await db.connect();
const identity = (
  await db.query(
    `SELECT current_database() AS database, current_schema() AS schema, inet_server_addr()::text AS address, inet_server_port() AS port`,
  )
).rows[0];
assert.equal(identity.database, 'hiringloop_test');
assert.equal(identity.schema, 'public');
// Fail before creating fixtures if scoped immutable-history cleanup is unavailable.
await db.query('BEGIN');
await db.query("SET LOCAL session_replication_role = 'replica'");
await db.query('ROLLBACK');
const migrations = (
  await db.query(
    `SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL`,
  )
).rows;
assert.ok(
  migrations.some(
    (m) =>
      m.migration_name ===
      '20261018120000_resume_relationship_trigger_record_fields',
  ),
  'Apply test migrations before E2E',
);
console.log('E2E database verified', identity);

const { getPrismaClient, disconnectDatabase } =
  await import('../src/database/client.js');
const { createApp } = await import('../src/app.js');
const { authRouter, authEmailDelivery } =
  await import('../src/modules/auth/auth-module.js');
const { organizationRouter, invitationAcceptanceRouter } =
  await import('../src/modules/organizations/organization-module.js');
const { createPublicCareerRouter } =
  await import('../src/modules/public-careers/routes/public-career-routes.js');
const { createPublicCareerUseCases } =
  await import('../src/modules/public-careers/use-cases/public-career-use-cases.js');
const { createPublicApplicationUseCases } =
  await import('../src/modules/applications/use-cases/public-application-use-cases.js');
const { createApplicationRepository } =
  await import('../src/modules/applications/repositories/application-repository.js');
const { createOrganizationRepository } =
  await import('../src/modules/organizations/repositories/organization-repository.js');
const { createJobRepository } =
  await import('../src/modules/jobs/repositories/job-repository.js');
const { StorageObjectNotFoundError } =
  await import('../src/modules/applications/storage/application-storage.js');
const { publicCareerReadRateLimiter, publicApplicationRateLimiters } =
  await import('../src/middleware/rate-limit.js');
const prisma = getPrismaClient();
const objects = new Map(),
  capabilities = new Map();
const storage = {
  async createSignedPutUrl({ objectKey, mimeType, expiresIn }) {
    const capability = randomUUID();
    capabilities.set(capability, {
      objectKey,
      mimeType,
      expires: Date.now() + expiresIn * 1000,
    });
    return {
      url: `http://127.0.0.1:4701/objects/${capability}`,
      requiredHeaders: { 'Content-Type': mimeType, 'If-None-Match': '*' },
    };
  },
  async headObject({ objectKey }) {
    const object = objects.get(objectKey);
    if (!object) throw new StorageObjectNotFoundError();
    return { contentLength: object.bytes.length, contentType: object.mimeType };
  },
  async readObjectPrefix({ objectKey }) {
    const object = objects.get(objectKey);
    if (!object) throw new StorageObjectNotFoundError();
    return object.bytes.subarray(0, 8);
  },
};
const fileApp = express();
fileApp.use(
  cors({
    origin: 'http://127.0.0.1:4173',
    methods: ['PUT'],
    allowedHeaders: ['Content-Type', 'If-None-Match'],
  }),
);
fileApp.put(
  '/objects/:capability',
  express.raw({ type: () => true, limit: '5mb' }),
  (req, res) => {
    const cap = capabilities.get(req.params.capability);
    if (!cap || cap.expires <= Date.now()) return res.sendStatus(403);
    if (
      req.get('If-None-Match') !== '*' ||
      req.get('Content-Type') !== cap.mimeType
    )
      return res.sendStatus(400);
    if (objects.has(cap.objectKey)) return res.sendStatus(412);
    objects.set(cap.objectKey, {
      bytes: Buffer.from(req.body),
      mimeType: cap.mimeType,
    });
    res.sendStatus(200);
  },
);
const api = express.Router();
const control = express.Router();
control.use((req, res, next) => {
  const provided = Buffer.from(req.get('X-E2E-Control') ?? '');
  const expected = Buffer.from(secret);
  if (
    provided.length !== expected.length ||
    !timingSafeEqual(provided, expected)
  )
    return res.sendStatus(404);
  next();
});
const ownEmail = (email) =>
  typeof email === 'string' && email.endsWith(`@${runId}.e2e.test`);
control.get('/ready', (_req, res) =>
  res.json({ database: identity.database, runId, fakeProviders: true }),
);
control.get('/inbox', (req, res) => {
  if (!ownEmail(req.query.email)) return res.sendStatus(400);
  res.json(
    authEmailDelivery.messages.filter(
      (m) => m.email === req.query.email || m.to === req.query.email,
    ),
  );
});
control.post('/expire-session', async (req, res) => {
  if (!ownEmail(req.body.email)) return res.sendStatus(400);
  await prisma.authSession.updateMany({
    where: { user: { email: req.body.email } },
    data: { expiresAt: new Date(0) },
  });
  res.sendStatus(204);
});
control.post('/cleanup', async (_req, res, next) => {
  try {
    // Cleanup only. No trigger bypass occurs during fixtures or browser flows.
    // LOCAL replication role restores automatically on commit/rollback, allowing
    // deletion of this run's immutable audit/history rows without global DDL.
    const users = (
      await db.query(`SELECT id FROM "User" WHERE email LIKE $1`, [
        `%@${runId}.e2e.test`,
      ])
    ).rows.map((u) => u.id);
    const orgs = (
      await db.query(`SELECT id FROM "Organization" WHERE name LIKE $1`, [
        `E2E ${runId}%`,
      ])
    ).rows.map((o) => o.id);
    const foreign = (
      await db.query(
        `SELECT 1 FROM "OrganizationMembership" WHERE ("organizationId" = ANY($1::uuid[]) AND NOT ("userId" = ANY($2::uuid[]))) OR ("userId" = ANY($2::uuid[]) AND NOT ("organizationId" = ANY($1::uuid[]))) LIMIT 1`,
        [orgs, users],
      )
    ).rows;
    assert.equal(foreign.length, 0, 'Refuse cleanup across fixture boundaries');
    await db.query('BEGIN');
    try {
      await db.query(`SET LOCAL session_replication_role = 'replica'`);
      await db.query(
        `DELETE FROM "InterviewParticipant" WHERE "interviewId" IN (SELECT id FROM "Interview" WHERE "organizationId" = ANY($1::uuid[]))`,
        [orgs],
      );
      await db.query(
        `DELETE FROM "PipelineStage" WHERE "pipelineId" IN (SELECT p.id FROM "Pipeline" p JOIN "Job" j ON j.id = p."jobId" WHERE j."organizationId" = ANY($1::uuid[]))`,
        [orgs],
      );
      await db.query(
        `DELETE FROM "Pipeline" WHERE "jobId" IN (SELECT id FROM "Job" WHERE "organizationId" = ANY($1::uuid[]))`,
        [orgs],
      );
      const tables = (
        await db.query(
          `SELECT table_name FROM information_schema.columns WHERE table_schema = 'public' AND column_name = 'organizationId'`,
        )
      ).rows;
      for (const { table_name: table } of tables)
        await db.query(
          `DELETE FROM "${table.replaceAll('"', '""')}" WHERE "organizationId" = ANY($1::uuid[])`,
          [orgs],
        );
      await db.query(`DELETE FROM "Organization" WHERE id = ANY($1::uuid[])`, [
        orgs,
      ]);
      for (const table of [
        'AuthSession',
        'AuthToken',
        'AuthProviderIdentity',
        'PasswordCredential',
      ])
        await db.query(
          `DELETE FROM "${table}" WHERE "userId" = ANY($1::uuid[])`,
          [users],
        );
      await db.query(`DELETE FROM "User" WHERE id = ANY($1::uuid[])`, [users]);
      await db.query('COMMIT');
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
    objects.clear();
    capabilities.clear();
    authEmailDelivery.messages.length = 0;
    res.json({ cleanedUsers: users.length, cleanedOrganizations: orgs.length });
  } catch (error) {
    next(error);
  }
});
api.use('/__e2e', control);
api.use('/auth', authRouter);
api.use('/organizations', organizationRouter);
api.use('/invitations', invitationAcceptanceRouter);
const organizationRepository = createOrganizationRepository(prisma),
  jobRepository = createJobRepository(prisma);
api.use(
  '/public',
  createPublicCareerRouter({
    publicCareerUseCases: createPublicCareerUseCases({
      organizationRepository,
      jobRepository,
    }),
    publicCareerReadRateLimiter,
    publicApplicationRateLimiters,
    publicApplicationUseCases: createPublicApplicationUseCases({
      organizationRepository,
      jobRepository,
      applicationRepository: createApplicationRepository(prisma),
      storage,
      uploadTtlSeconds: 600,
      maxUploadBytes: 5242880,
    }),
  }),
);
const app = createApp({ apiRouter: api });
await new Promise((resolve) => {
  fileApp.listen(4701, '127.0.0.1', resolve).on('error', (error) => {
    throw error;
  });
});
const server = app.listen(4700, '127.0.0.1', () =>
  console.log('E2E backend and fake storage ready'),
);
server.on('error', (error) => {
  throw error;
});
async function shutdown() {
  await disconnectDatabase();
  await db.end();
  process.exit(0);
}
process.once('SIGTERM', shutdown);
process.once('SIGINT', shutdown);
