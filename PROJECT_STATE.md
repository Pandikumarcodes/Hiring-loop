# HiringLoop Project State

## Current milestone

Software Engineering

## Current phase

Phase 17 - Offers, Hire/Reject & Talent Pool: **COMPLETE**

## Phase 17 final status

- Database, backend, frontend, automated verification, and final audit are complete.
- Database changes: 5 new models, 2 altered models, 3 enums, and 1 forward migration.
- Actual Phase 17 APIs: 18; dedicated frontend routes: 2.
- Final verification: backend non-database 39 files / 250 tests; full integration 23 files / 111 tests; frontend 50 files / 274 tests.
- Final handoff: `docs/architecture/PHASE_17_HANDOFF.md`.
- No AI or Phase 18 implementation was added.

## Phase 16 final status

- Database, backend, frontend, automated verification, and final audit are complete.
- Database models added: 4; actual APIs: 12; dedicated frontend routes: 1.
- Outbound candidate email is tenant-scoped, recipient-locked, idempotent, rate-limited, and lifecycle-tracked.
- Organization templates, own-user notifications, notification triggers, and preferences are complete.
- Final handoff: `docs/architecture/PHASE_16_HANDOFF.md`.

## Phase 17 status

Phase 17 - Offers, Hire/Reject & Talent Pool: **COMPLETE**

## Phase 15 final status

- Database, backend, frontend, automated verification, and manual QA are complete.
- Database models added: 6; planned APIs: 14; actual APIs: 14; primary frontend routes: 2.
- Final handoff: `docs/architecture/PHASE_15_HANDOFF.md`.

## Phase 14 final status

- Database, backend, frontend, automated verification, and core manual QA are complete.
- Database models added: 2; planned APIs: 7; actual APIs: 7; primary frontend routes: 2.
- Final handoff: `docs/architecture/PHASE_14_HANDOFF.md`.

## Phase 13 final status

- Database, backend, and frontend implementation are complete.
- Exactly 4 authenticated candidate-management APIs and 3 recruiter routes.
- Candidate list/search/filter/sort/pagination, Candidate detail, Application detail, submitted answers, stage history, and secure resume access are complete.
- ADMIN and RECRUITER are allowed; HIRING_MANAGER and INTERVIEWER remain denied.
- Final engineering audit passed with no targeted code fixes required.
- Final handoff: `docs/architecture/PHASE_13_HANDOFF.md`.

## Phase 12 final status

Prompt 1 Database: **COMPLETE**

Prompt 2 Backend: **COMPLETE**

Prompt 3 Frontend: **COMPLETE**

Prompt 4 Audit: **COMPLETE**

Manual QA: **PASS**

- Database, backend, and frontend implementation are complete.
- Final engineering audit passed with a targeted dynamic-form accessibility fix.
- Exactly 3 public application APIs and 1 public Apply route.
- Final handoff: `docs/architecture/PHASE_12_HANDOFF.md`.

## Next phase

Phase 18 — Analytics & Audit: **NOT STARTED**

## Phase 10 final status

Phase 10 is complete: database, backend, and frontend work are complete.

- Exactly 2 anonymous public APIs, 2 candidate-facing public screens, and 2 public routes.
- Organization public slugs support safe backfill and collision handling.
- OPEN-only visibility and tenant/resource-scoped public detail lookup are enforced.
- Engineering audit passed with targeted pagination and SEO fixes.
- Manual QA passed, including the public-detail metadata-layout fix.
- Final security verification passed, including HTTP/HTTPS-only public websites.
- Full frontend suite: 30 files / 175 tests PASS; typecheck, lint, format,
  production build, and `git diff --check` PASS.
- Backend non-database and PostgreSQL integration suites, Prisma validation,
  lint, format, and diff checks passed after final code changes.

## Architecture constraints retained

- PostgreSQL remains authoritative; Organization remains the tenant boundary.
- Public Organization identity is immutable `Organization.slug`; public Job
  identity is Organization slug plus immutable Job ID.
- `Job.status === OPEN` is the sole public visibility rule.
- No CareerSite entity, Job slug, publication field/state machine, Apply
  button, Application Form Builder, Candidate/Application flow, resume upload,
  public search/filter, customization, custom domains, Redis/realtime, or AI
  was added in Phase 10.

## Key references

- `docs/architecture/PHASE_10_HANDOFF.md`
- `docs/architecture/PHASE_10_ENGINEERING_AUDIT.md`
- `hiringloop-backend/docs-shared/PUBLIC_CAREER_SITE_DATABASE.md`

## AI status

NOT STARTED. AI remains deferred until the Software Engineering roadmap is
complete.
