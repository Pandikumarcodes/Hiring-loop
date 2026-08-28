# Phase 00 Handoff

## Completed Work

- SETUP-00 — Repository Structure
- ARCH-01 — Core System Architecture
- PLAN-01 — Authoritative Master Roadmap
- ARCH-02 — Domain Model
- ARCH-03 — Authorization & Security Architecture
- ARCH-04 — Infrastructure Boundaries
- ARCH-05 — Quality Attributes & Non-Functional Requirements
- ARCH-06 — Phase 00 Final Review / Closure

## Architecture Decisions

HiringLoop is a modular monolith backend with separate frontend and backend applications in one Git repository. PostgreSQL is authoritative. Redis is non-authoritative support infrastructure. S3 stores private file bytes. Workers, providers, and realtime are bounded, fallible supporting systems. Microservices are not introduced without evidence.

## Domain Decisions

Organization is the tenant boundary. User and Membership are separate. Candidate and Application are separate. Job and Pipeline are separate. Current state is distinct from history. Interview and Feedback, Activity and Audit, Offer and Hire, and Resume and Candidate Profile remain distinct concepts.

## Security Decisions

Backend authorization is authoritative. Tenant context derives from authenticated membership. RBAC is combined with resource-level policy. Documents are private and provider credentials remain server-side. Sensitive data is minimized in DTOs, logs, queues, URLs, and client bundles. Security-critical actions are auditable.

## Infrastructure Decisions

External providers are accessed through adapter boundaries. Slow or unreliable work may use workers with durable intent, idempotency, retries, backoff, and reconciliation. API instances are stateless where practical. Development, staging, and production resources and credentials are separated.

## NFR Decisions

NFRs use hard invariants for tenant isolation and authorization, provisional initial engineering targets for latency, and TBD/future SLO labels for production availability, RPO/RTO, retention, and capacity. Quality attribute scenarios define future validation.

## ADRs

ADR-001 through ADR-006 are accepted and cover modular monolith structure, Candidate/Application separation, RBAC plus resource authorization, PostgreSQL authority, object storage, and background workers.

## Open Decisions

See [OPEN_DECISIONS_AND_RISKS.md](OPEN_DECISIONS_AND_RISKS.md) for product, security, infrastructure, and operational decisions. No open item was found to block Phase 01 foundation setup.

## Known Risks

The repository-local PRD is missing; production performance/availability evidence does not exist; provider, privacy, recovery, and operational policies remain to be decided at the relevant phases.

## Documentation Gaps

Add the authoritative repository-local PRD before feature implementation expands. Do not invent product requirements from the roadmap's FR identifiers alone.

## Current Repository State

Documentation-only Phase 00 closure artifacts are present. Frontend and backend directories remain uninitialized. No migrations, secrets, provisioned services, or AI implementation were added.

## Next Phase

Phase 01 — Project Foundation — NOT STARTED.

## Exact Next Codex Task

Phase 01 — Project Foundation, as defined in MASTER_ROADMAP.md. Do not start it as part of ARCH-06 unless explicitly requested in a new task.
