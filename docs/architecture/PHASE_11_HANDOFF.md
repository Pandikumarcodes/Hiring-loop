# Phase 11 — Application Form Builder Handoff

## Phase summary and final status

**Phase 11 — Application Form Builder: COMPLETE.** This phase delivers the
authenticated, recruiter-side configuration of a versioned Job application
form. Prompt 1 database, Prompt 2 backend, Prompt 3 frontend, Prompt 4 audit,
and Manual QA are complete. Manual QA: **PASS**.

## Scope completed and architecture

The modular-monolith slice is `Organization -> Job -> ApplicationForm ->
ApplicationFormVersion -> ApplicationFormQuestion ->
ApplicationFormQuestionOption`. PostgreSQL is authoritative and Organization
is the tenant boundary. Routes validate with Zod, controllers delegate to use
cases, repositories own scoped persistence and transactions, and DTO mappers
return only builder data. The frontend feature owns its route, API client,
query keys, mutation hooks, utilities, and page.

## Database design and migrations

`ApplicationForm` is unique per Job and has an active version. Versions are
Draft or Published; questions and normalized options are version-owned. All
form records carry `organizationId`, parent FKs are restrictive, and ordering
uses positive `sortOrder` values (1000 spacing). Applied Phase 11 migrations:

- `hiringloop-backend/prisma/migrations/20260908120000_application_form_builder_foundation/migration.sql`
- `hiringloop-backend/prisma/migrations/20260908123000_application_form_active_version_deferred_fk/migration.sql`
- `hiringloop-backend/prisma/migrations/20260908124500_application_form_active_version_ownership/migration.sql`

The foundation migration backfills every existing Job with exactly one empty,
published V1 and an active link. New Job creation atomically creates the Job,
default Pipeline, default empty published V1, and form link.

The active-version FK is deferred for the intentional circular creation flow.
The final composite FK binds `(activeVersionId, formId, organizationId)` to the
same version, form, and tenant; it prevents a valid version from another form
or tenant becoming active.

## Default and version lifecycle

Every Job starts with a published empty V1. Creating a draft clones the active
published version's questions and options using new row IDs while preserving
logical `questionKey` values. A form has at most one Draft (partial unique
index). Publish atomically marks the Draft Published and makes it active;
previous published snapshots remain immutable historical versions. Discard
removes only the Draft and its draft-owned questions/options.

## Question model, types, ordering, and limits

Questions contain type, label, optional description/placeholder, required,
logical key, and order. Choice options contain label, value, and order. The
supported types are `SHORT_TEXT`, `LONG_TEXT`, `NUMBER`, `YES_NO`,
`SINGLE_SELECT`, `MULTI_SELECT`, `DATE`, and `URL`. Choice types require 2–50
unique-valued options; non-choice types have no options. Question order is
persisted by the dedicated reorder API; option order is persisted with the
question create/update payload. Limits are 100 custom questions and 50 options
per choice question.

## Concurrency, DTOs, and validation

Draft mutations require a positive `expectedRevision`. The version revision is
atomically incremented only after a successful mutation. Stale writers receive
HTTP 409 `FORM_VERSION_CONFLICT`; failed validation or limit checks create no
partial data and do not increment revision. DTOs exclude server-owned tenant
and relation fields. Strict Zod schemas validate UUID parameters, required
configuration, question types, choice-option rules, unique values, bounds, and
unknown fields.

## Authorization, tenant isolation, and security

ADMIN and RECRUITER can view and configure; HIRING_MANAGER can view only;
INTERVIEWER has no access. Every request requires authentication, active
membership/tenant context, and centralized permission enforcement; mutations
also require CSRF protection. Resource ownership is checked across
Organization, Job, form, version, and question, so valid cross-tenant or
wrong-Job IDs cannot read or mutate data. Plain text is rendered as text, raw
database errors are not exposed, and published snapshots cannot be mutated.

## Backend APIs and implementation

Final API count: **8 planned / 8 actual**.

1. `GET /organizations/:organizationId/jobs/:jobId/application-form`
2. `POST /organizations/:organizationId/jobs/:jobId/application-form/draft`
3. `POST /organizations/:organizationId/jobs/:jobId/application-form/draft/questions`
4. `PATCH /organizations/:organizationId/jobs/:jobId/application-form/draft/questions/:questionId`
5. `DELETE /organizations/:organizationId/jobs/:jobId/application-form/draft/questions/:questionId`
6. `PUT /organizations/:organizationId/jobs/:jobId/application-form/draft/questions/order`
7. `POST /organizations/:organizationId/jobs/:jobId/application-form/draft/publish`
8. `DELETE /organizations/:organizationId/jobs/:jobId/application-form/draft`

The feature module is mounted beneath the existing Job router. Its transactions
clone, mutate, reorder, publish, and discard only Draft data; repository
checks also fail safely if corrupted active-version state is encountered.

## Frontend architecture and builder UX

The authenticated route is
`/app/organizations/:organizationId/jobs/:jobId/application-form`, with a
permission-gated Job Detail entry point. One TanStack Query aggregate key,
`applicationFormKeys.builder(organizationId, jobId)`, fetches the active
published version and optional draft. Each of the seven mutation hooks replaces
that exact cache entry on success; a conflict invalidates only that entry and
offers explicit reload rather than retrying stale input.

The responsive builder/preview two-column layout stacks below extra-large
screens. It provides Draft creation, question CRUD, required/optional state,
question and option ordering, choice editing, publish/discard confirmations,
version state, and a disabled visual configuration preview only. It has no
candidate submission behavior. Keyboard-accessible Move Up/Move Down controls,
native controls and labels, dialog focus behavior, disabled boundary controls,
alert feedback, and readable responsive wrapping support accessibility.

## Performance

The builder fetches a single scoped aggregate. Ordered child indexes support
the query shape; cache writes are exact rather than broad invalidations. No
cache infrastructure, speculative indexes, or AI workload was added.

## Testing, audit, and manual QA

Backend real-PostgreSQL foundation and HTTP/integration tests cover schema
constraints, default-form creation/backfill, lifecycle, immutability,
authorization, CSRF, tenant/wrong-Job isolation, revision conflicts, limits,
ordering, and active-version ownership. Frontend focused API, cache, route,
builder, permission, conflict, ordering, boundary, dialog, and
accessibility-sensitive interaction tests pass. The bounded frontend run
records 34 files / 199 tests passing.

Prompt 4 audit: **PASS WITH TARGETED FIXES**. The critical targeted fix added
the deferred active-version ownership composite FK and defensive serving check.
Manual QA: **PASS**.

Known non-blocking warnings: the existing Vite chunk-size advisory and the
unrelated React `act(...)` warning remain applicable where emitted. Known Phase
11 issues: **NONE**. No additional Phase 11 technical debt was identified.

## Phase boundary and next phase

Phase 11 contains no candidate submission flow, Candidate/Application or
ApplicationAnswer persistence, resume/document upload, public Apply page,
confirmation, pipeline placement, candidate email workflow, AI screening,
embeddings, or LLM features. These remain deferred.

**Next phase: Phase 12 — Candidate Application Flow: NOT STARTED.**

## Files created and major files modified

Created: this handoff; the three migrations; the backend
`src/modules/application-forms/` module and database tests; frontend
`src/features/application-form/` and `docs-shared/PHASE_11_FRONTEND.md`.

Major modifications: `prisma/schema.prisma`, Job creation/router wiring,
permissions and application errors, Job Detail/route wiring, Phase 11-focused
tests, `docs/DATABASE_DESIGN.md`, `docs/architecture/PHASE_11_BACKEND.md`,
`PROJECT_STATE.md`, `MASTER_ROADMAP.md`, and `README.md`.
