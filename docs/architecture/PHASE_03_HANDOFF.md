# Phase 03 — Backend Foundation Handoff

## Status

COMPLETE

## Objective

Establish the reusable backend request and application foundation for the
modular-monolith JavaScript/Express application without implementing product
features, authentication, authorization, tenant resolution, new Prisma models,
migrations, or frontend behavior.

## Completed Work

- Composed the Express application with a preserved technical `GET /health`
  endpoint and an empty `/api/v1` product-router namespace.
- Established ordered middleware for request correlation, bounded JSON parsing,
  routes, explicit JSON 404 handling, and centralized errors.
- Implemented `ApplicationError`, safe error envelopes, malformed-JSON mapping,
  safe 413 handling, and Express 5 async error propagation.
- Implemented reusable Zod validation for body, params, and query input through
  the `request.validated` boundary.
- Demonstrated transport-to-application DTO mapping and route → controller →
  service/use-case → repository layering with dependency injection in tests.
- Added request correlation and safe minimal unexpected-error logging.
- Verified the foundation with 29 database-independent tests and 7 Phase 02
  database integration tests.

## Backend Request Architecture

```text
HTTP Request
→ Route
→ Middleware
→ Controller
→ Service / Use Case
→ Repository / Data Access
→ Prisma
→ PostgreSQL
```

Route composes HTTP methods and paths. Middleware owns cross-cutting HTTP
concerns. Controllers perform HTTP adaptation, read `request.validated`, map
transport input to a plain application DTO, invoke a use case, and choose the
success HTTP response. Services/use cases own application and business
orchestration and do not depend on Express. Repositories own persistence
queries, Prisma access, persistence mapping, and future database-specific
concerns. Future tenant-owned repositories require verified tenant scope.

No generic `BaseController`, `BaseService`, or `BaseRepository` was introduced.

## Routing Foundation

- `GET /health` is an infrastructure endpoint outside `/api/v1`, returns HTTP
  200, and returns `{ "status": "ok" }`.
- `/api/v1` is the product API namespace and `src/routes/api-v1.js` is the
  composition point for future approved feature routers.
- The current API router intentionally has no fake product endpoints.

## Error Architecture

`ApplicationError` supports an HTTP status, stable code, safe message, and
optional safe details. Foundational codes are:

- `VALIDATION_ERROR`
- `NOT_FOUND`
- `CONFLICT`
- `INTERNAL_ERROR`
- `PAYLOAD_TOO_LARGE`

Responses use the applicable fields in this shape:

```json
{
  "error": {
    "code": "...",
    "message": "...",
    "details": [],
    "requestId": "..."
  }
}
```

Unknown routes produce a structured JSON 404. Unexpected failures produce a
generic 500. Stacks, Prisma details, SQL, environment secrets, filesystem
paths, and raw internal exception messages are not returned.

## JSON / Payload Handling

Express built-in JSON parsing is bounded to `100kb` for general JSON APIs.
Malformed JSON maps to HTTP 400 / `VALIDATION_ERROR`. Oversized JSON maps to
HTTP 413 / `PAYLOAD_TOO_LARGE` with a safe response. Resume and other file
uploads are not JSON API payloads and require separate future file-upload or
object-storage flows.

Express 5.2.1 native rejected-promise forwarding is used. No
`express-async-handler` dependency is required; future async controllers rely
on supported Express 5 semantics.

## Validation Architecture

```js
validateRequest({ body, params, query })
```

Schemas are optional and Zod-backed. Body, params, and query are parsed in
fail-fast order: `body` → `params` → `query`. Parsed values are stored in
`request.validated`. Failures flow through the existing application-error and
central error handler path as HTTP 400 validation errors. Details are bounded
`{ path, message }` values; raw Zod errors and input values are not returned.

Unknown-field behavior and query coercion remain schema-owned. Validation is
currently synchronous; async refinement support is deferred.

## DTO Boundary

```text
Raw HTTP input
→ Zod-validated transport input
→ controller mapping
→ plain JavaScript application DTO
→ service / use case
```

No DTO framework, DTO classes, decorators, or TypeScript interfaces were added.

## Controller Responsibilities

Controllers are thin HTTP adapters. They read only validated input, map it to a
plain application command/DTO, invoke one use case, and shape the response DTO
and success status. They do not access Prisma, perform persistence queries,
authorize, or own transaction internals.

## Service / Use-Case Responsibilities

Services/use cases receive application DTOs, own application/business
orchestration, decide future transaction boundaries, and return application
results without Express objects or HTTP statuses. They do not scatter Prisma
queries where repository boundaries apply.

## Repository Responsibilities

Real future repositories receive the shared process-scoped Prisma client through
explicit dependency composition. They own persistence queries and mappings,
and eventually narrow database-specific translation. Tenant-owned repositories
must receive verified tenant scope from backend request context; a client-
supplied organization ID is never authorization authority.

## Dependency Direction

Routes call controllers; controllers call use cases; use cases call repositories
or approved ports; only repositories/data-access call Prisma. The test-only
layered fixture proves this direction with an in-memory repository double. No
fake production feature route or persistence was added.

## Request Correlation

- Node `crypto.randomUUID()` generates one server-owned ephemeral ID per request.
- The ID is available as `request.requestId` and returned as `X-Request-Id`.
- Client-supplied `X-Request-Id` is ignored and is not authoritative.
- The same ID appears in error bodies and response headers.
- IDs are not persisted and carry no authentication, authorization, or tenant
  meaning.
- AsyncLocalStorage remains deferred.

## Logging Foundation

Unexpected errors may log only safe error type/name and request ID. Request
bodies, credentials, tokens, database URLs, SQL, raw Prisma details, and
sensitive input are not logged. A full structured production observability
framework remains deferred.

## Transaction Convention

Services/use cases decide transaction boundaries. Repositories participate in a
supplied transaction or data-access context where required. Controllers never
start Prisma transactions. Phase 02 PostgreSQL transaction/concurrency
principles remain authoritative. No `TransactionManager` was created.

## Tenant-Scope Convention

Authentication and tenant resolution are not implemented in Phase 03. When
available in later phases, verified membership-derived tenant context flows into
the service/use case and tenant-scoped repository calls. Database integrity does
not replace backend authorization.

## Testing Architecture

The database-independent suite covers routing, health, structured 404,
`ApplicationError`, unexpected errors, Express 5 rejected async flow, malformed
JSON, body/params/query validation, safe validation details, DTO/layered flow,
request correlation, request-ID uniqueness, client override prevention, and
100kb/413 behavior.

- 6 database-independent test files: 29 tests PASS
- 1 Phase 02 database integration file: 7 tests PASS
- `npm run verify`: PASS
- `npm run verify:db`: PASS

## Security Decisions

Phase 03 establishes bounded request bodies, server-side validation, safe parser
and centralized errors, no internal-detail exposure, server-owned correlation
IDs, client-ID distrust, and environment-owned secrets. Frontend-provided
`organizationId` is not trusted for authorization, and database integrity is not
authorization.

Authentication, membership resolution, RBAC, resource authorization, rate
limiting, and full security hardening remain later-phase work.

## Performance Decisions

The foundation uses lightweight middleware, one request-ID generation per
request, the reusable process-scoped Prisma client, a lightweight health check,
bounded JSON parsing, and no blocking operations introduced by Phase 03. No
AsyncLocalStorage, DI container, Redis/cache, queues, workers, or unnecessary
database lookup per request was added.

## Files Created

- `docs/architecture/PHASE_03_HANDOFF.md`

The Phase 03 implementation files and tests were created in the preceding
implementation task and are evidenced by the verification results above.

## Files Modified

- `PROJECT_STATE.md`
- `MASTER_ROADMAP.md`
- `hiringloop-backend/README.md`
- synchronized `hiringloop-backend/docs-shared/` and
  `hiringloop-frontend/docs-shared/` status documents

## Verification Results

- Lint: PASS
- Format check: PASS
- Database-independent tests: PASS (29/29)
- `npm run verify`: PASS
- `npm run verify:db`: PASS
- Prisma validate: PASS
- Prisma generate: PASS
- `hiringloop_dev` migration status: current
- `hiringloop_test` migration status: current
- Health: PASS, HTTP 200, `{ "status": "ok" }`
- Documentation consistency: PASS
- `git diff --check`: PASS

No database reset, migration creation, or package installation/upgrade was
performed for Phase 03 completion.

## Deferred Work

The following are intentional, non-blocking deferrals: authentication,
authorization/RBAC, tenant resolution, real product modules, production feature
repositories, concrete Prisma/PostgreSQL error translation, real transaction
implementations, AsyncLocalStorage, structured production logging, rate
limiting, Redis, background workers, realtime, full security hardening, and AI.
Future file uploads/object storage, provider integrations, and feature schemas
remain deferred to their approved phases.

## Known Issues / Technical Debt

- The repository-local PRD remains missing.
- Prisma tooling retains the three high-severity transitive audit findings
  recorded by Phase 02; no `npm audit fix --force` or package changes were made.
- Concrete database-error translation remains deferred until a real production
  feature repository exists.
- AsyncLocalStorage and structured production observability remain deferred.

These items do not block Phase 03 completion.

## Architecture Decisions Reinforced

The handoff reinforces the modular monolith, domain-owned future modules,
PostgreSQL authority, explicit dependency direction, thin HTTP controllers,
service/use-case orchestration, repository-owned persistence, backend
authorization authority, verified tenant scope, safe DTOs, and feature-by-feature
schema evolution established by the accepted architecture and Phase 00–02
handoffs.

## Definition of Done Review

PASS. The modular request foundation, `/api/v1` composition, preserved health
endpoint, centralized error contract, structured 404, safe unexpected errors,
Express 5 async behavior, bounded JSON and parser mappings, 413 handling, Zod
body/params/query validation, `request.validated`, DTO boundary, controller,
service/use-case, repository, dependency, future transaction and tenant-scope
conventions, request correlation, safe logging seam, HTTP tests, database
regression tests, security review, performance review, and documentation are
evidenced. No generic base abstractions, product scope, or AI were introduced.

## Phase 03 Final Status

COMPLETE. The implementation and integrated verification passed, the formal
handoff is recorded here, and all later capabilities remain intentionally
deferred.

## Next Phase

Phase 04 — Frontend Foundation — NEXT / NOT STARTED.

Do not begin Phase 04 implementation as part of this handoff.
