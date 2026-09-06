# Phase 10 — Public Career Site Handoff

## Status and objective

**Phase 10 — Public Career Site: COMPLETE.** This phase delivers a read-only, anonymous career site for an Organization’s OPEN Jobs. Phase 11 — Application Form Builder is **NOT STARTED**.

## Product flow and counts

Visitors open an Organization career page, review OPEN Jobs, paginate the list, and open Job detail. Authenticated users see **View public posting** only for OPEN Jobs; it opens the persisted Organization slug plus immutable Job ID.

| Area | Count |
|---|---:|
| Public APIs | 2 |
| Public screens | 2 |
| Public routes | 2 |

APIs: GET /api/v1/public/careers/:organizationSlug/jobs and GET /api/v1/public/careers/:organizationSlug/jobs/:jobId. Routes: /careers/:organizationSlug and /careers/:organizationSlug/jobs/:jobId.

## Architecture, database, and identity

The public site is a read projection of Organization and Job in the modular monolith. PostgreSQL is authoritative; Organization is the tenant boundary. Controllers, Zod validation, use cases, scoped repositories, and explicit DTO mappers separate HTTP, business, persistence, and public exposure.

Migration 20260907120000_organization_public_slug is applied in dev/test and must not be renamed. It adds immutable Organization.slug: globally unique, NOT NULL, VARCHAR(63), canonical lowercase-hyphen format, and automatically generated. Existing rows were safely backfilled. Names never regenerate slugs; frontend does not generate or accept slugs. Collisions use acme, acme-2, acme-3; bounded fresh-transaction retries keep concurrent Organization creation plus creator ADMIN membership atomic. The database constraint remains authoritative.

Only the justified Job index (organizationId, status, openedAt) was added. No CareerSite entity, Job slug, or speculative tie-breaker index exists.

Visibility is exclusively Job.status === OPEN: DRAFT, CLOSED, and ARCHIVED are hidden and return safe 404 detail responses. Public identity is Organization slug plus immutable Job ID. Detail scopes slug, Job ID, and OPEN status, so a real ID under a wrong Organization returns 404.

## APIs, DTOs, and security

PublicOrganization exposes name, slug, website, description. PublicJobSummary exposes id, title, employmentType, workplaceType, location, openings, openedAt; PublicJobDetail adds description. List queries omit description. Internal IDs, memberships, roles, permissions, organizationId, status, version, lifecycle timestamps, Pipeline/PipelineStage, and internal hiring metadata are never exposed.

The exactly two APIs are anonymous GET endpoints with Zod validation and structured errors. They require no session, membership, or recruiter permission; resource isolation is backend-authoritative. Pagination is page/pageSize, default 1/20 and maximum 100; ordering is openedAt DESC, id DESC. There is no public search, filters, or client sort. Public reads use 120 requests/hour/IP, exact-origin CORS, and no CSRF requirement; unsafe authenticated operations retain CSRF protection.

Organization website input accepts only HTTP/HTTPS. Rendering fails closed for javascript, malformed, and non-HTTP(S) legacy values; valid links use noopener noreferrer. Strict DTOs, plain-text rendering, validation, safe 404s, rate limiting, CORS/CSRF policy, and scoped reads protect against XSS and private-field exposure.

## Frontend, accessibility, and SEO

The two anonymous pages use PublicLayout outside /app, with no recruiter shell. TanStack Query list and detail keys are isolated from internal Job keys. Each page makes one primary request. List states cover loading, success, zero OPEN Jobs, unavailable Organization, error/Retry, and pagination. Detail covers loading, success, safe unavailable/404, error/Retry, and All open positions. Descriptions are plain text.

Semantic main/headings, real controls, keyboard/focus behavior, disabled pagination, loading/error semantics, safe links, and responsive wrapping were verified. Detail metadata uses semantic dl/dt/dd, clear spacing, min-w-0, break-words, and 1/2/4 mobile/tablet/desktop columns.

React/Vite SEO sets Careers at {organization.name} | HiringLoop and {job.title} at {organization.name} | HiringLoop, updates meta descriptions, and restores prior metadata on unmount. SSR, prerendering, sitemaps, JobPosting JSON-LD, and custom canonical infrastructure remain deferred.

## Audits, QA, and verification

Engineering audit fixes made pagination pageSize contract-consistent and restored SEO metadata on route exit. Manual QA passed; its only UI finding was detail metadata visually running together, fixed only in src/features/public-careers/pages/PublicJobDetailPage.tsx. Final security audit added HTTP/HTTPS-only input and fail-closed legacy rendering.

Final frontend verification: 30 files / 175 tests PASS, zero failures; typecheck, lint, format, production build, and git diff --check PASS. Backend full non-database and PostgreSQL integration tests, Prisma validate, lint, format, and diff checks passed after final code changes.

## Phase boundary and next phase

Not created or implemented: CareerSite entity, Job slug, isPublished/publication flag, Apply button, Application Form Builder, Candidate/Application flow, resume upload, candidate account, public search/filter, customization, custom domains, Redis/realtime, and AI.

**Next phase: Phase 11 — Application Form Builder: NOT STARTED.**
