# ADR-003 — RBAC Plus Resource-Level Authorization

## Status

Accepted

## Context

HiringLoop needs broad role-based capabilities for Admin, Recruiter, Hiring Manager, and Interviewer. However, recruiting access is contextual. An interviewer may access an assigned interview but not all candidates; a hiring manager may access responsible jobs; private feedback and offers have additional visibility constraints; and every tenant-owned resource must remain inside the active Organization.

Roles and permissions alone cannot represent these resource relationships safely.

## Decision

Use RBAC for broad capability control, combined with resource-level policies for context-sensitive authorization.

Authorization evaluates, in order, authenticated identity, active organization context, membership status, role/permission, tenant/resource ownership, resource relationship/assignment, visibility, and business/lifecycle conditions.

The backend is authoritative. Frontend permission checks are UX only. Domain modules own their business rules and expose stable contracts; cross-module workflows use explicit services/use cases rather than bypassing policies or persistence boundaries.

## Alternatives

### RBAC only

Simple to understand, but too coarse for assigned interviews, responsible jobs, private feedback, candidate-facing offers, and tenant isolation.

### Resource policies only

Flexible, but unnecessarily difficult to manage for common broad capabilities and role administration.

### Frontend-enforced permissions

Useful for UX, but not a security boundary because clients can be modified and requests can be sent directly to the backend.

## Consequences

- Permission names remain understandable and roles remain manageable.
- Every protected resource path needs tenant and object-level checks.
- Policy behavior must be documented and tested by role, tenant, assignment, visibility, and lifecycle.
- Authorization decisions may require collaboration between modules through stable contracts.
- The final role grants, field-level visibility, custom-role support, and policy exceptions require product decisions.
- Database constraints and query scoping reinforce but do not replace backend policy enforcement.

## Revisit Conditions

Revisit if the product becomes a single-tenant system, all resources are intentionally organization-wide with no contextual visibility, or a separately approved policy model replaces roles and resource relationships. Evidence must demonstrate that RBAC plus policies no longer matches the product's authorization complexity.
