# Phase 10 — Public Career Site Engineering Audit

Status: ENGINEERING COMPLETE / MANUAL QA PENDING. This does not mark Phase 10
complete.

The public career site is a read projection of an Organization and its `OPEN`
Jobs. `Organization.slug` is generated, immutable, globally unique, and
database constrained; the migration is
`20260907120000_organization_public_slug`. No `CareerSite` entity, Job slug,
or publication field/state machine was created.

Exactly two anonymous GET APIs exist:

- `GET /api/v1/public/careers/:organizationSlug/jobs`
- `GET /api/v1/public/careers/:organizationSlug/jobs/:jobId`

Exactly two public screens exist:

- `/careers/:organizationSlug`
- `/careers/:organizationSlug/jobs/:jobId`

Only OPEN Jobs are listed and readable. Public detail queries scope by resolved
organization ID, Job ID, and `OPEN` status, returning the same safe not-found
result for unavailable, foreign, and unknown Jobs. List pagination accepts
`page` and `pageSize` (default 1/20, maximum 100) and has fixed `openedAt DESC,
id DESC` ordering. DTOs expose only approved Organization and Job fields.

The frontend uses isolated TanStack Query keys, one primary request per page,
plain-text rendering, basic title/description metadata, responsive semantic
layouts, and an authenticated `View public posting` link for OPEN Jobs only.
There is no search/filter/sort UI, Apply action, application form,
Candidate/Application flow, Redis/realtime infrastructure, or AI.

Phase 11 Application Form Builder and Phase 12 candidate/resume work remain
deferred. Manual QA is the next required gate.
