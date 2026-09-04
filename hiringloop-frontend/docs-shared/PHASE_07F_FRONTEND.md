# Phase 07F — Frontend Team Experience

Status: COMPLETE. This document records the frontend implementation only;
the final authorization audit is recorded in
`PHASE_07G_FINAL_AUTHORIZATION_AUDIT.md`.

## Routes and architecture

- Team: `/app/organizations/:organizationId/team`
- Invitation acceptance: `/invitations/accept?token=...`
- Feature code lives in `src/features/team` with API, query/mutation hooks,
  components, pages, types, and utility boundaries.
- The existing authenticated Phase 06 shell and route-driven workspace model
  are preserved. The workspace page links to Team without introducing a new
  shell or global workspace state.

## Server state and permissions

Member data uses `['organizations', organizationId, 'members']`; invitation
data uses `['organizations', organizationId, 'invitations']`. Both keys include
the route organization ID and clear on auth changes. The current organization
role is derived from the tenant member response and only ADMIN exposes Team
management controls. Backend authorization remains authoritative; a 403 is
shown as a permission boundary rather than an empty state.

Invites, role changes, removals, revocations, and acceptance use the existing
CSRF-aware authenticated mutation wrapper. Successful mutations invalidate only
the relevant tenant queries, plus organization/auth queries when membership
authorization may change.

## UX, security, and accessibility

The page supports loading, empty, error, and success feedback for members and
invitations. Role changes, removals, and revocations require an accessible
confirmation dialog. Self-removal is labelled “Leave workspace”. A 503 email
delivery failure explains that the invitation was saved and can be retried.
Safe 403/404/409 messages avoid raw backend details.

Desktop/tablet use semantic tables; mobile rows stack into labelled blocks.
Forms use explicit labels, descriptions, invalid state, and error text. Dialogs
have labelled modal semantics, Tab/Shift+Tab focus trapping, Escape support,
and focus restoration to the trigger.

Acceptance reads the bearer token from the URL only, never renders or persists
it, and uses router state to preserve the acceptance URL through login. Verified
users are accepted into the returned organization and navigated to its existing
workspace route. Unverified users are directed to existing verification UX.
