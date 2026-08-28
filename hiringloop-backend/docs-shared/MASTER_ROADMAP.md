# HiringLoop Master Roadmap

## Authority and Status

This document is the authoritative end-to-end implementation roadmap for HiringLoop. It is governed by `PROJECT_INSTRUCTIONS.md`, `PROJECT_STATE.md`, and the architecture documents under `docs/architecture/` and `docs/adr/`.

HiringLoop remains one Git repository containing separate `hiringloop-frontend/` and `hiringloop-backend/` applications. The backend is a modular monolith with background workers where justified. PostgreSQL is the source of truth. AI engineering begins only after all Software Engineering phases are complete.

The repository currently has no local PRD file. PRD traceability below uses only the functional requirement identifiers supplied for this roadmap task; requirement wording and acceptance detail remain a documentation gap. Add a repository-local PRD before feature implementation expands.

### Status legend

- **DONE:** completed and evidenced in the repository.
- **IN PROGRESS:** current work.
- **NOT STARTED:** no implementation evidence exists.
- **BLOCKED:** cannot proceed without a documented external decision or artifact.

### Current status after ARCH-06 closure

- `SETUP-00 — Repository Structure` — **DONE**
- `ARCH-01 — Core System Architecture Documentation` — **DONE**
- `PLAN-01 — Authoritative Master Roadmap` — **DONE**
- `ARCH-02 — Domain Model` — **DONE**
- `ARCH-03 — Authorization & Security Architecture` — **DONE**
- `ARCH-04 — Infrastructure Boundaries` — **DONE**
- `ARCH-05 — Quality Attributes & Non-Functional Requirements` — **DONE**
- `ARCH-06 — Phase 00 Final Review / Closure` — **DONE**
- `Phase 00 — Product & Architecture Planning` — **COMPLETE**
- `Phase 01 — Project Foundation` — **NOT STARTED / NEXT**

The historical task detail below remains the ordered roadmap definition. Its original Phase 00 in-progress label is superseded by this closure status after ARCH-06 acceptance.

### Historical status before ARCH-06 closure

- `SETUP-00 — Repository Structure` — **DONE**
- `ARCH-01 — Core System Architecture Documentation` — **DONE**
- `PLAN-01 — Authoritative Master Roadmap` — **DONE**
- `Phase 00 — Product & Architecture Planning` — **IN PROGRESS**
- All other Software Engineering phases — **NOT STARTED**
- All AI Engineering phases — **NOT STARTED / GATED**

## Execution Discipline

Major phases are not implemented with one giant Codex prompt. Execute each meaningful feature as:

```text
Major Phase
  → Feature
  → Analyze
  → Design
  → Database
  → Backend
  → Frontend
  → Security Review
  → Performance Review
  → Tests
  → Fix
  → Verify
  → Document
  → Commit
```

Not every feature needs every step, but significant features must explicitly assess the applicable steps. Each focused prompt must name its phase, feature, allowed scope, dependencies, acceptance criteria, and verification commands. Do not start a later phase while a dependency or Definition of Done in this roadmap remains unmet.

## PRD Traceability

The following is the current traceability index. It is intentionally limited to the supplied requirement IDs because the repository-local PRD is unavailable.

| PRD requirement | Primary roadmap coverage |
|---|---|
| FR-01 Authentication | Phase 05 |
| FR-02 Organization Management | Phase 06 |
| FR-03 Authorization | Phase 07 |
| FR-04 Job Management | Phase 08 |
| FR-06 Application Form | Phase 10 |
| FR-07 Public Career Page | Phase 10 |
| FR-08 Candidate Management | Phase 11 |
| FR-09 Resume Management | Phase 12 |
| FR-12 Hiring Pipeline | Phase 13 |
| FR-13 Candidate Activity Timeline | Phase 13 |
| FR-14 Interview Scheduling | Phase 14 |
| FR-15 Interview Scorecards | Phase 15 |
| FR-16 Team Collaboration | Phase 15 |
| FR-17 Candidate Communication | Phase 16 |
| FR-19 Talent Pool | Phase 17 |
| FR-20 Offer Management | Phase 17 |
| FR-21 Hiring Analytics | Phase 18 |
| FR-22 Search | Phase 13 |
| FR-23 Notifications | Phase 16 |
| FR-24 Audit Logging | Phase 18 |

AI-specific requirements, if present in the missing PRD, belong only to the AI roadmap.

# Part A — Software Engineering

Software Engineering must be completed before AI Engineering starts.

## Phase 00 — Product & Architecture Planning — IN PROGRESS

- **Objective:** complete the product and architecture planning artifacts required before framework and feature implementation.
- **Features/sub-features:** domain model; security architecture; infrastructure boundaries; quality attributes/NFRs; final planning review.
- **Engineering concepts to learn:** domain modeling, threat modeling, non-functional requirements, architecture governance, traceability.
- **Frontend work:** define frontend responsibilities, UX/accessibility quality expectations, and later foundation constraints; no implementation.
- **Backend work:** define module/use-case, authorization, integration, and persistence boundaries; no implementation.
- **Database work:** define conceptual ownership and modeling constraints; no schema or migrations.
- **Security considerations:** establish tenant isolation, authorization authority, trust boundaries, secrets, files, and audit requirements.
- **Performance considerations:** establish measurable quality expectations without speculative indexes or cache design.
- **Reliability considerations:** establish failure, retry, recovery, and provider-fallibility expectations.
- **Testing expectations:** review artifacts for internal consistency, traceability, and acceptance criteria.
- **Documentation outputs:** ARCH-02 through ARCH-06 artifacts and updated planning state.
- **Dependencies:** SETUP-00 and ARCH-01.
- **Definition of Done:** all ordered Phase 00 tasks are accepted, documentation gaps are visible, and Phase 00 is explicitly closed only after ARCH-06.

### Ordered tasks

#### SETUP-00 — Repository Structure — DONE

- **Objective:** establish one repository with separate frontend, backend, and documentation areas.
- **Expected files:** repository directories, control files, and shared documentation structure.
- **Concepts learned:** repository boundaries, application separation, project controls.
- **Dependencies:** none.
- **Acceptance criteria:** one Git repository exists; frontend/backend directories are separate; no nested repository or framework initialization was introduced.

#### ARCH-01 — Core System Architecture Documentation — DONE

- **Objective:** define the modular-monolith architecture, boundaries, data flow, security, performance, and ADR.
- **Expected files:** `docs/architecture/SYSTEM_ARCHITECTURE.md`, `MODULE_BOUNDARIES.md`, `ARCHITECTURE_PRINCIPLES.md`, `docs/adr/ADR-001-modular-monolith.md`.
- **Concepts learned:** modular monoliths, ownership, trust boundaries, source of truth, orchestration.
- **Dependencies:** SETUP-00.
- **Acceptance criteria:** required architecture docs exist; AI is a future boundary only; no application implementation was added.

#### ARCH-02 — Domain Model

- **Objective:** define the conceptual entities, relationships, lifecycle states, invariants, and terminology for the recruitment domain.
- **Expected files:** `docs/architecture/DOMAIN_MODEL.md`, with any approved ADR updates.
- **Concepts learned:** aggregates, entity identity, lifecycle modeling, invariants, domain vocabulary.
- **Dependencies:** ARCH-01; repository-local PRD recommended but not currently available.
- **Acceptance criteria:** Candidate/Application, Job/Pipeline, User/Membership, Activity/Audit, and Offer/Hire distinctions are explicit; ownership and lifecycle questions are recorded; no schema or migration is implemented.

#### ARCH-03 — Authorization & Security Architecture

- **Objective:** define authentication, authorization, tenant isolation, roles/permissions, trust boundaries, threat assumptions, and security-critical audit rules.
- **Expected files:** `docs/security/SECURITY_ARCHITECTURE.md`, with ADRs if needed.
- **Concepts learned:** least privilege, RBAC/permission checks, tenant isolation, threat modeling, secure data exposure.
- **Dependencies:** ARCH-01 and ARCH-02.
- **Acceptance criteria:** authorization decision points, organization-scoped data access, secret handling, file access, abuse controls, and audit requirements are testable and unambiguous; no auth implementation is added.

#### ARCH-04 — Infrastructure Boundaries

- **Objective:** specify boundaries and responsibilities for PostgreSQL, object storage, Redis, workers, email, calendar, and deployment providers.
- **Expected files:** `docs/architecture/INFRASTRUCTURE_BOUNDARIES.md`, with integration ADRs if required.
- **Concepts learned:** ports/adapters, infrastructure responsibility, provider fallibility, operational boundaries.
- **Dependencies:** ARCH-01 through ARCH-03.
- **Acceptance criteria:** source-of-truth, failure, retry, credential, and ownership rules are documented; no infrastructure service is initialized.

#### ARCH-05 — Quality Attributes & Non-Functional Requirements

- **Objective:** define measurable targets and constraints for security, performance, reliability, accessibility, operability, and maintainability.
- **Expected files:** `docs/architecture/QUALITY_ATTRIBUTES.md` and/or `docs/architecture/NFRS.md`.
- **Concepts learned:** quality attributes, service-level objectives, capacity assumptions, testable non-functional requirements.
- **Dependencies:** ARCH-01 through ARCH-04.
- **Acceptance criteria:** priorities, provisional targets, measurement methods, and deferred decisions are recorded without premature cache keys or indexes.

#### ARCH-06 — Phase 00 Final Review / Closure

- **Objective:** review planning artifacts for consistency, traceability, readiness, and scope compliance.
- **Expected files:** `docs/architecture/PHASE-00-REVIEW.md`, updated `PROJECT_STATE.md`, and roadmap status updates only if all criteria pass.
- **Concepts learned:** architecture review, decision records, traceability, readiness gates.
- **Dependencies:** SETUP-00, ARCH-01 through ARCH-05, and repository-local PRD gap assessment.
- **Acceptance criteria:** all Phase 00 artifacts are reviewed; contradictions are resolved or recorded; PRD gap is visible; Phase 00 is marked complete only if every required planning artifact exists and is accepted.

### Phase 00 Definition of Done

All ordered tasks are complete, required planning documents are reviewed, the roadmap and state agree, and a repository-local PRD gap is either closed or explicitly accepted as a follow-up. No application framework or product feature is implemented.

## Phase 01 — Project Foundation — NOT STARTED

- **Objective:** initialize the separate frontend and backend applications with minimal, reproducible development foundations.
- **Features/sub-features:** framework setup; independent package/config files; environment conventions; linting/formatting; health endpoint/shell; baseline scripts.
- **Engineering concepts to learn:** application bootstrapping, configuration, dependency boundaries, local development workflows.
- **Frontend work:** initialize React shell, routing foundation, error boundary, environment access.
- **Backend work:** initialize Node.js/Express shell, route registration, error handling, health endpoint.
- **Database work:** document connection contract only; no schema beyond approved foundation work.
- **Security considerations:** secret handling, safe configuration, dependency hygiene, non-production defaults.
- **Performance considerations:** minimal startup work, bundle baseline, request timeout policy.
- **Reliability considerations:** deterministic scripts, graceful shutdown, health/readiness distinction.
- **Testing expectations:** smoke tests for startup, health, and build/lint commands.
- **Documentation outputs:** setup guide, environment reference, application runbook.
- **Dependencies:** Phase 00 complete.
- **Definition of Done:** both apps run independently with separate dependencies/configuration and verified baseline scripts; no product features are included.

## Phase 02 — Database Foundation — NOT STARTED

- **Objective:** establish the PostgreSQL/Prisma foundation and migration discipline.
- **Features/sub-features:** Prisma setup; initial conventions; migration workflow; seed strategy; transaction/test database approach.
- **Engineering concepts to learn:** relational modeling, migrations, constraints, transactions, connection lifecycle.
- **Frontend work:** define typed API/data contracts only where needed for foundation.
- **Backend work:** database client lifecycle, repository conventions, transaction boundary conventions.
- **Database work:** initial metadata/identity schema only after approved domain model; migrations and constraints.
- **Security considerations:** least-privilege database credentials, secret separation, protected migrations.
- **Performance considerations:** connection pooling baseline; no speculative indexes.
- **Reliability considerations:** migration repeatability, backup/restore assumptions, seed idempotence.
- **Testing expectations:** migration up/down policy, repository smoke tests, isolated test database checks.
- **Documentation outputs:** database conventions and local setup/runbook.
- **Dependencies:** Phase 01 and Phase 00 domain model.
- **Definition of Done:** schema changes are reproducible and tested; PostgreSQL remains authoritative; no feature schema is added without an approved feature scope.

## Phase 03 — Backend Foundation — NOT STARTED

- **Objective:** establish the modular-monolith request and application layers.
- **Features/sub-features:** module layout; routes; middleware pipeline; validation; error model; DTO conventions; repository/service patterns.
- **Engineering concepts to learn:** layered architecture, dependency direction, use cases, DTOs, middleware.
- **Frontend work:** agree on API error and pagination contract; no product screens.
- **Backend work:** module registration, request context, validation and error handling, logging seam.
- **Database work:** use Phase 02 repositories and transactions; no cross-module direct access.
- **Security considerations:** trust-boundary validation, secure errors, request correlation, auth seam.
- **Performance considerations:** bounded payloads, request timeouts, avoid eager loading defaults.
- **Reliability considerations:** graceful errors, correlation IDs, shutdown handling, idempotency guidance.
- **Testing expectations:** unit tests for validation/error contracts and integration test for request flow.
- **Documentation outputs:** backend structure guide and API conventions.
- **Dependencies:** Phase 02.
- **Definition of Done:** a thin-controller, service/use-case, repository, Prisma, PostgreSQL flow is demonstrated without product-specific behavior.

## Phase 04 — Frontend Foundation — NOT STARTED

- **Objective:** establish an accessible, testable React application shell consuming server state safely.
- **Features/sub-features:** routing; layout; design primitives; query/cache foundation; form primitives; loading/error/empty states.
- **Engineering concepts to learn:** component boundaries, client/server state, accessibility, rendering performance.
- **Frontend work:** shell, navigation placeholders, route protection seam, API client, query conventions.
- **Backend work:** stable health/error contract only.
- **Database work:** none beyond existing foundation.
- **Security considerations:** no trusted authorization decisions in UI; safe token/session handling contract.
- **Performance considerations:** avoid network waterfalls, code splitting baseline, render budget awareness.
- **Reliability considerations:** error boundaries, retry policy, offline/slow-state UX decisions.
- **Testing expectations:** component, routing, accessibility smoke, and API-client tests.
- **Documentation outputs:** frontend structure and UI-state conventions.
- **Dependencies:** Phase 03.
- **Definition of Done:** frontend shell builds, routes, handles standard states, and passes baseline tests without product workflows.

## Phase 05 — Authentication — NOT STARTED

- **Objective:** implement secure identity authentication and session lifecycle. (FR-01)
- **Features/sub-features:** registration/invitation entry points; login/logout; session refresh/revocation; password recovery or provider flow as approved.
- **Engineering concepts to learn:** session security, credential lifecycle, secure cookies/tokens, identity boundaries.
- **Frontend work:** auth forms, session bootstrap, protected route UX, validation and recovery states.
- **Backend work:** auth routes/middleware, credential/provider adapters, session lifecycle, secure DTOs.
- **Database work:** identity, credential, session, and verification persistence.
- **Security considerations:** hashing, rate limits, enumeration resistance, CSRF/XSS posture, secret protection.
- **Performance considerations:** bounded auth queries and session lookup path.
- **Reliability considerations:** revocation, provider failure handling, recovery retries and observability.
- **Testing expectations:** happy/negative/security tests, session expiry, isolation, rate-limit tests.
- **Documentation outputs:** auth flow, threat notes, API contract.
- **Dependencies:** Phases 02–04; ARCH-03.
- **Definition of Done:** authenticated sessions work securely with backend enforcement and tested failure paths.

## Phase 06 — Organization & Multi-Tenancy — NOT STARTED

- **Objective:** implement tenant organization lifecycle and organization-scoped context. (FR-02)
- **Features/sub-features:** create organization; organization settings; active organization context; tenant-scoped resource conventions.
- **Engineering concepts to learn:** tenancy models, context propagation, ownership, isolation invariants.
- **Frontend work:** organization onboarding/switching/settings UX.
- **Backend work:** tenant resolution middleware, organization services, scoped DTOs and repositories.
- **Database work:** organizations, membership linkage, tenant foreign keys and constraints.
- **Security considerations:** never trust frontend organization IDs; enforce membership and scope at backend/query level.
- **Performance considerations:** efficient context lookup and scoped pagination.
- **Reliability considerations:** safe organization lifecycle transitions and transaction boundaries.
- **Testing expectations:** cross-tenant access tests, context tests, constraint and concurrency tests.
- **Documentation outputs:** tenancy guide and data-access checklist.
- **Dependencies:** Phase 05; ARCH-02/03.
- **Definition of Done:** every tenant-owned path is organization-scoped and cross-tenant tests pass.

## Phase 07 — Team Management & Authorization — NOT STARTED

- **Objective:** manage organization members, roles, permissions, and authorization decisions. (FR-03)
- **Features/sub-features:** invite/remove members; roles; permission checks; protected actions; membership status.
- **Engineering concepts to learn:** RBAC/ABAC tradeoffs, least privilege, policy enforcement, authorization testing.
- **Frontend work:** member management, permission-aware controls, forbidden states.
- **Backend work:** membership services, policy checks, authorization middleware/use cases.
- **Database work:** memberships, roles/permissions, invitation state and constraints.
- **Security considerations:** backend authority, privilege escalation prevention, invitation security, audit events.
- **Performance considerations:** avoid repeated permission lookups; measure policy path.
- **Reliability considerations:** idempotent invitations and safe membership transitions.
- **Testing expectations:** matrix tests by role/action/tenant plus negative tests.
- **Documentation outputs:** permission matrix and authorization guide.
- **Dependencies:** Phase 06; ARCH-03.
- **Definition of Done:** documented permission matrix is enforced server-side and verified across tenants and roles.

## Phase 08 — Job Management — NOT STARTED

- **Objective:** manage job requisitions and job lifecycle. (FR-04)
- **Features/sub-features:** draft/edit/publish/pause/close; requirements; ownership; list/detail/filter views.
- **Engineering concepts to learn:** lifecycle state machines, CRUD boundaries, validation, optimistic UI.
- **Frontend work:** recruiter job screens, forms, lifecycle controls, pagination and states.
- **Backend work:** job use cases, lifecycle rules, scoped queries, DTOs.
- **Database work:** job and requirement persistence, constraints, query-supporting indexes based on actual patterns.
- **Security considerations:** role-based lifecycle actions, tenant scope, sensitive internal fields.
- **Performance considerations:** paginated lists, selective fields, no N+1 detail loading.
- **Reliability considerations:** guarded transitions, idempotent updates, audit generation.
- **Testing expectations:** lifecycle matrix, validation, authorization, repository and API tests.
- **Documentation outputs:** job lifecycle and API/user workflow docs.
- **Dependencies:** Phase 07.
- **Definition of Done:** authorized users can manage jobs through valid lifecycle transitions with tested tenant isolation.

## Phase 09 — Pipeline Configuration — NOT STARTED

- **Objective:** configure organization/job pipeline stages and valid transitions.
- **Features/sub-features:** default stages; custom stages; ordering; transition rules; stage history contract.
- **Engineering concepts to learn:** workflow modeling, invariants, configuration ownership, event history.
- **Frontend work:** stage configuration UI and validation.
- **Backend work:** pipeline configuration use cases, transition validation, collaboration contracts.
- **Database work:** pipeline/stage configuration and constraints; no candidate movement yet.
- **Security considerations:** restrict configuration to authorized roles; tenant scope and audit.
- **Performance considerations:** load configuration efficiently; avoid repeated stage queries.
- **Reliability considerations:** prevent invalid/deleting-in-use stages; transactional updates.
- **Testing expectations:** transition/configuration matrix and concurrency tests.
- **Documentation outputs:** pipeline configuration contract and state diagram.
- **Dependencies:** Phases 06–08.
- **Definition of Done:** valid pipeline configuration is persisted and safely consumable by later application workflows.

## Phase 10 — Career Site & Application Forms — NOT STARTED

- **Objective:** publish public career pages and collect job applications. (FR-06, FR-07)
- **Features/sub-features:** public job listing/detail; career page; configurable application form; submission confirmation; spam/abuse controls.
- **Engineering concepts to learn:** public/private boundaries, form design, validation, rate limiting, SEO basics.
- **Frontend work:** public responsive pages, accessible forms, validation, submission/error UX.
- **Backend work:** public read endpoints, form definition/validation, submission use case, secure DTOs.
- **Database work:** public job projection/read queries, form configuration, submission records.
- **Security considerations:** untrusted public input, abuse prevention, PII minimization, safe file boundary.
- **Performance considerations:** cacheable public reads where justified, efficient form payloads, CDN-friendly assets.
- **Reliability considerations:** duplicate submission handling, clear confirmation, durable persistence before follow-up work.
- **Testing expectations:** accessibility, validation, abuse, public/private isolation, end-to-end submission tests.
- **Documentation outputs:** public API/form contract and moderation/abuse notes.
- **Dependencies:** Phases 08–09.
- **Definition of Done:** a public user can discover an eligible job and submit a validated application without exposing private tenant data.

## Phase 11 — Applications & Candidates — NOT STARTED

- **Objective:** manage reusable candidate profiles and job-specific applications. (FR-08)
- **Features/sub-features:** candidate create/update/search; application review; deduplication/merge policy; source tracking; statuses.
- **Engineering concepts to learn:** entity separation, identity resolution, aggregate boundaries, PII handling.
- **Frontend work:** candidate/application list and detail views, review workflows, empty/loading/error states.
- **Backend work:** candidate and application services, association rules, secure DTOs, cross-module orchestration.
- **Database work:** candidate/application relationships, unique/foreign-key constraints, query indexes from real patterns.
- **Security considerations:** PII access, tenant scope, field-level response control, audit critical changes.
- **Performance considerations:** pagination, selective candidate/application joins, avoid N+1.
- **Reliability considerations:** idempotent submission/import behavior, merge safety, transaction boundaries.
- **Testing expectations:** candidate/application distinction, duplicate, access, lifecycle, and API tests.
- **Documentation outputs:** candidate/application domain guide and workflows.
- **Dependencies:** Phases 06, 07, 08, 10.
- **Definition of Done:** candidate identity and application lifecycle are separate, scoped, tested concepts.

## Phase 12 — Resume & File Management — NOT STARTED

- **Objective:** add secure resume/file metadata and object-storage boundary. (FR-09)
- **Features/sub-features:** upload request; metadata; replace/delete policy; download/access flow; file validation.
- **Engineering concepts to learn:** object storage, signed URLs, content validation, asynchronous processing boundaries.
- **Frontend work:** upload/progress/error/download UX and accessible file controls.
- **Backend work:** file metadata service, storage adapter contract, authorization and signed URL issuance.
- **Database work:** file metadata, ownership, version/status records.
- **Security considerations:** private-by-default access, MIME/content checks, malware scanning boundary, server-side credentials.
- **Performance considerations:** direct/object-storage transfer where appropriate; avoid proxying large files unnecessarily.
- **Reliability considerations:** resumable/retryable uploads, orphan cleanup, provider failure status.
- **Testing expectations:** authorization, file limits, signed URL, failure, and integration-contract tests.
- **Documentation outputs:** file lifecycle and storage adapter documentation.
- **Dependencies:** Phase 11; ARCH-04.
- **Definition of Done:** authorized users can manage private files through an adapter without storing file bytes as domain truth in PostgreSQL.

## Phase 13 — Hiring Pipeline, Activity & Search — NOT STARTED

- **Objective:** move applications through hiring workflows, expose activity timelines, and provide scoped search. (FR-12, FR-13, FR-22)
- **Features/sub-features:** application stage movement; history; activity timeline; filters; keyword search; pagination.
- **Engineering concepts to learn:** workflow orchestration, append-only history, search tradeoffs, query design.
- **Frontend work:** pipeline board/list, candidate activity timeline, search/filter UX and states.
- **Backend work:** transition use cases, activity generation, search endpoints, DTOs and policy checks.
- **Database work:** stage history/activity records and query-supporting indexes based on measured patterns.
- **Security considerations:** scoped search/results, redact sensitive activity, distinguish activity from audit.
- **Performance considerations:** pagination, query plans, avoid N+1 board loading, bounded search.
- **Reliability considerations:** transactional stage changes/history, idempotent commands, consistent ordering.
- **Testing expectations:** transition invariants, search relevance/scope, pagination, concurrency, audit/activity tests.
- **Documentation outputs:** workflow/state docs, search contract, activity-vs-audit guidance.
- **Dependencies:** Phases 09 and 11–12.
- **Definition of Done:** authorized teams can manage and search application workflows with durable, tenant-scoped history.

## Phase 14 — Interview Scheduling & Calendar — NOT STARTED

- **Objective:** schedule interviews and integrate calendars through an adapter. (FR-14)
- **Features/sub-features:** interview event CRUD; participants; reschedule/cancel; availability contract; provider sync boundary.
- **Engineering concepts to learn:** time zones, distributed provider state, idempotency, integration adapters.
- **Frontend work:** scheduling forms, timezone-safe display, calendar status/error UX.
- **Backend work:** interview use cases, validation, provider adapter orchestration, status reconciliation.
- **Database work:** interview events, participants, provider references, sync status.
- **Security considerations:** participant privacy, authorization, OAuth token protection, tenant scope.
- **Performance considerations:** bounded availability queries; external calls off request path where justified.
- **Reliability considerations:** retries, idempotency keys, provider drift, conflict handling.
- **Testing expectations:** timezone, authorization, adapter contract, retry/conflict, end-to-end tests.
- **Documentation outputs:** scheduling state model and calendar integration contract.
- **Dependencies:** Phases 11, 13, and ARCH-04.
- **Definition of Done:** interview lifecycle is authoritative in PostgreSQL and calendar sync failures are visible and recoverable.

## Phase 15 — Scorecards & Collaboration — NOT STARTED

- **Objective:** collect interview scorecards and support team review workflows. (FR-15, FR-16)
- **Features/sub-features:** scorecard templates; assignments; submission; review; mentions/comments as approved; collaboration states.
- **Engineering concepts to learn:** structured feedback, permissions, concurrency, collaboration UX.
- **Frontend work:** scorecard forms, review views, collaboration controls, autosave policy if justified.
- **Backend work:** scorecard/feedback use cases, assignment rules, secure collaboration DTOs.
- **Database work:** templates, assignments, responses, comments/review state.
- **Security considerations:** interviewer visibility, confidential feedback, authorization, audit of critical changes.
- **Performance considerations:** selective response loading and paginated comments.
- **Reliability considerations:** draft/submission distinction, idempotent saves, conflict policy.
- **Testing expectations:** permission matrix, validation, concurrency, accessibility, API and integration tests.
- **Documentation outputs:** scorecard model, visibility rules, collaboration workflow.
- **Dependencies:** Phases 07 and 14.
- **Definition of Done:** authorized interviewers can submit and review feedback with documented visibility and lifecycle rules.

## Phase 16 — Candidate Communication & Notifications — NOT STARTED

- **Objective:** manage communication intent and user notifications. (FR-17, FR-23)
- **Features/sub-features:** templates; compose/send request; delivery status; notification inbox; preferences; event triggers.
- **Engineering concepts to learn:** message intent vs delivery, async boundaries, retries, preference enforcement.
- **Frontend work:** composer/templates, inbox, preferences, delivery/error states.
- **Backend work:** communication and notification services, provider adapter contract, status handling.
- **Database work:** message/template/notification records, preferences, provider references.
- **Security considerations:** PII, recipient validation, unsubscribe/consent, server-side credentials, tenant scope.
- **Performance considerations:** batch/list pagination; external delivery off request path where justified.
- **Reliability considerations:** outbox/queue readiness, retries, idempotency, provider failure visibility.
- **Testing expectations:** delivery contract, preference, authorization, retry, duplicate-send, and accessibility tests.
- **Documentation outputs:** communication lifecycle, notification policy, provider contract.
- **Dependencies:** Phases 11, 14, 15, and ARCH-04.
- **Definition of Done:** communication requests and notifications are durable, authorized, observable, and safe to retry.

## Phase 17 — Offers, Hire/Reject & Talent Pool — NOT STARTED

- **Objective:** manage offer workflows, explicit hire/reject decisions, and candidate pools. (FR-19, FR-20)
- **Features/sub-features:** offer drafting/versioning/issue/accept/decline/withdraw; explicit hire/reject; pools and memberships.
- **Engineering concepts to learn:** sensitive workflows, state transitions, consent, explicit business decisions.
- **Frontend work:** offer forms/status, decision UX, talent-pool management.
- **Backend work:** offer and talent-pool use cases, authorization, workflow orchestration.
- **Database work:** offer versions/status, decisions, pool membership and constraints.
- **Security considerations:** confidential terms, strict roles, tenant scope, audit, no implicit employment transition.
- **Performance considerations:** paginated pools and offers; selective sensitive fields.
- **Reliability considerations:** guarded transitions, idempotent decisions, transactional status/history.
- **Testing expectations:** lifecycle/permission matrix, confidentiality, explicit decision, concurrency tests.
- **Documentation outputs:** offer/hire decision policy and talent-pool workflow.
- **Dependencies:** Phases 11, 13, 15, 16.
- **Definition of Done:** offers and pool workflows are explicit, scoped, auditable, and do not infer employment without an approved rule.

## Phase 18 — Analytics & Audit — NOT STARTED

- **Objective:** provide hiring analytics and protected audit logging. (FR-21, FR-24)
- **Features/sub-features:** funnel metrics; time-to-stage; dashboards/reports; audit event capture/query/export policy.
- **Engineering concepts to learn:** derived data, metric definitions, audit integrity, privacy-aware reporting.
- **Frontend work:** dashboards, filters, empty/partial data states, authorized audit views.
- **Backend work:** metric/query services, audit append/query service, redaction and access policies.
- **Database work:** derived reporting structures as justified; append-oriented audit records and retention metadata.
- **Security considerations:** audit tamper resistance, least-privilege reporting, PII minimization, tenant scope.
- **Performance considerations:** aggregate queries, pagination, precomputation only when evidence supports it.
- **Reliability considerations:** audit generation on critical mutations, metric consistency, backfill/rebuild strategy.
- **Testing expectations:** metric correctness, authorization, redaction, audit completeness and retention tests.
- **Documentation outputs:** metric glossary, audit policy, report/data lineage docs.
- **Dependencies:** Phases 08–17; ARCH-05.
- **Definition of Done:** metrics have definitions and scope, and critical changes produce protected audit records without becoming product activity timelines.

## Phase 19 — Redis, BullMQ & Background Jobs — NOT STARTED

- **Objective:** introduce async infrastructure only for justified workloads.
- **Features/sub-features:** worker runtime; queues; retries/backoff; job status; email/calendar/notification/document/cleanup workers; Redis use cases.
- **Engineering concepts to learn:** queues, idempotency, retries, eventual consistency, cache invalidation.
- **Frontend work:** status/progress/retry UX where user-visible.
- **Backend work:** enqueue contracts, worker handlers, job lifecycle, failure/dead-letter handling.
- **Database work:** durable work intent/status and idempotency records as needed; PostgreSQL remains authoritative.
- **Security considerations:** queue payload minimization, secret handling, tenant context, worker authorization.
- **Performance considerations:** controlled concurrency, backpressure, measured cache benefit, connection limits.
- **Reliability considerations:** retries, deduplication, poison jobs, graceful worker shutdown, recovery.
- **Testing expectations:** worker unit/integration tests, retry/idempotency, failure and load tests.
- **Documentation outputs:** queue catalog, retry policy, operational runbook.
- **Dependencies:** Phases 12, 14, 16, 18; ARCH-04/05.
- **Definition of Done:** selected slow work runs reliably off request paths and Redis is not used as domain truth.

## Phase 20 — Realtime & Integration Reliability — NOT STARTED

- **Objective:** add realtime updates only where justified and strengthen provider synchronization.
- **Features/sub-features:** selected Socket.IO/SSE events; authorization; reconnect behavior; provider reconciliation; integration health.
- **Engineering concepts to learn:** event delivery, connection lifecycle, consistency, reconciliation, fallbacks.
- **Frontend work:** subscriptions, stale/reconnect UX, REST fallback.
- **Backend work:** event contracts, authorization, integration health/reconciliation services.
- **Database work:** event/sync cursors and statuses where justified.
- **Security considerations:** per-event authorization, tenant isolation, token/session handling, webhook verification.
- **Performance considerations:** bounded fan-out, connection limits, event payload minimization.
- **Reliability considerations:** reconnect, replay/reconciliation, provider drift, circuit breakers where justified.
- **Testing expectations:** event authorization, reconnect, ordering, provider failure, contract and load tests.
- **Documentation outputs:** realtime decision records and integration reliability runbooks.
- **Dependencies:** Phases 14, 16, 19; demonstrated product need.
- **Definition of Done:** realtime is limited to justified workflows and integrations recover from normal provider failures.

## Phase 21 — Security Hardening — NOT STARTED

- **Objective:** perform systematic security hardening across implemented features.
- **Features/sub-features:** threat-model review; dependency/security scans; headers; rate limits; secrets; abuse controls; data retention review.
- **Engineering concepts to learn:** defense in depth, threat modeling, secure SDLC, incident preparation.
- **Frontend work:** XSS-safe rendering, dependency review, secure session UX, accessible security errors.
- **Backend work:** authorization audit, validation audit, secure headers, rate limiting, logging/redaction.
- **Database work:** privilege review, backup/access review, sensitive-field audit.
- **Security considerations:** tenant isolation, IDOR prevention, credential protection, file/provider security, audit integrity.
- **Performance considerations:** security controls measured for acceptable overhead.
- **Reliability considerations:** incident response, revocation, recovery, security-failure observability.
- **Testing expectations:** SAST/dependency, abuse, authorization, penetration-style and regression tests.
- **Documentation outputs:** security review, threat model, incident/security runbooks.
- **Dependencies:** implemented product phases through 20.
- **Definition of Done:** critical security findings are fixed or explicitly accepted with owners and evidence.

## Phase 22 — Performance Engineering — NOT STARTED

- **Objective:** measure and improve real application bottlenecks.
- **Features/sub-features:** baselines; query profiling; API latency; frontend performance; load tests; targeted optimization.
- **Engineering concepts to learn:** profiling, capacity, latency budgets, query plans, performance tradeoffs.
- **Frontend work:** bundle/render/network profiling, waterfall reduction, pagination/virtualization where justified.
- **Backend work:** hot-path profiling, payload/query optimization, pooling and concurrency tuning.
- **Database work:** explain plans, evidence-based indexes, pagination strategy, connection tuning.
- **Security considerations:** preserve authorization and validation during optimization; no unsafe cache exposure.
- **Performance considerations:** define and measure targets; optimize evidence-based bottlenecks.
- **Reliability considerations:** load behavior, saturation, graceful degradation, rollback of regressions.
- **Testing expectations:** repeatable benchmarks, load/stress tests, regression thresholds.
- **Documentation outputs:** performance baseline, findings, decisions, and capacity notes.
- **Dependencies:** representative implemented features and Phase 21 controls.
- **Definition of Done:** agreed bottlenecks are measured and improved without regressions or speculative infrastructure.

## Phase 23 — Reliability & Observability — NOT STARTED

- **Objective:** make system health, failures, and recovery observable and operable.
- **Features/sub-features:** structured logs; metrics; traces/correlation; health checks; alerts; error tracking; runbooks.
- **Engineering concepts to learn:** observability signals, SLOs, incident response, graceful degradation.
- **Frontend work:** error reporting, user-safe failure states, client performance/error telemetry.
- **Backend work:** correlation, structured logging, metrics/tracing, readiness, failure classification.
- **Database work:** health/connection metrics, backup and restore verification signals.
- **Security considerations:** no secrets/PII in telemetry; protected observability access.
- **Performance considerations:** bounded telemetry overhead and sampling policy.
- **Reliability considerations:** alert quality, recovery drills, dependency failure behavior, runbooks.
- **Testing expectations:** failure injection, health/readiness, alert and recovery tests.
- **Documentation outputs:** observability catalog, SLOs, incident and recovery runbooks.
- **Dependencies:** Phases 19–22.
- **Definition of Done:** operators can detect, diagnose, and recover from defined failure classes with tested signals.

## Phase 24 — Accessibility & Testing — NOT STARTED

- **Objective:** raise accessibility and test coverage to release confidence across the product.
- **Features/sub-features:** accessibility audit; keyboard/screen-reader fixes; unit/integration/E2E coverage; regression suite.
- **Engineering concepts to learn:** WCAG practices, test pyramid, contract testing, deterministic test data.
- **Frontend work:** semantic UI, focus management, keyboard paths, responsive and assistive-technology fixes.
- **Backend work:** contract, authorization, validation, and error regression coverage.
- **Database work:** fixture/seed strategy and migration test coverage.
- **Security considerations:** test protected paths and ensure accessibility changes do not bypass authorization.
- **Performance considerations:** test realistic collection sizes and avoid costly test-only patterns.
- **Reliability considerations:** flaky-test elimination, deterministic environments, recovery-path coverage.
- **Testing expectations:** prioritized coverage matrix, accessibility automation plus manual review, E2E critical paths.
- **Documentation outputs:** test strategy, coverage/risk report, accessibility statement/checklist.
- **Dependencies:** all user-facing product phases; Phases 21–23.
- **Definition of Done:** critical workflows and accessibility paths are covered, repeatable, and release-gated.

## Phase 25 — CI/CD & Deployment — NOT STARTED

- **Objective:** automate safe build, test, and deployment workflows.
- **Features/sub-features:** CI checks; artifacts; migrations; preview/staging; deployment promotion; rollback procedure.
- **Engineering concepts to learn:** delivery pipelines, environments, artifact immutability, release strategies.
- **Frontend work:** Vercel build/deploy configuration and environment separation.
- **Backend work:** Render build/deploy, health/readiness, migration release process.
- **Database work:** Supabase PostgreSQL environment/migration/backup workflow.
- **Security considerations:** protected secrets, least-privilege deploy identity, dependency and artifact integrity.
- **Performance considerations:** build caching, deployment size/startup budgets.
- **Reliability considerations:** rollback, migration compatibility, smoke checks, deployment health gates.
- **Testing expectations:** CI lint/build/unit/integration/E2E gates and staging smoke tests.
- **Documentation outputs:** deployment guide, environment matrix, rollback runbook.
- **Dependencies:** Phases 21–24.
- **Definition of Done:** separate frontend/backend deployments are repeatable, gated, observable, and recoverable.

## Phase 26 — Production Readiness — NOT STARTED

- **Objective:** validate the complete product and operating model for production use.
- **Features/sub-features:** readiness checklist; backup/restore drill; security/performance sign-off; support/admin procedures; launch criteria.
- **Engineering concepts to learn:** operational readiness, risk acceptance, release governance, disaster recovery.
- **Frontend work:** production UX review, analytics/privacy review, critical-path polish.
- **Backend work:** configuration review, dependency readiness, operational safeguards.
- **Database work:** backup/restore, retention, capacity and migration readiness.
- **Security considerations:** final access/secret/incident review and unresolved-risk ownership.
- **Performance considerations:** capacity evidence and traffic/usage assumptions.
- **Reliability considerations:** DR objectives, monitoring, on-call/support procedures, rollback drill.
- **Testing expectations:** release candidate regression, smoke, load, backup/restore, failure drills.
- **Documentation outputs:** production readiness report, launch checklist, support and incident docs.
- **Dependencies:** Phases 21–25.
- **Definition of Done:** release risks are evidenced, owned, or accepted; launch criteria pass; no hidden implementation gap is treated as complete.

## Phase 27 — Documentation & Portfolio — NOT STARTED

- **Objective:** make the completed software-engineering milestone understandable, maintainable, and presentable.
- **Features/sub-features:** architecture refresh; API/domain docs; setup/runbooks; ADR index; portfolio case study; decision timeline.
- **Engineering concepts to learn:** technical communication, documentation maintenance, portfolio storytelling.
- **Frontend work:** UI/component and accessibility documentation; screenshots only where appropriate.
- **Backend work:** module/API/operations documentation and examples.
- **Database work:** schema/data ownership/migration documentation.
- **Security considerations:** redact secrets, personal data, and operationally sensitive details.
- **Performance considerations:** record baselines and lessons without overstating results.
- **Reliability considerations:** preserve runbooks, recovery evidence, and known limitations.
- **Testing expectations:** documentation link checks, reproducible setup, final verification.
- **Documentation outputs:** maintained project docs and portfolio material.
- **Dependencies:** Phases 00–26.
- **Definition of Done:** software-engineering documentation is current, reproducible, and reviewed; AI remains deferred until this phase is accepted.

## Software Engineering Complete

This milestone may be declared complete only after Phases 00–27 are accepted according to their Definitions of Done. Only then may AI Phase 00 begin.

# Part B — AI Engineering

AI Engineering is a separate, gated roadmap. These phases do not begin until `SOFTWARE ENGINEERING COMPLETE`. AI features must have approved product requirements, security/privacy review, evaluation criteria, cost controls, and an explicit human-oversight policy before implementation.

## AI Phase 00 — AI Engineering Foundation — NOT STARTED

Define AI product boundaries, data eligibility, provider/model adapter contracts, evaluation datasets, human oversight, privacy/security controls, cost budgets, observability, and rollback. Dependency: Software Engineering Complete plus a repository-local PRD update.

## AI Phase 01 — AI Job Description Assistant — NOT STARTED

Add a user-invoked drafting assistant with editable output, provenance, refusal/error behavior, and no automatic publishing. Dependency: AI Phase 00 and approved FRs.

## AI Phase 02 — Resume Extraction Pipeline — NOT STARTED

Create an asynchronous, consent-aware pipeline for extracting text/structure from supported resume files, with status, retry, and failure handling. Dependency: AI Phase 00 and Phase 12.

## AI Phase 03 — AI Resume Parsing — NOT STARTED

Generate structured candidate data from extracted resume content with schema validation, provenance, confidence, human correction, and safe non-destructive updates. Dependency: AI Phase 02.

## AI Phase 04 — AI Candidate Evaluation — NOT STARTED

Provide explainable, reviewable candidate-job evaluation assistance without making autonomous hiring decisions. Dependency: AI Phase 03, candidate/application data, policy approval.

## AI Phase 05 — Embeddings + pgvector — NOT STARTED

Design and implement embeddings storage, versioning, deletion, access control, and pgvector operations only after retrieval requirements are proven. Dependency: AI Phase 00 and relevant PostgreSQL evidence.

## AI Phase 06 — Semantic Search — NOT STARTED

Add tenant-scoped semantic retrieval with filters, relevance evaluation, fallback behavior, and transparent result provenance. Dependency: AI Phase 05.

## AI Phase 07 — Talent Recommendation Engine — NOT STARTED

Recommend candidates or talent-pool matches as assistive ranked suggestions with explanations, feedback, fairness review, and human control. Dependency: AI Phases 04–06.

## AI Phase 08 — Interview Transcription — NOT STARTED

Support consented transcription with provider boundaries, access controls, retention, redaction, and asynchronous status. Dependency: AI Phase 00 and Phase 14.

## AI Phase 09 — Interview Summaries — NOT STARTED

Generate editable, source-linked interview summaries with uncertainty handling and no automatic score or hiring decision. Dependency: AI Phase 08 and scorecard policy.

## AI Phase 10 — AI Evaluation Framework — NOT STARTED

Create offline/online evaluation, golden datasets, regression tests, quality thresholds, bias/fairness checks, and model/prompt version tracking. Dependency: AI Phases 01–09 as applicable.

## AI Phase 11 — AI Security & Privacy — NOT STARTED

Harden data minimization, tenant isolation, retention/deletion, prompt injection defenses, provider controls, access logging, and human review. Dependency: AI features and Phase 21 controls.

## AI Phase 12 — AI Cost, Performance & Observability — NOT STARTED

Measure token/compute/provider cost, latency, throughput, failures, quality, and usage by workflow; introduce bounded caching or batching only with evidence. Dependency: AI features and Phases 19, 22, 23.

## AI Phase 13 — AI Production Hardening — NOT STARTED

Operationalize approved AI features with rollout controls, fallbacks, incident response, model/provider change management, auditability, and production readiness gates. Dependency: AI Phases 00–12.

## AI Engineering Complete

AI Engineering is complete only when AI Phase 13 and all applicable product, security, evaluation, and operational acceptance criteria are accepted. AI remains optional and must not be assumed necessary for the software-engineering milestone.

# Roadmap Governance

- Mark only evidenced work as DONE.
- Keep `PROJECT_STATE.md` synchronized with this roadmap.
- Add or update an ADR for important architecture changes.
- Do not introduce microservices without demonstrated need.
- Do not add infrastructure merely because it appears in a future phase.
- Do not silently move AI implementation into Software Engineering phases.
- When the PRD is added, update traceability and acceptance criteria without changing approved phase ordering casually.
