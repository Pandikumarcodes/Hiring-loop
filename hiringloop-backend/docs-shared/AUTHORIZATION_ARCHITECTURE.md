# HiringLoop Authorization Architecture

## Purpose

Authentication answers “who is this actor?” Authorization answers “what may this actor do, in which Organization, to which resource, under which conditions?” They must be designed separately because a valid identity does not automatically grant access to a tenant, capability, or individual recruiting record.

This document defines the conceptual authorization contract for HiringLoop before authentication, multi-tenancy, RBAC, and product APIs are implemented. It is consistent with the modular-monolith, domain-owned architecture and the domain model's User/Membership distinction.

## Authorization Model

HiringLoop authorization combines identity, tenant context, broad capability, and resource-specific policy:

- **Authenticated identity:** the User established by the authentication boundary. It is not itself an authorization decision.
- **Active Organization context:** the organization in which the request is being evaluated. It must be derived from authenticated membership/session context, not trusted from a request body.
- **Organization membership:** the User's relationship with that Organization, including membership status and role context.
- **Role:** a named grouping of permissions, such as Admin or Interviewer, in an organization context.
- **Permission:** a capability such as `candidate:view` or `offer:send`.
- **Resource-level policy:** conditions involving the particular resource, assignment, ownership, relationship, visibility, or lifecycle.

Conceptual flow:

```text
Request
  ↓
Authentication
  ↓
Resolve active organization
  ↓
Verify organization membership
  ↓
Resolve role/permissions
  ↓
Resource-level authorization
  ↓
Business operation
```

The backend is authoritative at every protected path. Frontend permission checks are UX only: they may hide controls or improve navigation, but they cannot grant access or replace backend policy checks.

## Decision Layers

### Identity and session

The request must be associated with an authenticated User where the operation is protected. Authentication security requirements are defined in `SECURITY_ARCHITECTURE.md`; this document does not implement sessions or credentials.

### Organization context

The backend resolves one active Organization context from authenticated membership and approved context-switching behavior. A request may carry a route or body organization identifier for selection or resource lookup, but that value is not authorization authority. The backend compares the resolved context with the target resource and membership.

### Membership status

Only a valid, appropriately active membership may act in an Organization. Pending, suspended, removed, or expired membership states must not be treated as active access. Exact membership-state behavior is **Proposed / Requires Product Decision**.

### Role and permission

Roles group capabilities. Permissions express capabilities, not ownership of a specific record. A permission check is necessary but may not be sufficient: a user can have `interview:view` and still lack access to a particular interview because they are not assigned, responsible, or otherwise permitted to view it.

### Resource policy

The policy evaluates the target resource and relevant relationships. Examples include the resource's Organization, JobHiringTeamMember assignment, InterviewParticipant assignment, feedback visibility, offer confidentiality, lifecycle state, and the actor's relationship to the workflow.

### Business operation

After authorization, the owning module's use case validates business invariants and lifecycle transitions. Authorization does not make an invalid domain operation valid, and a valid domain operation cannot bypass authorization.

## Initial Roles

These four roles are the approved initial role vocabulary. The descriptions are intentionally broad; the final permission matrix remains dependent on the missing PRD.

### Admin

- **Responsibility:** organization administration, membership and authorization management, and broad workspace oversight.
- **Broad permissions:** organization settings, member invitation/removal, role changes, broad job/candidate/application oversight, audit access where approved, and configuration management.
- **Restrictions:** must not bypass tenant boundaries; should not automatically gain access to secrets, provider credentials, or unredacted sensitive data; owner/super-admin behavior is **Proposed / Requires Product Decision**.
- **Normally visible:** organization settings, members, jobs, candidates, applications, pipelines, interviews, communications, offers, analytics, and approved audit records.
- **Normally hidden:** raw passwords, sessions, OAuth/provider tokens, secret material, and internal security metadata.

### Recruiter

- **Responsibility:** manage recruiting operations across jobs, candidates, applications, pipeline movement, interviews, communications, and offers within assigned organizational scope.
- **Broad permissions:** view/update candidates and applications, manage job workflows where granted, move applications, coordinate interviews, communicate with candidates, and create or view offers where granted.
- **Restrictions:** cannot manage organization authorization unless explicitly granted; cannot automatically view private feedback or all confidential offer terms; scope to assigned jobs/teams is **Proposed / Requires Product Decision**.
- **Normally visible:** recruiting profiles, applications, job pipeline work, assigned/interacting interviews, permitted notes, communications, and operational activity.
- **Normally hidden:** credentials, tokens, audit internals, private feedback outside policy, and restricted offer information.

### Hiring Manager

- **Responsibility:** make or support hiring decisions for jobs they own or are assigned to.
- **Broad permissions:** view responsible jobs/applications, participate in pipeline review, view permitted candidate information, participate in interviews/feedback, and contribute to offer decisions where approved.
- **Restrictions:** should not automatically access every organization candidate, membership/role administration, credentials, or unrelated jobs; job responsibility scope is **Proposed / Requires Product Decision**.
- **Normally visible:** assigned jobs, related applications/candidates, relevant interviews, permitted feedback, and decision-related activity.
- **Normally hidden:** unrelated jobs/candidates, organization security settings, credentials, restricted audit records, and private feedback outside policy.

### Interviewer

- **Responsibility:** participate in assigned interviews and submit permitted evaluations.
- **Broad permissions:** view assigned interview context, the minimum candidate/application data required for the interview, and create/view their own or permitted Scorecard/Feedback records.
- **Restrictions:** no general candidate search or organization-wide application access by default; cannot manage jobs, memberships, offers, or permissions; access duration and post-interview visibility are **Proposed / Requires Product Decision**.
- **Normally visible:** assigned interview, scheduling details, minimum relevant candidate/application context, scorecard template, and their permitted feedback.
- **Normally hidden:** unrelated candidates/applications, broad candidate PII, private feedback from others unless allowed, offers, audit records, and organization settings.

The role descriptions are not a final grant matrix. Least privilege requires the eventual product decision to grant only the capabilities and scopes needed for each workflow.

## Permission Model

Permissions express capabilities. Roles group permissions. Policies evaluate resource-specific conditions. No database tables or storage representation is defined here.

### Organization and authorization

- `organization:manage`
- `member:invite`
- `member:remove`
- `member:role-change`

### Jobs

- `job:create`
- `job:view`
- `job:update`
- `job:publish`
- `job:pause`
- `job:close`
- `job:archive`

### Candidates and applications

- `candidate:view`
- `candidate:update`
- `candidate:note`
- `candidate:document-access`
- `application:view`
- `application:update`
- `pipeline:move`

### Interviews and feedback

- `interview:create`
- `interview:view`
- `interview:view-assigned`
- `interview:update`
- `feedback:create`
- `feedback:view`
- `feedback:view-private`

### Communications, offers, reporting, and audit

- `communication:send`
- `offer:create`
- `offer:send`
- `offer:view`
- `analytics:view`
- `audit:view`

The permission names are an initial vocabulary, not a complete final matrix. Additional permissions, field-level restrictions, and role assignments require product/security review.

## Why RBAC Alone Is Insufficient

RBAC answers whether a role generally has a capability. HiringLoop also needs resource-level conditions:

- An Interviewer may view Candidate X because they are assigned to Interview Y, while another Interviewer with the same role may not.
- A Hiring Manager may access applications for jobs they are responsible for, not every job in the organization.
- Private feedback may be visible only to permitted roles/users, even when the actor can view the interview.
- Candidate-facing Offer access must expose only that candidate's approved offer information, never organization-wide recruiting data.
- A Recruiter with `candidate:view` still cannot view a Candidate from another Organization.

The policy concepts are expressed conceptually as:

```text
canViewCandidate(user, organization, candidate)
canAccessInterview(user, organization, interview)
canViewFeedback(user, organization, feedback)
canManageOffer(user, organization, offer)
```

These names describe policy decisions, not code to implement now. Each policy should validate active membership, the broad permission, tenant/resource ownership, relationship/assignment, visibility rules, and lifecycle constraints.

## Tenant Security Architecture

1. Never trust `organizationId` from a request body as authorization input.
2. Resolve tenant context from authenticated membership and approved organization-switching context.
3. Scope every tenant-owned resource to the resolved Organization.
4. Child resources must not bypass tenant checks through parent IDs. A valid child ID is insufficient if its parent belongs elsewhere.
5. Do not unnecessarily reveal whether a cross-tenant resource exists; return a safe not-found/denied outcome according to the API error policy.
6. Explicitly test cross-tenant access for direct resources, nested resources, search, bulk operations, file access, and asynchronous work.
7. A resource's organization must be checked before applying role or assignment rules.

Later repository access should conceptually require tenant context, for example:

```text
findCandidateById(candidateId, organizationId)
```

instead of an unscoped lookup:

```text
findCandidateById(candidateId)
```

This is a future repository pattern, not an implementation instruction in ARCH-03.

## Authorization Data Flow Examples

### Recruiter reads a candidate

```text
React
  ↓
GET /candidates/:id
  ↓
Authenticate
  ↓
Resolve organization membership
  ↓
Check candidate:view
  ↓
Check candidate.organization == active organization
  ↓
Candidate service
  ↓
Repository
  ↓
Explicit DTO
  ↓
Response
```

### Interviewer reads an assigned candidate

```text
Authenticate
  ↓
Membership
  ↓
Basic interviewer permission
  ↓
Resource policy:
Is user assigned to an interview for this candidate?
  ↓
Allow / deny
```

### Cross-tenant attack

```text
Organization B user requests Organization A candidate ID
  ↓
Tenant/resource check fails
  ↓
No candidate data returned
```

## Authorization Ownership

- **Frontend:** permission-aware visibility, route UX, safe rendering, and client validation for usability. It is never the authority.
- **Backend:** authentication context, tenant resolution, membership verification, permission checks, resource policies, business authorization, validation, rate limits, and DTO filtering.
- **Owning domain modules:** enforce their business rules and expose stable use cases/contracts; they do not bypass another module's policies.
- **Database later:** constraints, tenant relationships, and data integrity reinforce backend decisions but do not replace them.
- **Infrastructure later:** TLS, secret storage, private buckets, network/provider configuration, and worker isolation.

No single layer is sufficient. A secure system uses defense in depth while keeping the backend as the authorization authority.

## Auditability

The following should later be auditable where security or business critical:

- login, logout, session, recovery, and other security events;
- membership invitations, removals, status changes, and role/permission changes;
- job lifecycle changes;
- candidate/profile/document access or changes according to sensitivity policy;
- pipeline transitions;
- offer creation, sending, viewing, acceptance, decline, withdrawal, and related access;
- administrative settings and protected data exports.

Activity Timeline ≠ Security Audit Log. Activity explains recruiting work to authorized product users. Audit records protected accountability data for security and administration, as defined in ARCH-02.

## Open Authorization Questions

The following are **Proposed / Requires Product Decision**:

- fixed roles only versus custom roles;
- exact permission grants for each initial role;
- whether Recruiter and Hiring Manager scope is organization-wide or job-assignment-based;
- private-feedback visibility, including who can view another interviewer's response;
- how long an Interviewer's access lasts after an interview;
- future organization-context UX beyond the Phase 06 route-driven selection;
- whether an organization owner has special privileges beyond Admin;
- who can view/export audit records and whether audit fields are redacted;
- whether candidates receive self-service access to applications, documents, interview details, or offers;
- field-level restrictions for candidate PII, documents, communications, and offer terms.

## Phase 06 implementation boundary

Phase 06 implements the Organization tenant boundary and membership verification
for the organization API. Its security questions are intentionally layered:

- Authentication answers: “Who are you?”
- Membership answers: “Do you belong to this organization?”
- RBAC answers: “What actions does your organization role allow?”
- Resource authorization answers: “Can you access this exact resource?”

The implemented Phase 06 flow is:

```text
Request
→ authenticate session
→ validate requested organizationId
→ verify OrganizationMembership(userId, organizationId)
→ attach trusted tenantContext { organizationId, membershipId, role }
→ controller → use case → tenant-scoped repository → Prisma/PostgreSQL
```

The route ID is request/navigation context, never authorization authority.
Active organization selection is route-driven and is not stored in AuthSession.
Cross-tenant organization requests return a safe not-found result. Full RBAC,
resource policies, invitations, and membership administration remain later
roadmap work.

## Phase 07 implementation boundary

Phase 07 implements the current Team-management authorization boundary. The
backend resolves an authenticated user's organization membership into trusted
tenant context, then applies centralized permissions before member or
invitation operations. In the current MVP scope, all Team-management
permissions are granted only to `ADMIN`; `RECRUITER`, `HIRING_MANAGER`, and
`INTERVIEWER` fail closed for these operations. Frontend permission checks are
UX only.

Member and invitation repositories require `organizationId` for sensitive
lookups and mutations. Member role changes and removals lock the Organization
row in a PostgreSQL transaction and count Admins before reducing the Admin
population. Invitation acceptance locks the invitation row, checks the
verified invited email, creates at most one membership, and marks the
invitation accepted atomically. Explicit DTOs omit credentials, sessions,
tokens, token hashes, and internal authorization metadata.

The Phase 07G final audit is recorded in
`docs/architecture/PHASE_07G_FINAL_AUTHORIZATION_AUDIT.md`. Recruiting resource
policies and future non-Admin recruiting permissions remain deferred.
