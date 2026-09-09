# Phase 17 — Offers, Hire/Reject & Talent Pool Handoff

## Overall status

**COMPLETE.** Phase 17 passed the final repository audit, backend/frontend
verification, database integrity checks, authorization matrix, tenant-isolation
matrix, concurrency checks, accessibility review, and documentation
synchronization.

No AI was added. No Phase 18 implementation was started. No Git push occurred.
The user handles installations; no packages were installed during this phase.

## Scope completed

- Confidential Offer creation, draft editing, immutable issued versions,
  revisioning, send, accept, decline, and withdraw.
- Application outcomes `ACTIVE`, `HIRED`, and `REJECTED`, with Hire, Reject,
  Reopen, controlled rejection reasons/details, immutable history, and optional
  Reject-to-Talent-Pool placement.
- Tenant-scoped Talent Pools with create/edit, list/search/pagination, member
  list/search/pagination, add/remove, duplicate-safe add, and Candidate links.
- Application Detail Offer/outcome integration and Candidate Detail bounded
  Talent Pool integration.
- Permission-aware frontend controls, loading/error/empty/conflict states, and
  accessible dialogs/forms.

## Architecture decisions

The backend remains a modular monolith:

```text
Route → Middleware → Controller → Use Case / Service → Repository → Prisma → PostgreSQL
```

Phase 17 routes and controllers do not access Prisma. Use cases enforce
business rules, repositories own persistence and organization predicates, Zod
schemas validate input, and DTOs explicitly select output. The existing
communication service remains the provider boundary. Provider calls occur only
after Offer issuance and Communication intent have committed.

The frontend remains feature-first with TanStack Query for server state,
React Hook Form/Zod conventions where forms require them, targeted query
invalidation, and no new global state, cache, Redis, worker, realtime, or AI
layer.

## Database

### Final counts

- New models: 5 — `Offer`, `OfferVersion`, `ApplicationOutcomeEvent`,
  `TalentPool`, `TalentPoolMember`.
- Altered models: 2 — `Application`, `Communication`.
- New enums: 3 — `OfferStatus`, `ApplicationOutcome`,
  `ApplicationOutcomeEventType`.
- Migration: 1 —
  `20260913120000_offers_outcomes_talent_pools`.

`Offer` is one-per-Application with a current Version reference and positive
revision. `OfferVersion` has unique `(offerId, versionNumber)`, compensation
and currency checks, date ordering, and issued-version immutability. Composite
foreign keys align Offer, Version, Communication, Application, Candidate, Pool,
and source Application tenants. `Application` stores current outcome and
revision. `ApplicationOutcomeEvent` is append-only. Talent Pool membership is
unique per Pool/Candidate and source Application alignment is guarded.

Restrictive foreign keys preserve historical Offer, communication, outcome, and
membership records. Database triggers protect current-version alignment,
communication-to-application alignment, source-application alignment, issued
OfferVersion immutability, and outcome-event immutability.

The migration was verified from a clean dedicated `hiringloop_test` database.
It remains intentionally unapplied to `hiringloop_dev`; no reset or implicit
development migration was performed.

## APIs

The final registered Phase 17 count is **18**, because the implementation
includes an explicit Offer lookup by Offer ID in addition to the
Application-scoped Offer lookup. The earlier expected count of 17 omitted that
registered read endpoint.

1. `GET /api/v1/organizations/:organizationId/applications/:applicationId/offer`
2. `POST /api/v1/organizations/:organizationId/applications/:applicationId/offer`
3. `GET /api/v1/organizations/:organizationId/offers/:offerId`
4. `PATCH /api/v1/organizations/:organizationId/offers/:offerId/draft`
5. `POST /api/v1/organizations/:organizationId/offers/:offerId/revisions`
6. `POST /api/v1/organizations/:organizationId/offers/:offerId/send`
7. `POST /api/v1/organizations/:organizationId/offers/:offerId/accept`
8. `POST /api/v1/organizations/:organizationId/offers/:offerId/decline`
9. `POST /api/v1/organizations/:organizationId/offers/:offerId/withdraw`
10. `POST /api/v1/organizations/:organizationId/applications/:applicationId/hire`
11. `POST /api/v1/organizations/:organizationId/applications/:applicationId/reject`
12. `POST /api/v1/organizations/:organizationId/applications/:applicationId/reopen`
13. `GET /api/v1/organizations/:organizationId/talent-pools`
14. `POST /api/v1/organizations/:organizationId/talent-pools`
15. `PATCH /api/v1/organizations/:organizationId/talent-pools/:talentPoolId`
16. `GET /api/v1/organizations/:organizationId/talent-pools/:talentPoolId/members`
17. `POST /api/v1/organizations/:organizationId/talent-pools/:talentPoolId/members`
18. `DELETE /api/v1/organizations/:organizationId/talent-pools/:talentPoolId/members/:candidateId`

## Frontend routes and integrations

There are exactly 2 dedicated Phase 17 routes:

1. `/app/organizations/:organizationId/talent-pools`
2. `/app/organizations/:organizationId/talent-pools/:talentPoolId`

Application Detail adds an Offer section with compensation visible only to
authorized users, Offer lifecycle/version controls, distinct delivery state,
and communication-history linkage. Its Application Outcome section shows
current status/history and permission-aware Hire, Reject, and Reopen controls.
Hire is disabled until an accepted Offer is loaded.

Candidate Detail adds a bounded Talent Pool summary and add/remove interaction.
The dedicated Pool pages are the authoritative full membership-management
surface, with member search, pagination, candidate links, and removal. The
Candidate Detail summary intentionally does not discover every Pool membership
or traverse all Pool members.

Feature folders are `hiringloop-frontend/src/features/offers` and
`hiringloop-frontend/src/features/talent-pools`, with integrations in
candidate-management, organizations, and the application router.

## Offer lifecycle and delivery

Offer lifecycle states are `DRAFT`, `SENT`, `ACCEPTED`, `DECLINED`, and
`WITHDRAWN`. Drafts may be sent or withdrawn. Sent Offers may be accepted,
declined, or withdrawn. Terminal states cannot be revised or transitioned.

Draft terms are editable with an OfferVersion revision guard. Issued versions
are immutable. A post-send change creates a new unissued Version; the revised
version must be sent before acceptance or decline is allowed. Historical
versions remain preserved.

The candidate recipient is resolved server-side from the stored Candidate.
Offer issuance commits the Offer state, issued Version, and exact linked
Communication intent before dispatch. Provider success is `SENT`; confirmed
failure leaves the Offer `SENT`, marks Communication `FAILED`, and preserves
the existing Phase 16 generic failure notification; ambiguous provider results
remain `PENDING` and do not auto-redispatch. Reusing the same idempotency key
with the same intent is safe; changed intent conflicts. A `FAILED`
Communication can be retried with the same immutable Version and does not
create a second Communication.

## Application outcome semantics

- Hire is allowed only from `ACTIVE` and requires an `ACCEPTED` Offer.
- Reject is allowed only from `ACTIVE`, requires a controlled reason, accepts
  optional details, and can atomically add the Candidate to one selected Pool.
- Reopen is allowed from `HIRED` or `REJECTED`, returns the Application to
  `ACTIVE`, and requires a reason detail.
- Current outcome, expected revision, immutable event history, and optional
  membership are changed transactionally. Other Applications for the Candidate
  are untouched. Offer history is unchanged by Reopen.

Stale revisions and concurrent commands produce structured conflicts. The real
Hire-versus-Reject race has one deterministic winner.

## Talent Pool semantics

Candidates may belong to multiple Pools, but a Candidate appears at most once
per Pool. Add is idempotent and validates Candidate, Pool, tenant, and optional
source Application relationships. Reject-to-Pool is optional and there is no
automatic pooling on rejection. Pool and member lists are paginated and support
search. Reject plus membership placement rolls back together if the transaction
cannot complete.

## Authorization and confidentiality

ADMIN and RECRUITER may use all Phase 17 operations. HIRING_MANAGER and
INTERVIEWER receive no Offer/compensation access, no Hire/Reject/Reopen
mutations, and no Talent Pool management. HIRING_MANAGER retains only the
pre-existing non-Phase-17 permissions. Backend authorization and tenant
scoping are authoritative; frontend permissions only shape UX.

Offer DTOs are the only Phase 17 DTOs that include compensation, and they are
permission-gated. Generic Application/Candidate/Communication/Notification
DTOs, logs, and errors do not serialize Offer terms. Candidate Detail does not
render compensation.

## Transactions, concurrency, and performance

- Offer creation plus Version 1 and current-Version linking are transactional.
- Offer revisions use expected Offer revision and unique version numbering.
- Send preparation uses an idempotency key, expected revision, unique
  Communication identity, issued-Version immutability, and dispatch after commit.
- Accept/decline/withdraw use conditional revision updates; accept/decline
  require an issued current Version.
- Outcome mutation plus event and optional Pool membership is one transaction.
- Talent Pool membership uses uniqueness/upsert semantics for duplicate-safe add.
- Reject and send race behavior is covered by database tests.
- Pool and member lists are paginated, Candidate Detail uses one bounded Pool
  query, and query invalidation is targeted. No new caching or N+1 traversal
  was introduced.

## Accessibility and UX review

Phase 17 dialogs have titles/descriptions, labels are associated with controls,
validation and mutation errors use accessible alert text, destructive actions
are explicitly named, status is not conveyed by color alone, and existing
Radix focus/keyboard behavior is retained. Offer, Reject, Reopen, Pool create/
edit, and member removal states include busy/conflict/error handling. Pool
layouts remain responsive with accessible controls.

## Verification

### Backend

- Non-database suite: **39 files / 250 tests PASS**.
- Full integration suite: **23 files / 111 tests PASS** (stable single-worker
  run).
- Dedicated Phase 17 tests: **7 files / 27 tests PASS**.
- Phase 16 communication regression: **2 files / 14 tests PASS**.
- Prisma validate: **PASS**.
- Prisma generate: **PASS**.
- Lint: **PASS**.
- Format check: **PASS**.

### Frontend

- Targeted Phase 17 suite: **4 files / 29 tests PASS**.
- Full frontend suite: **50 files / 274 tests PASS**.
- Lint: **PASS**, with one pre-existing unrelated warning in
  `PublicApplyPage.tsx`.
- Typecheck: **PASS**.
- Production build: **PASS**; Vite emitted only the existing large-chunk
  advisory.
- Format check: **PASS**.

## Bugs fixed during final audit

- Implemented server-side Talent Pool list filtering for the existing `search`
  query instead of silently ignoring it.
- Made post-send Offer revisions sendable while preventing accept/decline of an
  unissued current revision; added regression coverage.

## Files created or modified

Backend created: `prisma/migrations/20260913120000_offers_outcomes_talent_pools/`,
`scripts/reset-phase17-test-database.js`,
`src/modules/applications/application-outcome-module.js`,
`src/modules/applications/controllers/application-outcome-controller.js`,
`src/modules/applications/domain/outcome-dto.js`,
`src/modules/applications/repositories/application-outcome-repository.js`,
`src/modules/applications/routes/application-outcome-routes.js`,
`src/modules/applications/schemas/outcome-schemas.js`,
`src/modules/applications/use-cases/application-outcome-use-cases.js`,
`src/modules/communications/candidate-communication-service.js`, all files
under `src/modules/offers/`, all files under `src/modules/talent-pools/`, the
Phase 17 integration helper/tests under `tests/integration/`, the Phase 17
database integrity test, and
`tests/modules/phase17-offer-outcome-use-cases.test.js`.

Backend modified: `prisma/schema.prisma`,
`src/authorization/permissions.js`, candidate DTO/repository files,
`src/modules/communications/communications-module.js`, organization module
and routes, and the candidate-management use-case test.

Frontend created: all files under `src/features/offers/` and
`src/features/talent-pools/`. Frontend modified: `src/app/router/routes.tsx`,
Candidate Management Application/Candidate Detail pages, types and tests,
and Organization Workspace/types integration files.

Documentation created/modified: this handoff, root `PROJECT_STATE.md`,
`MASTER_ROADMAP.md`, `README.md`, `docs/DATABASE_DESIGN.md`,
`docs/architecture/SYSTEM_ARCHITECTURE.md`, and
`docs/security/SECURITY_ARCHITECTURE.md`. The root state, roadmap, system
architecture, and security documents were synchronized to both
`hiringloop-backend/docs-shared/` and `hiringloop-frontend/docs-shared/`.
No unrelated files were intentionally changed during the final audit.

## Known limitations and technical debt

Candidate Detail does not have an exhaustive Candidate → Talent Pool membership
API, so it intentionally displays only bounded locally known membership and
directs users to dedicated Pool pages for authoritative full management. This
is a non-blocking product/technical limitation; no unbounded N+1 traversal is
used and no API 18 was added to remove it.

The frontend retains one pre-existing PublicApplyPage lint warning and the
production build’s large-chunk advisory. Phase 18 owns analytics and audit
logging; Phase 17 does not introduce those systems.

## Installation, Git, and next phase

No packages were installed. The user handles installations. The Phase 17
development migration remains intentionally unapplied to `hiringloop_dev`.
No Git push occurred and no commit was created; the working tree is left for
the user’s review.

Next phase: **Phase 18 — Analytics & Audit — NOT STARTED**.
