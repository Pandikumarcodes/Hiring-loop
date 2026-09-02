# HiringLoop Project State

## Current Milestone

M0 — Architecture and Project Foundation

## Current Phase

Phase 05 — Authentication

## Previous Phase

Phase 03 — Backend Foundation — COMPLETE

## Phase Status

IN PROGRESS

## Completed

- HiringLoop PRD preparation recorded; repository-local PRD file is currently unavailable
- Software-engineering-first development strategy selected
- AI engineering deferred until the software engineering milestone is complete
- Modular monolith backend architecture selected
- Separate frontend and backend applications selected
- Single Git repository and shared documentation structure established
- Phase 00 planning and architecture documentation — COMPLETE
- Phase 01 Project Foundation — COMPLETE
- Phase 02 Database Foundation — COMPLETE
- Phase 02 handoff: `docs/architecture/PHASE_02_HANDOFF.md`
- Phase 03 Backend Foundation — COMPLETE
- Phase 03 handoff: `docs/architecture/PHASE_03_HANDOFF.md`
- Phase 04 Frontend Foundation — COMPLETE
- Phase 04 handoff: `docs/architecture/PHASE_04_HANDOFF.md`
- Phase 05A Authentication Architecture Decision Freeze — COMPLETE
- Phase 05B Authentication Database Foundation — COMPLETE

- Phase 05C Authentication Crypto/Domain Utilities — COMPLETE
- Phase 05D1 Registration + Email Verification Core — COMPLETE
- Phase 05D2 Email Verification Delivery + Resend — COMPLETE
- Phase 05E Login + Opaque Session Creation — COMPLETE
- Phase 05F Authentication Middleware + /auth/me — COMPLETE
- Phase 05G Logout + Session Revocation/Lifecycle — COMPLETE

- Phase 05H Password Recovery + Password Change — COMPLETE
- Phase 05I Google OAuth/OIDC Backend — COMPLETE
- Phase 05J CORS + CSRF Hardening — COMPLETE
- Phase 05K Authentication Rate Limiting — COMPLETE

## Repository Structure

Frontend: `hiringloop-frontend/`
Backend: `hiringloop-backend/`
Authoritative documentation: repository root and `docs/`

## AI Status

NOT STARTED

Do not implement AI functionality during the current software engineering phases.

## Architecture Decisions

- Modular monolith with domain-based backend boundaries
- Separate frontend/backend applications
- PostgreSQL source of truth
- Background workers reserved for justified async workloads
- AI deferred

## Current Work

Phase 05K authentication abuse controls are complete. Browser-side Google UX
and frontend authentication integration remain unimplemented.

Completed through: 05K Authentication Rate Limiting.
Next: 05L Frontend Authentication API + TanStack Query Foundation.

Phase 04 Frontend Foundation is COMPLETE. Its verified implementation
establishes the accessible React/Vite shell, neutral routing and layouts,
product-agnostic UI and feedback primitives, safe `/api/v1` API transport and
ApiError normalization, request-ID preservation, TanStack Query foundation,
state/form/async UX conventions, and frontend security/performance/testing
baselines. The formal handoff is recorded in
`docs/architecture/PHASE_04_HANDOFF.md`.

## Phase 04 Completion Evidence

- 6 frontend test files: 32 tests PASS
- `npm run verify`: PASS twice consecutively without timeout overrides
- Lint, format check, typecheck, and production build: PASS
- No backend services contacted by frontend verification
- Documentation handoff and shared-doc synchronization: PASS
- No product workflow, authentication, authorization, database, backend, or AI
  scope introduced

Phase 05J CORS and CSRF hardening is complete. See
`docs-shared/CORS_CSRF_HARDENING.md` for the browser security contract.

## Next Task

The next sub-phase is Phase 05L — Frontend Authentication API + TanStack Query Foundation.

Phase 05L — Frontend Authentication API + TanStack Query Foundation

## Next Phase Status

Phase 05 — Authentication is IN PROGRESS.

## Documentation Gaps

- No repository-local PRD file is currently present. The roadmap records supplied functional requirement identifiers for traceability and recommends adding the authoritative PRD before feature implementation expands.

## Deferred Work

Authentication, authorization/RBAC, tenant resolution, product modules, concrete
feature repositories, concrete Prisma/PostgreSQL error translation, real
transactions, AsyncLocalStorage, structured production logging, Redis, workers,
realtime, full security hardening, and AI remain deferred to
approved later phases. The Phase 02 Prisma tooling audit debt remains tracked;
no forced audit fix or package change was made.
