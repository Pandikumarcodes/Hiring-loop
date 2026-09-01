# HiringLoop Backend

This directory contains the HiringLoop backend foundation. It is a separate
Node.js application from `hiringloop-frontend/` and currently provides the
technical application shell and health endpoint only.

## Stack and prerequisites

- Node.js 24.x
- npm 11.x
- Express.js
- JavaScript with ES modules
- Prisma 7.10.0 with PostgreSQL and the `pg` driver adapter

Install dependencies from this directory:

```sh
npm install
```

Repository-wide Node/npm version pinning should be considered later. This
backend does not currently add an `.nvmrc`, `.node-version`, or Volta config.

## Local development

Copy `.env.example` to a local `.env` file when local configuration is needed;
do not commit local environment files. Start the watch-mode server with:

```sh
npm run dev
```

Start the backend normally with:

```sh
npm start
```

The runtime reads `NODE_ENV`, `PORT`, and the optional database connection
variables. `NODE_ENV` may be `development`,
`test`, or `production`. `PORT` must be a whole number from 1 through 65535
and defaults to 3000. Invalid configuration fails startup immediately.
`DATABASE_URL` selects the development database; `TEST_DATABASE_URL` is reserved
for isolated database integration tests. The backend does not require a database
connection for the technical health endpoint, but the normal server verifies the
connection when `DATABASE_URL` is configured.

The additional provider-related variables in `.env.example` are reserved
placeholders for future phases; they are not currently required or connected
to any provider. Never put backend secrets in frontend `VITE_*` variables.

## Quality and testing

```sh
npm run lint
npm run format
npm run format:check
npm test
npm run test:watch
npm run test:coverage
npm run verify
```

`verify` is the non-interactive one-command check: lint, formatting check, and
the test suite. Coverage is intentionally separate. Tests use Vitest in the
Node environment, Supertest, and the `*.test.js` convention under `tests/`.

## Database foundation

The first tenant foundation slice is defined in `prisma/schema.prisma` with
only `User`, `Organization`, and `OrganizationMembership`. `User` is global;
it has no organization foreign key. `Organization` is the tenant root, and
`OrganizationMembership` is the first-class User-to-Organization relationship
with the fixed roles `ADMIN`, `RECRUITER`, `HIRING_MANAGER`, and `INTERVIEWER`.
Each organization/user pair is unique, and membership deletion behavior is
restrictive so deleting a User or Organization cannot casually erase history.

Entity IDs are required application inputs and must be generated as UUIDv7 by
`src/utils/ids.js`; Prisma does not generate random IDs for these models. The
schema uses PostgreSQL `timestamptz` mappings for UTC instants. The role
vocabulary is enforced by the `OrganizationMembership_role_check` PostgreSQL
CHECK constraint in the first migration,
`20260901105250_init_tenant_foundation`.

The reusable Prisma client boundary is `src/database/client.js`; it creates
one `PrismaClient` with `PrismaPg` per process, and controllers must not access
Prisma directly.

Useful Prisma commands are `npm run prisma:validate` and
`npm run prisma:generate`; both are valid against Prisma 7.10.0. Generation
uses Prisma's JavaScript-compatible `prisma-client-js` provider so it does not
add TypeScript source to this backend. Future migrations must be
reviewed, committed, and applied only to the intended environment; test database
operations must use
`TEST_DATABASE_URL` and must never fall back to `DATABASE_URL`.

The first migration has been applied to both configured databases: development
uses `hiringloop_dev`, while isolated database integration tests use
`hiringloop_test`. `TEST_DATABASE_URL` is required for database integration
tests and must target `hiringloop_test`; test tooling must never fall back to
`DATABASE_URL` or perform destructive operations against the development
database.

Apply existing migrations to the test database with `prisma migrate deploy`
using `TEST_DATABASE_URL`, then run `npm run test:db`. The test database must be
migrated before integration tests run. Ordinary `npm test` and `npm run verify`
remain database-independent; `npm run verify:db` runs validation and the
isolated database integration suite. Migration files are committed to Git as
part of the database foundation work. Phase 02 remains in progress.

## Health endpoint

`GET /health` is a technical health check, not a product API. It returns:

```http
HTTP/1.1 200
```

```json
{ "status": "ok" }
```

## Current scope

Phase 02 is in progress and currently contains only database infrastructure;
domain models, migrations, authentication, product routes, external providers,
workers, realtime behavior, and AI are not initialized here. For deeper project
context, see the shared documents in `docs-shared/`.
