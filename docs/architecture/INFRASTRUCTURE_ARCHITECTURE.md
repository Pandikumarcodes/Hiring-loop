# HiringLoop Infrastructure Architecture

## Purpose

This document defines how infrastructure supports HiringLoop's modular-monolith application. Infrastructure provides persistence, storage, asynchronous execution, delivery, identity integration, and deployment capabilities; it must not become part of domain logic or the authority for HiringLoop business state.

This is an architecture planning document. It does not configure, provision, or initialize any service. Provider choices and deployment direction are approved at a conceptual level only, and unresolved decisions are recorded near the end.

The boundaries here extend `SYSTEM_ARCHITECTURE.md`, `MODULE_BOUNDARIES.md`, `DOMAIN_MODEL.md`, and the security documents. The backend remains the enforcement point for authentication, tenant context, authorization, business rules, provider orchestration, and explicit DTOs.

## High-Level Components

```text
Candidate / Recruiter / Hiring Team
              |
       React frontend
              |
       HTTPS / REST (and justified realtime)
              |
Node.js + Express.js + JavaScript backend API
       |       |       |       |
 PostgreSQL  Redis  S3   Provider adapters
       |       |       |       |
   durable   cache/  files  email, OAuth,
   domain    queue/        calendar providers
   state     coord.
              |
        BullMQ workers
```

### Frontend

The React application is deployed independently. It owns presentation, routing, forms, client-side validation, loading/error/empty states, accessibility, and permission-aware UX. It does not own authorization, tenant isolation, provider credentials, durable business state, or file-storage authority.

### Backend API

The Node.js + Express backend is a modular monolith. It should be stateless where practical: request handling must not depend on critical business state held only in one process's memory. The backend owns authentication context, tenant resolution, authorization, business rules, transactions, persistence orchestration, integration orchestration, and safe response DTOs.

### PostgreSQL

PostgreSQL is the authoritative application database for HiringLoop domain state, metadata, workflow state, durable integration state, and business history. Prisma is the planned application data-access mediator. Physical schema design belongs to Phase 02 and later feature work.

### Redis

Redis is reserved for derived cache data, BullMQ queue infrastructure, and ephemeral coordination where justified. Redis is never the source of truth for candidates, jobs, applications, interviews, offers, communications, or other business records.

### BullMQ workers

BullMQ workers are a future asynchronous execution boundary. They may process slow, retryable, or provider-dependent work, but important business intent and user-visible status must be persisted in PostgreSQL according to the relevant workflow.

### AWS S3

AWS S3 is the future private object/document storage boundary. File bytes belong in object storage; ownership, metadata, association, authorization context, and lifecycle status remain in PostgreSQL.

### SendGrid

SendGrid is an external email-delivery provider. It may report provider message and delivery status, but it does not own HiringLoop communication intent, recipient authorization, templates, or business workflow state.

### Google OAuth

Google OAuth is an external identity integration. Provider identity claims and tokens must be validated and controlled by the backend. A Google identity does not itself grant HiringLoop organization membership or application permissions.

### Google Calendar

Google Calendar is an external scheduling integration. Calendar event IDs and synchronization status are references held by HiringLoop; the internal Interview lifecycle remains authoritative for HiringLoop workflows.

### Realtime

Socket.IO or SSE may be introduced only for workflows with a demonstrated user-experience benefit, such as selected pipeline changes, interview updates, notifications, or offer response updates. REST and PostgreSQL remain authoritative.

### Future AI provider

AI is explicitly deferred. No provider, model, prompt, queue, storage flow, or AI business behavior is defined or implemented by this architecture. Any future AI provider must be separately approved after the software-engineering milestone and must preserve human control and source provenance.

## Infrastructure vs Application Responsibilities

The application decides what a recruiting action means, whether it is authorized, and what durable business state results. Infrastructure supplies capabilities and operational guarantees.

| Responsibility | Application boundary | Infrastructure boundary |
|---|---|---|
| Candidate/application/job state | Validate, authorize, transition, and persist business state | Store and recover database records |
| Files | Decide ownership, access, association, and lifecycle | Store private bytes and serve authorized signed capabilities |
| Email | Create communication intent, recipient scope, template use, and status | Accept delivery request and report provider outcomes |
| Calendar | Own Interview lifecycle, participant rules, and sync status | Create/update external calendar events and return provider results |
| Async work | Define work intent, idempotency, and business result | Queue, execute, retry, and monitor jobs |
| Authentication | Establish application identity and membership context | Provide transport/security facilities and provider connectivity |
| Realtime | Authorize event visibility and define event meaning | Carry connections and delivery attempts |

Provider SDKs, Redis clients, queue libraries, and storage clients must remain behind infrastructure adapters or application-facing ports. Domain modules must not contain provider-specific calls or provider response assumptions.

## Source-of-Truth Ownership

| Concern | Source of Truth | Supporting System |
|---|---|---|
| User and organization application state | PostgreSQL | Backend authorization and session mechanisms |
| Candidate, Job, Application, Pipeline, Interview, Feedback, Offer state | PostgreSQL | API, workers, and provider references |
| Resume/document bytes | S3 | PostgreSQL metadata, ownership, lifecycle, and access records |
| Resume/document metadata | PostgreSQL | S3 object identified by an internal object reference |
| Tenant ownership and authorization context | PostgreSQL plus authenticated backend context | Frontend UX, policies, and infrastructure isolation |
| Cache entries | PostgreSQL-derived state | Redis only |
| Queue delivery and attempt mechanics | BullMQ/Redis operationally | PostgreSQL business intent/status where required |
| Communication intent and application delivery status | PostgreSQL | SendGrid provider state, callbacks, and reconciliation |
| Email provider delivery events | SendGrid operational state | PostgreSQL relevant status/history |
| Interview scheduling state | PostgreSQL | Google Calendar event and synchronization state |
| External calendar event | Google Calendar for the external event | PostgreSQL provider ID, sync state, and internal Interview state |
| Analytics/reporting views | PostgreSQL-derived or later approved read model | Jobs, queries, workers, and caches |
| Realtime connection state | Connection infrastructure operationally | PostgreSQL authoritative records and REST refresh |

Redis is not authoritative business storage. External providers do not own HiringLoop business state. A provider can report facts about its own operation, but HiringLoop must validate, authorize, reconcile, and persist the application meaning of those facts.

## Synchronous and Asynchronous Boundaries

Synchronous work is appropriate when the user needs an immediate result and the operation can complete within a bounded request. Examples include authorization, validation, ordinary reads, transactional domain mutations, and creation of an upload intent.

Asynchronous work is justified when it is slow, unreliable, retryable, provider-dependent, batch-oriented, or not required to complete before the user receives an acknowledgement. Examples include email sending, calendar synchronization, notifications, bulk imports, document generation, cleanup, and later approved AI workloads.

The conceptual asynchronous pattern is:

```text
API request
    |
persist authoritative state / work intent
    |
enqueue minimal job payload
    |
return accepted result
    |
worker claims and validates job
    |
external provider or slow processing
    |
persist result, status, and history in PostgreSQL
```

The exact ordering, transaction/outbox strategy, and user-visible status for each workflow are implementation decisions. They must preserve domain invariants and must not silently treat queue acceptance as provider success.

## Object Storage Boundary

Uploaded resumes and other private documents should use the following future flow:

```text
Frontend
   |
Backend authentication + tenant/resource authorization
   |
create upload intent / signed upload URL
   |
private S3 object upload
   |
upload confirmation and validation
   |
persist metadata, ownership, association, and status in PostgreSQL
```

### Boundary rules

- Use a private bucket; browsers do not receive storage credentials or unrestricted bucket paths.
- Use unpredictable internal object keys. Keys must not expose candidate identity, tenant names, or user-controlled path traversal.
- Issue signed upload/download URLs only after backend authorization and only for the narrow object and action required.
- Keep content metadata, ownership, Candidate/Application/Offer association, lifecycle status, and access/audit references in PostgreSQL.
- Apply server-side upload-size and supported-type limits. Later implementation should validate declared MIME type, extension, filename, and content signature where possible.
- Upload confirmation must not make a document available merely because bytes reached S3. A future malware-scanning or quarantine state may be required before sensitive use.
- Signed URLs are bearer capabilities. Their expiration, scope, logging, referrer behavior, and frontend handling require security review.

### Failure scenarios

| Scenario | Proposed behavior |
|---|---|
| Signed URL cannot be issued | Fail the upload/access action safely; do not create misleading available metadata. |
| Upload fails or expires | Keep the intent incomplete/failed according to a later lifecycle policy; allow safe retry or cleanup. |
| Confirmation cannot verify the object | Do not mark the document available; preserve recoverable status. |
| S3 is unavailable during access | Return a safe access failure without changing authoritative metadata. |
| S3 succeeds but PostgreSQL persistence fails | Reconcile or clean up the orphaned object later; do not claim the domain operation completed. |
| Malware scan fails or detects malware | Proposed quarantine/failed status; never expose the object as available until policy allows it. |

Exact orphan cleanup, replacement, retention, deletion, scanning provider, and signed-URL expiration are open decisions.

## Redis Boundary

Redis may support:

- cache-aside reads for measured repeated-read workloads;
- BullMQ queue and worker coordination;
- short-lived locks, rate-limit counters, deduplication windows, or other ephemeral coordination where explicitly justified.

Redis must not store the permanent authoritative candidate, job, application, interview, offer, communication, membership, audit, or tenant state. Queue loss, cache eviction, restart, or Redis replacement must not make HiringLoop unable to reconstruct required business state from PostgreSQL and external-provider reconciliation.

### Cache-aside concept

```text
Request
   |
 Redis
  /   \
hit   miss
 |      |
return PostgreSQL
           |
         cache derived result
```

Cache entries are derived, disposable, tenant-safe, and subject to invalidation or expiry. Cache reads must not bypass backend authorization. Where safe, Redis outage may fail open to PostgreSQL; for coordination or rate-limit controls, the feature must define whether fail-closed or degraded behavior is safer. Exact cache keys, TTLs, invalidation events, and sensitive-data policy are deferred until real query patterns and implementation evidence exist.

## Background Job and Worker Boundary

Background processing is justified for email sending, calendar synchronization, notifications, bulk imports, document generation, cleanup, and later approved AI workloads. It is not justified merely to move ordinary transactional domain work out of the API.

### Job lifecycle expectations

The API should persist the authoritative business intent and any required user-visible pending status before or alongside enqueueing according to the workflow's consistency requirement. It then enqueues a minimal, tenant-scoped job reference and returns a response appropriate to the operation.

Workers must revalidate authorization-relevant context, load authoritative records from PostgreSQL, call providers through adapters, and persist success, pending, or failure results. Queue acknowledgement is not business success.

Workers should be designed for:

- bounded timeouts so a stuck provider call does not consume a worker indefinitely;
- limited retries with exponential backoff and jitter where retry is safe;
- deterministic job identity or an idempotency record to prevent duplicate effects;
- payload minimization, with no secrets or unnecessary PII in job metadata;
- explicit failure and exhausted-retry state, with safe recovery or operator action;
- poison-job handling and a later dead-letter/recovery policy;
- correlation IDs and metrics without sensitive logging;
- graceful shutdown and safe redelivery semantics.

Retries must be classified by error: transient provider/network failures may be retryable, validation/authorization failures generally are not, and ambiguous timeouts require provider-aware idempotency or reconciliation before repeating an external effect.

## External Provider Adapter Boundaries

The intended dependency direction is:

```text
Business use case
        |
Application-facing provider contract
        |
Concrete infrastructure adapter
        |
External provider SDK/API
```

Future adapter boundaries include:

- `EmailProvider` for sending and delivery-status translation;
- `CalendarProvider` for event creation, update, cancellation, and provider reconciliation;
- `ObjectStorageProvider` for signed upload/download capability and object inspection;
- `OAuthProvider` where provider identity and authorization-code/token exchange are needed.

These names describe conceptual ports only; no interfaces or code are created by ARCH-04. Domain and business services depend on stable application concepts, not SendGrid, Google Calendar, S3, Google SDK, HTTP response shapes, or provider-specific error classes. This isolates vendor changes, makes provider fallibility explicit, permits contract testing, and prevents external APIs from bypassing tenant authorization and domain invariants.

## Calendar Integration Boundary

HiringLoop owns the internal Interview entity, participants, lifecycle, authorization, timezone-aware business rules, and synchronization status. Google Calendar owns the external calendar event it hosts. HiringLoop stores provider IDs and synchronization references; provider IDs are not domain identity.

Conceptually:

```text
Interview use case
   |
persist internal Interview + intended sync state
   |
CalendarProvider adapter
   |
Google Calendar
   |
provider result / webhook / reconciliation
   |
persist sync status, reference, and error in PostgreSQL
```

The boundaries must account for:

- partial success, such as a provider event being created while the response is lost;
- retries with deterministic event identity or a stored idempotency/reference strategy;
- eventual consistency between internal Interview state and the provider event;
- duplicate prevention during create, reschedule, cancel, webhook replay, or worker redelivery;
- provider drift, deletion, edits, conflicts, and stale callbacks;
- OAuth token handling on the server side, with least privilege, encryption/protection, rotation, and no token leakage into logs, DTOs, URLs, or queues;
- conflict detection and reconciliation responsibilities, which remain **Proposed / Requires Implementation Evidence** until scheduling requirements exist.

A PostgreSQL transaction cannot include Google Calendar because the database transaction manager cannot atomically commit or roll back a remote HTTP/API side effect. The application must use an explicit consistency strategy: durable intent, idempotent adapter operations, retry/reconciliation, and visible pending/failed synchronization state. Exact workflow semantics are **Proposed / Requires Product Decision**.

## Email Integration Boundary

Communications owns message intent, recipient scope, template responsibility, and application delivery history. SendGrid performs external delivery and reports provider outcomes.

```text
Communication request
        |
persist outbound intent and status
        |
background job
        |
SendGrid adapter
        |
SendGrid
        |
delivery result / webhook where supported
        |
update communication status in PostgreSQL
```

The design must address:

- retries with idempotency or duplicate-send protection;
- ambiguous provider timeouts, where status must be reconciled before repeating a send;
- provider outage, with a visible pending/failed state and recoverable retry path;
- delivery, bounce, complaint, and failure status where the provider supports them;
- webhook authenticity, replay handling, and tenant-safe correlation;
- template selection, variable substitution, recipient validation, and consent/preferences in the Communications/application boundary rather than in SendGrid;
- minimum necessary payloads and no provider credentials in application responses or worker metadata.

The provider cannot change the source Application, Interview, Offer, or other workflow state merely by reporting delivery success or failure.

## Realtime Boundary

Realtime is optional infrastructure for server-to-client delivery, not a replacement for durable state. Use normal REST refresh or polling when the UX does not materially benefit from low latency. Consider SSE for primarily server-to-client streams and WebSockets/Socket.IO for justified bidirectional or connection-rich collaboration.

Potential candidates include pipeline changes, interview updates, notifications, and offer response updates. Each proposed event needs an authorization rule, tenant scope, minimal payload, ordering/reconnect behavior, and REST fallback. The backend must recheck authorization for subscriptions and events; a client must be able to recover from missed events by refreshing authoritative PostgreSQL-backed state.

Transport selection is **Proposed / Requires Product Decision** and should wait for demonstrated UX need. Connection counts, fan-out, replay, event ordering, and operational limits require implementation evidence.

## Stateless Backend Design

The API should remain stateless where practical:

- no critical session, tenant, business, or workflow state exists only in one API process's memory;
- API instances can be added or removed without moving business state;
- shared PostgreSQL holds durable domain state;
- Redis is shared only where cache/queue/coordination use is approved;
- S3 holds object bytes outside API instance disks;
- provider credentials and tokens are available through protected environment-specific secret management, not process-local ad hoc files;
- connection pooling and bounded concurrency protect shared dependencies.

Stateless does not mean the application has no state. It means durable state is held in shared authoritative or explicitly external systems rather than in an individual API instance's memory or filesystem. Short-lived request-local state and safe in-memory optimizations may exist if their loss does not corrupt business behavior.

## Database Infrastructure Boundary

PostgreSQL is authoritative for HiringLoop application state, tenant relationships, workflow status, history, integration references, and business-relevant asynchronous status. Prisma will later mediate application data access; controllers must not access Prisma directly. Repositories and use cases must preserve tenant-scoped queries and explicit transaction boundaries.

The database boundary must later address:

- connection pooling and maximum connection budgets across API and workers;
- migrations and controlled schema evolution;
- backups, point-in-time recovery assumptions, restore testing, and retention;
- transaction support for the consistency boundaries identified by the domain model;
- tenant-scoped queries, relationships, constraints, and authorization reinforcement;
- safe operational access and least-privilege credentials.

No physical schema, Prisma model, migration, index, pool size, backup target, or SQL is selected here. Physical schema design belongs to Phase 02 and feature-specific database work.

## Environment Model

The standalone [ENVIRONMENT_MODEL.md](ENVIRONMENT_MODEL.md) records the environment separation and credential/data rules in more detail. The boundary summary is included here for traceability.

Development, staging, and production must be separate operational environments with separate credentials and resources. They are not merely configuration labels.

| Environment | Purpose | Separation requirements |
|---|---|---|
| Development | Local feature/design work and safe experimentation | Separate database, Redis, storage namespace/bucket strategy, OAuth app/redirects, email credentials, calendar credentials, and secrets. Use non-production data or approved fixtures. |
| Staging | Integration, acceptance, and release-candidate verification | Separate shared resources and credentials from production; representative but controlled data; provider sandbox/test modes where available. |
| Production | Real tenant data and user traffic | Dedicated resources, managed secrets, least-privilege access, backups/recovery, monitoring, audited operational access, and production provider credentials. |

At minimum, separate:

- PostgreSQL databases/projects and connection credentials;
- Redis instances/databases and queue namespaces;
- S3 buckets or an explicitly approved isolated topology and prefixes;
- Google OAuth client IDs, redirect URIs, and provider scopes;
- SendGrid API keys, sender identities, and webhook configuration;
- Google Calendar OAuth credentials and connected-account data;
- worker credentials and deployment configuration;
- environment secrets, encryption material, and observability access.

Production resources must not be reused casually for development or testing. No secrets or `.env` values are created by this task.

## Deployment Boundaries

The approved initial direction is:

```text
Frontend       -> Vercel
Backend API    -> Render
PostgreSQL     -> Supabase PostgreSQL
Files          -> AWS S3
```

Future infrastructure includes a Redis provider and worker deployment strategy. These are directions, not provisioning instructions. Exact service tiers, regions, networking, domains, scaling settings, and operational products remain open.

One Git repository does not require one deployment unit. The frontend and backend remain independently deployable applications with separate dependencies, build/configuration concerns, release health, and rollback boundaries. A future worker deployment may be independently deployed from the API while sharing approved application contracts and infrastructure resources.

## Failure Boundaries

The following are proposed architectural behaviors. Exact user messaging, timeouts, retry counts, alert thresholds, and recovery tooling require implementation evidence and feature-level decisions.

| Dependency | Example failure | Expected application behavior |
|---|---|---|
| PostgreSQL | Timeout, unavailable database, failed transaction | Fail dependent request safely; do not claim a mutation succeeded; preserve transaction atomicity; surface an operational error without sensitive details. Recovery and read-only degradation are **Proposed / Requires Implementation Evidence**. |
| Redis | Cache outage, eviction, queue coordination issue | Cache may fail open to PostgreSQL where safe. Queue-dependent work must not be reported complete merely because the API accepted a request; enqueue durability/recovery behavior is **Proposed / Requires Implementation Evidence**. |
| Worker | Crash, timeout, poison job, exhausted retry | Durable intent/status remains in PostgreSQL; job is retryable or failed visibly according to workflow; no duplicate external effect on redelivery. Exact dead-letter/operator behavior is **Proposed**. |
| S3 | Upload, signed URL, or object-read failure | Fail upload/access safely; do not corrupt or falsely advance PostgreSQL metadata; retain recoverable pending/failed state where applicable. |
| SendGrid | Provider outage, rejection, ambiguous timeout | Communication intent remains durable; mark pending/failed as appropriate; retry only when safe and reconcile ambiguous sends; source business state does not necessarily fail. |
| Google Calendar | API outage, token failure, conflict, stale event | Internal Interview remains authoritative; record pending/failed synchronization and retry/reconcile; do not silently lose scheduling intent. |
| OAuth provider | Login/token exchange failure, invalid callback, revoked access | Reject or pause the integration safely; do not grant identity or membership based on unvalidated claims; preserve existing application state. |
| Realtime connection | Disconnect, missed event, transport outage | Fall back to REST refresh/polling and show stale/reconnecting state where needed; PostgreSQL remains authoritative. |

Provider errors, callbacks, and worker payloads cross trust boundaries. They require validation, safe error translation, tenant/resource authorization, replay protection, and redacted observability as defined by the security architecture.

## Scalability Direction

Initial direction:

```text
single API deployment
single worker deployment (when workers are introduced)
PostgreSQL
Redis for justified cache/queue needs
S3 for object bytes
```

Later, if evidence requires it:

- multiple stateless API instances behind the hosting platform/load-balancing layer;
- multiple worker processes or deployments with controlled queue concurrency;
- database connection pooling and per-process connection budgets;
- Redis scaling or partitioning appropriate to measured cache/queue load;
- bounded provider concurrency, backpressure, and rate-limit handling;
- selective read-model, cache, or asynchronous processing improvements.

Do not introduce microservices as the default scaling response. Many scaling problems can be addressed within the modular monolith through query design, pagination, evidence-based indexes, connection management, horizontal API instances, worker concurrency, caching, and moving slow provider work off request paths. Service decomposition requires demonstrated independent scaling, ownership, deployment, or isolation need and a separately reviewed decision.

## Infrastructure Security

This document complements, rather than replaces, `AUTHORIZATION_ARCHITECTURE.md`, `SECURITY_ARCHITECTURE.md`, and `THREAT_MODEL.md`.

- Use TLS for browser, API, database, cache, storage, and provider connections as supported by the deployment.
- Isolate secrets by environment and store production secrets in managed, access-controlled storage with rotation and audit.
- Use least-privilege credentials and scopes for PostgreSQL, S3, SendGrid, Google OAuth, Google Calendar, workers, and observability.
- Keep S3 buckets private and issue narrowly scoped signed URLs only after backend tenant/resource authorization.
- Keep OAuth/provider tokens server-side and protect them from DTOs, logs, URLs, queues, and client bundles.
- Never log secrets, signed URLs, full documents, unnecessary candidate PII, private feedback, or confidential offer terms.
- Treat workers as a server-side trust boundary: validate job payloads, minimize tenant context, re-load authoritative state, enforce authorization-relevant checks, and protect provider credentials.
- Validate provider callbacks, signatures/state/PKCE requirements where applicable, replay characteristics, and resource ownership before applying results.
- Database constraints, network isolation, backups, and infrastructure access controls reinforce but do not replace backend authorization.

## Open Infrastructure Questions

| Question | Status |
|---|---|
| Which Redis hosting provider and topology should be used? | Proposed / Requires Implementation Evidence |
| How should workers be hosted and independently scaled? | Proposed / Requires Implementation Evidence |
| What exact S3 bucket topology, region, lifecycle, and tenant isolation model is appropriate? | Proposed / Requires Security and Implementation Evidence |
| What signed URL expiration and scope values are acceptable? | Proposed / Requires Security Decision |
| Which malware-scanning provider and quarantine workflow will be used? | Proposed / Requires Product and Security Decision |
| What webhook ingress, signature verification, and replay/reconciliation infrastructure is needed? | Proposed / Requires Implementation Evidence |
| Should realtime use REST refresh, polling, SSE, or WebSockets for each workflow? | Proposed / Requires Product Decision and UX Evidence |
| What API/worker database connection-pool configuration fits hosting limits and traffic? | Proposed / Requires Implementation Evidence |
| What backup, restore, point-in-time recovery, retention, and disaster-recovery targets are required? | Proposed / Requires Product and Operational Decision |
| Is a CDN needed for any public/static or authorized file delivery path? | Proposed / Requires Performance and Security Evidence |
| What exact outbox/queue durability strategy is required for each asynchronous workflow? | Proposed / Requires Implementation Evidence |
| Which provider sandbox/test environments and webhook environments are available? | Proposed / Requires Provider/Implementation Evidence |

The missing repository-local PRD remains a product traceability gap. It may change workflow priorities and user-visible failure behavior but does not change the infrastructure principle that PostgreSQL owns HiringLoop business state.

## Durable Decisions and Deferred Choices

Accepted by this task:

1. PostgreSQL is the authoritative source of truth for HiringLoop application state.
2. Uploaded document bytes belong in private object storage while metadata and ownership remain in PostgreSQL.
3. Slow, unreliable, retryable, or provider-dependent work belongs behind a worker boundary when justified.
4. Redis, external providers, and realtime transports are supporting systems, not domain authorities.
5. Provider SDKs are hidden behind application-facing adapter boundaries.
6. The API/frontend/dependency boundaries remain independently deployable without introducing microservices.

Deferred until evidence or product/security decisions exist:

- detailed cache keys and invalidation design;
- BullMQ queue catalog, job payloads, and exact retry policy;
- physical database schema, migrations, indexes, and pool sizing;
- S3 lifecycle, scanning, CDN, signed-URL values, and deletion policy;
- calendar conflict/reconciliation rules and email delivery semantics;
- realtime transport and event catalog;
- provider tiers, regions, networking, and operational runbooks.

## Teaching Notes

1. **Infrastructure vs application architecture:** application architecture defines business behavior and boundaries; infrastructure supplies databases, storage, queues, providers, and runtime capabilities.
2. **Source of truth:** the authoritative system whose durable state defines what HiringLoop believes is true. Here, core application state belongs in PostgreSQL.
3. **Stateless backend:** an API instance does not depend on critical state kept only in its own memory or disk.
4. **Horizontal scaling:** adding more equivalent API or worker instances instead of making one instance larger.
5. **Connection pooling:** reusing a bounded set of database connections so many requests/processes do not overwhelm PostgreSQL.
6. **Cache:** disposable derived data used to reduce repeated reads or latency; it can be rebuilt from the source of truth.
7. **Cache invalidation:** removing or refreshing derived data when authoritative state changes so stale results do not persist beyond the accepted policy.
8. **Message queue:** durable or operational infrastructure that holds work until a worker can process it.
9. **Worker:** a server-side process that consumes queued work independently of an HTTP request.
10. **Idempotency:** repeating the same command produces one intended effect rather than duplicates.
11. **Retry/backoff:** retrying transient failures after increasing delays, often with jitter, while avoiding unsafe repeats.
12. **Eventual consistency:** related systems converge over time rather than changing atomically together.
13. **Adapter pattern:** translating a stable application-facing contract into a provider-specific SDK/API call and response.
14. **Failure boundary:** the point at which a dependency can fail and the application must define safe degradation, retry, or visible failure behavior.
15. **Why PostgreSQL transactions cannot include external providers:** a database can atomically commit its own records, but it cannot roll back a remote email, calendar, or storage side effect without a distributed transaction protocol. HiringLoop therefore needs intent, idempotency, retries, reconciliation, and explicit pending/failed states.

### Relevant system-design and interview concepts

Multi-tenant isolation, modular monoliths, bounded contexts, ports and adapters, consistency models, distributed transactions, the outbox pattern, queues and backpressure, at-least-once delivery, deduplication, idempotency keys, exponential backoff, dead-letter queues, reconciliation, webhooks, cache-aside, cache invalidation, connection pools, horizontal scaling, graceful degradation, circuit breakers, rate limits, provider fallibility, secret management, signed URLs, object storage, observability, SLOs, and disaster recovery.

## Scope Verification

ARCH-04 adds architecture documentation only. It does not initialize React, Express, Prisma, PostgreSQL, Redis, BullMQ, S3, SendGrid, Google Calendar, Socket.IO, SSE, or AI; create migrations; provision infrastructure; or move the project into Phase 01.
