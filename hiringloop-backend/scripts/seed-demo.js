import { pathToFileURL } from 'node:url';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  buildDemoData,
  countRows,
  fixtureId,
  organizationId,
  slug,
} from './demo-seed-data.js';

export class SeedSafetyError extends Error {}

export function validateOptions(args, env) {
  if (env.NODE_ENV !== 'development')
    throw new SeedSafetyError('NODE_ENV must explicitly be development.');
  if (
    args.length !== 1 ||
    !['--dry-run', '--confirm-development-write'].includes(args[0])
  ) {
    throw new SeedSafetyError(
      'Specify exactly --dry-run or --confirm-development-write.',
    );
  }
  let url;
  try {
    url = new URL(env.DATABASE_URL);
  } catch {
    throw new SeedSafetyError('A valid DATABASE_URL is required.');
  }
  if (
    !['postgres:', 'postgresql:'].includes(url.protocol) ||
    !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) ||
    url.port !== '7498' ||
    url.pathname !== '/hiringloop_dev' ||
    [...url.searchParams].some(
      ([key, value]) => key !== 'schema' || value !== 'public',
    )
  ) {
    throw new SeedSafetyError(
      'Target must be hiringloop_dev on localhost:7498, public schema, without connection overrides.',
    );
  }
  return {
    write: args[0] === '--confirm-development-write',
    connectionString: url.toString(),
  };
}

export async function inspectRows(tx, rows, { requireAll = false } = {}) {
  let found = 0;
  for (const { model, data } of rows) {
    const existing = await tx[model].findUnique({ where: { id: data.id } });
    if (!existing) {
      if (requireAll)
        throw new SeedSafetyError(
          `Incomplete demo dataset: missing ${model}. Restore the backup or investigate; no automatic repair.`,
        );
      continue;
    }
    found++;
    // Check every ownership/reference field, without overwriting legitimate UI edits.
    for (const key of Object.keys(data).filter((field) =>
      field.endsWith('Id'),
    )) {
      if (existing[key] !== data[key])
        throw new SeedSafetyError(
          `Demo relationship mismatch: ${model}.${key}.`,
        );
    }
    if (model === 'user' && existing.email !== data.email)
      throw new SeedSafetyError('Demo user identity collision.');
    if (model === 'organization' && existing.slug !== slug)
      throw new SeedSafetyError('Demo organization identity collision.');
    if (model === 'scorecardTemplate' || model === 'offer') {
      const versionId =
        model === 'offer'
          ? existing.currentVersionId
          : existing.activeVersionId;
      const versionModel =
        model === 'offer' ? 'offerVersion' : 'scorecardTemplateVersion';
      const ownerKey = model === 'offer' ? 'offerId' : 'templateId';
      const version =
        versionId &&
        (await tx[versionModel].findUnique({ where: { id: versionId } }));
      if (
        !version ||
        version[ownerKey] !== data.id ||
        version.organizationId !== organizationId ||
        (model === 'scorecardTemplate' && version.status !== 'PUBLISHED')
      ) {
        throw new SeedSafetyError(
          `Invalid current version ownership: ${model}.`,
        );
      }
    }
  }
  return found;
}

export async function seedTransaction(tx, rows, write) {
  const organization = await tx.organization.findUnique({ where: { slug } });
  if (organization && organization.id !== organizationId)
    throw new SeedSafetyError(
      'Demo slug already belongs to another organization.',
    );
  if (organization) {
    await inspectRows(tx, rows, { requireAll: true });
    return {
      created: {},
      existing: countRows(rows),
      action: 'Already seeded; no records changed.',
    };
  }
  if (await inspectRows(tx, rows))
    throw new SeedSafetyError(
      'Reserved demo identities already exist; refusing partial or conflicting data.',
    );
  for (const { data } of rows.filter((row) => row.model === 'user')) {
    if (await tx.user.findUnique({ where: { email: data.email } }))
      throw new SeedSafetyError(
        'Reserved demo email already exists; refusing to adopt it.',
      );
  }
  if (!write)
    return { planned: countRows(rows), action: 'Preview only; no writes.' };
  for (const { model, data } of rows) {
    await tx[model].create({ data });
    if (model === 'scorecardCriterion') {
      await tx.scorecardTemplateVersion.update({
        where: { id: data.templateVersionId },
        data: { status: 'PUBLISHED', publishedAt: new Date() },
      });
      const version = rows.find(
        (row) =>
          row.model === 'scorecardTemplateVersion' &&
          row.data.id === data.templateVersionId,
      ).data;
      await tx.scorecardTemplate.update({
        where: { id: version.templateId },
        data: { activeVersionId: version.id },
      });
    }
    if (model === 'offerVersion') {
      await tx.offer.update({
        where: { id: data.offerId },
        data: { currentVersionId: data.id },
      });
    }
  }
  await inspectRows(tx, rows, { requireAll: true });
  return {
    created: countRows(rows),
    action: 'Created and verified atomically.',
  };
}

async function main() {
  const options = validateOptions(process.argv.slice(2), process.env);
  // Separate client avoids application startup and all email/storage providers.
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: options.connectionString }),
  });
  try {
    const result = await prisma.$transaction(
      async (tx) => {
        if (!options.write) await tx.$executeRaw`SET TRANSACTION READ ONLY`;
        const [target] = await tx.$queryRaw`
        SELECT current_database() AS database, current_schema() AS schema,
          host(inet_server_addr()) AS address, inet_server_port() AS port`;
        if (
          target.database !== 'hiringloop_dev' ||
          target.schema !== 'public' ||
          !['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(target.address) ||
          target.port !== 7498
        ) {
          throw new SeedSafetyError(
            `Connected server did not verify as local hiringloop_dev:7498/public (server address ${target.address}, port ${target.port}; database match: ${target.database === 'hiringloop_dev'}, schema match: ${target.schema === 'public'}).`,
          );
        }
        if (options.write)
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(7498, 18014)`;
        let adminId = process.env.DEMO_SEED_ADMIN_USER_ID || null;
        if (adminId) {
          if (
            !/^[0-9a-f-]{36}$/i.test(adminId) ||
            adminId === fixtureId('user-0')
          )
            throw new SeedSafetyError('Invalid existing admin selection.');
          const admin = await tx.user.findUnique({
            where: { id: adminId },
            include: {
              passwordCredential: { select: { id: true } },
              organizationMemberships: { where: { role: 'ADMIN' } },
            },
          });
          if (
            !admin?.emailVerifiedAt ||
            !admin.passwordCredential ||
            !admin.organizationMemberships.length
          ) {
            throw new SeedSafetyError(
              'Selected user must be a verified existing password-login organization ADMIN.',
            );
          }
        } else if (options.write) {
          throw new SeedSafetyError(
            'Set DEMO_SEED_ADMIN_USER_ID to an existing development admin before writing.',
          );
        }
        const existing = await tx.organization.findUnique({
          where: { id: organizationId },
        });
        // Retain the original relative-date anchor on repeat previews/runs.
        const anchor = existing
          ? new Date(+existing.createdAt + 60 * 86400000)
          : new Date();
        const rows = buildDemoData(anchor, adminId);
        const report = await seedTransaction(tx, rows, options.write);
        return {
          target: 'localhost:7498/hiringloop_dev/public',
          adminAccess: Boolean(adminId),
          ...report,
        };
      },
      { timeout: 60000, maxWait: 10000 },
    );
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch((error) => {
    // Driver/Prisma errors can contain connection strings or record contents.
    if (error instanceof SeedSafetyError) console.error(error.message);
    else
      console.error('Database operation failed (details suppressed).', {
        code: /^[A-Z0-9_]{2,30}$/.test(error.code ?? '')
          ? error.code
          : 'UNAVAILABLE',
      });
    console.error(
      'Demo seed aborted. Check development mode, exact target, admin selection, migrations, and fixture identity/integrity. No partial transaction was committed.',
    );
    process.exitCode = 1;
  });
}
