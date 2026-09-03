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

The runtime loads `.env` before importing application configuration. It reads
`NODE_ENV`, `PORT`, and the optional database connection variables. `NODE_ENV` may be `development`,
`test`, or `production`. `PORT` must be a whole number from 1 through 65535
and defaults to 3000. Invalid configuration fails startup immediately.
`DATABASE_URL` selects the development database; `TEST_DATABASE_URL` is reserved
for isolated database integration tests. `AUTH_CSRF_SECRET` is required in
development and production and must contain at least 32 characters; tests use a
controlled fallback when no secret is supplied. The backend does not require a database
connection for the technical health endpoint, but the normal server verifies the
connection when `DATABASE_URL` is configured.

`FRONTEND_ORIGIN` is an exact-origin browser/CORS and auth-link setting. SendGrid
is optional in local development unless email delivery is being tested; if
either `SENDGRID_API_KEY` or `AUTH_EMAIL_FROM` is set, both values and
`FRONTEND_ORIGIN` are required. Google configuration is optional unless Google
login is being tested. Never put backend secrets in frontend `VITE_*` variables.

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

## Authentication cryptographic foundation

The Phase 05C auth module contains reusable primitives only. Email identity is
canonicalized by trimming surrounding whitespace and lowercasing the complete
string; provider-specific rewrites are not performed. Passwords use the
`passwordHasher` abstraction backed by explicit Argon2id settings: 19,456 KiB
memory, time cost 2, parallelism 1, and 32-byte output. Password-hash failures
for malformed stored hashes raise `PasswordHashError` rather than becoming an
incorrect-password result.

Opaque session, verification, and reset secrets use 32 cryptographically random
bytes encoded as base64url. Consumers must hash raw secrets with SHA-256 and
persist only the resulting 64-character lowercase hexadecimal digest, which
fits the Phase 05B Prisma `String` fields. Password hashing and generated-secret
hashing intentionally remain separate strategies.

### Phase 05D1–05D2 authentication workflow

`POST /api/v1/auth/register` accepts `{ email, password }` with a 12–128
character password and returns a generic `202` acknowledgement. It creates
only global `User`, `PasswordCredential`, and a 24-hour
`EMAIL_VERIFICATION` token; no organization, membership, session, or tenant
context is created. `POST /api/v1/auth/verify-email` accepts `{ token }` and
atomically performs single-use verification. Raw tokens are sent through the
email-delivery port but only their SHA-256 hashes are stored.

Email verification delivery uses the narrow auth email-delivery port and a
SendGrid adapter in configured development/production-like runtimes. Configure
`SENDGRID_API_KEY`, `AUTH_EMAIL_FROM`, and `FRONTEND_ORIGIN` together; production
startup rejects missing or partial SendGrid configuration. Tests use an
in-memory adapter and never contact SendGrid. Verification links are built from
the configured frontend URL as `/verify-email?token=...`, and expire after 24
hours. The request Host and Origin headers are never used to choose the link
destination.

`POST /api/v1/auth/verification/resend` accepts `{ email }` and always returns
the same `202` acknowledgement for unknown, verified, and eligible accounts.
For an unverified account it transactionally consumes active verification tokens
and creates one fresh 24-hour token, then sends the email after commit. A
delivery failure returns a safe `EMAIL_DELIVERY_FAILED` response while leaving
the fresh token valid for a later resend. No user, password credential,
organization, membership, or session is created or changed by resend.

Verification resend is abuse-sensitive and is protected by the Phase 05K
authentication rate-limit middleware described in
[`docs-shared/AUTHENTICATION_RATE_LIMITING.md`](docs-shared/AUTHENTICATION_RATE_LIMITING.md).

`POST /api/v1/auth/login` accepts `{ email, password }`. Email is trimmed and
lowercased for lookup; the password is passed unchanged to Argon2id, and login
does not apply registration's minimum-length rule before verification. Unknown
email, missing password credential, and incorrect password all return `401
AUTHENTICATION_FAILED` with the same generic message. Unknown-account paths
verify against a fixed Argon2id dummy hash to reduce timing-based enumeration.

Successful login creates a fresh opaque `AuthSession` containing only the
SHA-256 hash of a 32-byte random base64url secret. The raw secret is issued
only in the HttpOnly session cookie and is never persisted. Sessions expire
absolutely after seven days. Production uses the host-only
`__Host-hiringloop_session` cookie with `Secure`, `SameSite=None`, `Path=/`,
and no `Domain`; local development/test uses `hiringloop_session`,
`Secure=false`, and `SameSite=Lax`. Login returns only a safe user DTO and
does not resolve organization, membership, role, or permission context. An
unverified email may authenticate; verification remains a separate state.

Required authentication for protected HTTP routes is provided by the reusable
`authenticateSession` middleware. It parses the configured cookie, hashes the
raw secret with SHA-256, and performs one bounded PostgreSQL lookup joining the
session to the minimal global User identity. Missing, unknown, expired, and
revoked sessions return `401 UNAUTHENTICATED`; database failures remain `500`
internal errors. Invalid-session cookies are cleared using the same cookie
attributes as login.

`POST /api/v1/auth/logout` requires the current authenticated session. It sets
that session's `revokedAt` timestamp in PostgreSQL using the trusted
`req.auth.sessionId` and `req.auth.userId`, retains the session row, clears the
session cookie with the same name, `Path=/`, `HttpOnly`, `SameSite`, and
environment-specific `Secure` policy, then returns `204 No Content`. Server-side
revocation is authoritative; clearing a browser cookie alone is not a logout.
An already revoked or otherwise invalid stale cookie is rejected by the normal
required-authentication middleware with `401`, and is cleared there. No
logout-specific optional-authentication path is introduced.

`POST /api/v1/auth/sessions/revoke-all` uses the same required authentication
boundary and revokes all active sessions for the authenticated global User,
including the current session. It clears the current browser cookie and returns
`204 No Content`. Both operations use server time and do not load organization
or membership data. Requests that completed authentication before revocation
may finish; requests authenticating after the database revocation must fail.
Logout and session lifecycle are global identity behavior, not tenant
authorization behavior.

`GET /api/v1/auth/me` returns the authenticated user as
`{ data: { user: { id, email, emailVerified } } }`. The trusted request context
contains `userId`, `sessionId`, and the same safe user DTO. It contains no raw
secret, session hash, organization, membership, role, or permission data.
Authentication establishes global identity only; organization and authorization
resolution remain later phases. Normal required-authentication requests are
read-only and target one database round trip with no cache or sliding expiry.

### Phase 05H password recovery and change

`POST /api/v1/auth/password/forgot` accepts `{ email }` and always returns a
generic `202` acknowledgement for unknown, provider-only, unverified, and
eligible accounts. Only a User with a PasswordCredential gets a fresh
single-use `PASSWORD_RESET` token. Active reset tokens are invalidated in the
same transaction as the new token, and the token expires after 30 minutes.
Only its SHA-256 hash is stored. The reset email is sent after commit through
the email-delivery port using configured `FRONTEND_ORIGIN`; request Host and
Origin headers are never used. Delivery failure returns the existing safe
provider error while leaving the committed token valid.

`POST /api/v1/auth/password/reset` accepts `{ token, newPassword }`. A valid
token is atomically consumed with the Argon2id credential update, competing
active reset-token invalidation, and revocation of every active session for the
User. No new session is created; the user must log in again. Unknown, expired,
consumed, and wrong-purpose tokens share `AUTH_TOKEN_INVALID` semantics, while
database failures remain internal errors.

`POST /api/v1/auth/password/change` requires the current opaque session and
accepts `{ currentPassword, newPassword }`. After Argon2id verification, the
credential update, `passwordChangedAt`, all-session revocation, and creation of
a fresh seven-day session are one transaction. The fresh session cookie is
written only after commit; the response contains only the safe User DTO.
Password recovery and change use global identity data only and do not load
Organization, OrganizationMembership, role, permission, or tenant context.

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
Foundation implementation and handoff are complete. Authentication remains
in progress; password recovery/change and external identity-provider flows are
deferred to their approved sub-phases. See
`../docs/architecture/PHASE_03_HANDOFF.md` for the completion evidence.

## Health endpoint

`GET /health` is a technical health check, not a product API. It returns:

```http
HTTP/1.1 200
```

```json
{ "status": "ok" }
```

Product APIs are mounted under `/api/v1`; authentication routes are composed by
`src/routes/api-v1.js`. `/health` remains outside the versioned API namespace.

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
