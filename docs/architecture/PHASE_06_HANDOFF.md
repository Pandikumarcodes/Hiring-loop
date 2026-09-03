# Phase 06 Handoff — Organization & Multi-Tenancy

## 1. Phase name and status

Phase 06 — Organization & Multi-Tenancy

**Status: IMPLEMENTATION COMPLETE — MANUAL QA PENDING**

Engineering verification and documentation synchronization are complete. This
handoff does not claim that manual browser QA has passed.

## 2. Objective

Establish Organization as the tenant boundary, connect users to organizations
through OrganizationMembership, provide membership-backed tenant context, and
deliver the first organization onboarding, listing, switching, and workspace
experience without coupling tenant selection to authentication sessions.

## 3. Completed architecture

The backend remains a modular monolith with the flow:

```text
Route → Middleware → Controller → Service / Use Case → Repository → Prisma → PostgreSQL
```

The organization module owns organization lifecycle reads/creation and tenant
context resolution. Controllers do not access Prisma. The frontend remains
feature-first with organization code under `src/features/organizations/`.

The tenant model is:

```text
User
  ↕
OrganizationMembership
  ↕
Organization
```

Organization is the tenant boundary. User identity is global and does not carry
an `organizationId`.

## 4. Database changes

The Prisma schema and migrations contain `Organization` and
`OrganizationMembership` alongside the Phase 05 global identity models.

`Organization` includes:

- application-supplied UUIDv7 `id`;
- required `name`;
- nullable `website` and `description` onboarding fields;
- UTC PostgreSQL `timestamptz(6)` `createdAt` and `updatedAt`.

`OrganizationMembership` includes:

- application-supplied UUIDv7 `id`;
- `organizationId` and `userId` foreign keys;
- membership-scoped `role`;
- UTC timestamps;
- unique `(organizationId, userId)` constraint;
- user-first lookup index;
- database role check for `ADMIN`, `RECRUITER`, `HIRING_MANAGER`, and
  `INTERVIEWER`;
- restrictive organization/user referential actions.

There is no `OWNER` role and no direct User-to-Organization foreign key.

## 5. Creator transaction

Organization creation is atomic in the repository:

```text
BEGIN
  create Organization
  create creator OrganizationMembership(role = ADMIN)
COMMIT
```

The Prisma transaction client is propagated to both writes. Membership failure
rolls back the organization and cannot leave an orphan tenant root.

## 6. APIs

| Method | Endpoint | Behavior |
|---|---|---|
| GET | `/api/v1/organizations` | Authenticated membership-scoped organization list |
| POST | `/api/v1/organizations` | Authenticated + CSRF-protected atomic organization creation |
| GET | `/api/v1/organizations/:organizationId` | Authenticated membership-verified organization detail |

Responses use explicit sanitized organization DTOs. Organization IDs are
validated as UUIDs and are never authorization by themselves.

## 7. Tenant-context architecture

The protected detail route executes:

```text
Request
→ authenticate session
→ validate organizationId
→ verify OrganizationMembership(userId, organizationId)
→ trusted tenantContext
→ controller → use case → repository → Prisma/PostgreSQL
```

The trusted context contains only verified values:

```js
{
  organizationId,
  membershipId,
  role
}
```

Raw membership rows are not attached to the request. Non-members,
nonexistent organizations, malformed IDs, and cross-tenant route tampering are
rejected safely before controller/business execution. AuthSession is not
mutated and arbitrary headers cannot override the context.

## 8. Security and non-disclosure decisions

- Authentication answers “Who are you?”
- Membership answers “Do you belong to this organization?”
- RBAC answers “What actions does your organization role allow?”
- Resource authorization answers “Can you access this exact resource?”

Phase 06 implements the first two boundaries. Full RBAC/resource policies
remain Phase 07 and later scope. Unavailable organization detail uses a safe
not-found response. Listing is always filtered by the authenticated user.
Phase 05 opaque sessions, cookies, exact Origin/CORS behavior, and CSRF
protection remain intact.

## 9. Frontend feature architecture

Organization code is feature-owned:

- `src/features/organizations/api/` — API transport and response validation;
- `hooks/` — TanStack Query keys, queries, and mutations;
- `pages/` — landing, onboarding, and workspace pages;
- `components/` — organization switcher;
- `types/` and `utils/` — organization contracts and safe ID/error helpers.

Shared UI and transport remain product-agnostic. No Redux, Zustand,
localStorage, sessionStorage, or AuthSession active-organization authority was
introduced.

## 10. Onboarding, routing, and switcher

Routes are:

- `/app` and `/app/organizations` — organization landing/selection;
- `/app/organizations/new` — onboarding;
- `/app/organizations/:organizationId` — organization workspace.

Zero organizations route to onboarding. One organization routes directly to its
workspace. Multiple organizations show a selection view. The native select
switcher navigates to the selected organization route and remains keyboard
operable. The route is the frontend organization context.

Onboarding includes required name, optional website, optional description,
creator ADMIN messaging, validation, pending, recoverable server-error, and
success/navigation states. Form values remain available after recoverable
failure and duplicate submission is prevented while pending.

## 11. TanStack Query strategy and Phase 06E fix

Organization keys are stable and scoped as:

```text
["organizations"]
["organizations", organizationId]
```

Organization list/detail data is server state. Creation updates the list/detail
cache and invalidates the list. Both query types carry session-scope metadata.
The generic QueryClient boundary removes those queries on login, logout,
authenticated 401 handling, and session clearing. This is the Phase 06E fix for
cross-identity stale organization data.

Future tenant-owned data should use a convention such as
`["organizations", organizationId, "jobs"]`, with authorization still enforced
by the backend.

## 12. Responsive and accessibility implementation

The organization pages use mobile-first bounded layouts, safe gutters,
`min-width: 0`, wrapping headers/navigation, controlled desktop widths,
long-name wrapping/truncation, full-width mobile controls, visible focus
patterns, semantic headings, associated labels, field error descriptions,
loading/status feedback, and disabled pending buttons.

Code-level responsive/accessibility review passed. Manual visual and assistive
technology verification remains pending.

## 13. Tests and final verification

Backend:

- `npm run verify`: 22 test files, 116 tests PASS;
- database integration: 3 test files, 11 tests PASS;
- lint and format check: PASS;
- Prisma validation and client generation: PASS.

Frontend:

- `npm run verify`: 13 test files, 119 tests PASS;
- lint, format check, typecheck, and production build: PASS;
- Phase 06E session-scoped query cleanup test: PASS.

Runtime/repository:

- backend startup connected to PostgreSQL and listened on port 3000;
- `GET /health` returned `{"status":"ok"}`;
- `git diff --check`: PASS.

## 14. Files and modules

Backend Phase 06 modules are under:

`hiringloop-backend/src/modules/organizations/`

including routes, controller, repository, DTO, schemas, tenant resolver, and
organization use cases. Tenant middleware is at
`hiringloop-backend/src/middleware/tenant-context.js`.

Database changes are in `hiringloop-backend/prisma/schema.prisma` and the
organization onboarding migration chain under
`hiringloop-backend/prisma/migrations/`.

Frontend Phase 06 modules are under:

`hiringloop-frontend/src/features/organizations/`

with route/layout integration in `src/app/router/` and `src/layouts/`.

Important Phase 06E cache-isolation changes are in the frontend QueryClient,
organization query hooks, and authentication mutation/session handling.

## 15. Dependencies, known issues, and technical debt

No dependencies were added or required.

Known issue: authenticated browser QA has not yet been performed. The existing
repository-local PRD is still unavailable. Membership lifecycle administration,
invitation flows, and detailed role policy remain intentionally deferred.

Technical debt is limited to the existing Phase 02 Prisma tooling audit note,
manual browser/operator verification, and future tenant-scoped repository work
for later product modules.

## 16. Manual QA checklist

The user should verify authenticated behavior at 320, 375, 390, 768, 1024,
1280, and 1440+ widths:

- organization creation and creator ADMIN membership;
- zero-, one-, and multiple-organization flows;
- organization switching and keyboard behavior;
- long organization names and no horizontal mobile overflow;
- browser back/forward navigation;
- inaccessible and malformed organization routes;
- User A/User B cross-tenant route behavior;
- POST without CSRF;
- loading, validation, pending, error, and success states;
- visible focus and accessible form/error behavior.

Manual browser QA is explicitly pending.

## 17. Deferred work and next roadmap phase

Phase 06 did not implement full RBAC, invitations, membership administration,
role editing, jobs, candidates, applications, pipelines, interviews,
scorecards, offers, talent pools, analytics, audit/activity product features,
integrations, Redis/BullMQ, realtime, or AI.

The next roadmap phase is Phase 07 — Team Management & Authorization. It must
not begin until the user completes final Phase 06 manual QA and acceptance.
Suggested starting point: define and approve the fixed-role permission matrix,
membership lifecycle decisions, invitation boundaries, and resource-policy
contracts on top of the verified Phase 06 tenant context.
