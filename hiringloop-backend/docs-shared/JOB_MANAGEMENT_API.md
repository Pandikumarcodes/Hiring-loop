# Phase 08 Job Management Backend API

Phase 08 exposes exactly eight authenticated, organization-scoped endpoints under
`/api/v1/organizations/:organizationId/jobs`:

- `POST /` creates a Draft.
- `GET /` lists Jobs with `page`, `limit`, `search`, `status`,
  `employmentType`, `workplaceType`, `sortBy`, and `sortOrder`.
- `GET /:jobId` returns Job detail.
- `PATCH /:jobId` edits approved fields and requires `expectedVersion`.
- `POST /:jobId/open`, `/close`, `/reopen`, and `/archive` perform explicit
  lifecycle transitions and require `expectedVersion`.

Create accepts `title` plus optional `department`, `employmentType`,
`workplaceType`, `location`, `description`, and `openings`. Update accepts only
those editable fields plus required `expectedVersion`. Unknown fields are
rejected. Lifecycle fields, ownership, IDs, timestamps, and version are never
client-writable.

The lifecycle is `DRAFT -> OPEN -> CLOSED -> OPEN`, with archive allowed only
from Draft or Closed. Archived Jobs are terminal. Opening and reopening require
nonblank title and description, employment/workplace types, at least one
opening, and a location for Onsite or Hybrid Jobs.

List search is case-insensitive over title, department, and location only.
`limit` defaults to 20 and is capped at 100. Sort fields are limited to
`updatedAt`, `createdAt`, `title`, and `openedAt`; default order is updated-at
descending. List responses omit description, while detail and mutation
responses include it. Responses use the existing `{ data: ... }` envelope;
lists also include top-level `pagination` metadata.

Admin and Recruiter have all eight Job permissions. Hiring Manager has all
except archive. Interviewer has none. Authentication, current membership,
central permission checks, and tenant-scoped repository predicates apply to
every endpoint. Foreign-tenant resource IDs return `JOB_NOT_FOUND` (404).
Stale versions return `JOB_VERSION_CONFLICT` (409); invalid transitions,
readiness failures, and archived edits use their dedicated structured 409
errors.

The existing organization-detail response includes the current membership's
centralized `permissions` array. The frontend uses that organization-scoped
value only to shape Job navigation and action visibility; backend middleware
remains authoritative. No Job-specific permission endpoint is exposed.
