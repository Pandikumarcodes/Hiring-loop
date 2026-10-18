import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { Client } from 'pg';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

// Diagnostic only: all write probes run in transactions that always roll back.
const url = new URL(process.env.TEST_DATABASE_URL);
assert.equal(url.pathname, '/hiringloop_test');
assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(url.hostname));
console.log('target', {
  host: url.hostname,
  port: url.port,
  database: 'hiringloop_test',
});
const client = new Client({ connectionString: url.href });
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: url.href }),
});
try {
  await client.connect();
  const identity = (
    await client.query(
      `SELECT current_database(), current_schema(), current_setting('search_path'), inet_server_addr()::text AS server, inet_server_port() AS port, version()`,
    )
  ).rows;
  assert.equal(identity[0].current_database, 'hiringloop_test');
  assert.equal(identity[0].current_schema, 'public');
  console.log('identity', identity);
  const columns = (
    await client.query(
      `SELECT table_schema, table_name, column_name, data_type, udt_name, character_maximum_length, is_nullable FROM information_schema.columns WHERE table_schema NOT IN ('pg_catalog','information_schema') ORDER BY table_schema, table_name, ordinal_position`,
    )
  ).rows;
  const mismatches = [];
  for (const model of Prisma.dmmf.datamodel.models) {
    for (const field of model.fields.filter((f) => f.kind !== 'object')) {
      if (
        !columns.some(
          (c) =>
            c.table_schema === 'public' &&
            c.table_name === (model.dbName ?? model.name) &&
            c.column_name === (field.dbName ?? field.name),
        )
      )
        mismatches.push(`${model.name}.${field.name}`);
    }
  }
  console.log('model column comparison', {
    models: Prisma.dmmf.datamodel.models.length,
    missing: mismatches,
  });
  console.log(
    'resume columns',
    columns.filter((c) =>
      ['CandidateDocument', 'ApplicationUpload'].includes(c.table_name),
    ),
  );
  const migrations = (
    await client.query(
      `SELECT migration_name, checksum, finished_at IS NOT NULL AS finished, rolled_back_at IS NOT NULL AS rolled_back FROM public._prisma_migrations ORDER BY migration_name`,
    )
  ).rows;
  console.log(
    'migrations',
    migrations.map((m) => ({
      ...m,
      checksum: undefined,
      checksumMatches:
        m.checksum ===
        createHash('sha256')
          .update(
            readFileSync(`prisma/migrations/${m.migration_name}/migration.sql`),
          )
          .digest('hex'),
    })),
  );
  console.log(
    'local migration count',
    readdirSync('prisma/migrations', { withFileTypes: true }).filter((f) =>
      f.isDirectory(),
    ).length,
  );
  console.log(
    'generated schema matches ignoring whitespace',
    readFileSync('prisma/schema.prisma', 'utf8').replace(/\s+/g, '') ===
      readFileSync('node_modules/.prisma/client/schema.prisma', 'utf8').replace(
        /\s+/g,
        '',
      ),
  );
  console.log(
    'versions',
    Prisma.prismaVersion,
    JSON.parse(readFileSync('node_modules/@prisma/adapter-pg/package.json'))
      .version,
  );
  console.log(
    'trigger',
    (
      await client.query(
        `SELECT pg_get_functiondef('public.assert_document_and_upload_relationships()'::regprocedure)`,
      )
    ).rows,
  );
  console.log(
    'sessions',
    (
      await client.query(
        `SELECT application_name, state, count(*)::int FROM pg_stat_activity WHERE datname = current_database() GROUP BY application_name, state`,
      )
    ).rows,
  );
  const job = (
    await client.query(`SELECT id, "organizationId" FROM public."Job" LIMIT 1`)
  ).rows[0];
  assert.ok(job, 'A disposable job fixture is needed for rolled-back probes');
  for (const qualified of [false, true]) {
    await client.query('BEGIN');
    try {
      await client.query(
        `INSERT INTO ${qualified ? 'public.' : ''}"ApplicationUpload" (id,"organizationId","jobId","objectKey","originalFilename","mimeType","declaredSizeBytes","expiresAt","updatedAt") VALUES ($1,$2,$3,$4,'resume.pdf','application/pdf',8,now()+interval '10 minutes',now())`,
        [randomUUID(), job.organizationId, job.id, `phase4b/${randomUUID()}`],
      );
      console.log('SQL upload probe', {
        qualified,
        result: 'insert succeeded; rolled back',
      });
    } catch (e) {
      console.log('SQL upload probe', {
        qualified,
        code: e.code,
        message: e.message,
        where: e.where,
      });
    } finally {
      await client.query('ROLLBACK');
    }
  }
  const application = (
    await client.query(
      `SELECT id, "organizationId", "candidateId" FROM public."Application" LIMIT 1`,
    )
  ).rows[0];
  assert.ok(application, 'A disposable application fixture is needed');
  await client.query('BEGIN');
  try {
    await client.query(
      `INSERT INTO public."CandidateDocument" (id,"organizationId","candidateId","applicationId",type,"objectKey","originalFilename","mimeType","sizeBytes","updatedAt") VALUES ($1,$2,$3,$4,'RESUME',$5,'resume.pdf','application/pdf',8,now())`,
      [
        randomUUID(),
        application.organizationId,
        application.candidateId,
        application.id,
        `phase4b/${randomUUID()}`,
      ],
    );
    console.log('SQL document probe', 'insert succeeded; rolled back');
  } catch (e) {
    console.log('SQL document probe', {
      code: e.code,
      message: e.message,
      where: e.where,
    });
  } finally {
    await client.query('ROLLBACK');
  }
  try {
    await prisma.$transaction(async (tx) => {
      await tx.applicationUpload.create({
        data: {
          id: randomUUID(),
          organizationId: job.organizationId,
          jobId: job.id,
          objectKey: `phase4b/${randomUUID()}`,
          originalFilename: 'resume.pdf',
          mimeType: 'application/pdf',
          declaredSizeBytes: 8,
          expiresAt: new Date(Date.now() + 600000),
        },
      });
      throw new Error('ROLLBACK_PROBE');
    });
  } catch (e) {
    if (e.message === 'ROLLBACK_PROBE') {
      console.log('Prisma upload probe', 'insert succeeded; rolled back');
    } else {
      console.log('Prisma upload probe', {
        code: e.code,
        model: e.meta?.modelName,
        cause: e.meta?.driverAdapterError?.cause,
        message: e.message,
      });
    }
  }
} finally {
  await prisma.$disconnect();
  await client.end();
}
