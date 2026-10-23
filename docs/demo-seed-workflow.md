# Development demo seed

Implemented for Acme Talent Technologies. No live seed writes were executed.

## Architecture and scope

The existing `hiringloop-backend/scripts/seed-phase14-qa.js` is a standalone
ES-module QA fixture, registered as `seed:qa`. It uses Prisma, job use cases,
default pipelines/forms and Argon2 credentials. It also resets its QA passwords
and logs a shared password, so this implementation deliberately does not invoke
or modify it. `prisma.config.js` has no automatic seed hook.

The new `db:seed:demo` command follows the existing standalone script convention,
uses the installed Prisma PostgreSQL adapter and existing pipeline/form defaults,
and has no startup, generation, migration or external-service hooks. Fixture-only
UUIDv5 identities use the existing `uuid` dependency; application-generated IDs
remain UUIDv7. There is no new database table or general-purpose seed framework.

Reviewed the Prisma schema/config, migrations and relationship/immutability
triggers, membership roles, authentication schemas/Argon2 mechanism, job,
interview, scorecard and offer use cases, and audit/analytics repositories.

## Dataset

| Records | Planned count |
| --- | ---: |
| Organization | 1 |
| Fictional users without login credentials | 5 |
| Demo memberships | 5, plus 1 selected existing admin |
| Jobs | 8 (6 open, 1 closed, 1 draft) |
| Pipelines / stages | 8 / 32 |
| Published default application forms / versions | 8 / 8 |
| Candidates / applications | 30 / 40 |
| Initial application history events | 40 |
| Interviews / participant assignments | 12 / 12 |
| Published scorecard templates / versions / criteria | 8 / 8 / 8 |
| Draft scorecards / rating responses | 8 / 8 |
| Draft offers / current versions | 5 / 5 |
| Talent pools / pool members | 3 / 15 |
| In-app notifications / audit events | 12 / 17 |

Names and `.example` domains are fictional. Users have ADMIN, RECRUITER (two),
HIRING_MANAGER and INTERVIEWER memberships. There is no separate OWNER role.
Applications span six open jobs and the four default stages. Dates are relative
to initial execution, with historical applications/eight past interviews and four
upcoming interviews. A repeat run retains the original date anchor.

These are initial fixture snapshots, not replayed production workflow actions.
Templates are inserted as drafts, criteria inserted, then published and linked.
Offers are inserted before their versions and only then linked to current versions.
Forms use the existing deferred active-version foreign key. No constraints or
triggers are disabled. Existing records are never updated by a repeat run.

## Commands (PowerShell, from hiringloop-backend)

```powershell
$env:NODE_ENV = 'development'
npm.cmd run db:seed:demo -- --dry-run
```

Before any authorized write, select a development user by UUID. The script checks
that the user already has an ADMIN membership, verified email and password
credential. It adds an ADMIN membership in the demo organization; it does not
change the user, password or existing memberships. Use that user's normal login
and organization selector. Do not supply a password to this script.

```powershell
$env:NODE_ENV = 'development'
$env:DEMO_SEED_ADMIN_USER_ID = '<existing-development-admin-user-uuid>'
npm.cmd run db:seed:demo -- --dry-run
# Execute the following only after explicit authorization to write:
npm.cmd run db:seed:demo -- --confirm-development-write
# Repeat the same authorized command to verify the existing fixture is a no-op.
```

Use the same admin UUID on subsequent runs. Without it, preview is supported but
write mode refuses to proceed. The preview reports `adminAccess: false` when no
admin is selected; that is not a login-provisioned dataset.

## Safety and verification

- Requires exactly one mode flag and explicit `NODE_ENV=development`.
- Checks URL host (loopback only), explicit port 7498, database `hiringloop_dev`,
  public schema and absence of connection override parameters.
- Independently queries the connected server's database, schema, loopback address
  and port before any fixture write. Unknown/unverifiable targets abort.
- Preview is a PostgreSQL READ ONLY transaction, including all preflight reads.
- Confirmed writes use one transaction and an advisory lock. Failure rolls back
  the entire dataset. Deferred constraints are enforced at commit.
- Reserved slug/email/ID collisions abort rather than adopting other data.
- Existing complete fixtures are verified by identity and relationship fields,
  with current template/offer version ownership checked. Partial or changed
  relationships abort for investigation instead of being overwritten.
- Scalar UI edits are retained. Moving applications between stages changes a
  reference and causes conservative repeat-run refusal; no repair is attempted.
- No `deleteMany`, reset, `db push`, communication queue, email sender, storage
  request, credentials, or environment-value logging.

The write report lists actual newly created rows by model after transaction
commit. A repeat reports existing verified rows and an empty created map.
These are fixture counts, not a restriction on additional user-created demo data.

## Validation performed on October 20, 2026

The read-only dry run succeeded against `localhost:7498/hiringloop_dev/public`.
It planned the counts above with **5** memberships because no existing admin UUID
was selected. No demo records or credentials were written.

The initial environment correctly refused to run without explicit development
mode. An early address check was corrected to use PostgreSQL `host()` because
casting an inet address to text includes `/128` on this server.

Unit tests cover mode/target guards, deterministic unique identities, dataset
counts, tenant/reference consistency, application/job/form/stage relationships,
zero-write preview, second-run no-op preserving scalar edits, partial fixtures,
cross-tenant tampering and email collisions. They use an in-memory Prisma-shaped
test double: **they do not prove PostgreSQL insertion or trigger acceptance**.
All 10 focused tests passed. Changed JavaScript files passed Oxlint and Prettier
checks, and `git diff --check` passed. The full backend suite was not run because
application behavior and schema were unchanged.

Live seed execution, live created counts, database second-run idempotency and
authenticated backend/dashboard/API verification remain unperformed because
database writes were not authorized. The preview verifies the target and
preflight availability/collisions; it does not attempt rolled-back test inserts.

## Omissions and expected analytics

- No resumes/uploads: no fabricated S3 objects or bypass of resume relationship
  and upload-consumption triggers.
- No sent/accepted offers, hired/rejected outcome events or submitted scorecards:
  these remain available for testing through actual authorized workflows.
  Issued-version, outcome-event and submitted-feedback rules are not bypassed.
- No email communications, invitations or password provisioning. Five demo
  identities cannot log in; the selected existing admin provides access.
- Default forms have no custom questions, matching the existing job factory.
- No stage-move history is fabricated: the schema currently permits only
  `APPLICATION_SUBMITTED` history events.
- Analytics are computed from records, not a separate analytics table. On initial
  seed expect six open jobs, forty active applications, twelve interviews, three
  pools and fifteen pool members. Sent offers, hires, rejections and submitted
  feedback remain zero; time-to-hire is null. Date-filtered counts depend on range.

## Safe cleanup

There is intentionally no deletion command. Audit events are append-only and
other relations use restrictive foreign keys. Do not disable triggers or attempt
a cascading tenant deletion. Prefer leaving the clearly named demo organization
in place. If complete removal is necessary, obtain explicit approval to restore
the existing pre-seed backup into a separate local database first and validate it;
replacing the working database would discard subsequent changes and needs its
own reviewed plan and authorization.

## Changed files

- `hiringloop-backend/scripts/demo-seed-data.js`: fictional dataset.
- `hiringloop-backend/scripts/seed-demo.js`: target guards, preview, atomic write,
  collision/relationship verification and safe reports.
- `hiringloop-backend/package.json`: explicit CLI command only.
- `hiringloop-backend/tests/scripts/seed-demo.test.js`: isolated safety tests.
- `docs/demo-seed-workflow.md`: commands, limitations and verification report.

No commit or push was performed.
