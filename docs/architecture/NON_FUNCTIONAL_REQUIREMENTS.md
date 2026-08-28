# HiringLoop Non-Functional Requirements

## Purpose

Functional requirements describe WHAT HiringLoop does. Non-functional requirements describe HOW WELL and under WHAT CONDITIONS it must operate.

These NFRs guide architecture, database design, API design, frontend implementation, testing, security, deployment, and production-readiness reviews.

This is a Phase 00 planning artifact. It defines invariants, initial engineering targets, measurement methods, and unresolved decisions. It does not implement controls, establish production SLOs, provision services, or claim that any target has already been measured.

The repository has no local PRD. Product-dependent behavior and capacity assumptions are therefore explicitly classified as **Requires Product Decision**, **Requires Production Evidence**, or **Requires Infrastructure Decision**.

## Requirement Classes

| Class | Meaning |
|---|---|
| Hard invariant | Must always hold; a violation is a correctness or security defect. |
| Architecture requirement | A structural rule that guides implementation and prevents a known failure class. |
| Initial Engineering Target | A provisional target for development, demo, staging, and early load testing; not a production commitment. |
| Future Operational SLO | A production objective to be agreed after operational evidence exists. |
| TBD | Intentionally unresolved until product, security, infrastructure, or production evidence exists. |

## Quality Attribute Catalog

### Security

**Definition:** Protect tenant data, identities, credentials, documents, recruiting decisions, and provider integrations against unauthorized access or mutation.

**Why it matters:** HiringLoop handles candidate PII, resumes, private feedback, offer terms, and organization administration. Cross-tenant access or privilege escalation is a critical product failure.

**Architectural implications:** Backend authorization is authoritative; tenant context comes from authenticated membership; resource-level policies supplement RBAC; inputs cross explicit trust boundaries; DTOs minimize exposure; files remain private; providers and workers are server-side boundaries; secrets are isolated; critical actions are auditable.

**Measurement/test:** Authorization matrix tests, cross-tenant negative tests across direct/nested/search/bulk/file/worker paths, input-validation tests, secret scanning, dependency/security review, signed-URL tests, webhook/authentication tests, sensitive-log review, and audit-completeness tests. Exact release thresholds are **Requires Security Decision**.

### Performance

**Definition:** Provide bounded response latency and responsive interactions for normal recruiting workflows while avoiding wasteful queries, rendering, and provider calls.

**Why it matters:** Recruiters repeatedly work through candidate lists, applications, pipelines, interviews, and communications. Slow collections and blocking providers harm task completion and can create retry storms.

**Architectural implications:** Use pagination and bounded payloads; avoid N+1 queries; select fields intentionally; measure query/API/frontend latency; use indexes only for observed query patterns; move slow provider work to workers; use cache-aside only when justified; avoid frontend waterfalls.

**Measurement/test:** API p50/p95/p99 latency, query timings and plans, database pool health, browser interaction and Core Web Vitals measurements, representative load tests, and regression thresholds. Values below are initial engineering targets, not observed results.

### Scalability

**Definition:** Increase useful API and asynchronous processing capacity by adding equivalent instances or bounded concurrency without changing domain ownership or correctness.

**Why it matters:** The platform may grow in organizations, candidates, applications, documents, and background work. Scaling must not require premature distributed-system complexity.

**Architectural implications:** Separate frontend/backend deployments; stateless API where practical; shared PostgreSQL authority; shared Redis only for approved cache/queue/coordination; independently scalable workers; S3 for object bytes; pagination and connection budgets; no microservices without evidence.

**Measurement/test:** Load and stress tests, saturation curves, queue throughput, database connection utilization, API instance scaling tests, worker concurrency tests, and resource-cost review. No arbitrary user-count promise is made. Initial capacity is an **Initial Portfolio/MVP Assumption** pending evidence.

### Reliability

**Definition:** Perform correct operations consistently despite retries, duplicate requests, concurrency, process crashes, and fallible external providers.

**Why it matters:** Duplicate applications, messages, calendar events, stage transitions, or offers can cause user harm and inconsistent recruiting history.

**Architectural implications:** Transactions for coherent domain changes; idempotency for repeatable commands; guarded lifecycle transitions; classified retries with exponential backoff; durable work intent/status; safe worker redelivery; reconciliation for ambiguous provider outcomes; explicit pending/failed states; graceful degradation.

**Measurement/test:** Failure injection, duplicate/replay tests, concurrency tests, worker crash/redelivery tests, provider contract tests, retry/backoff verification, and reconciliation drills. Exact retry counts and recovery windows are **Requires Implementation Evidence**.

### Availability

**Definition:** The proportion of time an authorized user can complete an intended supported journey when required dependencies are available, and can receive a safe degraded result when optional dependencies fail.

**Why it matters:** Recruiting workflows need dependable access, but availability claims must reflect early-stage deployment and actual operational capability.

**Architectural implications:** Separate critical domain paths from optional email/calendar/realtime integrations; health/readiness checks later; safe errors; stateless API instances; backups and recovery; REST fallback for realtime; provider-independent internal state.

**Measurement/test:** Later uptime and journey-success SLIs, dependency health, synthetic checks, incident records, and deployment/recovery drills. No 99.99%, five-nines, or contractual SLA is claimed. The initial philosophy is to protect core journeys where dependencies allow and degrade optional capabilities visibly.

### Data Integrity

**Definition:** Authoritative records, relationships, lifecycle transitions, history, and tenant boundaries remain internally valid and traceable.

**Why it matters:** Hiring decisions rely on correct Candidate, Application, Job, Pipeline, Interview, Offer, Communication, and Audit relationships.

**Architectural implications:** PostgreSQL is authoritative; transactions cover coherent business changes; referential and tenant constraints are later designed; same-tenant relationships are enforced; lifecycle transitions are validated; historical records are append-oriented or immutable where required; concurrency controls protect conflicting writes.

**Measurement/test:** Invariant tests, database constraint tests, transaction rollback tests, migration tests, reconciliation checks, duplicate/replay tests, and data-quality reports. Physical schema and exact constraint design belong to later database work.

### Maintainability

**Definition:** The system can be understood, changed, reviewed, and operated without disproportionate risk or cross-module coupling.

**Why it matters:** The modular monolith must remain deliberate rather than becoming an unstructured codebase.

**Architectural implications:** Domain module ownership; thin controllers; use cases/services for business logic; repositories for data access; explicit DTOs; strict TypeScript for the React frontend; clear JavaScript conventions and runtime validation for the Node.js/Express.js backend; provider adapters; source-controlled migrations; ADRs for durable decisions; feature documentation; focused changes.

**Measurement/test:** Architecture review, dependency-direction checks, code review, static analysis, type-checking, documentation/link checks, change-failure analysis, and periodic module-boundary review. “Clean code” alone is not a measurable definition of maintainability.

### Testability

**Definition:** Important business, security, integration, failure, and user workflows can be exercised deterministically at appropriate boundaries.

**Why it matters:** Tenant isolation, lifecycle invariants, provider failure, and async redelivery cannot be trusted to manual happy-path checks alone.

**Architectural implications:** Stable use-case and adapter contracts; test seams later; deterministic fixtures; separate unit, integration, contract, and E2E responsibilities; provider fakes/sandboxes; observable state transitions.

**Measurement/test:** Test inventory by risk, critical-path pass rate, mutation/replay/failure coverage, flaky-test rate, integration/E2E results, and coverage trends. No blanket 100% coverage requirement is imposed. A provisional critical-workflow coverage gate is **Proposed / Requires Implementation Evidence**.

### Accessibility

**Definition:** Users with disabilities can navigate, understand, operate, and recover from frontend workflows using keyboard, screen reader, zoom, and other supported assistive technology paths.

**Why it matters:** Recruiting work includes forms, tables, filters, dialogs, pipeline interactions, errors, and status updates.

**Architectural implications:** Semantic HTML; labels and descriptions; visible focus; keyboard paths; accessible errors and loading states; modal focus management; accessible tables; non-drag alternatives; sufficient contrast and responsive layouts; no permission or workflow information conveyed only by color.

**Measurement/test:** Automated accessibility checks plus manual keyboard, screen-reader, zoom/reflow, focus, and form/error review against WCAG-aligned expectations. No formal WCAG certification or conformance level is claimed until product scope and testing are approved.

### Observability

**Definition:** Operators and developers can detect, diagnose, correlate, and explain important behavior and failures without exposing sensitive data.

**Why it matters:** Provider failures, queue backlog, database saturation, tenant-isolation incidents, and slow queries require evidence for safe recovery.

**Architectural implications:** Request IDs/correlation; structured events; latency/error metrics; database and pool visibility; queue depth/retry/failure metrics; provider health and failure classification; redaction; protected access; health/readiness boundaries later.

**Measurement/test:** Telemetry completeness review, alert tests, trace/log correlation checks, failure-injection exercises, dashboard/runbook review, and sensitive-log scans. Exact provider, retention, sampling, and alert thresholds are **Requires Infrastructure Decision**.

### Privacy

**Definition:** Collect, expose, retain, transmit, and observe only candidate and employee information needed for an authorized recruiting purpose.

**Why it matters:** Resumes, contact details, application answers, feedback, offer terms, and audit records are sensitive and may be shared with external providers.

**Architectural implications:** Data minimization; explicit DTOs and field-level policy; private documents; purpose-limited provider payloads; no sensitive data in logs/queues/URLs; access audit; retention/anonymization/deletion policy; AI data handling remains deferred.

**Measurement/test:** Data inventory, DTO/privacy review, access tests, provider payload review, log redaction tests, retention/deletion tests, and privacy/security sign-off. Retention periods and legal obligations are **Requires Product/Security Decision**.

### Recoverability

**Definition:** The system can restore authoritative state and resume safe operation after data loss, migration error, provider disruption, worker failure, or deployment incident.

**Why it matters:** Candidate and hiring history is business-critical, while files and external integrations may fail independently.

**Architectural implications:** PostgreSQL backups and restore procedures; migration recovery strategy; S3 durability and orphan reconciliation; provider retry/reconciliation; durable async status; operational runbooks; environment separation.

**Measurement/test:** Backup verification, restore drills, migration recovery tests, object/metadata reconciliation, provider resynchronization, and incident exercises. Production RPO/RTO are TBD and must not be invented here.

### Operability

**Definition:** Authorized operators can deploy, monitor, troubleshoot, recover, and safely change the system with repeatable procedures.

**Why it matters:** A technically correct architecture still fails users if no one can identify a broken queue, restore a database, rotate credentials, or roll back a release.

**Architectural implications:** Environment separation; managed production secrets; health/readiness; structured telemetry; least-privilege operations; deployment and rollback runbooks; migration discipline; worker shutdown/recovery; provider status visibility.

**Measurement/test:** Runbook walkthroughs, deployment/recovery drills, operator acceptance, alert-to-diagnosis time, backup/restore evidence, and credential-rotation exercises. Exact staffing, schedules, and operational targets are **Requires Infrastructure/Product Decision**.

## Performance Requirements

The following are **Initial Engineering Targets** for representative development/staging environments and early MVP load tests. They are not production SLOs, SLAs, or measured results. Measurements should report p50, p95, and p99, dataset size, concurrency, dependency state, and environment.

| Workflow | p50 target | p95 target | p99 target | Notes |
|---|---:|---:|---:|---|
| Typical authenticated simple read | <= 200 ms | <= 500 ms | <= 1,000 ms | Excludes cold starts and unavailable dependencies. |
| Typical authenticated normal write | <= 300 ms | <= 750 ms | <= 1,500 ms | Includes validation and one coherent database transaction. |
| Candidate/job/application filtered collection | <= 300 ms | <= 800 ms | <= 1,500 ms | Bounded page and intentional fields; pagination required. |
| Pipeline board read | <= 400 ms | <= 1,000 ms | <= 2,000 ms | Must avoid N+1 behavior; exact board payload is later designed. |
| Search/filter request | <= 500 ms | <= 1,000 ms | <= 2,000 ms | Initial bounded search only; not semantic/AI search. |
| Public career page data request | <= 300 ms | <= 800 ms | <= 1,500 ms | Public payload only; CDN/caching remain open. |
| File upload initiation / signed capability | <= 250 ms | <= 600 ms | <= 1,200 ms | Excludes transfer time and S3 availability. |
| Async job acknowledgement | <= 300 ms | <= 750 ms | <= 1,500 ms | Acknowledges durable intent/enqueue attempt; not provider completion. |
| Background job completion | TBD | TBD | TBD | Depends on provider, payload, retry policy, and user-visible requirement. |
| Frontend routine interaction | <= 100 ms visual acknowledgement | <= 300 ms usable feedback | <= 1,000 ms settled state | Initial UX target; measure INP and workflow behavior, not API latency alone. |

These ranges are modest and evidence-seeking. If a request requires a slow or unreliable provider call, the normal target is a fast durable acknowledgement with pending status and background processing, not a promise of provider completion within the API budget.

## API Performance Budget

| Operation type | Initial target | Measurement | Notes |
|---|---|---|---|
| Simple reads | p95 <= 500 ms, p99 <= 1,000 ms | API timer, database timer, representative load | Authorization and tenant checks included. |
| Normal writes | p95 <= 750 ms, p99 <= 1,500 ms | End-to-end request timer and transaction timing | Do not remove checks to meet latency. |
| Filtered collections | p95 <= 800 ms, p99 <= 1,500 ms | Dataset-size and page-size load test | Pagination and bounded response fields required. |
| Search | p95 <= 1,000 ms, p99 <= 2,000 ms | Query timing, result-size, and concurrency test | Search semantics and indexes require evidence. |
| External-provider-dependent operation | Prefer p95 <= 750 ms acknowledgement; completion TBD | API, queue, provider, and reconciliation metrics | Move slow work to workers where appropriate. |
| Asynchronous operation | Enqueue acknowledgement p95 <= 750 ms; completion TBD | Queue latency, processing latency, retries, completion/failure rate | Acknowledgement is not business/provider success. |

API performance must be measured before optimization. Averages alone are insufficient because tail latency affects users and reveals saturation or provider failure.

## Database Performance Requirements

- Large collections require pagination with bounded page size; unbounded candidate, application, activity, or audit lists are prohibited.
- Candidate lists, application lists, pipeline boards, activity timelines, and analytics queries must be tested against representative data volumes and access patterns.
- Query patterns determine indexes. Composite indexes require documented query/use-case justification and later measurement.
- Avoid N+1 queries and unnecessary relationship loading; select only fields needed by the use case and DTO.
- Use `EXPLAIN ANALYZE` when investigating a query plan in a safe non-production environment; do not add speculative indexes from intuition alone.
- Connection pooling is required in deployed API/worker environments, with shared connection budgets respecting hosting and PostgreSQL limits.
- Query latency, errors, pool exhaustion, slow-query events, and transaction failures must eventually be observable without sensitive values.
- Analytics and reporting must not become the write path or source of truth; precomputation is justified only by measured need.

Physical tables, Prisma models, migrations, indexes, isolation levels, and pool sizes are later implementation decisions.

## Frontend Performance Requirements

- Use route-level code splitting where bundle size and route usage justify it.
- Avoid unnecessary network waterfalls; coordinate data loading around user-visible boundaries and server capabilities.
- Avoid unnecessary renders and large client-held collections; keep query/cache behavior intentional.
- Use pagination or virtualization for sufficiently large candidate, application, activity, notification, and audit lists.
- Provide loading, empty, error, retry, and stale/reconnecting states without hiding authorization or integrity failures.
- Keep routine interactions responsive and provide immediate visual acknowledgement for slower work.
- Measure Core Web Vitals conceptually: LCP for loading/display, INP for interaction responsiveness, and CLS for visual stability.
- Establish route and Core Web Vitals budgets after representative builds and product routes exist. No measured score or formal production target is claimed now.

## Scalability Requirements

```text
Frontend   -> independently deployed
Backend    -> stateless where practical
PostgreSQL -> shared authoritative database
Redis      -> shared cache/queue infrastructure only
Workers    -> independently scalable processes/deployment
S3         -> external object storage
```

Horizontal scaling means adding equivalent API instances that can serve any authorized request, and adding worker processes/concurrency that safely consume the same queues. It requires shared durable state, connection limits, idempotent work, tenant-safe context, and no critical process-local state.

Initial Portfolio/MVP Assumption: one API deployment, one worker deployment when async infrastructure is introduced, one primary PostgreSQL environment per deployment environment, and modest early-user/data volume. This is not a contractual capacity limit or user-count promise.

Scalability does not require microservices. Pagination, query tuning, evidence-based indexes, connection pooling, stateless API instances, worker concurrency, queue backpressure, caching, and moving slow work off request paths can solve many early scaling problems within the modular monolith.

## Reliability Requirements

- Use transactions when a coherent domain change and required history must change together.
- Use idempotency or deterministic identity for repeatable commands, including application submission, stage movement, communications, provider callbacks, calendar operations, and worker delivery where applicable.
- Protect lifecycle transitions with current-state and relationship validation; concurrent writes must not silently overwrite important business decisions.
- Retry only classified transient failures, with exponential backoff and jitter where safe. Validation and authorization failures generally must not be retried.
- Treat ambiguous timeouts as unsafe to repeat until provider status or idempotency can be reconciled.
- Persist business intent and relevant pending/failed status in PostgreSQL before relying on asynchronous processing, according to each workflow's consistency boundary.
- Minimize queue payloads; workers reload authoritative records and revalidate relevant tenant/resource context.
- Degrade gracefully only when correctness and security remain intact. Redis cache loss may fall back to PostgreSQL where safe; an unavailable provider must not fabricate success.
- Preserve failure state, correlation, and recovery options without exposing secrets or sensitive provider details.

### Example reliability scenarios

| Scenario | Expected principle |
|---|---|
| Application submitted twice | Enforce the approved duplicate policy and one intended effect, with no accidental duplicate history, message, or transition. Exact policy is **Requires Product Decision**. |
| Candidate moved concurrently | Validate current stage/version and use transaction/concurrency control; do not lose or reorder important stage history. |
| SendGrid unavailable | Persist intent/status; retry safely or show failed/pending state; source workflow does not necessarily fail. |
| Calendar provider unavailable | Keep internal Interview authoritative; record pending/failed sync and retry/reconcile. |
| Redis unavailable | Cache may fail open to PostgreSQL where safe; queue/rate-limit behavior is workflow-specific. Redis is never business truth. |
| Worker crashes | Work remains pending/retryable or becomes explicit failure; redelivery must not duplicate external effects. |
| S3 upload fails | Do not mark the document available or corrupt metadata; retain safe retry/cleanup state as policy permits. |

## Availability Philosophy

Availability is not reliability. Availability asks whether a service is usable at a point in time; reliability asks whether it behaves correctly over time and under failure, retries, concurrency, and recovery.

Protect these core journeys when their required dependencies are available:

- authentication and session establishment;
- recruiter dashboard and authorized workspace reads;
- public candidate application submission;
- recruiter candidate/application review; and
- authorized pipeline movement.

Optional or provider-dependent capabilities may degrade independently: email delivery, calendar synchronization, document transfer/access, realtime updates, analytics refresh, and notifications. The application should show pending, stale, failed, or retry-needed status according to each feature's later contract, while PostgreSQL remains authoritative.

Production availability SLOs should be based on observed traffic, dependency plans, incident history, hosting capabilities, and recovery evidence. No uptime percentage or SLA is promised here.

## Security Requirements

The existing [authorization architecture](../security/AUTHORIZATION_ARCHITECTURE.md), [security architecture](../security/SECURITY_ARCHITECTURE.md), [threat model](../security/THREAT_MODEL.md), and ARCH-04 infrastructure documents are authoritative for detailed controls. NFR acceptance expectations are:

- every protected API requires authenticated context;
- every tenant-owned resource requires backend tenant and resource authorization;
- frontend permission checks never replace backend enforcement;
- external input, uploads, provider callbacks, and worker payloads are validated at trust boundaries;
- sensitive fields are excluded from DTOs, logs, URLs, queues, and client bundles unless explicitly required;
- secrets are never committed and production credentials are environment-isolated and least-privileged;
- public APIs receive appropriate rate limiting, abuse controls, bounded payloads, and enumeration resistance;
- uploaded files remain private and access requires backend authorization plus narrowly scoped capabilities;
- security-sensitive and business-critical changes are auditable according to policy;
- tenant-isolation tests cover direct, nested, search, bulk, file, worker, and callback paths;
- provider responses do not bypass HiringLoop authorization or domain invariants.

These are measurable by security tests, code/configuration review, secret scanning, log review, and release gates later. They are not implemented in ARCH-05.

## Data Integrity Requirements

Future persistence and use cases must preserve referential integrity, transactional business workflows and required history, uniqueness where duplicate records violate an approved rule, same-tenant relationship invariants, lifecycle validation, immutable or append-oriented history where auditability requires it, and concurrency controls for stage, interview, offer, membership, and other conflicting writes.

Examples:

- Candidate and Job in an Application must belong to the same Organization.
- An Application stage must belong to the correct Job Pipeline.
- An Interview must reference an authorized Application and permitted participants.
- An Offer must belong to the correct Candidate/Application/Job/Organization context.
- Communication and Notification records react to source workflows but do not become those workflows' authority.

Physical enforcement belongs to Phase 02 and feature-specific database work.

## Privacy Requirements

- Collect only candidate and employee data needed for an authorized recruiting purpose.
- Minimize PII in API responses, search results, analytics, notifications, logs, queues, and provider payloads.
- Private feedback obeys resource-level authorization and is not exposed merely because an actor can see an Interview.
- Resumes and other documents remain private; storage access is authorized and signed capabilities are narrowly scoped.
- Provider sharing is purpose-limited, server-side, and recorded where audit/privacy policy requires it.
- Logs must not contain full resumes, unnecessary candidate PII, private feedback, offer terms, tokens, signed URLs, or provider credentials.
- Retention, deletion, anonymization, consent, export, and legal/privacy policy remain **Requires Product and Security Decision**.
- AI privacy, provider selection, prompts, and model data flows remain future/deferred and are not part of the software-engineering phase.

## Accessibility Requirements

The frontend should follow WCAG-aligned expectations without claiming formal certification:

- all workflows support keyboard navigation and have visible focus;
- controls and fields have meaningful labels, descriptions, instructions, and accessible names;
- semantic HTML is preferred over inaccessible custom interaction patterns;
- forms expose field-level and summary errors programmatically and visually;
- modal/dialog focus is moved, trapped, restored, and announced appropriately;
- tables, pagination, sorting, filtering, and status changes are understandable to screen readers;
- drag-and-drop pipeline interactions have keyboard and non-drag alternatives;
- loading, empty, retry, forbidden, and failure states are accessible and not color-only;
- responsive layouts support zoom/reflow and avoid clipping important content;
- dynamic notifications and realtime updates have an accessible announcement strategy.

Validation combines automated tools with manual keyboard, screen-reader, zoom, focus, and form testing. Product scope and supported browser/assistive technology matrix are TBD.

## Observability Requirements

| Area | Minimum future signals |
|---|---|
| API | Request count, route/result class, latency percentiles, request/correlation IDs, timeout/error status, and safe dependency timing. |
| Database | Query latency, slow-query investigations, transaction failures, connection/pool utilization and exhaustion, availability. |
| Redis | Connection/errors, latency, cache misses/failures where important, queue infrastructure health, and memory/eviction signals where available. |
| BullMQ/workers | Queue depth/age, enqueue failures, processing latency, retries, failures, exhausted jobs, worker health, and graceful shutdown. |
| SendGrid | Request failures, ambiguous outcomes, delivery/bounce/complaint signals where supported, retry state, and webhook verification failures. |
| Google Calendar/OAuth | API failures, token/revocation errors, sync latency, pending/failed states, conflicts, callbacks, and reconciliation results. |
| S3 | Signed URL/transfer failures, confirmation failures, object-access errors, scan/quarantine status where introduced, and orphan reconciliation. |
| Frontend/realtime | Navigation/interaction timing, client errors, network failures, stale/reconnect state, and safe user-visible degradation. |

Do not log sensitive payloads unnecessarily. Observability must support correlation and diagnosis without becoming a second uncontrolled copy of recruiting data. Exact monitoring provider, dashboards, retention, sampling, and alert thresholds are open infrastructure decisions.

## Maintainability Requirements

- Preserve modular domain boundaries and one-way collaboration.
- Use strict TypeScript and consistent formatting/type/error conventions in the React frontend; use consistent JavaScript, formatting, runtime validation, and error conventions in the Node.js/Express.js backend once implementation begins.
- Keep controllers thin; place business logic in use cases/services/domain logic.
- Use explicit DTOs and repositories; do not expose ORM/storage/provider details across boundaries.
- Keep migrations under source control once database implementation begins.
- Record significant durable decisions in ADRs.
- Document feature behavior, failure states, security decisions, and operational runbooks as implementation grows.
- Keep scoped tasks focused; unrelated refactors require explicit scope and review.

Maintainability is the system's ability to accept safe change over time, not merely a subjective claim that code is “clean.”

## Testability Requirements

Expected categories include unit tests for domain rules/policies/transformations, integration tests for use cases/repositories/transactions/tenant scope, authorization and negative tests by role/tenant/resource/lifecycle, provider-contract and failure-path tests, worker idempotency/retry/crash tests, frontend component and interaction tests, and E2E tests for critical hiring journeys.

Critical hiring workflows require integration or E2E coverage in addition to unit tests. No blanket 100% coverage target is imposed. Coverage thresholds, mutation testing, and release gates are **Proposed / Requires Implementation Evidence**.

## Recoverability

Future operational design must include PostgreSQL backups and restore testing, migration recovery, S3 durability and object/metadata reconciliation, provider retry/webhook replay/reconciliation, durable asynchronous intent/status, and environment-specific recovery/access controls.

RPO (Recovery Point Objective) is the maximum acceptable amount of data loss measured in time. RTO (Recovery Time Objective) is the maximum acceptable time to restore service or a journey. HiringLoop has no approved production RPO/RTO values; both are **TBD / Requires Infrastructure and Product Decision**. No backup frequency or restore-time commitment is invented here.

## Initial Engineering Targets

| Area | Initial target | Type | Validation stage |
|---|---|---|---|
| Tenant isolation | Zero cross-tenant data exposure or mutation | Hard invariant / Security requirement | Unit, integration, negative, E2E, and security review |
| Backend authorization | All protected operations enforced server-side | Hard invariant | Authorization matrix and attack-path tests |
| Unbounded candidate/application/activity lists | Prohibited; use bounded pagination | Architecture requirement | API contract and query review |
| Typical API latency | p95 <= 500 ms simple reads; p95 <= 750 ms normal writes | Initial Engineering Target | Representative staging/load test |
| Collection/search latency | p95 <= 800 ms filtered collections; p95 <= 1,000 ms initial search | Initial Engineering Target | Dataset-based performance test |
| API tail latency | p99 <= 1,000 ms simple reads; <= 1,500–2,000 ms heavier reads/writes | Initial Engineering Target | Load/saturation test |
| Provider-dependent requests | Prefer fast acknowledgement and pending state; completion target TBD | Architecture requirement / Engineering target | Integration and failure tests |
| Database query investigation | Use timings and `EXPLAIN ANALYZE`; no speculative indexes | Architecture requirement | Database review/performance test |
| Duplicate/replayed commands | One intended business effect | Hard invariant where workflow requires | Idempotency/replay/concurrency tests |
| Redis loss | Never lose authoritative business state; cache fallback where safe | Hard invariant / Architecture requirement | Failure injection and recovery test |
| Security-sensitive changes | Auditable according to approved policy | Security requirement | Audit and security tests |
| Accessibility | Keyboard, focus, semantic, form/error, and non-drag paths work | Quality requirement | Automated plus manual accessibility review |
| API observability | Request ID, latency, result/error class, and safe dependency timing | Architecture requirement | Telemetry contract and failure review |
| Production availability | No percentage committed yet | Future Operational SLO / TBD | Production evidence and operational decision |
| Production RPO/RTO | TBD | Operational TBD | Backup/restore and DR decision |
| Candidate-data retention | TBD | Requires Product/Security Decision | Privacy review |
| Frontend Core Web Vitals | TBD after routes/builds exist; measure LCP, INP, CLS | Initial target to be set later | Browser lab/field evidence |

## Non-Goals

ARCH-05 does not promise internet-scale traffic, arbitrary user/tenant counts, multi-region deployment, active-active operation, five-nines availability, an exact production SLA, zero-latency APIs, provider completion within every request budget, microservices, complex distributed consensus, cross-provider atomic transactions, enterprise DR architecture, approved production RPO/RTO, exact indexes/cache keys/TTLs/pool sizes/queue concurrency/alert thresholds, formal WCAG certification, AI behavior/privacy/infrastructure/readiness, or implementation of any control, framework, provider, service, migration, or deployment.

## Open NFR Questions

| Question | Classification |
|---|---|
| What MVP request concurrency, organization count, candidate/application volume, and document volume should staging represent? | Requires Product Decision and Production Evidence |
| What exact API and frontend performance budgets are acceptable for each critical journey? | Requires Product Decision and Production Evidence |
| What uptime objective is appropriate for the first production release? | Requires Product Decision and Production Evidence |
| How often must PostgreSQL backups run, and what restore locations/access rules are required? | Requires Infrastructure Decision |
| What are approved production RPO and RTO values? | Requires Product and Infrastructure Decision |
| How long should API logs, security audit records, provider webhooks, and worker telemetry be retained? | Requires Product, Security, and Infrastructure Decision |
| How long should candidate data, resumes, feedback, offers, and communications be retained or anonymized? | Requires Product and Security Decision |
| What load-testing datasets, concurrency levels, saturation thresholds, and regression gates are required? | Requires Production Evidence and Infrastructure Decision |
| What alert thresholds and escalation/runbook ownership are required? | Requires Infrastructure Decision |
| Which monitoring, tracing, error-reporting, and frontend field-observability provider should be used? | Requires Infrastructure Decision |
| What browser, device, assistive technology, and WCAG-aligned support matrix is required? | Requires Product Decision |
| What frontend route budgets and Core Web Vitals targets should apply after representative routes exist? | Requires Product and Production Evidence |
| Which workflows require E2E coverage and what release gate is sufficient? | Requires Product and Implementation Evidence |
| What provider degradation states and user retry controls should email/calendar/file workflows expose? | Requires Product Decision |
| Which Redis/worker failure modes may fail open versus fail closed? | Requires Security and Implementation Evidence |

## Scope Verification

ARCH-05 is documentation only. It does not initialize React, Express, Prisma, PostgreSQL, Redis, BullMQ, S3, SendGrid, Google Calendar, realtime infrastructure, or AI; create migrations; provision services; or move the project to Phase 01.
