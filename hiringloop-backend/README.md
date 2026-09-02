# HiringLoop Backend

This directory contains the HiringLoop backend foundation. It is a separate
Node.js application from `hiringloop-frontend/` and currently provides the
technical application shell, backend request foundation, and health endpoint.

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

The schema contains the global `User` identity, its Phase 05 authentication
records (`PasswordCredential`, `AuthSession`, `AuthToken`, and
`AuthProviderIdentity`), and the tenant foundation (`Organization` and
`OrganizationMembership`). User has no organization foreign key. Authentication
records are global identity infrastructure; OrganizationMembership remains the
first-class User-to-Organization relationship with the fixed roles `ADMIN`,
`RECRUITER`, `HIRING_MANAGER`, and `INTERVIEWER`. Membership deletion behavior
is restrictive, while a User deletion cascades only to its authentication
records so they cannot orphan.

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
part of the database foundation work. Phase 02 is complete. Phase 03 Backend
Foundation implementation and handoff are complete. Product features and
authentication remain deferred to their approved phases. See
`../docs/architecture/PHASE_03_HANDOFF.md` for the completion evidence.

## Health endpoint

`GET /health` is a technical health check, not a product API. It returns:

```http
HTTP/1.1 200
```

```json
{ "status": "ok" }
```

Product APIs will be mounted under `/api/v1`. The composition point is the empty
`src/routes/api-v1.js` router, where approved future feature routers may be mounted.
The current route foundation intentionally adds no product endpoints. `/health`
remains outside the versioned API namespace.

## Error handling

Terminal middleware in `src/middleware/` provides a predictable JSON error
contract for known application errors, malformed JSON, unknown routes, and
unexpected failures:

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Route not found",
    "requestId": null
  }
}
```

Known errors use stable codes such as `VALIDATION_ERROR`, `NOT_FOUND`, and
`CONFLICT`; unexpected failures use `INTERNAL_ERROR` and a generic message.
Stacks, database errors, SQL, paths, and environment values are never returned.
The explicit JSON 404 handler runs after all routes and before the centralized
error handler. Express 5 natively forwards rejected async-handler promises to
that handler, so no async wrapper dependency is required. Future validation,
authentication/authorization, and database-error translation will extend this
same contract.

## HTTP request validation

`validateRequest({ body, params, query })` in
`src/middleware/validate-request.js` is the reusable Zod boundary for HTTP
input. Each location is optional. Supplied schemas are parsed in the order
`body`, `params`, `query`; the first failure stops the request and flows through
the centralized error handler as HTTP 400 with code `VALIDATION_ERROR`.

Parsed values are available only in `request.validated`, under the locations
whose schemas were supplied. Controllers should use those values and map them
into explicit application commands/DTOs; this middleware is transport
validation, not a generic service-DTO layer. Validation details are bounded
`{ path, message }` entries and never include raw Zod errors or input values.

Schemas own unknown-field behavior (`strip`, `strict`, or `passthrough`) and any
deliberate coercion. Query values are therefore not coerced globally. Current
middleware parsing is synchronous; async Zod refinements are deferred until a
real requirement exists.

## Current scope

Phase 03 Backend Foundation implementation is complete. The backend currently
contains the Phase 01 application shell, Phase 02 database infrastructure, the
shared HTTP validation/error foundation, and a database-independent test fixture
that proves the request/application boundary. It adds no product endpoint or
feature module. Authentication,
authorization, product routes, external providers, workers, realtime behavior, and
AI remain deferred. For deeper project context, see the shared documents in
`docs-shared/` and the authoritative root document
`../docs/architecture/BACKEND_FOUNDATION.md`.

## Layered request/application boundary

The approved pragmatic-hybrid convention keeps shared infrastructure in `src/`
and lets each future domain module own its route, controller, service/use case,
repository, and schemas. A future module may follow this shape when it is
authorized:

```text
src/modules/<domain>/
  routes.js
  controller.js
  service.js        # or use-cases/
  repository.js
  schemas.js
```

The request direction is `route → validation middleware → thin controller →
service/use case → repository/data access → Prisma → PostgreSQL`. Controllers
read only `request.validated`, map transport input to a plain application DTO,
invoke a use case, and select the HTTP success status and response shape. They
do not import Prisma, query the database, authorize, or decide transaction
internals. Services/use cases receive DTOs, orchestrate application rules, and
return application results without Express objects or HTTP statuses.

Repositories own persistence queries and database-specific mapping. Real future
repositories receive the process-scoped client from `src/database/client.js`
through explicit dependency composition; no generic BaseController,
BaseService, or BaseRepository is planned. The current proof uses only an
in-memory repository fixture under `tests/fixtures/`, so no fake product
persistence or production route was added.

Success responses remain direct/resource-oriented. The controller owns choosing
200/201/204 for successful HTTP operations, while `ApplicationError` carries
known failure status and code to the centralized handler. Future services own
transaction orchestration, with repositories participating in a supplied
transaction/data-access context where needed; controllers never start Prisma
transactions. Future verified tenant context will flow into the service/use case
and then tenant-scoped repository calls. A client-supplied
`req.body.organizationId` is never trusted as tenant authority.

## Request correlation and HTTP hardening

The first middleware assigns every request a server-owned ephemeral ID using
Node's built-in `crypto.randomUUID()`. It is available as `request.requestId`
and is returned in the `X-Request-Id` response header. Client-supplied
`X-Request-Id` values are ignored; request IDs have no authentication,
authorization, or tenant meaning and are not persisted. The centralized error
handler uses the same ID in the standard error body, so the header and body
identify the same request. Unexpected-error logging includes only the safe error
name and request ID, never request data or secrets.

The middleware order is request correlation → bounded JSON parsing → health and
versioned routes → explicit 404 → centralized error handling. JSON parsing uses
Express's built-in `100kb` limit, a conservative general API bound selected
because Phase 03 requires bounded payloads but specifies no exact size. This is
not suitable for resumes or other file uploads; future uploads require a
separate validated object-storage flow. Oversized JSON returns HTTP 413 with
`PAYLOAD_TOO_LARGE`; malformed JSON remains the existing safe
`VALIDATION_ERROR`. AsyncLocalStorage is intentionally deferred because the
explicit request property is sufficient for this phase. Concrete Prisma/
PostgreSQL error translation remains deferred until a real feature repository
exists, where mappings can be based on actual operations and tested outcomes.
