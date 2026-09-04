# Phase 07G — Final Authorization Audit

Status: PHASE 07 — COMPLETE

## Objective

Prove that the Phase 07 Team Management and Authorization slice is secure,
tenant-isolated, consistent across backend and frontend, and safe under member
and invitation lifecycle operations.

## Audit scope

Reviewed authentication/session context, organization membership and tenant
resolution, the permission matrix, member management, invitation
creation/revocation/acceptance, PostgreSQL repository scoping and transactions,
DTO boundaries, frontend routes and cache keys, mutation invalidation, logout
cleanup, and Phase 07F dialogs and invitation routing.

Recruiting resources and future recruiting permissions were not implemented or
treated as complete.

## Architecture reviewed

Protected organization routes follow:

```text
session authentication
  → tenant membership lookup
  → trusted tenantContext { organizationId, membershipId, role }
  → centralized permission middleware
  → controller/use case
  → tenant-scoped repository
  → Prisma/PostgreSQL
  → explicit DTO
```

Frontend permission checks shape UX only; the backend remains authoritative.

## Findings and disposition

No blocking authorization, tenant-isolation, data-disclosure, invitation, or
cache-isolation defects were found. Existing implementation and tests covered
the identified regression risks. No product functionality was added and no
unrelated worktree changes were overwritten.

The existing dialog primitive has modal semantics, Escape handling, autofocus,
and focus restoration but no complete focus trap. This remains a known,
non-blocking accessibility limitation for the current acceptance scope.

## Security invariants verified

- Authentication uses opaque PostgreSQL sessions; frontend state cannot grant access.
- Membership is resolved for the authenticated user and requested organization.
- Team permissions fail closed for unknown roles and permissions.
- ADMIN, RECRUITER, HIRING_MANAGER, and INTERVIEWER are all represented.
- Current Team-management permissions are ADMIN-only.
- Member and invitation reads/mutations require organizationId in predicates.
- Cross-tenant IDs cannot be read, changed, removed, or revoked.
- Member DTOs expose only membership ID, role, joined timestamp, and minimal user ID/email.
- Invitation DTOs never expose token hashes or raw tokens.
- Errors do not expose SQL, Prisma details, stack traces, or tokens.

## Tenant isolation

Repository integration tests verify that Organization A context cannot list,
inspect, update, remove, or revoke Organization B records by replacing IDs.
Same-user multi-organization permission evaluation uses the current tenant
membership role and does not leak a role from another organization.

## Role-permission results

| Action | ADMIN | RECRUITER | HIRING_MANAGER | INTERVIEWER |
|---|---:|---:|---:|---:|
| List members | Allow | Deny | Deny | Deny |
| List invitations | Allow | Deny | Deny | Deny |
| Invite member | Allow | Deny | Deny | Deny |
| Change another role | Allow | Deny | Deny | Deny |
| Change own role | Allow, final-Admin protected | Deny | Deny | Deny |
| Remove another member | Allow, domain/history protected | Deny | Deny | Deny |
| Remove self | Allow, final-Admin protected | Deny | Deny | Deny |
| Revoke invitation | Allow | Deny | Deny | Deny |

Server schemas validate the approved role vocabulary; client controls are not
authorization boundaries.

## Final-Admin protection

Role changes and removals lock the Organization row in a PostgreSQL
transaction, reload the tenant-scoped membership, and count Admins before
reducing the Admin population. Tests verify sole-Admin downgrade/removal
blocking, allowed changes when another Admin remains, and concurrent
demotion/removal safety.

## Self-management

Self-targeted operations use the same membership and final-Admin checks.
After self-removal or loss of Admin permission, frontend refetching receives
backend truth and presents an unavailable/forbidden state.

## Invitation lifecycle

Creation is ADMIN-only, normalizes email, validates role, hashes the bearer
token, and applies a seven-day lifetime. Active duplicate invitations are
rotated deterministically under an advisory lock. Acceptance requires a
verified identity matching the normalized invited email, locks the invitation
row, creates at most one membership, and marks the invitation accepted
atomically. Expired, revoked, accepted, malformed, unknown, and mismatched
tokens have safe conflict/forbidden/not-found behavior. Delivery occurs after
persistence; provider failure returns controlled 503
`EMAIL_DELIVERY_FAILED` while retaining the invitation for reissue.

## Frontend results

Member and invitation query keys include organizationId. Switching
organizations cannot reuse another organization's Team cache. Mutations
invalidate the relevant tenant queries and organization/session queries when
membership authorization may change. Direct Team navigation remains backend
protected. Invitation tokens are read from the URL, preserved through login
using router state, and never written to localStorage or sessionStorage.
Logout/session changes remove session-scoped Team and organization queries.
Destructive actions use accessible confirmation dialogs with loading/disabled
states, Escape support, and focus restoration.

### Manual QA fix pass

An invitation create response with `503 EMAIL_DELIVERY_FAILED` means the
invitation was committed but external delivery failed. The frontend preserves
the warning and invalidates only the current organization invitation query so
the persisted pending row appears without a browser refresh. Invitation
delivery errors use invitation-specific wording; verification errors retain
verification-specific wording.

The Team confirmation flows close role-change and member-removal dialogs after
a structured 409 business conflict, while leaving the server error visible and
preserving server-backed member state. Recoverable mutation errors still leave
their dialog open.

In the checked-in local environment SendGrid is intentionally disabled because
`SENDGRID_API_KEY` and `AUTH_EMAIL_FROM` are unset. Real invitation delivery
QA requires both values, a verified SendGrid sender in `AUTH_EMAIL_FROM`, the
correct `FRONTEND_ORIGIN`, and a backend restart. No provider secret is logged
or hardcoded.

## Tests and verification

- Backend: 26 non-database files / 139 tests passed.
- PostgreSQL integration: 5 files / 26 tests passed.
- Frontend: 15 files / 129 tests passed.
- Backend lint, format check, Prisma validation, and Prisma generation passed.
- Frontend lint, format check, typecheck, and production build passed.
- `git diff --check` passed.

## Limitations and deferred items

The Phase 07F dialog fix now traps Tab and Shift+Tab, handles Escape, and
restores focus to the trigger. Recruiting resources, future resource policies,
non-Admin recruiting grants, audit-log product behavior, and broader
membership-status workflows remain deferred. Manual authenticated browser QA
remains an operator checklist; real invitation receipt and acceptance QA is
blocked until the external SendGrid configuration is supplied.

## Final acceptance decision

All blocking Phase 07 authorization and tenant-isolation issues are resolved.
The Phase 07 definition of done is satisfied.

**PHASE 07 — COMPLETE**

The next roadmap phase is Phase 08 — Job Management. It was not started by
this audit.
