import { describe, expect, it } from 'vitest';
import {
  buildDemoData,
  countRows,
  organizationId,
  fixtureId,
} from '../../scripts/demo-seed-data.js';
import { validateOptions, seedTransaction } from '../../scripts/seed-demo.js';

const env = {
  NODE_ENV: 'development',
  DATABASE_URL:
    'postgresql://demo:secret@localhost:7498/hiringloop_dev?schema=public',
};
const data = () =>
  buildDemoData(
    new Date('2026-10-20T09:00:00Z'),
    '00000000-0000-4000-a000-000000000001',
  );

function fakeDatabase(rows) {
  const tables = new Map();
  let writes = 0;
  const tx = Object.fromEntries(
    [...new Set(rows.map((r) => r.model))].map((model) => {
      const table = new Map();
      tables.set(model, table);
      return [
        model,
        {
          findUnique: async ({ where }) =>
            [...table.values()].find((row) =>
              Object.entries(where).every(([k, v]) => row[k] === v),
            ) ?? null,
          create: async ({ data: record }) => {
            if (table.has(record.id)) throw new Error('Duplicate fixture');
            writes++;
            table.set(record.id, { ...record });
            return record;
          },
          update: async ({ where, data: change }) => {
            writes++;
            Object.assign(table.get(where.id), change);
            return table.get(where.id);
          },
        },
      ];
    }),
  );
  return { tx, tables, writes: () => writes };
}

describe('demo seed safety', () => {
  it('requires explicit development mode and exactly one explicit mode flag', () => {
    for (const NODE_ENV of [undefined, 'test', 'production'])
      expect(() =>
        validateOptions(['--dry-run'], { ...env, NODE_ENV }),
      ).toThrow();
    for (const args of [
      [],
      ['--yes'],
      ['--dry-run', '--confirm-development-write'],
    ])
      expect(() => validateOptions(args, env)).toThrow();
    expect(validateOptions(['--dry-run'], env).write).toBe(false);
    expect(validateOptions(['--confirm-development-write'], env).write).toBe(
      true,
    );
  });
  it.each([
    'postgresql://demo@remote:7498/hiringloop_dev',
    'postgresql://demo@localhost:5432/hiringloop_dev',
    'postgresql://demo@localhost:7498/hiringloop_prod',
    'postgresql://demo@localhost:7498/hiringloop_dev?host=remote',
    'postgresql://demo@localhost:7498/hiringloop_dev?schema=private',
  ])('rejects unsafe URL %s', (DATABASE_URL) => {
    expect(() =>
      validateOptions(['--dry-run'], { ...env, DATABASE_URL }),
    ).toThrow();
  });
  it('has stable identities and the requested counts without authentication secrets', () => {
    const rows = data();
    expect(rows.map((r) => r.data.id)).toEqual(data().map((r) => r.data.id));
    expect(new Set(rows.map((r) => r.data.id)).size).toBe(rows.length);
    expect(countRows(rows)).toMatchObject({
      user: 5,
      organizationMembership: 6,
      job: 8,
      candidate: 30,
      application: 40,
      interview: 12,
      scorecard: 8,
      offer: 5,
      talentPool: 3,
      notification: 12,
      auditEvent: 17,
    });
    expect(rows.some((r) => r.model === 'passwordCredential')).toBe(false);
    const byId = new Map(rows.map((r) => [r.data.id, r]));
    for (const { data: row } of rows) {
      if ('organizationId' in row)
        expect(row.organizationId).toBe(organizationId);
      for (const [key, value] of Object.entries(row)) {
        if (
          key.endsWith('Id') &&
          value !== '00000000-0000-4000-a000-000000000001'
        )
          expect(byId.has(value), key).toBe(true);
      }
    }
    const apps = rows
      .filter((r) => r.model === 'application')
      .map((r) => r.data);
    expect(new Set(apps.map((a) => `${a.jobId}:${a.candidateId}`)).size).toBe(
      40,
    );
    for (const app of apps) {
      const stage = byId.get(app.currentPipelineStageId).data;
      expect(byId.get(stage.pipelineId).data.jobId).toBe(app.jobId);
      const version = byId.get(app.applicationFormVersionId).data;
      expect(byId.get(version.applicationFormId).data.jobId).toBe(app.jobId);
    }
  });
  it('preview performs zero mutations; second confirmed pass performs zero mutations and preserves edits', async () => {
    const rows = data();
    const db = fakeDatabase(rows);
    await seedTransaction(db.tx, rows, false);
    expect(db.writes()).toBe(0);
    await seedTransaction(db.tx, rows, true);
    const writes = db.writes();
    db.tables.get('job').get(fixtureId('job-0')).title = 'Edited in UI';
    const result = await seedTransaction(db.tx, data(), true);
    expect(result.created).toEqual({});
    expect(db.writes()).toBe(writes);
    expect(db.tables.get('job').get(fixtureId('job-0')).title).toBe(
      'Edited in UI',
    );
  });
  it('rejects partial seeds and cross-tenant references before any second-pass writes', async () => {
    const rows = data();
    const db = fakeDatabase(rows);
    await seedTransaction(db.tx, rows, true);
    const writes = db.writes();
    db.tables
      .get('application')
      .get(fixtureId('application-0')).organizationId = fixtureId('other-org');
    await expect(seedTransaction(db.tx, rows, true)).rejects.toThrow(
      'relationship mismatch',
    );
    expect(db.writes()).toBe(writes);
    db.tables.get('application').delete(fixtureId('application-0'));
    await expect(seedTransaction(db.tx, rows, true)).rejects.toThrow(
      'Incomplete',
    );
  });
  it('refuses to adopt a colliding existing email', async () => {
    const rows = data();
    const db = fakeDatabase(rows);
    db.tables
      .get('user')
      .set('unrelated', { id: 'unrelated', email: 'avery@acme-demo.example' });
    await expect(seedTransaction(db.tx, rows, true)).rejects.toThrow(
      'email already exists',
    );
    expect(db.writes()).toBe(0);
  });
});
