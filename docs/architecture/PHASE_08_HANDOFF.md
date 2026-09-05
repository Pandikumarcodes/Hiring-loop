# Phase 08 — Job Management Handoff

## 1. Phase objective

Phase 08 implements organization-scoped job requisition management and an explicit, guarded Job lifecycle for authorized HiringLoop users. It satisfies the Phase 08 definition of done without beginning pipeline, application, candidate, interview, offer, analytics, or AI work.

**Status: COMPLETE.** Final manual browser QA passed on September 6, 2026.

## 2. Completed features

- Tenant-owned Job persistence with database-enforced integrity.
- Draft creation and editing, including incomplete Drafts.
- Explicit Open, Close, Reopen, and Archive operations.
- Paginated, searchable, filterable, sortable Job listing.
- Detail and edit workflows with lifecycle-aware actions.
- Organization-specific permissions and safe direct-route behavior.
- Optimistic concurrency and explicit stale-version recovery.
- Responsive desktop-table/mobile-card Job list.
- Save Draft and Save & Open workflows, including partial-failure recovery.

## 3. Architecture decisions

The Job feature is a bounded module in the existing JavaScript ES-module modular monolith. Controllers translate HTTP concerns, Zod schemas validate trust-boundary input, use cases own lifecycle/readiness rules, repositories own Prisma persistence and tenant predicates, and explicit DTO mappers control output. PostgreSQL remains authoritative. Lifecycle changes are business operations rather than a client-writable status field.

No DELETE endpoint, generic status PATCH, Job history table, hiring-team relationship, pipeline configuration, or background workflow was introduced.

## 4. Database changes

Migration `20260905100000_job_management_foundation` adds one `Job` table and the `JobStatus`, `EmploymentType`, and `WorkplaceType` PostgreSQL enums. `Organization.jobs` establishes the parent-side relation.

## 5. Job fields

The 16 approved fields are:

1. `id`
2. `organizationId`
3. `title`
4. `department`
5. `employmentType`
6. `workplaceType`
7. `location`
8. `description`
9. `openings`
10. `status`
11. `openedAt`
12. `closedAt`
13. `archivedAt`
14. `version`
15. `createdAt`
16. `updatedAt`

`title`, `department`, and `location` use bounded varchar storage. Description uses PostgreSQL text with application validation. Draft defaults are `openings = 1`, `status = DRAFT`, and `version = 1`.

## 6. Enums

- `JobStatus`: `DRAFT`, `OPEN`, `CLOSED`, `ARCHIVED`
- `EmploymentType`: `FULL_TIME`, `PART_TIME`, `CONTRACT`, `TEMPORARY`, `INTERNSHIP`, `OTHER`
- `WorkplaceType`: `ONSITE`, `HYBRID`, `REMOTE`

## 7. Relationships

Organization has a one-to-many relationship with Job. `Job.organizationId` is required and references `Organization.id` with `ON DELETE RESTRICT ON UPDATE RESTRICT`. No creator-membership, hiring-team, candidate, application, or pipeline relation is part of Phase 08.

## 8. Constraints

- Primary key on `Job.id`.
- Restrictive organization foreign key.
- `openings` must be between 1 and 1,000.
- `version` must be at least 1.
- Lifecycle timestamps must agree with the current status.
- Archived rows require `archivedAt`; they may originate from Draft or Closed.
- Job titles are intentionally not unique.

## 9. Indexes and rationale

Exactly two business indexes were added:

- `(organizationId, updatedAt)` supports tenant-scoped recent/default listing.
- `(organizationId, status, updatedAt)` supports tenant-scoped status filtering with updated-time ordering.

No speculative search or uniqueness index was added.

## 10. Lifecycle and state machine

```text
DRAFT ──open──> OPEN ──close──> CLOSED ──reopen──> OPEN
  │                                  │
  └────────archive──> ARCHIVED <─────┘
                         │
                         └── terminal/read-only
```

Drafts may be incomplete and remain editable. Open and Reopen require a nonblank title and description, employment type, workplace type, and valid openings. On-site and Hybrid Jobs additionally require location; Remote Jobs may omit it. Archived Jobs cannot be edited or transitioned. There is no deletion or generic status mutation.

## 11. Permission matrix

| Capability | Admin | Recruiter | Hiring Manager | Interviewer |
|---|---:|---:|---:|---:|
| List | Yes | Yes | Yes | No |
| Read | Yes | Yes | Yes | No |
| Create | Yes | Yes | Yes | No |
| Update | Yes | Yes | Yes | No |
| Open | Yes | Yes | Yes | No |
| Close | Yes | Yes | Yes | No |
| Reopen | Yes | Yes | Yes | No |
| Archive | Yes | Yes | No | No |

Permissions remain centralized. Backend middleware is authoritative; organization-detail permissions shape frontend navigation and action visibility only.

## 12. Tenant-isolation design

Organization is the tenant boundary. Authentication and membership resolution produce trusted context:

```js
request.tenantContext = {
  organizationId,
  membershipId,
  role,
}
```

Every Job repository read, list, and mutation includes `organizationId`. Foreign-tenant identifiers return safe `JOB_NOT_FOUND` behavior where applicable. Frontend Job query keys include `organizationId`, so workspace switching cannot reuse another tenant's Job cache entries.

## 13. API endpoints

Phase 08 exposes exactly eight authenticated endpoints:

1. `POST /api/v1/organizations/:organizationId/jobs`
2. `GET /api/v1/organizations/:organizationId/jobs`
3. `GET /api/v1/organizations/:organizationId/jobs/:jobId`
4. `PATCH /api/v1/organizations/:organizationId/jobs/:jobId`
5. `POST /api/v1/organizations/:organizationId/jobs/:jobId/open`
6. `POST /api/v1/organizations/:organizationId/jobs/:jobId/close`
7. `POST /api/v1/organizations/:organizationId/jobs/:jobId/reopen`
8. `POST /api/v1/organizations/:organizationId/jobs/:jobId/archive`

## 14. Request and response contracts

Create accepts the editable business fields and creates a Draft. Update accepts a partial set of editable fields plus required `expectedVersion`. Lifecycle commands accept only `expectedVersion`. Unknown or server-owned fields are rejected.

Single-resource responses use `{ "data": { "job": ... } }`. Lists use `{ "data": { "jobs": [...] }, "pagination": ... }`. List DTOs omit description; detail and mutation DTOs include it. Structured errors distinguish not found, version conflict, readiness failure, archived mutation, invalid transition, validation, and authorization failures. The detailed contract is in `hiringloop-backend/docs-shared/JOB_MANAGEMENT_API.md`.

## 15. Pagination, search, filter, and sort strategy

Listings are server-paginated with a default limit of 20 and maximum of 100. Search is case-insensitive across title, department, and location. Filters support status, employment type, and workplace type. Sorting is restricted to `updatedAt`, `createdAt`, `title`, and `openedAt`, with updated-descending as the default. Frontend state is URL-driven and retained across refresh/navigation.

## 16. Optimistic concurrency

Update, Open, Close, Reopen, and Archive require `expectedVersion`. Atomic repository predicates include `organizationId`, `jobId`, `expectedVersion`, and current lifecycle status where applicable. Successful writes increment `version`. Stale writes return HTTP 409 with `JOB_VERSION_CONFLICT`; the frontend shows an explicit reload action and never silently overwrites newer state.

## 17. Frontend screens

Phase 08 has exactly four main screens:

1. Jobs List — `/app/organizations/:organizationId/jobs`
2. Create Job — `/app/organizations/:organizationId/jobs/new`
3. Job Detail — `/app/organizations/:organizationId/jobs/:jobId`
4. Edit Job — `/app/organizations/:organizationId/jobs/:jobId/edit`

The list provides server pagination, URL-driven search/filter/sort state, desktop tables, mobile cards, and distinct loading, first-time-empty, filtered-empty, error, and permission states. Create supports Save Draft and Save & Open. Save & Open creates once, opens once, and preserves/routes to the Draft with an error notice if Open fails. Detail exposes lifecycle-aware actions and is the read-only Archived experience. Edit sends concurrency metadata internally and provides stale-version recovery.

## 18. Frontend query and cache strategy

TanStack Query keys are organized by organization and then by list/detail resource. List filters are part of list keys. Create invalidates the current organization's lists. Update and lifecycle mutations update the returned Job detail cache and invalidate the current organization's lists. Absolute organization-scoped Job route builders preserve both tenant and resource identifiers after mutations.

## 19. Responsive and accessibility decisions

The Job list uses a desktop table with safe horizontal scrolling and mobile cards. Forms use labeled controls, inline validation, busy states, and keyboard-operable shared controls. Loading, errors, empty results, permission denial, and confirmation states have explicit semantics. Descriptions render as plain text with whitespace preservation, avoiding unsafe HTML. Empty Job titles use the accessible/display fallback “Untitled job.”

## 20. Security decisions

- Cookie-authenticated mutations retain CSRF protection.
- Backend authentication, membership resolution, centralized permissions, and tenant predicates apply to every endpoint.
- Request schemas reject unknown and server-owned fields.
- Explicit DTOs prevent accidental persistence-model exposure.
- Foreign-tenant access uses safe not-found behavior.
- Archived state is enforced in use cases, not only hidden by the UI.
- Frontend permissions are UX state, never an authorization boundary.

## 21. Performance decisions

Lists are paginated and query only selected list fields. Detail queries retrieve one tenant-scoped resource. Two indexes support actual listing/filter patterns. Cache keys avoid cross-tenant reuse, and mutations target/update detail cache before list invalidation. No N+1 loading, speculative cache layer, or speculative index was introduced.

## 22. Tests and verification

Backend coverage includes all eight HTTP operations, permission roles, strict DTO validation, pagination/filter/sort behavior, lifecycle/readiness matrices, archived behavior, safe tenant not-found behavior, and atomic version conflicts. PostgreSQL integration verifies Draft defaults, tenant scoping, list behavior, and competing writes.

Frontend coverage includes organization-isolated keys, Draft validation, role-aware action visibility, create/open/recovery navigation, exact route matching, permission-loading ordering, and genuine missing-Job handling.

Final verification results:

- Backend focused Job tests: 42 passed.
- Backend focused Job database integration: 4 passed.
- Backend full PostgreSQL integration suite: 50 passed.
- Backend full non-database suite: 190 passed.
- Frontend focused Job tests: 15 passed.
- Frontend full suite: 153 passed.
- Backend/frontend lint and formatting: passed.
- Prisma validation: passed.
- Frontend typecheck and production build: passed.
- `git diff --check`: passed.

## 23. Manual QA result

Final manual browser QA passed. Coverage included Jobs List, Draft creation/editing, Draft to Open, lifecycle transitions, Archived read-only behavior, Save & Open and its recovery behavior, role visibility, tenant/workspace isolation, concurrency UX, and responsive behavior. No Phase 08 blocker remains.

## 24. Resolved audit and manual-QA issues

- Corrected Hiring Manager Archive visibility while preserving backend authority.
- Improved atomic mutation return/concurrency handling so returned DTOs represent the winning write.
- Allowed intentionally incomplete Drafts while retaining Open/Reopen readiness enforcement.
- Added explicit conflict reload/recovery UX.
- Preserved responsive Job table scrolling.
- Added “Untitled job” display/accessibility fallback.
- Fixed Draft-save navigation that resolved `..` through React Router's route hierarchy and landed on 404.
- Added absolute organization-scoped Job route builders and applied them across Job navigation.
- Ordered permission/loading/error states so disabled queries cannot cause premature or indefinite fallback states.

## 25. Phase 07 regressions

None. Phase 07 authentication, tenant context, Team management, authorization, and final-Admin protections remain intact; the complete backend and frontend regression suites pass.

## 26. Known issues and technical debt

No genuine Phase 08 Job Management issue or technical debt remains. A previously observed unrelated member-management timeout did not reproduce during final verification; the complete PostgreSQL integration suite passes.

## 27. Final counts

| Area | Planned | Actual |
|---|---:|---:|
| Job entities | 1 | 1 |
| Job fields | 16 | 16 |
| Job enums | 3 | 3 |
| Job business indexes | 2 | 2 |
| Backend Job APIs | 8 | 8 |
| Frontend Job screens | 4 | 4 |

## 28. Current phase status

**Phase 08 — Job Management: COMPLETE.**

## 29. Next phase

The next roadmap phase is **Phase 09 — Pipeline Configuration**. Its objective is to configure organization/job pipeline stages and valid transitions. Phase 09 is **NOT STARTED** by this handoff.
