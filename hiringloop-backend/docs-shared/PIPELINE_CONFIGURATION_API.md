# Phase 09 Pipeline Configuration Backend API

Status: backend and frontend implementation are complete; Phase 09 remains in
progress pending engineering audit and manual QA.

All endpoints are authenticated, CSRF-protected for mutations, membership-scoped,
and mounted under `/api/v1/organizations/:organizationId/jobs/:jobId/pipeline`.
There are exactly five Phase 09 endpoints:

- `GET /` returns `{ data: { pipeline } }`.
- `POST /stages` accepts `{ name, expectedVersion }` and returns the updated aggregate with status 201.
- `PATCH /stages/:stageId` accepts `{ name, expectedVersion }`.
- `PUT /stages/order` accepts `{ stageIds, expectedVersion }`.
- `DELETE /stages/:stageId` accepts `{ expectedVersion }`.

The safe Pipeline DTO is `id`, `jobId`, `version`, timestamps, and ordered
stages with only `id`, `name`, `kind`, and `position`. `normalizedName` and
tenant internals are never returned.

`PIPELINE_VIEW` permits Admin, Recruiter, and Hiring Manager reads. Existing
Job resource policy remains the only basis for any Interviewer access (the
current policy grants none). `PIPELINE_CONFIGURE` permits only Admin and
Recruiter. Authorization uses the trusted tenant context and all repository
queries scope Pipeline ownership through `Pipeline -> Job -> Organization`.

Mutations are permitted only while a Job is Draft or Open. Closed and Archived
Jobs return `PIPELINE_JOB_LOCKED`. Every mutation requires the aggregate
`expectedVersion`; a stale version returns HTTP 409
`PIPELINE_VERSION_CONFLICT`. A conditional Pipeline version increment is the
transaction gate, so competing requests cannot both commit.

Stages are server-controlled: creation always makes an appended `STANDARD`;
names are trimmed, 1--80 characters, normalized with the shared `en-US`
lowercase helper, and unique within the Pipeline; the collection is capped at
20. ENTRY may be renamed but cannot be deleted or moved from position 1.
Reorder accepts the complete exact ID set. Reorder and delete first shift all
positions by 20 inside their transaction, then write contiguous final positions,
avoiding temporary collisions with the database unique position constraint.

No Application, candidate, history, transition graph, soft deletion, template,
or automation behavior exists yet. Future Application references will need to
replace the current physical STANDARD-stage deletion rule safely.
