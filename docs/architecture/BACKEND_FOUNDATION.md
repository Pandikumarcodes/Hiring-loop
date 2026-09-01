# HiringLoop Backend Foundation

## Status and scope

**Phase:** 03 — Backend Foundation  
**Status:** IN PROGRESS  
**Implementation:** COMPLETE / IMPLEMENTED  
**Integrated verification:** ready to rerun after documentation reconciliation  
**Handoff:** NOT YET COMPLETE

This document records the implemented Phase 03 backend request/application
foundation and the intentionally deferred work. Phase 03 does not add product
features, authentication, authorization, tenant resolution, new Prisma models,
migrations, or frontend behavior.

The backend remains a Node.js, Express.js, JavaScript ES-module modular monolith.
The demonstrated request direction is:

```text
Route → Middleware → Controller → Service / Use Case
      → Repository / Data Access → Prisma → PostgreSQL
```

## 1. Implemented now

### Application composition and HTTP boundaries

- `src/app.js` is independently importable; `src/server.js` owns listening,
  database lifecycle, and graceful shutdown.
- `GET /health` remains a technical endpoint and returns `{ "status": "ok" }`.
- `src/routes/api-v1.js` is mounted at `/api/v1` as the future product-router
  composition point. It intentionally has no product endpoints yet.
- Middleware order is request correlation → bounded JSON parsing → health and
  versioned routes → explicit JSON 404 → centralized error handling.
- Express 5 native async rejection propagation is used; no async-wrapper package
  is required.

### Errors and safe responses

- `ApplicationError` provides HTTP status, stable machine-readable code, safe
  message, and optional bounded details.
- Centralized terminal error middleware maps application, malformed-JSON,
  oversized-body, and unexpected failures to predictable JSON envelopes.
- Unknown routes use an explicit `NOT_FOUND` response.
- Malformed JSON is a safe `VALIDATION_ERROR`; the JSON parser is bounded to
  `100kb`, and oversized requests return `413 PAYLOAD_TOO_LARGE`.
- Unexpected failures return `INTERNAL_ERROR` without stacks, SQL, Prisma
  messages, paths, secrets, or request data.

### Validation and application boundaries

- `validateRequest({ body, params, query })` provides reusable Zod validation for
  any selected HTTP input location.
- Parsed values are stored in `request.validated`; downstream controllers consume
  that boundary rather than raw request input.
- Endpoint-owned Zod schemas control unknown-field behavior and deliberate
  coercion. Validation issue details are bounded to safe path/message data.
- The layered fixture proves explicit transport-to-application DTO mapping,
  thin-controller behavior, service/use-case orchestration, and repository/data
  access through dependency injection without a product entity or migration.

### Correlation, logging, security, and performance seams

- Every request receives a server-generated UUID request ID in
  `request.requestId` and the `X-Request-Id` response header.
- Client-provided request IDs are ignored. Error bodies use the same safe ID, and
  unexpected-error logging includes only error name and request ID.
- The `100kb` JSON limit bounds the current API shell; file uploads require a
  future separate object-storage flow.
- The existing process-scoped Prisma client, graceful shutdown, and lightweight
  health endpoint remain in place. No synchronous blocking work, caching, Redis,
  workers, or speculative feature infrastructure was added.

## 2. Layered architecture conventions

Shared cross-cutting infrastructure lives under `src/`. Each future domain module
owns its route, controller, service/use case, repository, and schemas when that
feature is approved:

```text
src/
  app.js
  server.js
  config/
  database/
  errors/
  middleware/
  routes/
  utils/
  modules/<approved-domain>/
```

Controllers adapt HTTP only: read `request.validated`, map to a plain application
DTO, invoke one use case, and shape the response DTO. Services/use cases own
application orchestration and return application results, not Express objects.
Repositories own Prisma query shape, persistence mapping, and the eventual narrow
database translation boundary. Controllers never import Prisma, and use cases do
not scatter persistence queries. Dependencies are supplied explicitly.

The repository/data-access and transaction conventions are established as
boundaries, but no production feature repository or concrete transaction workflow
is created in this phase.

## 3. Current inventory and gap matrix

| Concern | Evidence | Phase 03 state |
|---|---|---|
| App/server separation | `src/app.js`, `src/server.js` | IMPLEMENTED |
| Health endpoint | `GET /health` | IMPLEMENTED |
| Versioned router composition | `src/routes/api-v1.js`, `/api/v1` mount | IMPLEMENTED |
| JSON 404 handling | `src/middleware/not-found.js` | IMPLEMENTED |
| Application error model | `src/errors/application-error.js` | IMPLEMENTED |
| Centralized errors | `src/middleware/error-handler.js` | IMPLEMENTED |
| Express 5 async propagation | native rejected-handler flow and tests | IMPLEMENTED |
| Malformed JSON handling | parser error mapping in error middleware | IMPLEMENTED |
| Bounded body parsing | `express.json({ limit: '100kb' })` | IMPLEMENTED |
| Safe 413 handling | `PAYLOAD_TOO_LARGE` mapping and tests | IMPLEMENTED |
| Zod HTTP validation | `src/middleware/validate-request.js` | IMPLEMENTED |
| Body/params/query support | `validateRequest({ body, params, query })` | IMPLEMENTED |
| Parsed request boundary | `request.validated` | IMPLEMENTED |
| DTO/application boundary | layered request-flow fixture and conventions | IMPLEMENTED |
| Thin controller | layered request-flow fixture | IMPLEMENTED |
| Service/use case | layered request-flow fixture | IMPLEMENTED |
| Repository/data access | injected in-memory fixture; production feature repos deferred | CONVENTION IMPLEMENTED; FEATURE DEFERRED |
| Prisma boundary | Phase 02 process-scoped client and documented ownership | IMPLEMENTED AS FOUNDATION |
| Explicit dependency composition | fixture construction and layer tests | IMPLEMENTED |
| Request correlation | `requestCorrelationMiddleware` | IMPLEMENTED |
| `request.requestId` | server-owned UUID per request | IMPLEMENTED |
| `X-Request-Id` | response header on success and error | IMPLEMENTED |
| Safe error correlation | header/body ID consistency | IMPLEMENTED |
| Safe minimal logging | error name and request ID only | IMPLEMENTED |
| Security review | trust-boundary parsing and safe errors | IMPLEMENTED FOR PHASE 03 SHELL |
| Performance review | bounded payload, reused client, lightweight health | IMPLEMENTED FOR FOUNDATION |
| Concrete Prisma error translation | no feature repository exists yet | DEFERRED-NON-BLOCKING |
| Authentication/authorization/tenant context | no product security behavior in scope | DEFERRED |

## 4. Error and response contract

Known errors use stable codes such as `VALIDATION_ERROR`, `NOT_FOUND`, and
`CONFLICT`. Unexpected failures use `INTERNAL_ERROR`; oversized bodies use
`PAYLOAD_TOO_LARGE`. The safe shape is:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [{ "path": ["name"], "message": "Required" }],
    "requestId": "..."
  }
}
```

Details appear only when safe and relevant. Validation currently uses HTTP 400.
The existing health success response remains direct/resource-oriented; no generic
success envelope was introduced.

Concrete Prisma/PostgreSQL error mappings will be based on real feature operations
and tested outcomes. Raw database errors remain internal and are never serialized.

## 5. Intentional deferrals

The following are non-blocking deferrals and are not Phase 03 requirements:

- authentication and authorization/RBAC;
- tenant resolution and real product modules;
- production feature repositories;
- concrete Prisma/PostgreSQL error translation and real transaction
  implementations;
- AsyncLocalStorage and a structured production logging framework;
- rate limiting, Redis, background workers, and realtime;
- full security hardening and AI.

Feature-specific schemas, migrations, providers, uploads, audit behavior, and
production observability selection remain deferred to their approved phases.

## 6. Verification evidence

Database-independent tests cover routing, error contracts, malformed JSON, body
limits, validation, `request.validated`, DTO shaping, layered request flow,
correlation, and safe logging. The verified baseline is 29 database-independent
tests and 7 database integration tests. The required gates are `npm run verify`
and `npm run verify:db`, alongside Prisma validation/generation, migration-status
checks for `hiringloop_dev` and `hiringloop_test`, and a health check.

Documentation synchronization is performed by `node scripts/sync-shared-docs.js`;
the synchronized `PROJECT_STATE.md` must report implementation complete while
Phase 03 itself remains IN PROGRESS and its handoff remains incomplete.

## 7. Phase 03 boundary

No authentication, authorization, tenant implementation, product feature, AI,
frontend application change, TypeScript, Prisma schema change, migration, package
installation/upgrade, or database reset belongs to this reconciliation or to the
implemented Phase 03 foundation.

**Next task after verification passes:** Phase 03 HANDOFF + COMPLETION. This
document does not mark the phase complete and does not create the handoff.
