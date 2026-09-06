# HiringLoop Project State

## Current milestone

Software Engineering

## Current phase

Phase 10 — Public Career Site: **COMPLETE**

## Next phase

Phase 11 — Application Form Builder: **NOT STARTED**

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
