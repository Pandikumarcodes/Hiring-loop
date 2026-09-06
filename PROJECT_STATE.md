# HiringLoop Project State

## Current Milestone

M0 — Architecture and Project Foundation

## Current Phase

Phase 09 — Pipeline Configuration

## Previous Phase

Phase 07 — Team Management & Authorization — COMPLETE

## Phase Status

IN PROGRESS — Phase 09 implementation is complete; engineering audit and
manual QA remain pending. Phase 08 remains complete.

## Completed

- HiringLoop PRD preparation recorded; repository-local PRD file is currently unavailable
- Software-engineering-first development strategy selected
- AI engineering deferred until the software engineering milestone is complete
- Modular monolith backend architecture selected
- Separate frontend and backend applications selected
- Single Git repository and shared documentation structure established
- Phase 00 through Phase 05 foundation and handoffs — COMPLETE
- Phase 06 Organization & Multi-Tenancy — COMPLETE
- Phase 07 Team Management & Authorization — COMPLETE
- Phase 08 Job Management database — COMPLETE
- Phase 08 Job Management backend — COMPLETE: exactly 8 APIs
- Phase 08 Job Management frontend — COMPLETE: exactly 4 main screens
- Phase 08 end-to-end engineering audit — COMPLETE
- Phase 08 targeted manual-QA navigation fix — COMPLETE
- Phase 08 final manual browser QA — PASSED
- Phase 08 handoff: `docs/architecture/PHASE_08_HANDOFF.md`

## Repository Structure

Frontend: `hiringloop-frontend/`
Backend: `hiringloop-backend/`
Authoritative documentation: repository root and `docs/`

## AI Status

NOT STARTED

Do not implement AI functionality during the current software engineering phases.

## Architecture Decisions

- Modular monolith with a bounded Job backend module
- Separate frontend/backend applications
- PostgreSQL source of truth
- Organization is the tenant boundary
- Centralized backend-authoritative permissions
- Explicit Job lifecycle operations; no DELETE or generic status PATCH
- Optimistic concurrency for Job mutations
- Organization-specific TanStack Query keys and absolute Job route builders
- Background workers reserved for justified async workloads
- AI deferred

## Current Work

Phase 08 Job Management is complete. It provides one 16-field Job entity,
three Job enums, two business indexes, eight organization-scoped APIs, and four
organization-scoped frontend screens. Draft, Open, Closed, and terminal
Archived behavior; readiness validation; tenant isolation; permissions;
optimistic concurrency; responsive UX; and create/open recovery are implemented
and verified. Final manual browser QA passed.

## Phase 08 Verification Evidence

- Backend focused Job verification: 1 file / 42 tests PASS
- PostgreSQL focused Job integration: 1 file / 4 tests PASS
- PostgreSQL full integration verification: 7 files / 50 tests PASS
- Backend full non-database verification: 27 files / 190 tests PASS
- Frontend focused Job verification: 5 files / 15 tests PASS
- Frontend full verification: 24 files / 153 tests PASS
- Backend lint, format check, and Prisma validation: PASS
- Frontend lint, format check, typecheck, and production build: PASS
- `git diff --check`: PASS
- Final manual browser QA: PASS

## Next Task

No Phase 08 work remains. Preserve the completed Phase 08 scope and handoff.

## Phase 09 Status

Phase 09 — Pipeline Configuration: planning, database, backend, frontend
implementation is complete. Engineering audit and manual QA remain pending.
It adds one Pipeline and one PipelineStage model, exactly five configuration
APIs, and one Pipeline Configuration screen. It intentionally has no transition
graph or later-phase ATS behavior. Do not mark the phase complete until manual
QA passes.

## Documentation Gaps

- No repository-local PRD file is currently present. The roadmap records supplied functional requirement identifiers for traceability and recommends adding the authoritative PRD before feature implementation expands.

## Deferred Work

Pipeline configuration and every later ATS domain remain deferred to their
approved roadmap phases. Applications, Candidates, Interviews, Offers,
Analytics, Redis, BullMQ, realtime, and AI are not started.
