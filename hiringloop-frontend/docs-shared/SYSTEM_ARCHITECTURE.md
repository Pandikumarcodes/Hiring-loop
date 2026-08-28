# HiringLoop System Architecture

## Purpose

HiringLoop uses a software-engineering-first architecture for a production-style, multi-tenant recruitment SaaS platform. The initial design keeps the frontend and backend as separate applications in one Git repository, organizes backend behavior by domain, and keeps PostgreSQL authoritative. It leaves deliberate boundaries for future infrastructure and AI work without implementing those concerns during the current planning phase.

## High-Level Architecture

The initial request and data path is:

```text
Candidate / Public User
        ↓
React Frontend
        ↓
HTTPS / REST
        ↓
Node.js + Express.js + JavaScript Backend
        ↓
PostgreSQL
```

Future supporting infrastructure may include:

- AWS S3 for object storage
- Redis for measured caching and coordination needs
- BullMQ workers for justified asynchronous workloads
- SendGrid for email delivery
- Google Calendar for calendar integration
- Socket.IO or SSE only where realtime behavior is justified

AI is a future extension boundary only. It is not an implemented component of this architecture or of the current milestone.

## Architecture Style

HiringLoop will use a modular monolith with background workers where justified. A single backend application contains explicit domain modules with controlled interfaces, while selected slow or retryable work can run in worker processes.

Microservices are not the starting point because the project is early-stage, needs fast iteration, benefits from transaction consistency, and does not yet have demonstrated independent scaling or team-ownership requirements. Clear module boundaries preserve a future extraction path without paying distributed-system costs prematurely.

## Frontend Boundary

The frontend is responsible for:

- presentation and composition of user interfaces
- client-side routing
- forms and client-side UX validation
- consuming server state
- loading, error, and empty states
- permission-aware UX and route visibility
- accessibility

Frontend authorization is not authoritative. UI checks improve usability, but the backend must authenticate requests, resolve tenant context, authorize operations, and enforce data access on every protected path.

## Backend Boundary

The backend is responsible for:

- authentication
- authorization
- tenant resolution
- business rules and workflow decisions
- transactions
- persistence
- integration orchestration
- audit and activity generation
- secure, explicit DTOs

External provider credentials remain server-side. The backend is the enforcement point for security and tenant isolation.

## Backend Request Flow

```text
Route
  → Middleware
  → Controller
  → Service / Use Case
  → Repository / Data Access
  → Prisma
  → PostgreSQL
```

- **Route** maps an HTTP method and path to a feature entry point.
- **Middleware** handles cross-cutting request concerns such as authentication, tenant context, authorization, validation, rate limiting, and error translation where appropriate.
- **Controller** translates HTTP input into an application call and translates the result into an HTTP response. Controllers remain thin.
- **Service / Use Case** coordinates business rules, permissions, transactions, and cross-module workflows.
- **Repository / Data Access** expresses persistence operations and tenant-scoped queries without exposing storage details to controllers.
- **Prisma** is the planned ORM/data-access mechanism and is not accessed directly from controllers.
- **PostgreSQL** persists authoritative domain state.

## Domain Modules

The initial backend module set is:

`auth`, `organizations`, `users`, `jobs`, `applications`, `candidates`, `pipeline`, `interviews`, `feedback`, `communications`, `offers`, `talent-pool`, `analytics`, `notifications`, `integrations`, and `audit`.

`ai/` is reserved as a future-phase boundary only and must not be implemented during the current software-engineering milestone.

Each module owns its domain rules and persistence abstractions. Cross-module workflows are orchestrated through services/use cases rather than direct manipulation of another module's database internals.

## Data Ownership

- PostgreSQL is the source of truth for HiringLoop domain state.
- Tenant-owned resources belong to an organization and must be accessed with organization scope.
- Files will be stored in object storage later; metadata and ownership remain represented in PostgreSQL.
- Redis must never become the source of truth for domain records.
- External providers are integrations, not domain authorities. Provider state is synchronized into PostgreSQL according to explicit workflows.

Tenant context is resolved from authenticated organization membership. A frontend-supplied organization ID is not trusted as authorization input, and tenant-owned repository queries must be organization-scoped.

## Data-Flow Examples

### Normal authenticated feature

```text
React UI
  ↓
API Request
  ↓
Authentication
  ↓
Organization Context
  ↓
Authorization
  ↓
Validation
  ↓
Controller
  ↓
Use Case
  ↓
Repository
  ↓
PostgreSQL
  ↓
Explicit DTO
  ↓
Frontend Query Cache
  ↓
UI
```

### Future asynchronous pattern

```text
HTTP Request
  ↓
Persist authoritative state
  ↓
Create / enqueue background work
  ↓
Return response
  ↓
Worker
  ↓
External provider
  ↓
Persist result / status
```

## Background Work

BullMQ workers may later handle email delivery, calendar synchronization, notifications, bulk or document processing, and cleanup. Slow, unreliable, or retryable external work should not unnecessarily block an HTTP request. The authoritative state and the status of requested work should be persisted before or alongside enqueueing according to the relevant workflow's consistency requirements.

## External Integration Boundaries

Integrations will be accessed through adapters or ports owned by the integration boundary, with domain modules depending on stable application-facing contracts rather than provider SDK details. Planned boundaries include:

- object storage
- email delivery
- calendar services
- OAuth or identity providers where appropriate

These adapters are architectural boundaries only at this stage; they are not implemented here.

## Realtime Boundary

Normal REST remains preferable for request/response workflows, predictable caching, and most CRUD-style screens. Socket.IO or SSE may be justified for user-visible state that benefits materially from low-latency server-to-client updates, such as selected collaboration or live process updates. Realtime should be introduced only with a defined event model, authorization rules, reconnection behavior, and a demonstrated product need.

## Deployment Direction

The approved initial deployment direction is:

```text
Frontend → Vercel
Backend → Render
PostgreSQL → Supabase PostgreSQL
Files → AWS S3
```

Deployment details can evolve later if implementation evidence requires it. The deployment choice does not change the ownership and security rules described here.

## Scalability Direction

The architecture can later support stateless API instances behind a load balancer, horizontal API scaling, database connection pooling, independently scaled workers, Redis caching, and asynchronous workloads. These are evolution paths, not requirements to introduce distributed-system complexity now. Large collections require pagination, indexes must support real query patterns, N+1 queries should be avoided, response fields should be intentional, and expensive external work should move off synchronous paths where justified.

Caching will be added only when measured or clearly repeated-read behavior justifies it. Frontend work should avoid unnecessary network waterfalls and rendering work. Cache keys and detailed indexes should be designed with actual feature query patterns rather than speculated in advance.

## Security Architecture Notes

- Backend authorization is authoritative.
- Tenant context is resolved from authenticated membership.
- Frontend-supplied organization IDs are not trusted for authorization.
- Tenant-owned repository queries are organization-scoped.
- Input validation occurs at trust boundaries.
- Sensitive database fields do not automatically appear in responses; explicit DTOs control exposure.
- External provider credentials remain server-side.
- Private file access will require authorization plus signed URLs.
- Security-critical and business-critical changes require auditability.

## Performance Architecture Notes

- Large collections use pagination.
- Indexes support real query patterns.
- N+1 queries are avoided.
- Responses do not include unnecessary fields.
- Expensive external work moves off synchronous request paths where justified.
- Redis caching is introduced only for a measured or clearly established repeated-read benefit.
- The frontend avoids unnecessary network waterfalls and rendering work.

## Teaching Notes

A modular monolith is one deployable backend organized internally into explicit domain modules. Module boundaries matter because they make ownership, allowed collaboration, testing, and future change visible before the codebase grows. Candidate and Application are separate because a person can apply to multiple jobs, while each application has its own job-specific status and history. Separate frontend and backend applications describe application boundaries, not a requirement for microservices. PostgreSQL remains the source of truth so domain state, transactions, reporting inputs, and recovery behavior have one authoritative home. The key concepts to learn from this task are boundaries, ownership, trust boundaries, orchestration, consistency, explicit contracts, and delaying complexity until evidence supports it.
