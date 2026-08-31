# HiringLoop Phase 02 Database Design Inventory

## Status

This is a design inventory for Phase 02. It is not a physical schema. No Prisma models, SQL, migrations, database packages, or application-code changes are defined here.

Phase 02 logical-model work is **IN PROGRESS** in `PROJECT_STATE.md`. Physical database implementation remains out of scope.

## Purpose

Capture the approved domain's persistence candidates, ownership, relationships, integrity concerns, query shapes, and unresolved decisions before PostgreSQL/Prisma implementation begins. The inventory preserves the modular-monolith boundaries and the repository's tenant-isolation rules.

## Source-of-truth documents reviewed

- `PROJECT_STATE.md`
- `MASTER_ROADMAP.md` (especially Phase 02 and the database-relevant feature phases)
- `PROJECT_INSTRUCTIONS.md`
- `README.md`
- `docs/architecture/SYSTEM_ARCHITECTURE.md`
- `docs/architecture/DOMAIN_MODEL.md`
- `docs/architecture/DOMAIN_GLOSSARY.md`
- `docs/architecture/MODULE_BOUNDARIES.md`
- `docs/security/AUTHORIZATION_ARCHITECTURE.md`
- `docs/security/SECURITY_ARCHITECTURE.md`
- `docs/architecture/INFRASTRUCTURE_ARCHITECTURE.md`
- `docs/architecture/INFRASTRUCTURE_BOUNDARIES.md`
- `docs/architecture/NON_FUNCTIONAL_REQUIREMENTS.md`
- `docs/architecture/OPEN_DECISIONS_AND_RISKS.md`
- `docs/architecture/PHASE_00_HANDOFF.md`
- `docs/architecture/PHASE_01_HANDOFF.md`
- `docs/adr/ADR-001-modular-monolith.md` through `ADR-006-background-workers-for-slow-unreliable-work.md`
- `hiringloop-backend/package.json`, `hiringloop-backend/README.md`, and existing files under `hiringloop-backend/src/`

No existing database-design document was present before this file.

## Domain entity inventory

The following are persistence candidates named by the approved domain documentation. A row marked `OPEN` needs product or architecture confirmation before it becomes a physical model.

| Entity / record | Owning area | Scope | Identity requirement | State or history posture |
|---|---|---|---|---|
| User | Users/Auth split | Global | Stable account identity | Mutable current profile; auth/action history separate |
| Organization | Organizations | Tenant root | Stable tenant identity | Current lifecycle plus lifecycle audit/history |
| OrganizationMembership | Users | Organization context | User–Organization relationship identity | Current status/role assignment plus history |
| Invitation | Users/Organizations | Organization-owned | Invitation/process identity | Process state plus security history |
| Role | Authorization | Global system role or custom tenant role **OPEN** | Role identity scoped according to policy | Current policy plus assignment/change history |
| Permission | Authorization | Global vocabulary | Stable permission key | Current/versioned policy |
| Credentials, sessions, auth identities/provider links | Auth | Global/account-scoped | Auth record/provider identity | Security lifecycle/history; exact records are feature-phase scope |
| Job | Jobs | Organization-owned | Stable job identity | Current lifecycle/configuration plus activity/audit |
| JobHiringTeamMember | Jobs | Organization context | Job–Membership assignment identity | Current assignment plus assignment history |
| ApplicationForm | Jobs | Organization-owned through Job | Form/revision identity | Versioned or revision-preserving; version strategy **OPEN** |
| ApplicationQuestion | Jobs | Organization-owned through Form/Job | Question identity within form/revision | Definition history required to interpret submissions |
| ApplicationAnswer | Applications | Organization context through Application | Answer identity within one submission/question | Submitted current value; edit/revision policy **OPEN** |
| Candidate | Candidates | Organization-owned | Stable candidate identity per organization | Current normalized profile plus merge/anonymization history |
| Application | Applications | Organization-owned | Independent candidacy identity; Candidate–Job association | Current status/stage plus immutable/append-oriented history |
| Resume | Candidates/Documents | Organization-owned through Candidate | Document/version identity | Source document versions and lifecycle history |
| CandidateDocument | Candidates/Documents | Organization-owned through Candidate | Document/resource identity | Metadata current state plus versions/access history |
| Pipeline | Pipeline | Organization-owned through Job | Pipeline identity associated with Job | Current configuration plus revisions/transition context |
| PipelineStage | Pipeline | Organization-owned through Pipeline/Job | Stable stage identity within Pipeline | Current definition plus historical definitions |
| ApplicationStage / PipelinePlacement | Pipeline/Applications | Organization context | One current placement per Application | Current state only; movement history separate |
| Stage transition history | Pipeline/Activity | Organization-owned through Application | Append-event identity | Immutable/append-oriented history candidate |
| Interview | Interviews | Organization-owned through Application/Job | Event identity | Current scheduling state plus reschedule/cancel history |
| InterviewParticipant | Interviews | Organization context | Interview–participant assignment identity | Current assignment plus response history |
| Availability | Interviews | Organization scheduling context | Availability submission/window identity | Time-bound proposal plus scheduling history |
| ScorecardTemplate | Feedback | Organization-owned; Job scope **OPEN** | Template/revision identity | Versioned; submitted feedback must remain interpretable |
| Scorecard | Feedback | Organization-owned through Interview | Interview–evaluator evaluation identity | Draft/submitted/locked state plus edit/submission history |
| ScorecardResponse | Feedback | Organization-owned through Scorecard | Scorecard–criterion response identity | Current response plus edit/submission history |
| CandidateNote | Collaboration | Organization-owned | Note identity | Mutable content with edit/archive policy **OPEN**; history may be required |
| Comment | Collaboration | Organization-owned | Thread/comment identity | Mutable/removable under policy **OPEN**; history may be required |
| Mention | Collaboration | Organization context through Note/Comment | Parent–recipient mention identity | Historical collaboration record |
| EmailTemplate | Communications | Organization-owned; global defaults **OPEN** | Template/revision identity | Versioned current content |
| Communication | Communications | Organization-owned | Message/intent identity independent of provider message ID | Current delivery state plus delivery-attempt history |
| Offer | Offers | Organization-owned | Offer and version/terms identity | Current lifecycle/version plus decision history |
| OfferDocument | Offers | Organization-owned through Offer | Artifact/version identity | Issuance/access/version history; bytes in object storage later |
| Notification | Notifications | Organization-owned with recipient context | Notification identity | Current read/delivery state plus creation history |
| ActivityRecord | Activity | Organization-owned | Activity event identity | User-visible, append-oriented business history |
| AuditRecord | Audit | Tenant-scoped or controlled system scope | Audit event identity | Protected, append-only/append-oriented history |
| TalentPool | Talent Pool | Organization-owned | Pool identity | Current pool configuration; lifecycle **OPEN** |
| TalentPoolMembership | Talent Pool | Organization context | Pool–Candidate relationship identity | Current membership plus membership history as needed |
| Integration reference / provider connection metadata | Integrations or relevant module | Organization context | Provider connection/external-reference identity | Current sync state plus retry/error history |

The Talent Pool rows are included because they are explicitly named in module boundaries, the glossary, and the domain ownership matrix. Their absence from the detailed core-entity definitions is a repository documentation gap and must be resolved before physical modeling.

Analytics/reporting records are not authoritative domain entities yet. Derived read models or aggregates require measured query needs and a later analytics decision.

## Global vs tenant-owned entities

### Global

- `User` and account identity.
- Authentication credentials, sessions, and provider identities/links.
- Permission vocabulary.
- System-defined roles, if the final role policy keeps them global.

Global does not mean universally accessible. A global User receives no organization access without an active, valid Membership.

### Organization/tenant-owned

Organization, Jobs, Candidates, Applications, forms/questions/answers, Pipelines/Stages/placements, Interviews/participants/availability, Scorecard templates/instances/responses, collaboration records, communication templates/messages, Offers/documents, Notifications, ActivityRecords, Talent Pools/memberships, and tenant-scoped AuditRecords.

Memberships and other join/context records are tenant-scoped even when they reference a global User. Documents are tenant-owned through their domain parent even though file bytes will later live in private object storage.

## Relationship and cardinality inventory

| Relationship | Cardinality | Requiredness / integrity note |
|---|---|---|
| User → OrganizationMembership | 1-to-many | Membership requires both User and Organization; a User may have none |
| Organization → Membership | 1-to-many | Required tenant context for access |
| Organization → Job/Candidate | 1-to-many | Required ownership |
| Job → Application | 1-to-many | Application must reference one Job |
| Candidate → Application | 1-to-many | Application must reference one Candidate; reusable Candidate is not duplicated per Job |
| Candidate ↔ Job through Application | many-to-many over time | Duplicate-application policy is OPEN; do not assume unconditional uniqueness |
| Job → ApplicationForm | one-to-one/configurable | One default is the working assumption; multiple forms/revisions are OPEN |
| ApplicationForm → ApplicationQuestion | 1-to-many | Question belongs to one form/revision |
| Application → ApplicationAnswer | 1-to-many | Answer belongs to one Application and matching question/form context |
| Job → Pipeline | one-to-one/configurable | One default pipeline assumed; reusable/shared pipelines are OPEN |
| Pipeline → PipelineStage | 1-to-many | Stage belongs to exactly one Pipeline |
| Application → current PipelineStage | many-to-one | Required once placed; stage must belong to the Application's Job pipeline |
| Application → stage history | 1-to-many | Required for important transitions; history is separate from current placement |
| Job → JobHiringTeamMember | 1-to-many | Assignment must reference an active same-tenant Membership |
| Application → Interview | 1-to-many | Interview can exist before feedback and multiple interviews are allowed |
| Interview ↔ User through InterviewParticipant | many-to-many | Internal participant requires valid same-tenant Membership; external participants are OPEN |
| Interview → Scorecard | 1-to-many | Scorecard may be absent; evaluator/template context must match |
| Scorecard → ScorecardResponse | 1-to-many | Response belongs to one scorecard and criterion/revision |
| Candidate → Resume/CandidateDocument | 1-to-many | Candidate owns metadata; Application/Offer references are optional |
| Application → Offer | 0/1-to-many | Multiple offers/version rules are OPEN |
| Offer → OfferDocument | 1-to-many | Documents/artifact versions remain traceable |
| Candidate/Job/Application/Interview/Offer → ActivityRecord | 1-to-many | User-visible timeline is separate from audit |
| Organization/User/target → AuditRecord | 1-to-many | Tenant scope and controlled system scope require policy |
| Organization → TalentPool; Candidate ↔ TalentPool | 1-to-many / many-to-many | Pool membership is contextual and independent of Application stage |

Relationships involving optional context (for example, a Note linked to Candidate with optional Application) need an explicit supported-target rule before physical foreign keys are chosen. Polymorphic targets must not be implied casually by nullable IDs.

## Critical domain distinctions

- **User vs Membership:** User is global identity; Membership grants organization participation, status, and role context.
- **Candidate vs Application:** Candidate is reusable organization profile; Application is one candidate's job-specific lifecycle.
- **Job vs Pipeline:** Job is the hiring requirement/lifecycle; Pipeline is the workflow configuration.
- **Current stage vs stage history:** Current placement answers where the Application is now; history records prior/new stage, actor, and time.
- **Interview vs Feedback:** Interview is the event; Scorecard/Feedback is an evaluator's assessment and can be absent or plural.
- **Activity vs AuditLog:** Activity is user-visible recruiting history; AuditRecord is protected accountability history. One action may produce both.
- **Offer vs Hire:** Offer is a proposal; acceptance is not automatically Hire. No separate Hire entity is approved.
- **Resume vs Candidate Profile:** Resume is the original uploaded source; profile is normalized data. No AI-derived persistence is introduced here.

## Preliminary integrity and uniqueness constraints

These are logical requirements for later schema design, not finalized SQL constraints.

- Every tenant-owned record must resolve to exactly one Organization, directly or through a parent; cross-tenant parent references must be impossible or rejected transactionally.
- Candidate and Job must belong to the same Organization before Application creation.
- Application, Form, Question, and Job context must agree for every Answer.
- A current Application placement must reference a Stage in the Job's Pipeline.
- At most one current placement should exist per Application.
- A JobHiringTeamMember must reference a Membership in the same Organization and satisfy active-status policy.
- An internal InterviewParticipant must reference a same-tenant User/Membership; feedback submission must be limited to an eligible participant.
- A Scorecard response must match its Scorecard's template criterion/revision and preserve submitted meaning after template changes.
- Offer Candidate/Application/Job/Organization context must agree.
- Provider IDs must not replace internal identities; provider references require provider/system scoping and idempotency handling.
- User-facing history and audit history must not be used interchangeably.
- Likely composite uniqueness candidates include `(userId, organizationId)` for Membership, `(jobId, membershipId)` for current team assignment, `(pipelineId, normalized stage key/order policy)` for stages, `(interviewId, participant identity)` for participants, `(scorecardId, criterion/revision)` for responses, and `(poolId, candidateId)` for pool membership. Exact keys and normalization are OPEN.
- Candidate–Job/Application uniqueness is intentionally OPEN because duplicate-application behavior is unresolved.
- Slugs, organization names, emails, provider references, and template names require scoped normalization/case-sensitivity decisions before uniqueness is fixed.

## Tenant-isolation considerations

The primary isolation invariant is zero cross-organization access or mutation. Risks requiring explicit repository and test coverage include:

- Fetching a child by its ID without constraining its Organization or verifying the parent chain.
- Trusting a frontend-supplied `organizationId` instead of authenticated Membership context.
- Joining a global User directly to tenant data and treating identity as authorization.
- Creating an Application from a Candidate and Job belonging to different organizations.
- Resolving PipelineStage by stage ID without checking the Job/Pipeline chain.
- Reusing a Membership, HiringTeam assignment, InterviewParticipant, Note, or Notification across organizations.
- Search, bulk actions, exports, analytics, pagination, and counts that omit tenant predicates.
- File metadata or signed URL lookup that is scoped only by object/document ID.
- Worker payloads, provider callbacks, retries, and integration references that do not reload and revalidate tenant/resource context.
- Activity/Audit queries that leak target metadata or sensitive values across tenant or visibility boundaries.

Tenant scoping is a backend/query and authorization responsibility; database constraints reinforce it but do not replace policy checks. Composite foreign-key or equivalent same-tenant enforcement should be evaluated during physical design.

## Current state vs history modeling

Current mutable state is appropriate for User profile, Organization lifecycle, Job lifecycle, Candidate profile, Application status/current stage, Interview status, Scorecard draft/submission state, Offer state/version, Notification read state, and provider sync state.

Separate append-oriented or immutable records are required or strongly indicated for stage transitions, ActivityRecords, AuditRecords, delivery attempts, offer decisions/version traceability, interview reschedule/cancel history, membership/security changes, document versions/access history, and any submitted feedback whose meaning must not be rewritten. Retention, correction, redaction, anonymization, and legal deletion rules remain OPEN.

## Expected high-level query patterns

These patterns should guide later evidence-based index design; no indexes are prescribed now.

- Resolve active Membership and organization context for an authenticated User.
- Paginate Jobs by Organization and lifecycle/status, with ownership/team filters.
- Paginate/search Candidates by Organization using approved PII/search fields.
- List Applications by Organization, Job, Candidate, status, current stage, source, and date; load selective Candidate data.
- Load a pipeline board by Job/Pipeline and current placement, with bounded Application pages.
- Read an Application timeline by Application/Candidate ordered by event time and stable tie-breaker.
- Read stage history by Application and time; preserve deterministic ordering.
- List Interviews by Application, participant, status, and time window; resolve provider sync state.
- List Scorecards by Interview/evaluator and submitted state with visibility policy.
- List Offers by Application/Candidate and lifecycle state without exposing confidential terms unnecessarily.
- List Notifications by recipient Membership/User, unread state, and creation time.
- List Activity separately from restricted AuditRecords, always tenant/visibility scoped.
- List Talent Pool members by Pool/Candidate and organization.
- Resolve communications/provider references by internal intent and provider-scoped idempotency key.

All large collections require bounded pagination. Actual index choices require representative data, query plans, and `EXPLAIN ANALYZE`; speculative indexing is deferred.

## Transaction and concurrency hotspots

- Organization creation plus initial admin Membership.
- Candidate resolution/creation plus Application creation and duplicate handling.
- Job creation plus default Pipeline creation.
- Application stage/status transition plus current placement update and stage history/activity append.
- Concurrent stage moves: validate expected current state/version and prevent lost or reordered transitions.
- Pipeline stage reorder/retire while Applications reference stages.
- Interview creation/reschedule/cancel plus participant assignments; provider synchronization is not the internal authority.
- Scorecard draft/submission/autosave or concurrent edits; final visibility/edit policy is OPEN.
- Offer issue/withdraw/accept/decline and version/decision recording; acceptance versus Hire remains OPEN.
- Membership invitation, activation, suspension/removal, and role changes.
- Communication intent persistence, retries, provider callbacks, and idempotent delivery attempts.
- Document upload confirmation, availability/quarantine, replacement, deletion, and object-storage orphan reconciliation.

The later design must choose transaction boundaries, expected-state/version strategy, isolation requirements, and idempotency keys per workflow. Cross-provider atomic transactions are not assumed.

## Major deletion and referential-integrity questions

OPEN decisions must be resolved before feature persistence is finalized:

- When are Organizations, Users, Memberships, Jobs, Candidates, Applications, and documents archived, soft-deleted, anonymized, or hard-deleted?
- Does deleting a Candidate ever delete Applications, interviews, feedback, offers, files, activity, or audit references?
- Can a Job or Pipeline stage be deleted while Applications or history reference it, or only retired?
- Can forms/questions be edited in place, or must revisions/snapshots preserve historical answers?
- Are Notes, Comments, Communications, Notifications, Activity, and AuditRecords mutable, redacted, or append-only?
- What is the retention and legal-hold policy for resumes, feedback, offers, communications, and audit data?
- What happens to provider references and object-storage bytes when a parent record is retired or anonymized?
- Can a membership be removed while it remains the actor/evaluator on historical records?
- Are external interview participants supported, and if so, what identity/retention model applies?

Defaulting to cascade deletion would be unsafe for recruiting history and must not be chosen without policy approval.

## Domain Decisions Required Before Logical Schema

This section records domain decisions that affect relational identity, foreign keys, uniqueness, lifecycle actions, or historical interpretation. A recommendation is not an approved decision. `DECIDED` means the repository already establishes the direction; it does not mean every physical-schema detail is fixed.

### 1. Duplicate and repeat job applications

- **Question:** Can one Candidate apply to one Job more than once, and how are accidental duplicate submissions distinguished from legitimate later reapplication?
- **Repository evidence:** ADR-002 and `DOMAIN_MODEL.md` establish reusable organization-scoped Candidates and independent Applications. `OPEN_DECISIONS_AND_RISKS.md` explicitly marks duplicate Application policy open; the inventory intentionally does not assume Candidate–Job uniqueness.
- **Current status:** OPEN
- **Options:** (A) one Application per Candidate–Job, with duplicate submission idempotently returning the existing Application; (B) one active Application per Candidate–Job but permit later Applications after a terminal/withdrawn outcome; (C) unrestricted multiple Applications, linked by a submission/reapplication group.
- **Recommended direction:** Option B, with a request/submission idempotency key for accidental repeats and an explicit, policy-controlled reapplication event. This is a recommendation only.
- **Database implications:** Do not add unconditional Candidate–Job uniqueness until approved. The model likely needs Application lifecycle/outcome state, submission identity/idempotency metadata, and a constrained uniqueness rule for the chosen active/eligible set. A repeat must not overwrite the prior Application.
- **Security/tenant implications:** Candidate and Job must be same-organization; public idempotency keys must not disclose whether another tenant's record exists. All duplicate checks use authenticated/public Job context and tenant-safe lookup.
- **History/audit implications:** Preserve each accepted Application, duplicate rejection/merge decision, reapplication reason, actor/source, and timestamps. Do not silently discard a replay that may be evidence of abuse.
- **Decision required before physical schema?** YES

### 2. Application-form versioning

- **Question:** What happens to historical answers when a published form is edited?
- **Repository evidence:** `DOMAIN_MODEL.md` says form lifecycle is draft/published/revised/retired, answers must remain interpretable, and versioning requires product decision. The inventory requires Application/Form/Question context alignment.
- **Current status:** OPEN
- **Options:** (A) immutable published revisions; new edits create a new revision; (B) mutable form with an application-time snapshot of question definitions; (C) mutable form and reinterpret historical answers against the latest definition.
- **Recommended direction:** Option A, optionally recording a compact submission snapshot/hash for audit. This is a recommendation only.
- **Database implications:** Application submission must reference the exact form revision; questions need stable revision identity and answer validation context. Published revision mutation should be prevented or represented as a new revision. Draft answers may use a draft revision only under an explicit workflow.
- **Security/tenant implications:** Revisions and answers inherit the Job/Organization boundary. Public submission must bind to the published revision selected by the Job, not a client-supplied question set.
- **History/audit implications:** Preserve question labels, types, requiredness, validation, options, and ordering as submitted. Form edits, publication, retirement, and answer corrections require audit treatment.
- **Decision required before physical schema?** YES

### 3. Pipeline/stage configuration changes

- **Question:** What happens when stages are renamed, reordered, disabled, or deleted while Applications reference them?
- **Repository evidence:** Job/Pipeline are distinct; current placement is distinct from stage history; `DOMAIN_MODEL.md` says configuration changes must not invalidate history. Terminal semantics remain open.
- **Current status:** DECIDED for the invariant; OPEN for exact lifecycle rules
- **Recommended direction:** Keep stable stage identity, allow display-name/order edits, use retire/disable rather than deleting referenced stages, and require an explicit migration when moving Applications between pipelines. This is a recommendation for unresolved details, not approval.
- **Database implications:** Current placement references a stable stage; history stores prior/new stage identity plus immutable definition snapshot fields needed for interpretation. Reordering changes presentation only. Deletion should be restricted where current/history references exist; a disabled stage must have a defined treatment for new and existing Applications.
- **Security/tenant implications:** Stage and placement checks must verify the Job/Pipeline/Organization chain; never authorize by stage ID alone. Configuration changes and bulk moves require the same resource policy as individual moves.
- **History/audit implications:** Record old/new stage, actor, reason, effective time, and relevant stage names/order at transition time. Renaming must not rewrite historical labels.
- **Decision required before physical schema?** YES for delete/disable/migration semantics; NO for the stable-identity/current-vs-history invariant

### 4. Scorecard/template versioning

- **Question:** What happens to completed evaluations when a scorecard template changes?
- **Repository evidence:** `DOMAIN_MODEL.md` requires template revisions and says revisions must not reinterpret submitted feedback. Scorecard responses are tied to a criterion/version; exact visibility/edit policy is open.
- **Current status:** DECIDED for preservation; OPEN for draft/edit/locking details
- **Recommended direction:** Immutable template revisions; each Scorecard records the revision used; submitted responses retain criterion definitions or an equivalent immutable reference. This preserves historical meaning without freezing future templates.
- **Database implications:** Template, criterion, revision, Scorecard, and response identity must be separable. Completed responses cannot foreign-key only to a mutable current criterion. Drafts may be migrated only by explicit policy.
- **Security/tenant implications:** Template scope (organization/job/interview type) and evaluator access must be checked within the active tenant. Private feedback must not become visible because a template is shared or revised.
- **History/audit implications:** Preserve submission time, evaluator, original question/scale/labels, edits or corrections, and lock/unlock actions. Audit must distinguish a changed template from changed feedback.
- **Decision required before physical schema?** YES

### 5. Retention, deletion, and anonymization

- **Question:** Which records are hard-deleted, soft-deleted, archived, retained, or anonymized for user, membership, candidate, job, application, activity, audit, communication, and document data?
- **Repository evidence:** Retention periods and deletion/anonymization are explicitly open in `OPEN_DECISIONS_AND_RISKS.md`, NFRs, the threat model, ADR-005, and the inventory. The repository warns that cascade deletion is unsafe for recruiting history.
- **Current status:** OPEN
- **Options:** (A) preserve operational records and anonymize personal fields on approved request; (B) soft-delete/archive domain records while retaining restricted history and metadata; (C) hard-delete eligible records, with separately retained legally/security-required audit records. A policy may combine these by data class.
- **Recommended direction:** Classify by data type and legal hold: deactivate/soft-delete User and Membership access; archive Jobs; preserve Applications and workflow history; anonymize Candidate PII when approved; retain protected AuditRecords subject to redaction/legal policy; delete or cryptographically revoke document bytes while retaining minimal metadata where required; retain Communication delivery/audit metadata only as policy permits. No retention period is proposed or approved.
- **Database implications:** Avoid default cascades. Foreign keys and lifecycle states must support actor removal without erasing historical attribution, parent archival without breaking references, anonymized candidate identity, document metadata/byte cleanup, and provider-reference reconciliation. Legal holds and deletion jobs may require durable state.
- **Security/tenant implications:** Removal revokes access immediately; historical records remain tenant-scoped and least-privilege. Anonymization must prevent re-identification through searchable fields, logs, files, provider IDs, and exports. Cross-tenant hard delete/anonymization is prohibited.
- **History/audit implications:** Record who/what/when initiated lifecycle actions, preserve required audit integrity, and distinguish redaction/anonymization from ordinary edits. Membership removal must not erase actor identity from protected history unless policy explicitly requires anonymization.
- **Decision required before physical schema?** YES

### 6. Offer vs Hire semantics

- **Question:** What entity or event represents the actual hiring outcome without collapsing Offer acceptance into Hire?
- **Repository evidence:** ADR-002, `DOMAIN_MODEL.md`, `MODULE_BOUNDARIES.md`, and the inventory explicitly preserve Offer ≠ Hire. Offer acceptance is not employment; no Hire entity is currently approved. Pipeline must not own final employment records.
- **Current status:** DECIDED that Offer acceptance is not automatically Hire; OPEN for the hiring-outcome representation
- **Options:** (A) explicit Hire/EmploymentOutcome entity linked to Application; (B) an Application outcome/state with an immutable hire event; (C) a separate organization HR/integration boundary records the employment outcome while HiringLoop stores a reference/event.
- **Recommended direction:** Option B for an MVP if HiringLoop only needs recruiting outcome reporting; choose Option A if hire-specific fields, lifecycle, onboarding, or multiple employment outcomes are required. Approval is required.
- **Database implications:** Offer status/version/decision must be independent from Application outcome. Any hire event must be idempotent, linked to the Application and tenant, and not overwrite offer history. Do not add a Hire table merely from this recommendation.
- **Security/tenant implications:** Confidential Offer access and restricted hiring-outcome access may differ. Same-tenant Candidate/Application/Job context is mandatory.
- **History/audit implications:** Preserve offer issuance/acceptance and separate explicit hire decision, actor, effective date, source, corrections, and audit records.
- **Decision required before physical schema?** YES

### 7. Roles and permissions

- **Question:** Does the current architecture require Role and Permission entities, or only fixed roles/constants plus membership attributes/policies?
- **Repository evidence:** ADR-003 decisively requires RBAC plus resource-level authorization. `DOMAIN_MODEL.md` calls Permission a global vocabulary and leaves custom roles proposed/open; Membership carries organization-specific role context. Final grants, custom roles, and recruiter/Hiring Manager scope are open.
- **Current status:** DECIDED for RBAC + resource policy; OPEN for storage representation and custom roles
- **Options:** (A) fixed system-role enum/constants on Membership plus code-defined permissions; (B) global Role/Permission tables with membership assignments; (C) global fixed roles initially, with versioned tenant custom-role tables only when approved.
- **Recommended direction:** Option C. Existing architecture does not require Role/Permission tables for fixed roles; use a stable permission vocabulary and membership-scoped role assignment now, reserving tables for approved configurable roles/permissions. This is not approval to implement either representation.
- **Database implications:** At minimum persist membership status and role context in a way that supports authorization history. If custom roles are approved, model scoped role definitions, permission grants, version/change history, and safe revocation; do not duplicate resource-policy facts as permissions.
- **Security/tenant implications:** Roles belong to Membership/Organization context, never global User. Backend policy remains authoritative; role changes are protected and audited. Resource assignments still constrain access.
- **History/audit implications:** Preserve role/permission grants, revocations, effective times, and actor; never let a current role rewrite historical access decisions.
- **Decision required before physical schema?** YES for custom/configurable roles; NO for the already-approved RBAC + resource-policy boundary

### 8. Feedback visibility and editability

- **Question:** Can feedback be edited after submission; do draft/submitted states exist; and can interviewers see other feedback before submitting?
- **Repository evidence:** Scorecards have proposed draft/submitted/locked lifecycle; Feedback module exposes edit where allowed; visibility is explicitly proposed/open in `DOMAIN_MODEL.md`, `OPEN_DECISIONS_AND_RISKS.md`, and the inventory.
- **Current status:** OPEN
- **Options:** (A) private draft, then submit-and-lock; reveal to others after all submissions or a deadline; (B) submitted feedback remains editable with version history and visibility policy; (C) live shared feedback visible to authorized participants throughout.
- **Recommended direction:** Option A for independent interviewer integrity, with a controlled correction/reopen workflow and immutable versions. Approval is required.
- **Database implications:** Persist draft/submitted/locked state, evaluator eligibility, submission time, visibility/release condition, and version/edit history. Prevent concurrent edits or detect them with expected-version checks.
- **Security/tenant implications:** Enforce participant/resource policy, private-feedback visibility, and field minimization server-side. Do not infer visibility from interview membership alone.
- **History/audit implications:** Preserve every submitted version, visibility release, correction, reopen, and lock event; audit access to private feedback where required.
- **Decision required before physical schema?** YES

### 9. External interviewers

- **Question:** Must every interview participant be a HiringLoop User/Membership, or may external participants exist?
- **Repository evidence:** Internal participants require same-tenant Membership; external participants are explicitly open in ADR-003-adjacent domain material, `DOMAIN_MODEL.md`, and the inventory.
- **Current status:** OPEN
- **Options:** (A) internal Membership only; (B) participant rows support either internal Membership or an external contact snapshot; (C) external guest identity with invitation/authentication and limited feedback capability.
- **Recommended direction:** Option A until a product requirement demonstrates external participation. If approved later, choose B for scheduling-only guests or C for guests who submit feedback; do not overload User identity with an untrusted external contact.
- **Database implications:** Internal participant uniqueness is Membership-scoped. External support would need a constrained participant-kind model, contact snapshot, invitation/consent/status, and rules for feedback/evidence retention; nullable internal IDs alone are insufficient.
- **Security/tenant implications:** External access needs separate authentication, signed links/session controls, expiration, least privilege, and strict tenant/resource binding. External email is not proof of organization membership.
- **History/audit implications:** Preserve participant identity as known at invitation/submission time, invitation/revocation/expiry, consent, and feedback actions even if later removed.
- **Decision required before physical schema?** YES if external participants are in scope; NO for internal-only modeling

### 10. Talent Pool semantics

- **Question:** Is a Talent Pool a candidate classification, organization-owned reusable named collection, application outcome, or another concept?
- **Repository evidence:** Module boundaries define organization-managed candidate pools, labels, and pool-level notes; Talent Pool is separate from candidate identity and application status. The inventory marks the detailed entity model as a documentation gap.
- **Current status:** DECIDED as separate from Application stage/status and Candidate identity; OPEN for exact semantics
- **Options:** (A) reusable organization-owned named collection with Candidate membership; (B) candidate classification/tags only; (C) application outcome/status such as “talent pool”; (D) support both named collections and classifications as separate concepts.
- **Recommended direction:** Option A for the named pool described by the repository, with membership metadata/history; add classification only as a separate approved feature. This is a recommendation only.
- **Database implications:** Likely Organization → TalentPool → Candidate many-to-many with scoped membership uniqueness, optional source/added-by/notes/status, and no Application-stage foreign key. If labels are also required, decide whether they are a distinct vocabulary/relationship.
- **Security/tenant implications:** Pools and memberships are tenant-owned; Candidate access remains subject to candidate policy. Pool membership must not grant access to unrelated Applications or Jobs.
- **History/audit implications:** Preserve add/remove/move/rename, actor, reason, and candidate anonymization effects. Pool membership history must not be confused with application outcome history.
- **Decision required before physical schema?** YES

### 11. Candidate identity and deduplication

- **Question:** What makes two Candidate rows the same person within one Organization, especially without a reliable unique email?
- **Repository evidence:** ADR-002 requires one reusable organization-scoped Candidate profile and explicitly leaves candidate merges/deduplication for a workflow. The architecture forbids global tenant-crossing assumptions; no email uniqueness rule exists.
- **Current status:** OPEN
- **Options:** (A) normalized email unique within Organization when present; (B) no hard identity key, use duplicate detection and an authorized merge workflow; (C) verified external identity/contact matching plus manual review.
- **Recommended direction:** Option B, optionally using normalized email as a non-authoritative duplicate signal. Permit missing/shared/changed emails; require explicit merge with conflict resolution and survivorship rules.
- **Database implications:** Do not impose global email uniqueness or require email. Candidate merge needs alias/redirect or merge history, reference repair rules, and protections against duplicate Applications during concurrent resolution. Personal matching data should not be encoded as an irreversible unique constraint without approval.
- **Security/tenant implications:** Deduplication searches are organization-scoped and must avoid existence leakage. Never match or merge Candidates across Organizations; access to PII used for matching is restricted.
- **History/audit implications:** Preserve source identities, merge actor/time/reason, field-level resolution where needed, and references to superseded records. Anonymization must preserve permitted aggregate/history without re-identifying the person.
- **Decision required before physical schema?** YES

### 12. Invitation lifecycle

- **Question:** What uniqueness, resend, expiry, acceptance, revocation, and repeated-attempt rules apply to Membership invitations?
- **Repository evidence:** `DOMAIN_MODEL.md` defines invitation process identity and pending/active/suspended/removed Membership lifecycle, but re-invitation rules are proposed/open. Security docs require idempotency for invitations and auditability for membership changes.
- **Current status:** OPEN
- **Options:** (A) one active invitation per Organization + target, resend rotates token while retaining one process; (B) every attempt is a separate invitation, with one accepted winner; (C) reusable invitation link with explicit revocation and attempt history.
- **Recommended direction:** Option A, with hashed single-use token, expiration, resend throttling, revocation, and append-only attempt/security history. Approval is required.
- **Database implications:** Separate invitation process identity from secret token; enforce at most one active invitation for the chosen target scope; acceptance must transactionally create/activate one Membership and make competing active invitations stale. Repeated sends need idempotency.
- **Security/tenant implications:** Tokens are opaque, short-lived, stored hashed, and bound to Organization/target; resend must not enumerate membership state. Revocation immediately invalidates acceptance.
- **History/audit implications:** Retain sent/resend/accepted/revoked/expired/failed attempts, actor, timestamps, and security-relevant metadata under retention policy.
- **Decision required before physical schema?** YES

### 13. Integration/provider identity

- **Question:** How are Google Calendar, email, OAuth, and other provider identifiers scoped, and how are duplicate callbacks/events prevented from changing core state twice?
- **Repository evidence:** ADR-004 makes PostgreSQL authoritative; ADR-006 requires deterministic identity/idempotency, safe redelivery, retries, and reconciliation. Security architecture requires provider adapters, server-side credentials, webhook verification, and callback replay policy.
- **Current status:** DECIDED for provider-specific references as non-authoritative; OPEN for provider catalog and exact keys
- **Recommended direction:** Keep internal domain IDs authoritative and store provider references in provider-scoped integration records. Use `(provider, provider-account/connection, external-id)` plus operation/event idempotency keys where provider contracts support them; persist raw provider payloads only when policy permits and with minimization.
- **Database implications:** Provider IDs must never be primary identity for Job, Interview, Communication, or User. Persist sync status, last-seen/version/cursor, retry/error state, callback/event deduplication identity, and reconciliation timestamps as needed. Duplicate callbacks become no-op/replay outcomes, not duplicate domain events.
- **Security/tenant implications:** Provider connections and references are tenant/account scoped; callbacks are signature-verified and resolved to tenant/resource context before mutation. Secrets and tokens remain outside ordinary domain records/DTOs.
- **History/audit implications:** Preserve provider event receipt, verification/replay result, attempted domain effect, and reconciliation outcome without retaining unnecessary sensitive payloads. Core business history records the accepted domain transition, not every provider retry as a new business action.
- **Decision required before physical schema?** YES for each provider integration before implementation; NO for the core-domain/provider-authority boundary

## Decision matrix

| Decision | Status | Recommended Direction | Schema Blocking? |
|---|---|---|---|
| Duplicate/repeat Applications | OPEN | One active Application per Candidate–Job; explicit reapplication; idempotent submission | YES |
| Application form revisions | OPEN | Immutable published revisions; answers bind to submitted revision | YES |
| Pipeline/stage changes | DECIDED invariant / OPEN lifecycle | Stable stage IDs; retire rather than delete references; separate movement history | YES for lifecycle rules |
| Scorecard/template revisions | DECIDED invariant / OPEN workflow | Immutable template revisions; Scorecard binds to revision; preserve submitted meaning | YES |
| Retention/deletion/anonymization | OPEN | Data-class policy; deactivate/archive/anonymize selectively; avoid cascades | YES |
| Offer vs Hire | DECIDED distinction / OPEN representation | Separate explicit hire outcome/event; never infer Hire from acceptance | YES |
| Roles and permissions | DECIDED boundary / OPEN storage | Fixed roles initially; configurable tables only if approved | YES for custom roles; NO for boundary |
| Feedback visibility/editability | OPEN | Draft then submit/lock; controlled correction; version history | YES |
| External interviewers | OPEN | Internal Membership only until approved; separate guest model if needed | NO for internal-only; YES if external |
| Talent Pool semantics | DECIDED separation / OPEN detail | Organization-owned reusable named collection; Candidate membership M:N | YES |
| Candidate identity/deduplication | OPEN | No hard email identity; duplicate signal plus authorized merge workflow | YES |
| Invitation lifecycle | OPEN | One active process per target; hashed single-use token; attempt history | YES |
| Provider identity/idempotency | DECIDED boundary / OPEN provider keys | Provider-scoped references; internal authority; replay-safe callbacks | YES per integration; NO for boundary |

These items should be approved by Product/Security/Architecture owners as applicable and, where the decision changes ownership, consistency, or authorization, recorded as ADRs after approval. No ADR is created by this task because the repository does not contain an approved new decision requiring one.

## Unresolved database-design decisions from repository documentation

- Duplicate Application policy.
- Application withdrawal and other exit semantics.
- Final fixed/custom role model and recruiter/Hiring Manager scope.
- Candidate self-service and visibility boundaries.
- Job reopening and Pipeline stage graph/terminal semantics.
- Form/question versioning and historical answer interpretation.
- Organization-wide versus Job-scoped ScorecardTemplates.
- Feedback visibility, editing, locking, and retention.
- Offer count/version rules, expiry/withdrawal, and explicit Hire transition/entity decision.
- External Interviewers and participant identity model.
- Talent Pool detailed entity model (documentation gap).
- Consent, retention, deletion, anonymization, export, and legal/privacy policy.
- Global defaults for EmailTemplates and other configuration.
- Database backup/restore, RPO/RTO, pool sizing, test database approach, and migration up/down policy.
- Representative dataset/concurrency assumptions and measured index requirements.

## Explicitly deferred physical-schema decisions

This inventory intentionally does not decide database provider provisioning, Prisma version/configuration, model syntax, table names, column types, UUID strategy, sequence strategy, timestamp precision, enum strategy, JSON usage, foreign-key action syntax, soft-delete implementation, row-level security, migration layout, seed data, connection pool values, isolation levels, indexes, full-text/search technology, read models, partitioning, or generated SQL.

The repository currently approves PostgreSQL as the source of truth and Prisma as the planned access mechanism, but implementation is a later Phase 02 step.

## Next recommended Phase 02 design step

The next step is to review this inventory with the domain and security owners, resolve the remaining open questions, and then convert the approved logical model into a physical PostgreSQL/Prisma design. Do not treat any field name, type, index, or constraint wording in this document as physical-schema approval.

---

# Reviewed Logical Relational Model

## Modeling status and precedence

This section is the first reviewed logical relational model for Phase 02. It supersedes earlier inventory statements in this file where they conflict with the approved domain directions supplied for this task. It remains a logical model: it does not define SQL, Prisma syntax, migrations, indexes, enum implementations, generated columns, partitioning, or database privileges.

The model follows these principles:

- Organization is the tenant boundary. User is a global account; Membership is the tenant-scoped authorization relationship.
- Candidate and Application are separate. A Candidate is reusable within one organization; an Application is one candidacy for one Job and may repeat over time.
- Mutable current state is separated from append-oriented history, decisions, audit, and provider synchronization records.
- Published form and scorecard definitions are immutable versions. Submitted answers point to the exact version and question/criterion definition used.
- Fixed roles are stored on Membership or an equivalent membership representation: Admin, Recruiter, Hiring Manager, and Interviewer. Configurable Role/Permission tables are not in this scope.
- Internal HiringLoop users/memberships are the only initial interview participants. External interviewer support is deferred, but the relationship is kept extensible enough not to make it impossible later.
- Hiring is initially an Application outcome/event. Offer remains a separate entity and does not imply employment.
- Archive, deactivate, retire, anonymize, and history-preserving workflows are preferred over destructive deletion for operational records. No legal retention period is invented here.

## Approved Domain Decisions

| Decision | Logical-model consequence |
|---|---|
| Repeat applications are legitimate | No permanent uniqueness rule on Candidate + Job. A distinct Application identity and a submission/idempotency or duplicate-detection concept are required. |
| Accidental duplicate submissions must be prevented separately | Public submission needs an idempotency/replay key or equivalent bounded duplicate-submission mechanism; its scope and expiry remain open. |
| Published application forms preserve history | ApplicationForm is a stable logical container; ApplicationFormVersion is immutable after publication; Application records the submitted version. |
| Pipeline history is durable | PipelineStage is retired/deactivated rather than destructively deleted when referenced; stage movement is recorded in ApplicationStageHistory. |
| Scorecard history is durable | ScorecardTemplateVersion and its criteria are preserved; each Scorecard records the completed version. |
| Retention/deletion is controlled | Operational records are archived/deactivated; Candidate PII anonymization is a controlled, audited workflow with no invented retention period. |
| Offer and Hire are separate | Offer has its own lifecycle; ApplicationOutcomeEvent represents hired/rejected decisions initially. |
| Roles are fixed and membership-scoped | Membership carries one approved role for the current scope; resource-level policy remains separate. |
| Feedback is Draft -> Submitted | Scorecard is editable in Draft and normally locked after Submitted; peer feedback visibility is policy-filtered until the viewer submits. |
| External interviewers are deferred | InterviewParticipant initially references an internal Membership/User; a future participant abstraction may add external identities. |
| Talent Pools are organization-owned collections | TalentPool and TalentPoolMember form a many-to-many Candidate relationship. |
| Candidate identity is tenant-contextual | Candidate identity is never global. Email is a normalized deduplication signal or candidate attribute, not automatically the identity. |
| Invitations have explicit lifecycle | Invitation supports pending, accepted, expired, and revoked states and prevents multiple uncontrolled active invitations for tenant/email. |
| Provider identifiers are behind integration references | Provider-specific IDs live in provider/reference records, with provider-scoped idempotency, not on core entities. |

## Logical model notation

Attribute lists below are intentionally limited to logical concepts. “Required” describes the domain relationship, not a final nullability or database constraint. `organizationId` is used as a logical name when discussing tenant ownership; the physical name and implementation are deferred.

## Entity Inventory

The following inventory gives each entity’s purpose, scope, aggregate context, identity concept, important logical attributes, relationships, mutability/history, preliminary constraints, integrity questions, and phase placement.

| Entity | Purpose and aggregate context | Scope and identity | Important logical attributes | Relationships and cardinality | Current/history and constraints | Phase |
|---|---|---|---|---|---|---|
| User | Global person/account identity used to authenticate and participate in organizations | Global; stable account identity | profile/display data, account lifecycle, timestamps | 1 User to many Memberships; may act on many tenant records through Membership | Current account plus auth/security history elsewhere; identity alone grants no tenant access | Core foundation |
| Organization | Tenant/workspace root | Global tenant root; stable organization identity | name, lifecycle, settings reference, timestamps | 1 Organization to many Memberships, Jobs, Candidates, Invitations and direct tenant records | Current lifecycle plus audit/history; must not be hard-deleted while dependent history exists | Core foundation |
| Membership | User’s organization context and fixed role | Tenant-owned relationship; identity is User + Organization membership | role (Admin/Recruiter/Hiring Manager/Interviewer), status, joined/removed state | many Memberships to 1 User and 1 Organization; referenced by team, interview, notes, audit | Current membership/role plus membership-change history; at most one active membership per User/Organization | Core foundation |
| Invitation | Controlled organization-join process | Tenant-owned; invitation process identity | target email, assigned fixed role, lifecycle, issued/accepted/expired/revoked timestamps | many Invitations to 1 Organization; optionally resolves to 1 User/Membership | Mutable lifecycle plus security audit; no uncontrolled simultaneous active invitation for same tenant/normalized email | Core foundation |
| Job | Hiring requisition and job-specific configuration root | Tenant-owned; Job identity | title, description, lifecycle, publication state, configuration references | 1 Job to many Applications, HiringTeamMembers; normally 1 active Pipeline and 1 active/default ApplicationForm | Current lifecycle/configuration plus audit; archive/close rather than destructive deletion | Core now |
| HiringTeamMember | Assigns an internal membership to a Job responsibility | Tenant-owned through Job; relationship identity | job responsibility, active assignment, timestamps | many HiringTeamMembers to 1 Job and 1 Membership | Current assignment; history may be Activity/Audit or assignment history if required; Membership must be same Organization | Core now |
| Pipeline | Workflow configuration for a Job | Tenant-owned; normally derived through Job, with scoped identity | name, lifecycle, configuration state | 1 Job to 1 active Pipeline (or explicitly versioned alternatives); 1 Pipeline to many PipelineStages | Current configuration; retire/deactivate referenced pipelines; historical stage meanings remain valid | Core now |
| PipelineStage | Ordered step in a Pipeline | Tenant-owned through Pipeline/Job; stable stage identity | name, semantic key, ordering/placement, active/retired state, terminal marker if approved | many Stages to 1 Pipeline; 1 Stage to many current placements and history rows | Current mutable label/order with retirement; history must retain stage identity and historical display meaning | Core now |
| PipelineStagePlacement | Current Application location in a PipelineStage | Tenant-owned through Application and Pipeline; one current placement per Application | current stage, entered time, concurrency/version marker | 1 Application to 0/1 current Placement; many Placements to 1 PipelineStage | Current state only; every change creates ApplicationStageHistory; stage must belong to Application’s Job pipeline | Core now |
| ApplicationForm | Stable logical form container for a Job | Tenant-owned through Job; form identity | name, job association, lifecycle, current published version reference | 1 Job to 0/many Forms; 1 Form to many Versions | Current container; published versions immutable; deletion is retire/archive only | Core now |
| ApplicationFormVersion | Immutable definition snapshot used for a publication/submission | Tenant-owned through Form/Job; Form + version identity | version number, publication state, published time, schema metadata | many Versions to 1 Form; 1 Version to many Questions and Applications | Immutable after publication; uniqueness of version within Form; each submitted Application points to exactly one version | Core now |
| ApplicationFormQuestion | Question definition within one form version | Tenant-owned through Version/Job; Version + question identity | stable question key, prompt, question kind, required flag, validation/presentation rules, order | many Questions to 1 Version; 1 Question to many Answers | Immutable when its version is published; no repeating question arrays; question key/order rules remain to be finalized | Core now |
| Application | Independent job-specific candidacy | Tenant-owned; Application identity; root context Candidate + Job | status, source, submitted time, current placement, selected form version, idempotency/deduplication reference | many Applications to 1 Candidate and 1 Job; 1 Application to answers, stage history, interviews, scorecards through interviews, offers and outcomes | Current lifecycle/stage plus immutable histories; repeat applications allowed; no permanent Candidate + Job unique rule | Core now |
| ApplicationAnswer | Submitted answer to one form question | Tenant-owned through Application; answer identity within Application + Question | answer value, submission/edit state, timestamps, optional redaction/anonymization state | many Answers to 1 Application and 1 Question | Submitted answer is tied to ApplicationFormVersion through Application and Question; value shape must match question definition; edits require explicit policy | Core now |
| Candidate | Reusable organization-scoped candidate profile | Tenant-owned; Candidate identity is contextual to Organization | normalized profile/PII, lifecycle, anonymization state, source metadata | 1 Candidate to many Applications, Documents, Notes, Communications and Pool memberships | Current profile plus merge/anonymization history; same person may have distinct records in different Organizations; email is not identity | Core now |
| CandidateDocument | Candidate-related file metadata and association | Tenant-owned through Candidate; document identity | category, filename/display metadata, storage reference placeholder, scan/access/lifecycle status | many Documents to 1 Candidate; optional association to Application or Offer | Current metadata plus file/access/deletion history; bytes remain outside database; private authorization required | Core now |
| Resume | Logical resume/document classification | Tenant-owned through CandidateDocument/Candidate; Resume identity or document subtype | resume-specific version/source metadata | many Resumes/Documents to 1 Candidate; optional reference from Application | Preserve original source and superseded versions; do not duplicate file bytes in relational model | Core now |
| Interview | Scheduled/conducted event for an Application | Tenant-owned through Application/Job; Interview identity | type, start/end/timezone, location/link reference, lifecycle, cancellation/reschedule state | many Interviews to 1 Application; 1 Interview to many Participants and Scorecards | Current event state plus reschedule/cancel/activity/audit history; Application context cannot change across tenants | Core later phase |
| InterviewParticipant | Assigns an interviewer to an Interview | Tenant-owned through Interview; relationship identity | internal Membership/User reference, participant role, response/status timestamps | many Participants to 1 Interview and 1 Membership initially | Current assignment plus response history; membership must be active and same organization; future external participant adapter remains possible | Core later phase |
| ScorecardTemplate | Reusable evaluation template container | Tenant-owned; template identity; scope may be org/job according to later decision | name, scope, lifecycle, current version reference | 1 Template to many Versions; optional association to Job/Interview type | Current container; retire rather than mutate published definition in place | Core later phase |
| ScorecardTemplateVersion | Immutable evaluation definition | Tenant-owned through Template; Template + version identity | version number, published time, lifecycle | many Versions to 1 Template; 1 Version to many Criteria and Scorecards | Immutable after use; version uniqueness within Template; completed Scorecard retains exact version | Core later phase |
| ScorecardCriterion | One criterion/question in a template version | Tenant-owned through Version; Version + criterion identity | key, prompt, response kind, required flag, order, scale/validation | many Criteria to 1 Version; 1 Criterion to many Responses | Immutable with published Version; no criteria arrays hidden in JSON | Core later phase |
| Scorecard | One evaluation assigned to an interviewer for an Interview | Tenant-owned through Interview/Application; Scorecard identity | evaluator Membership, template version, lifecycle Draft/Submitted, submitted time, visibility policy reference | many Scorecards to 1 Interview, 1 evaluator Membership, 1 TemplateVersion; 1 Scorecard to many Responses | Draft mutable; Submitted normally locked; evaluator must be an assigned internal participant; does not itself hire/reject | Core later phase |
| ScorecardResponse | Response to one criterion in one Scorecard | Tenant-owned through Scorecard; Scorecard + Criterion identity | rating/value, comment, timestamps | many Responses to 1 Scorecard and 1 Criterion | Current draft/submitted response with submission lock/history as policy requires; criterion/version contexts must align | Core later phase |
| Note | Internal recruiting note associated with a permitted resource | Tenant-owned; Note identity | body, author Membership, visibility, timestamps, archived state | many Notes to Candidate, Application, Job, Interview, or other approved parent (one explicit parent per Note) | Mutable/archivable; untrusted content; resource authorization required; avoid polymorphic physical FK without a later integrity design | Later collaboration phase |
| Comment | Collaboration comment/thread entry if repository requirements confirm it | Tenant-owned; Comment identity | body, author, thread/parent reference, timestamps, moderation/edit state | many Comments to an approved collaboration parent | Mutable with edit history if enabled; separate from Notes if threaded collaboration is required; otherwise defer | Deferred pending product confirmation |
| Communication | Durable message/email intent and delivery record | Tenant-owned; Communication identity | channel, direction, sender/recipient context, template reference if used, lifecycle/delivery status, provider reference | many Communications to Candidate/Application/Job as permitted; recipients represented separately | Current delivery state plus attempts/events; idempotent send intent; provider is not authority | Later communication phase |
| CommunicationRecipient | Recipient association for a Communication | Tenant-owned through Communication; relationship identity | recipient address or User/Candidate reference, role, delivery status | many Recipients to 1 Communication | Required when multiple recipients or delivery state per recipient exists; no recipient arrays as authoritative storage | Later communication phase |
| CommunicationTemplate | Reusable organization-owned message template if confirmed | Tenant-owned; template identity | name, channel, content definition, lifecycle/version reference | 1 Template to many Communications or immutable versions | Versioning needed if sent content must be reproduced; defer if message templates are not in current product slice | Deferred/later phase |
| Offer | Proposal of employment terms for an Application | Tenant-owned through Application; Offer identity | lifecycle draft/issued/accepted/declined/withdrawn, terms reference, issued/decision timestamps, version reference | many Offers to 1 Application (exact count policy open); optional Candidate/Job derived through Application | Current lifecycle plus offer versions/status history; confidential access; never equates to Hire | Later offers phase |
| OfferVersion | Historical terms snapshot for an Offer | Tenant-owned through Offer/Application; Offer + version identity | terms snapshot/reference, version number, created time | many Versions to 1 Offer | Immutable once issued; exact terms representation and document relationship are open | Later offers phase |
| ApplicationOutcomeEvent | Append-oriented hiring/rejection/other terminal outcome event | Tenant-owned through Application; event identity | outcome type (initially hired or rejected), actor Membership, reason/reference, effective time | many OutcomeEvents to 1 Application; at most one current terminal outcome under approved policy | Immutable/auditable; outcome does not create a standalone Hire; duplicate/replay-safe transition required | Later offers/outcomes phase |
| TalentPool | Named organization-owned candidate collection | Tenant-owned; Pool identity | name, description, lifecycle, created/updated by Membership | 1 Organization to many Pools; many-to-many Candidate through TalentPoolMember | Current named collection; archive/deactivate; names may be unique within Organization if approved | Later talent-pool phase |
| TalentPoolMember | Candidate membership in a TalentPool | Tenant-owned through Pool and Candidate; Pool + Candidate relationship identity | added by, added time, membership state, optional removal time | many Members to 1 TalentPool and 1 Candidate | Candidate and Pool must share Organization; duplicate active membership prohibited; history may be retained on removal | Later talent-pool phase |
| Activity | User-visible recruiting timeline/business event | Tenant-owned; Activity identity | event type, actor Membership, subject/resource reference, summary, occurred time | many Activities to Organization and optional Candidate/Application/Job/Interview/Offer subject | Append-oriented; distinct from AuditLog; minimize PII and preserve tenant scope | Core platform/later phase |
| AuditLog | Protected security/administrative trace | Tenant-owned for tenant actions, with global security events possible; event identity | actor/user, membership context, action, resource type/id, outcome, correlation, occurred time, redacted metadata | many AuditLogs to Organization where applicable; may reference any protected resource | Append-oriented, restricted, tamper-resistant operational treatment; never substitute for Activity | Core platform/later phase |
| Integration | Organization’s connection/configuration to an external provider | Tenant-owned; Integration identity | provider kind, lifecycle, connection status, secret reference, scopes, last sync/error | 1 Organization to many Integrations; provider references attach to integration | Current connection state; credentials are secret-managed and not ordinary attributes | Later integration phase |
| ExternalReference | Provider-specific identity for a HiringLoop resource | Tenant-owned through Integration and referenced resource; reference identity | provider object type/id, integration, sync state, last seen, idempotency/reconciliation fields | many ExternalReferences to 1 Integration and one approved core resource | Provider-scoped uniqueness; provider response never overrides authoritative core state without policy | Later integration phase |
| IntegrationEvent / IdempotencyRecord | Replay-safe provider callback or outbound operation record | Tenant-owned through Integration where applicable; event identity | provider, operation/event key, request/correlation, status, received/processed time, error | many records to 1 Integration and optional resource | Unique within provider/integration scope; append/process state supports safe retry and reconciliation | Later integration/reliability phase |

### Explicitly excluded from this logical model

There is no configurable Role, Permission, RolePermission, or MembershipRole junction model in the current scope because approved roles are fixed and membership-scoped. There is no standalone Hire entity. There are no AI entities, resume-extraction entities, embeddings, analytics facts, notification tables, calendar-token tables, or object-storage byte tables in this first logical model; those are later decisions unless a feature phase establishes a concrete requirement.

## Relationship and Cardinality Map

```text
Organization 1 ---- * Membership * ---- 1 User
Organization 1 ---- * Invitation
Organization 1 ---- * Job
Organization 1 ---- * Candidate

Job 1 ---- * HiringTeamMember * ---- 1 Membership
Job 1 ---- 0..* ApplicationForm
ApplicationForm 1 ---- * ApplicationFormVersion
ApplicationFormVersion 1 ---- * ApplicationFormQuestion
ApplicationFormVersion 1 ---- * Application
ApplicationFormQuestion 1 ---- * ApplicationAnswer

Job 1 ---- 1 active Pipeline
Pipeline 1 ---- * PipelineStage
Application 1 ---- 0..1 current PipelineStagePlacement
Application 1 ---- * ApplicationStageHistory
PipelineStage 1 ---- * ApplicationStageHistory

Candidate 1 ---- * Application * ---- 1 Job
Candidate 1 ---- * CandidateDocument
CandidateDocument 0..1 ---- 0..1 Resume classification

Application 1 ---- * Interview
Interview 1 ---- * InterviewParticipant * ---- 1 Membership
Interview 1 ---- * Scorecard
ScorecardTemplate 1 ---- * ScorecardTemplateVersion
ScorecardTemplateVersion 1 ---- * ScorecardCriterion
Scorecard 1 ---- * ScorecardResponse * ---- 1 ScorecardCriterion

Application 1 ---- * Offer
Offer 1 ---- * OfferVersion
Application 1 ---- * ApplicationOutcomeEvent

Organization 1 ---- * TalentPool
TalentPool 1 ---- * TalentPoolMember * ---- 1 Candidate

Candidate/Application/Job/Interview 1 ---- * Activity (approved subject)
Organization 1 ---- * AuditLog
Organization 1 ---- * Integration
Integration 1 ---- * ExternalReference
Integration 1 ---- * IntegrationEvent / IdempotencyRecord
```

### Relationship rules

| Relationship | Cardinality | Required? | Integrity rule |
|---|---:|---:|---|
| Organization–Membership–User | Organization 1 to many Memberships; User 1 to many Memberships | Membership requires both | Membership’s Organization and User are explicit; one active membership per User/Organization; role is one approved fixed value |
| Organization–Job | 1 to many | Job requires one | Job is directly tenant-owned and cannot be accessed through an unrelated organization |
| Job–Pipeline | 1 to 1 active pipeline initially | Pipeline requires one Job | Application’s stage and all PipelineStages must resolve to the same Job/Organization context |
| Pipeline–PipelineStage | 1 to many | Stage requires one | Stage is never shared across pipelines; referenced stages are retired/deactivated, not destructively removed |
| Job–ApplicationForm–Version | Job 1 to many Forms; Form 1 to many Versions | Submitted Application requires one published Version | Application, version, form, and Job must align; published version cannot be edited in place |
| Candidate–Application–Job | Candidate 1 to many Applications; Job 1 to many Applications | Application requires one of each | Candidate and Job must share Organization; repeat applications are allowed |
| Application–Question–Answer | Application 1 to many Answers; Question 1 to many Answers | Answer requires one Application and one question definition | Application’s selected form version must equal Answer’s question version; one answer per Application/Question unless question semantics explicitly support repeatable answers via a separate child model |
| Application–StageHistory | Application 1 to many history rows | Every movement should create a row | Previous/new stages must belong to the Application’s pipeline; actor membership must be same tenant |
| Application–Interview | Application 1 to many Interviews | Interview requires one | Interview cannot point directly to a Candidate/Job from another tenant; those contexts are derived or cross-checked from Application |
| Interview–Participant–Membership | Interview 1 to many Participants; Membership 1 to many | Participant requires one of each initially | Membership is active, authorized, and same Organization; submitted feedback access follows assignment/policy |
| Interview–Scorecard–Evaluator | Interview 1 to many Scorecards; Membership 1 to many | Scorecard requires one evaluator | Evaluator is a permitted InterviewParticipant; no peer feedback exposure before own submission absent elevated policy |
| Template–Version–Criterion | 1 to many at each level | Used template/version requires one | Version and criteria are immutable once published/used; completed Scorecard stores exact Version |
| Application–Offer | Application 1 to many Offers initially | Offer requires one | Offer context is derived from Application; offer acceptance is not Hire |
| Application–OutcomeEvent | Application 1 to many events | Event requires one | Events are append-only; transition policy determines whether one current terminal outcome is allowed |
| TalentPool–Member–Candidate | Pool 1 to many Members; Candidate 1 to many Members | Member requires both | Pool and Candidate must share Organization; no duplicate active pair |
| Organization–Activity/AuditLog | Organization 1 to many | Tenant event requires one | Activity is user-facing business history; AuditLog is protected security/admin history; they are not interchangeable |
| Integration–ExternalReference | Integration 1 to many | ExternalReference requires one | Provider identifier uniqueness is scoped to Integration/provider and resource type; provider state is fallible |

## Tenant Ownership Matrix

The recommendation is to keep direct tenant ownership on root or high-risk query entities and derive ownership through a parent where that is sufficient and integrity can be enforced. Direct ownership is not a substitute for validating parent relationships.

| Entity | Scope | Direct organizationId? | Reason |
|---|---|---:|---|
| User | Global | No | A User can belong to many Organizations; tenant context comes from Membership. |
| Organization | Global tenant root | Self | It is the tenant root. |
| Membership | Organization-owned relationship | Yes | Makes membership lookup/scoping explicit and protects role context. |
| Invitation | Organization-owned | Yes | Safe tenant/email lifecycle and active-invitation uniqueness are simpler. |
| Job | Tenant-owned root | Yes | Frequent scoped lookup and composite relationship checks. |
| HiringTeamMember | Job child | Prefer yes | High-value authorization join; direct tenant key simplifies same-tenant Membership/Job checks. |
| Pipeline | Job child | Prefer yes | Pipeline is frequently queried with stage/application data; direct key helps scoping and constraints. |
| PipelineStage | Pipeline child | Prefer yes | Referenced by current placement/history; direct key materially reduces cross-tenant stage risk. |
| PipelineStagePlacement | Application/stage current state | Yes | Current workflow records are security-sensitive and frequently scoped. |
| ApplicationForm | Job child | Prefer yes | Public form reads and version submission need safe tenant scoping; still validate Job. |
| ApplicationFormVersion | Form child | Prefer yes | Published definitions are read independently and must be safely scoped. |
| ApplicationFormQuestion | Version child | Prefer yes | Answer validation and public form reads benefit from direct scope; validate Version/Form/Job. |
| Application | Tenant-owned root | Yes | Central security/query boundary; Candidate and Job same-tenant invariant must be checked. |
| ApplicationAnswer | Application child | Prefer yes | Sensitive candidate-submitted data and form-version checks benefit from direct scope. |
| Candidate | Tenant-owned root | Yes | Candidate identity is tenant-contextual and must never be global. |
| CandidateDocument/Resume | Candidate child | Prefer yes | File authorization, signed access, and PII queries need safe direct scope. |
| Interview | Application child | Prefer yes | Scheduling and participant authorization are high-risk; direct scope simplifies filtering. |
| InterviewParticipant | Interview child | Prefer yes | Same-tenant Membership validation and participant queries are security-sensitive. |
| ScorecardTemplate | Tenant-owned | Yes | Templates may be organization-wide or Job-scoped; direct scope supports both safely. |
| ScorecardTemplateVersion/Criterion | Template children | Prefer yes | Historical feedback reads must remain tenant-scoped even when joined selectively. |
| Scorecard | Interview child | Yes | Private feedback is high-risk and frequently queried by tenant/evaluator. |
| ScorecardResponse | Scorecard child | Prefer yes | Sensitive feedback and criterion alignment benefit from direct scope. |
| Note/Comment | Tenant-owned collaboration | Yes | Resource authorization and search must never infer scope only from a polymorphic parent. |
| Communication/Recipient | Tenant-owned | Yes | Delivery retries, recipient validation, and provider callbacks require safe scope. |
| Offer/OfferVersion | Application child | Prefer yes | Confidential terms and status actions need direct tenant scoping; validate Application. |
| ApplicationOutcomeEvent | Application child | Yes | Hiring/rejection decisions are security/audit-sensitive. |
| TalentPool | Tenant-owned root | Yes | Named organization collection and tenant-scoped uniqueness. |
| TalentPoolMember | Pool/Candidate junction | Yes | Composite same-tenant checks and active-pair uniqueness. |
| Activity | Tenant-owned timeline | Yes | User-visible queries must be safely scoped. |
| AuditLog | Tenant-owned or global security event | Yes when tenant action | Protected audit queries and retention/access policy need explicit scope. |
| Integration | Organization-owned | Yes | Connection and secret references must never cross tenants. |
| ExternalReference/IntegrationEvent | Integration child | Prefer yes | Provider callbacks/retries require tenant scope without trusting provider identifiers. |

Direct organization ownership is most justified for Application, Candidate, Job, Interview, Scorecard, Offer, Activity, AuditLog, Invitation, and all records containing sensitive PII/feedback/terms or independently queried provider work. Child records can remain derivable only when they are never independently resolved or authorized, but the recommended direct keys above reduce IDOR and cross-tenant join risk. Any duplicated tenant key must be maintained transactionally and checked against the parent; it must not become an independently mutable authority.

## Same-Tenant Integrity Rules

These are security invariants, not merely convenience validations:

1. A Membership belongs to exactly one Organization and User; a User has no tenant access without an active Membership.
2. HiringTeamMember.Job, HiringTeamMember.Membership, and their Organization must agree.
3. Job, Pipeline, PipelineStage, ApplicationForm, and their versions/questions must resolve to the same Organization and intended Job lineage.
4. Application.Organization, Application.Candidate.Organization, and Application.Job.Organization must be equal.
5. Application’s current stage and every ApplicationStageHistory old/new stage must belong to the Pipeline configured for that Application’s Job.
6. ApplicationFormVersion used by an Application must belong to the Application’s Job form; every ApplicationAnswer’s question must belong to that exact version.
7. Interview.Application, InterviewParticipant.Membership, and Scorecard evaluator must share Organization; evaluator must be an authorized participant for that Interview.
8. Scorecard, ScorecardResponse, ScorecardTemplateVersion, and ScorecardCriterion must share the same tenant and template-version lineage.
9. CandidateDocument/Resume, Note, Communication, Offer, and ApplicationOutcomeEvent must not be attached to a parent in another Organization.
10. TalentPool and Candidate in TalentPoolMember must share Organization; active membership is unique per Pool/Candidate pair.
11. Activity and AuditLog tenant context must be explicit for tenant actions. A user’s global identity is not sufficient authorization.
12. Integration, ExternalReference, and IntegrationEvent must resolve through the same Organization; provider IDs cannot be used as cross-tenant lookup keys.
13. Resource-level authorization is required after tenant scoping for jobs, candidates, applications, private documents, interviews, feedback, offers, notes, and audit records.

The physical design should prefer composite foreign-key/check patterns or transactionally enforced service boundaries that make these mismatches difficult to represent. Exact PostgreSQL enforcement is a remaining physical-design decision.

## Current State vs History Map

| Entity or pair | Current state or history | Mutability expectation |
|---|---|---|
| Organization / Organization lifecycle history | Current organization state / audit or lifecycle events | Current state changes through authorized workflow; history append-oriented |
| Membership / Membership history | Current status and fixed role / membership and role changes | Current mutable; changes auditable; removed memberships retained as needed |
| Invitation / invitation audit | Current lifecycle / security events | Lifecycle transitions guarded; terminal states retained |
| Job / Activity + AuditLog | Current job configuration/lifecycle / business and security history | Current mutable; close/archive preferred over delete |
| Pipeline + PipelineStage / ApplicationStageHistory | Current configuration and active/retired definitions / immutable movement history | Stage labels/order may be controlled; referenced identities and history preserved |
| ApplicationForm + ApplicationFormVersion + Question | Current form pointer / immutable published version/question definition | Draft may change; published/used versions immutable |
| Application + PipelineStagePlacement | Current status and location / ApplicationStageHistory | Current mutable by guarded transition; movement history append-only |
| ApplicationAnswer | Current submitted answer / optional answer revision or edit audit | Submitted values should be stable unless an explicit correction policy exists |
| Candidate / merge-anonymization history | Current normalized profile / controlled history | PII changes authorized and audited; anonymization is a workflow, not ordinary delete |
| CandidateDocument/Resume / access and deletion history | Current metadata/status / file-access, scan, supersession, deletion events | Metadata lifecycle mutable; original source meaning preserved |
| Interview / reschedule/cancel history | Current schedule/lifecycle / event history | Current schedule mutable; material changes auditable |
| InterviewParticipant / participant response history | Current assignment/status / response changes | Assignment mutable until policy cutoff; membership context preserved |
| ScorecardTemplate + Version + Criterion | Current template pointer / immutable version/criterion definitions | Draft mutable; published/used versions immutable |
| Scorecard + Response | Draft/submitted current evaluation / submission/edit audit | Draft mutable; Submitted normally locked; elevated correction must be explicit/audited |
| Offer + OfferVersion | Current offer lifecycle / immutable terms/status history | Draft may change; issued terms/version preserved; no implicit hire |
| ApplicationOutcomeEvent | Current application outcome projection if needed / append-only decisions | Immutable event; replay-safe and audited |
| TalentPool + TalentPoolMember | Current collection/membership / optional membership removal history | Archive/deactivate; active pair cannot duplicate |
| Communication + delivery attempts | Current delivery status / attempt/provider event history | Delivery status reconciled; intent and provider responses retained as needed |
| Activity | Timeline event | Append-oriented; not a mutable source of truth |
| AuditLog | Security/administrative event | Append-only/protected; separate access and retention policy |
| Integration + ExternalReference/Event | Current connection/sync state / provider event and reconciliation history | Current status mutable; provider events retained for idempotency/debugging |

## Preliminary Constraint Matrix

These are logical constraints for review, not final database declarations.

| Entity/relationship | Preliminary uniqueness or business constraint | Implementation note/open point |
|---|---|---|
| Membership | One active Membership per User + Organization | Historical removed memberships may remain; role values fixed to four approved roles |
| Invitation | At most one uncontrolled active invitation per Organization + normalized target email | Define whether pending only or pending + unexpired count as active; token/auth storage deferred |
| Job | Organization-scoped identifier; any human-readable key unique only if product requires | Do not use title as identity |
| PipelineStage | Stable identity within Pipeline; ordering unique within a pipeline at a point in time | Reordering concurrency and placement representation remain physical decisions |
| FormVersion | Version number unique within ApplicationForm | Published version immutable |
| FormQuestion | Question key unique within FormVersion; order unique within version if ordered UI is required | Repeatable questions require a separate answer-item model or explicit controlled representation |
| Application | No permanent Candidate + Job uniqueness | Require independent Application identity; accidental duplicate policy needs scoped idempotency/replay key and/or duplicate-review signal |
| Application submission idempotency | Submission key unique within its intended tenant/form/job/request scope for a bounded period | Exact key source, retention, and retry semantics remain open; do not make it a lifetime application uniqueness rule |
| ApplicationAnswer | One authoritative answer per Application + Question for non-repeatable questions | Repeatable question semantics are an open product decision |
| ApplicationStageHistory | No duplicate transition from one identical command/idempotency key | Preserve actor, prior/new stage, reason, and time; concurrency guard required |
| Candidate email | Optional normalized tenant-scoped deduplication signal, not Candidate identity | Exact case/normalization, null behavior, shared-email behavior, merge policy, and confidence threshold remain open |
| TalentPoolMember | One active Pool + Candidate membership | Removal/re-add behavior should preserve history without duplicate active rows |
| TemplateVersion | Version number unique within template | Completed Scorecard must reference immutable version |
| ScorecardCriterion | Criterion key/order unique within version as appropriate | Criterion type/scale validation must remain aligned with response |
| Scorecard | At most one active Scorecard per Interview + evaluator + template assignment, unless reassignment/version policy explicitly allows more | Draft/Submitted transition and correction policy required |
| ScorecardResponse | One response per Scorecard + Criterion | Submitted response normally locked; peer visibility is policy, not uniqueness |
| OfferVersion | Version number unique within Offer | Exact number of concurrent offers per Application remains open |
| ApplicationOutcomeEvent | Idempotent outcome command/event key; terminal outcome policy needed | Multiple historical outcome events may exist only under explicit correction/reopen rules |
| Provider references | Provider + integration + provider object type + provider object ID unique | Never globally unique on provider ID; account/integration scope matters |
| Provider events | Provider/integration + provider event ID or operation key unique | Must support webhook replay and stale-event handling |

### Candidate composite uniqueness analysis

The candidate’s primary logical identity is `(Organization, Candidate identity)`, where Candidate identity is an internal stable identifier, not email. A physical design should not use a global email unique constraint and should not assume that `(Organization, normalizedEmail)` is always safe: shared inboxes, changed addresses, missing addresses, aliases, and multiple legitimate people can exist. A tenant-scoped normalized-email lookup may support warnings, candidate search, or a separately approved active-identity constraint, but automatic merge or rejection requires product policy and a controlled override/audit path.

The Application composite `(Organization, Candidate, Job)` is intentionally non-unique. If a later policy limits simultaneous active candidacies, that should be represented as a partial/current-state business rule or service workflow, not a permanent prohibition on historical and legitimate reapplications.

## Referential-Integrity and Deletion Behavior Questions

- Which operational records may be archived versus anonymized, and which references must remain resolvable after anonymization?
- Should a Candidate merge preserve a redirect/alias record, and what happens to Applications, Documents, Offers, TalentPoolMember rows, and audit subjects?
- Are parent resources ever hard-deleted in non-production environments, and should child deletion be restricted everywhere outside test fixtures?
- What is the exact Application duplicate/replay window and how should a user intentionally reapply after a prior submission?
- Can a Job have multiple active pipelines/forms, or only one active configuration at a time?
- Can an Application move backward, reopen after rejection, or change Job/Pipeline after creation?
- What is the policy for correcting submitted answers or submitted scorecards, and who can perform an elevated correction?
- Which references remain valid after Membership removal, User deactivation, or Organization closure?
- What file version, malware-scan, access-log, and orphan-cleanup records must survive object-byte deletion?
- What offer version/count and outcome correction rules are required?

Default recommendation: use restrictive parent deletion for records that carry history, and implement archive/deactivate/anonymize workflows. Any hard delete must be an explicit, reviewed exception with reference handling and audit implications.

## Normalization Review

### First normal form (1NF)

The model has scalar attributes and child relations for repeating data. Interview participants, application answers, scorecard responses, talent-pool membership, communication recipients, and hiring-team assignments are rows in relationships, not arrays in a parent record. Ordered questions, stages, and criteria are separate child entities with an explicit logical placement/order concept.

### Second normal form (2NF)

Junction entities carry attributes about the relationship itself: HiringTeamMember carries job responsibility, InterviewParticipant carries participation status, and TalentPoolMember carries membership state. Answer/response rows depend on the whole logical parent-plus-question/criterion relationship, not on an incidental subset. A future physical composite key review must confirm that no non-key attribute is stored on a junction when it belongs to User, Candidate, Job, or the related definition.

### Third normal form (3NF)

Candidate profile data is not repeated on each Application; Job data is not repeated on each Application; form/question and template/criterion definitions are not copied into every answer except as immutable version references/snapshots where historical interpretation requires them. Organization ownership is deliberately duplicated only where it improves isolation and composite checks; it is a consistency attribute, not a second business parent.

### Derived fields and duplication

- Current Application stage is a read-optimized current-state representation; ApplicationStageHistory is the authoritative movement history. The two must change in one transaction or through a controlled projection rule.
- Current form/template version pointers are convenience/current-state fields; published versions remain the historical definitions.
- Candidate and Job references on Application are facts, not derived display copies. Interview’s Candidate/Job context should normally be derived from Application, with direct tenant scoping only when justified.
- Counts, search indexes, reporting metrics, delivery summaries, and “latest” projections are derived and must not become authoritative without reconciliation rules.
- Duplicated organization ownership is acceptable only with same-tenant enforcement and no independent mutation path.

### JSON and future physical representation

JSON must not be used to avoid modeling questions, answers, criteria, recipients, stage history, memberships, or provider references. A bounded JSON value may eventually be justified for a question’s presentation/validation configuration, a versioned offer-terms snapshot, or provider-specific metadata that is not queried relationally and is treated as untrusted/opaque. If used, it must have an owning entity, validation contract, size/privacy rules, and a clear statement of which fields are not relationally constrained. It cannot replace tenant keys, lifecycle state, foreign-key relationships, or idempotency identity.

## Deferred Entities / Deferred Physical Decisions

### Deferred or later-feature entities

- ExternalInterviewer/ExternalParticipant identity: deferred; initial participation is internal Membership/User only.
- Availability windows: deferred until scheduling requirements confirm that they need durable relational records distinct from Interview.
- Notification and user-preference records: deferred to the notification feature phase; not invented for this model.
- Analytics/reporting facts or materialized projections: deferred; analytics is non-authoritative.
- Candidate merge alias, consent, retention-case, and anonymization-job entities: likely workflow candidates, but require approved privacy/product behavior before inclusion.
- Calendar-specific token/sync tables: deferred behind Integration and ExternalReference boundaries.
- AI extraction, parsing, embeddings, evaluation, and recommendation entities: explicitly out of scope and untouched.

### Deferred physical decisions

- PostgreSQL key strategy, UUID/opaque identifier format, generated timestamps, and exact field types.
- Prisma model names, relation names, migration ordering, and cascade/restrict behavior.
- Exact composite foreign keys or trigger/service enforcement for repeated `organizationId` values.
- Partial/expression uniqueness for active invitations, active membership, active pool membership, and any future active-candidacy rule.
- Idempotency-key storage, expiry/retention, hashing, and public submission replay behavior.
- Optimistic concurrency/version columns for pipeline movement, form publication, scorecard submission, offers, and integrations.
- Indexes, pagination cursors, full-text/search structures, partitioning, and reporting projections; these require real query patterns and measurements.
- Encryption/tokenization strategy for sensitive PII, offer terms, document references, and provider secret handles.
- Exact audit immutability/tamper-resistance, access roles, retention, export, and redaction implementation.
- Test-database, migration up/down, seed, backup/restore, and deployment credential conventions.

## Remaining Open Questions Before Physical Schema

1. Approve the public duplicate/replay policy, including the bounded idempotency scope and intentional reapplication behavior.
2. Decide whether a Job may have multiple active forms/pipelines or exactly one active configuration.
3. Approve candidate email normalization/deduplication behavior, including shared emails, nulls, aliases, merges, and overrides.
4. Define Application lifecycle transitions, reopen/withdraw rules, and whether a terminal outcome can be corrected or superseded.
5. Define submitted-answer correction/versioning behavior and whether repeatable form questions are supported.
6. Define scorecard assignment cardinality, correction authority, post-submission lock rules, and the elevated peer-feedback policy.
7. Decide organization-wide versus Job-scoped ScorecardTemplate usage and exact template assignment rules.
8. Confirm Note versus Comment requirements and the allowed parent-resource set before choosing a physical association pattern.
9. Approve offer version/count, confidential visibility, and accepted-offer versus hired-outcome behavior.
10. Define candidate merge, anonymization, document deletion, and audit-reference behavior without inventing legal retention periods.
11. Confirm direct `organizationId` duplication for the high-risk child entities and the physical enforcement mechanism for parent/key agreement.
12. Define initial provider integrations, provider identity scope, callback idempotency, and reconciliation authority.

Until these questions are resolved, Phase 02 can proceed with review and physical-model preparation but should not create Prisma models or migrations.

---

# Schema-Blocking Rules — Resolution Addendum

## Resolution status

This addendum resolves the minimum logical rules needed to begin a physical PostgreSQL design. It does not silently convert unresolved product behavior into database behavior. A status of **APPROVED — baseline direction** means it follows the approved directions and repository architecture. A status of **OPEN — explicit product input required** means the physical design may reserve a shape, but must not encode the business policy until that input is supplied.

The repository has no local PRD that adds more specific behavior. The roadmap confirms that several of these features are implemented in later phases, so the initial rules below favor durable history, safe tenant isolation, replay safety, and the smallest useful model.

## Schema-Blocking Rules

| Rule | Decision | Database consequence | Status |
|---|---|---|---|
| Legitimate reapplications | A Candidate may have multiple Applications for the same Job over time | Application has independent identity; no lifetime Candidate + Job unique constraint | APPROVED — baseline direction |
| Public double-click/retry | The same intentional submission must resolve to one effect | Persist a bounded, scoped application-submission idempotency/deduplication record that points to the resulting Application; key uniqueness is not Application uniqueness | APPROVED — baseline direction |
| Import/manual creation | Imported or manually-created Applications are not forced through a public-form key | Source is part of Application context; only a supplied deterministic import/request key participates in replay protection | APPROVED — baseline direction |
| Job/pipeline | A Job may be in Draft with no Pipeline; it has at most one active Pipeline configuration at a time; retired configurations may remain for history | No PipelineStagePlacement entity; Application is tied to the Pipeline configuration used for its stage history | APPROVED — baseline direction |
| Pipeline history | No separate PipelineVersion is required initially | Retain retired Pipeline and PipelineStage identities; do not delete used stages; stage history stores the transition context needed for historical display | APPROVED — baseline direction |
| Application form | A Draft Job may have no form; a public/submittable Job requires exactly one active logical form | One ApplicationForm per Job in the initial model, with many immutable versions and one current published version | APPROVED — baseline direction |
| Form version at submission | The submitted Application records the exact ApplicationFormVersion | Answers reference questions from that same version; published definitions are immutable | APPROVED — baseline direction |
| Candidate email | Email is optional and non-identity | Store an optional normalized email signal; do not enforce Organization + normalizedEmail uniqueness | APPROVED — baseline direction |
| Application lifecycle | Application business state is Active, Rejected, Withdrawn, Hired, or Archived; pipeline stages are separate | Current lifecycle is a projection/guarded state; outcome events retain decisions | APPROVED — baseline direction |
| Reopen | Rejected and Withdrawn are not silently reopened; an authorized explicit reopen may return the Application to Active and records an event | Transition history and outcome/event audit are required; exact reopen permissions remain policy | APPROVED — baseline direction; exact authority OPEN |
| Hired | Hired is a terminal business outcome unless a separately approved correction/reversal workflow exists | ApplicationOutcomeEvent is append-oriented; no standalone Hire entity | APPROVED — baseline direction |
| Submitted answers | Candidate-submitted answers are immutable in the initial product | No overwrite of the original value; later correction requires an amendment/history workflow | APPROVED — baseline direction |
| Scorecard ownership | A Scorecard belongs to one Interview and one assigned evaluator Membership | One active scorecard per Interview + evaluator assignment initially; completed scorecard retains exact template version | APPROVED — baseline direction |
| Submitted scorecards | Normal interviewer edits stop after Submitted | Initial product has no ordinary post-submit edits; elevated corrections must preserve the original | APPROVED — baseline direction; correction authority OPEN |
| Notes/comments | Keep Note as the current internal annotation concept; defer Comment until threaded collaboration is confirmed | Do not create both structures now; Note has explicit supported target and visibility | APPROVED — baseline direction |
| Offers | An Application may have historical Offer attempts, but no more than one currently active Offer | Offer remains separate from ApplicationOutcomeEvent; OfferVersion preserves issued terms | APPROVED — baseline direction |
| Accepted offer | Accepted is an Offer state, not an automatic Hired outcome | Hiring requires a separate authorized ApplicationOutcomeEvent | APPROVED — baseline direction |
| Anonymization | Candidate identity and historical relationships survive in anonymized form where business/audit integrity requires them | Redact PII-bearing values and sensitive payloads in a controlled transaction/workflow; preserve non-PII structure and audit evidence | APPROVED — baseline direction; exact field policy OPEN |
| Tenant relationships | Every protected relationship must validate tenant agreement, not merely individual foreign keys | Prefer composite same-tenant references for high-risk paths, plus repository authorization and transaction validation | APPROVED — baseline direction |

## 1. Application Integrity Rules

### Duplicate application submission strategy

The minimum safe logical flow is:

```text
submission attempt
  -> scoped idempotency/deduplication identity
  -> one resulting Application
  -> replay returns/reuses the same intended result
```

The deduplication identity is not the Candidate + Job relationship. It represents one client/request intent, such as a public-form submission key or a deterministic import operation key. It should be scoped at least by Organization and submission surface/source, and it should retain a status such as pending, completed, or failed/retryable as needed for safe recovery. The successful record points to the Application created by that intent.

The record is bounded by an approved replay window or cleanup policy; it must not permanently prevent a later legitimate reapplication. Exact key generation, expiry, storage protection, and response replay are API/application decisions and remain outside this document.

Public double-clicks, browser retries, gateway retries, and worker redelivery should reuse the same submission identity where the caller can provide one. If a request is retried without a usable identity, bounded duplicate detection may compare a carefully selected submission fingerprint and recent state, but this must produce a warning/review or a safe rejection according to a future product policy. It must not become an unreviewable lifetime Candidate + Job ban.

Source handling is explicit:

- Public form submissions require a submission identity for production-safe replay handling and, when accepted, reference the selected ApplicationFormVersion.
- Imports should use a deterministic import batch/row identity when replay safety is required. An import may intentionally create multiple Applications only when the import process explicitly says so.
- Manual recruiter creation may have no public idempotency key, but the create command still needs transaction/concurrency protection and an application source.

The relational model therefore needs an application-submission deduplication record or an equivalent bounded idempotency record. Its uniqueness is scoped to the submission identity, not to Candidate + Job. Whether the record is a domain table or a shared command-idempotency facility is a physical-design choice; the logical invariant is approved.

### Application stage and outcome are independent

Pipeline stage answers “where is the Application in the recruiting workflow?” Outcome answers “what business decision or exit has occurred?” An Application may be Active at any non-terminal stage, then receive a Rejected, Withdrawn, or Hired outcome. A later explicit reopen can restore Active state and move the Application to an approved stage; it must append history rather than erase the prior outcome.

`ApplicationStageHistory` is required. The former `PipelineStagePlacement` concept is removed: current stage can be a current-state reference on Application, while the history relation records every movement. `ApplicationStageHistory` should retain the prior stage, new stage, pipeline configuration context, actor, time, and transition reason/reference needed to interpret history.

## 2. Pipeline and Form Cardinality

### Job and Pipeline

The recommended cardinality is:

```text
Job 1 ---- 0..* Pipeline configurations
Job 1 ---- 0..1 active Pipeline
Pipeline 1 ---- * PipelineStage
Application * ---- 1 Pipeline configuration (for its workflow context)
```

A Draft Job may have no Pipeline. A Job that is made available for applications or internal stage movement must have exactly one active Pipeline. A Job may retain retired Pipeline configurations if configuration replacement is ever needed; there is no separate PipelineVersion entity initially. At most one configuration is active for a Job at a time. This allows historical Applications to remain tied to the configuration whose stages they used while the Job later adopts a replacement configuration.

PipelineStage has an explicit logical ordering attribute within its Pipeline. A current Application stage reference plus `ApplicationStageHistory` is sufficient. `PipelineStagePlacement` is **REMOVE FROM CURRENT LOGICAL MODEL** because it adds no independent fact: it would duplicate the Application’s current stage and would make it easier for the two current-state records to diverge. A placement-like projection may be introduced later only if measured query needs require it, and then it must remain a projection of Application plus stage history rather than a second authority.

Used Pipeline and PipelineStage identities are retained. A stage’s meaning must not be changed in a way that reinterprets historical transitions; rename/order changes require controlled rules, and retirement/deactivation is preferred. Whether a stage label snapshot is stored in history is a physical/history-detail decision, but historical display must not depend on a mutable current label alone.

**Decision:** zero-or-one active Pipeline for a Job, with optional retired configurations; ordered PipelineStage children; no PipelineStagePlacement; no PipelineVersion initially. **APPROVED — baseline direction.** Exact replacement/reopen workflow is **OPEN — explicit product input required**.

### ApplicationForm

The recommended cardinality is:

```text
Job 1 ---- 0..1 ApplicationForm
ApplicationForm 1 ---- * ApplicationFormVersion
ApplicationForm 1 ---- 0..1 current published Version
ApplicationFormVersion 1 ---- * ApplicationFormQuestion
Application * ---- 1 required Version for public-form submissions
```

The initial model has one logical ApplicationForm per Job. A Draft Job may temporarily have no form. Before a Job is publicly submittable, exactly one ApplicationForm must exist and exactly one version may be the current published version. Earlier versions remain immutable and may be retired/unpublished for new submissions without changing their historical meaning. There is no need for multiple active published versions for one Job in the initial scope.

An Application created through the public form must reference the exact published ApplicationFormVersion used. ApplicationAnswer rows reference questions under that exact version. Manual/import Applications may have no form version only if the source did not use a HiringLoop form; such Applications must not fabricate answers against an unrelated version. Whether manual/import sources require a captured external form snapshot remains **OPEN**.

**Decision:** one logical form per Job, zero while Job is Draft, one active published version when submittable, many immutable historical versions, and exact version reference on public-form Applications. **APPROVED — baseline direction.**

## 3. Candidate Identity Rules

Candidate has a stable identity within an Organization. Email is an optional attribute and deduplication signal, not an identity key.

| Case | Rule | Constraint implication |
|---|---|---|
| No email | Candidate may exist without email | Normalized email is nullable/absent; no uniqueness assumption |
| Case/format variation | Store a separately normalized comparison signal according to a later approved normalization contract | Normalization is deterministic and tenant-scoped; original display value may be retained separately if needed |
| Duplicate email in one Organization | Permit duplicate Candidate rows | No UNIQUE(Organization, normalizedEmail); surface a warning/review signal instead |
| Shared/family email | Do not merge or reject automatically | Email cannot prove person identity; preserve a controlled merge/override path for later |
| Import | Import may create a Candidate with no email or a duplicate signal | Import matching must be explicit, repeat-safe, and auditable; no global matching |
| Future merge | Merge is a controlled workflow, not a delete shortcut | Preserve an alias/redirect or merge history concept if approved later; Applications and audit references remain traceable |
| Cross-organization match | Never deduplicate globally | Separate Organizations retain separate Candidate identities even with equal email |

**Decision:** a database-level unique `(organizationId, normalizedEmail)` is **NOT SAFE** for the current product. Use an optional tenant-scoped normalized signal with non-unique lookup support, a warning/review workflow, and future controlled merge. **APPROVED — baseline direction.** Exact normalization and merge policy remain **OPEN**.

## 4. Application Lifecycle Rules

The minimal conceptual lifecycle is:

```text
Active <-> (explicit reopen only) Rejected
Active <-> (explicit reopen only) Withdrawn
Active -> Hired
Active/Rejected/Withdrawn/Hired -> Archived (administrative preservation)
```

`Active` covers an ongoing application regardless of its PipelineStage. `Rejected`, `Withdrawn`, and `Hired` are business outcomes; `Archived` is an administrative preservation state and does not erase the prior outcome. There is no separate “Screening”, “Interview”, or “Offer” Application status because those are represented by pipeline stage and related records.

- Rejected Applications do not reopen implicitly. An authorized explicit reopen may return the Application to Active, records the prior outcome, and requires a valid current stage.
- Withdrawn Applications follow the same explicit-reopen rule; ordinary edits do not reopen them.
- Hired is terminal for normal operations. Reversal/correction requires a separately authorized workflow and append-only history; it is not a normal status edit.
- ApplicationOutcomeEvent records the actor, outcome, reason/reference, effective time, and idempotency identity. Application’s current lifecycle/outcome is a current-state representation kept consistent with the event workflow.
- Accepted Offer does not create Hired automatically. Hiring requires a separate ApplicationOutcomeEvent after whatever product approval is later defined.

**Decision:** use the five conceptual states above, keep stage and outcome independent, and represent Hire as an Application outcome event. **APPROVED — baseline direction.** Exact reopen permissions, reasons, and correction/reversal behavior remain **OPEN**.

## 5. Application Answer Correction

The safest initial rule is that a submitted Candidate answer is immutable. Recruiters do not overwrite the original submitted value. This preserves what the Candidate actually submitted and keeps the answer interpretable through its immutable ApplicationFormVersion and Question.

If a correction is later approved, it should be an explicit amendment or revision that retains the original value, correcting actor, reason, time, and authorization evidence. It should not mutate the original row in place. The physical design may reserve an append-only answer-amendment relation, but the initial product does not need a correction workflow to proceed.

**Decision:** immutable submitted answers now; append-only amendment/history for a future authorized correction workflow. **APPROVED — baseline direction.** Whether recruiters can request or apply corrections is **OPEN**.

## 6. Scorecard Integrity

### Ownership and cardinality

The Scorecard is owned by an Interview context and assigned to one evaluator Membership. The evaluator must be an authorized internal InterviewParticipant for that Interview. The Application is reached through Interview and is not a second independent Scorecard owner.

```text
Interview 1 ---- * InterviewParticipant * ---- 1 Membership
Interview 1 ---- * Scorecard * ---- 1 evaluator Membership
Scorecard 1 ---- 1 ScorecardTemplateVersion
Scorecard 1 ---- * ScorecardResponse
```

Initial cardinality is one active Scorecard per `(Interview, evaluator Membership)` assignment. Reassignment, replacement, or a second evaluation by the same interviewer requires an explicit policy; it must not be created accidentally by retry. Independent interviewers receive independent Scorecards and cannot edit or overwrite each other’s records.

### Submission and correction

Scorecard is Draft until submitted. In Draft, the assigned evaluator may save responses. On Submitted, normal evaluator editing is blocked. The exact template version and criterion definitions remain fixed for the evaluation.

An elevated correction, if later approved, must either reopen through a guarded workflow or create a superseding/amendment record while preserving the original Submitted evaluation. It must record who corrected it, why, when, and under what elevated policy. No normal post-submission overwrite is part of the initial model.

Peer feedback visibility is an authorization rule: an interviewer should not see peer feedback before submitting their own Scorecard, unless an elevated policy permits it. The database must preserve evaluator identity and submission state so the repository can enforce that rule; a simple foreign key alone cannot enforce visibility.

**Decision:** Scorecard belongs to Interview + assigned evaluator Membership; one active assignment per interviewer/interview initially; Draft -> Submitted; immutable-on-submit with future audited correction path. **APPROVED — baseline direction.** Exact reassignment and elevated-correction policy remains **OPEN**.

## 7. Notes and Comments

Repository evidence establishes internal notes/comments as a later collaboration concept, but does not specify two distinct workflows, threading, mentions, or comment visibility. Keeping both as fully modeled entities now would be premature.

| Concept | Decision | Rationale |
|---|---|---|
| Note | KEEP | A durable internal annotation attached to an explicitly supported recruiting resource, authored by a Membership, with internal/resource visibility and archive/edit history as needed. |
| Comment | DEFER | Threading, replies, mentions, edit policy, and parent-resource scope are not confirmed. |
| CollaborationEntry | REMOVE | A generic polymorphic abstraction would hide authorization and foreign-key rules rather than clarify them. |

For the current model, Note should use an explicit supported target model rather than an unconstrained target type/id pair. Initial candidates are Candidate and Application, with Job/Interview added only when a feature requirement confirms them. Notes are internal and subject to resource-level authorization; they are not public Candidate answers and not security AuditLog records.

**Decision:** keep Note; defer Comment and any generic CollaborationEntry. **APPROVED — baseline simplification.** Exact Note target set, threading, visibility, and edit policy remain **OPEN**.

## 8. Offer Integrity

Offer remains separate from both Application lifecycle and ApplicationOutcomeEvent. An Application may have multiple historical Offer attempts, for example when an offer is declined, withdrawn, superseded, or reissued under a later approved workflow. The initial rule is no more than one currently active Offer for an Application.

Recommended logical states are Draft, Sent, Viewed, Accepted, Declined, Withdrawn, and Superseded. Viewed is a delivery/read state rather than a hiring outcome; if the product does not need it, it can be collapsed during physical review without changing the Offer boundary. Accepted is not Hired and is not automatically terminal for the Application.

OfferVersion is justified because issued terms must remain reproducible and historical changes must not rewrite what was sent. Draft terms may be edited before issue. Once Sent, an OfferVersion is immutable. A revised offer creates a new version or a new Offer attempt according to the approved reissue workflow; it must not overwrite an issued version. A superseded/withdrawn prior Offer remains queryable for audit and candidate-history purposes.

**Decision:** KEEP Offer and OfferVersion; allow historical offers; permit at most one active offer; make issued versions immutable; require a separate ApplicationOutcomeEvent for Hired. **APPROVED — baseline direction.** Exact definition of “active”, reissue versus new Offer, and whether Accepted can coexist with another offer are **OPEN**.

## 9. Anonymization Model

Anonymization is a controlled, authorized workflow, not ordinary deletion and not a claimed legal-retention policy. The logical model must preserve referential integrity and auditability while minimizing or removing PII and sensitive payloads.

| Record | Preserve after anonymization where required | Redact/remove or replace |
|---|---|---|
| Candidate | Stable internal anonymized identity, Organization relationship, non-PII lifecycle and merge/anonymization event | Name, email, phone, address, profile text, identifiers, and other direct/indirect PII replaced with null or approved neutral markers |
| Application | Application identity, Organization/Candidate/Job relationships, source, lifecycle, stage/outcome history, timestamps, non-PII workflow facts | Candidate-entered PII copied into free-text/source fields; public contact details |
| Application answers | Question/version lineage, submission timing, structural answer metadata where useful for audit | PII-bearing answer values or free text redacted/replaced; original may only survive if an approved policy requires it |
| CandidateDocument/Resume | Document record identity, type, scan/status/history needed to explain the record | Object-storage reference, filename, extracted text, preview, and other PII-bearing metadata removed/quarantined according to approved workflow |
| Interview | Event identity, Application relationship, scheduling outcome and non-PII timing/audit facts | Candidate contact/location details, meeting links or free text that contain PII; internal participant identity follows employment/audit policy |
| Scorecard/feedback | Evaluation identity, template/version lineage, submission state, evaluator Membership when audit requires it | Candidate PII in comments, copied resume text, and other sensitive free text redacted according to policy; evaluation history is not silently deleted |
| Communication | Intent, channel, delivery outcome, timestamps, provider operation identity, Application/Candidate relationship where permissible | Recipient addresses, message body, subject, provider payload, and candidate PII redacted or tokenized |
| Offer/OfferVersion | Offer identity, lifecycle decision, Application relationship, version/status audit where required | Terms, compensation, personal address, documents, and other confidential payloads redacted; issued history is not rewritten |
| Activity | Event type, anonymized subject reference, actor/context and time where needed for business history | Candidate names, free-text PII, document links, and unnecessary payload metadata |
| AuditLog | Security action, tenant, actor/user or membership reference where required, resource identity, outcome, correlation/time | Secret values, tokens, raw payloads, PII not needed to prove the action; redaction itself is audited |

Foreign keys should normally survive to an anonymized Candidate rather than be nulled, because nulling breaks Application and audit history. If a privacy decision requires unlinking a particular record, the unlinking must be an explicit audited operation with a replacement subject/reference strategy. Internal User/Membership identity is not automatically anonymized when a Candidate is anonymized; separate account lifecycle and employment/audit policy applies.

**Decision:** preserve structure and history, anonymize Candidate PII and PII-bearing descendants through controlled workflow, preserve audit of the operation, and avoid legal retention claims. **APPROVED — baseline direction.** Exact field-level redaction, merge, export, and retention policy remain **OPEN**.

## 10. Tenant Integrity Enforcement Matrix

No direct foreign key by itself proves that two referenced records share an Organization. The recommended defense is layered: use same-tenant composite relational enforcement where practical, validate relationships in the transaction/repository, and apply backend authorization/resource policy on every protected path.

| Relationship | Tenant risk | Database enforcement recommendation | Application/repository enforcement |
|---|---|---|---|
| Organization -> Membership | Role or membership from another tenant is attached | Direct Organization relationship; active-membership uniqueness in tenant context | Resolve tenant from authenticated Membership; authorize role/status changes |
| Organization -> Job | A guessed Job ID exposes another tenant | Direct tenant ownership on Job | Every query begins with tenant scope; resource policy applies after scope |
| Job -> Pipeline | Pipeline from another Job/tenant is attached | Composite/same-tenant reference or equivalent parent-key validation | Job-owned pipeline service validates tenant and active cardinality |
| Pipeline -> PipelineStage | Stage from another Pipeline is used | Composite Pipeline + Stage identity or transactionally checked parent | Stage repositories scope through Pipeline and reject mismatches |
| Organization -> Candidate | Global candidate lookup leaks PII | Direct tenant ownership on Candidate | Candidate lookup always scopes Organization; no global email matching |
| Candidate + Job -> Application | Candidate and Job from different tenants combine | Direct Application tenant plus composite same-tenant references where practical | Create/update transaction validates Candidate.Organization = Job.Organization = Application.Organization |
| Application -> current stage/history | Stage from another pipeline is assigned | Application pipeline context plus composite stage/pipeline validation | Stage transition service checks current version, pipeline, actor, and tenant |
| Application -> Interview | Interview is attached to unrelated Application/Job | Direct Interview tenant and Application tenant agreement | Interview service resolves Job/Candidate through Application and reauthorizes |
| Interview -> Participant | Another tenant’s Membership becomes interviewer | Direct participant tenant plus composite Interview/Membership context | Membership must be active, same tenant, and authorized for the Interview |
| Interview -> Scorecard | Feedback is attached to unrelated interview | Direct Scorecard tenant and Interview context | Resource policy checks evaluator assignment and peer-visibility rule |
| Candidate -> Document/Resume | Signed URL or metadata crosses tenant | Direct document tenant plus Candidate composite relationship | File access authorizes Candidate, Application/Offer context, and current actor |
| Application -> Offer | Confidential offer crosses application tenant | Direct Offer tenant plus Application tenant agreement | Offer service checks Application context and confidential policy |
| Organization -> TalentPool | Pool is accessed by another tenant | Direct Pool tenant | Pool queries and mutations scope Organization |
| TalentPool -> Candidate | Candidate from another tenant is added | Direct junction tenant plus composite Pool/Candidate tenant relationship | Add/remove transaction validates both roots share tenant; active pair unique |
| Activity -> subject | Timeline leaks another tenant or wrong resource | Direct Activity tenant; subject-specific references where practical | Subject lookup and visibility policy are tenant/resource scoped |
| AuditLog -> resource | Audit data becomes a cross-tenant side channel | Direct tenant for tenant events; protected append behavior | Actor/resource context validated; restricted audit DTOs |
| Integration -> ExternalReference/Event | Provider ID from one tenant is used in another | Integration tenant and provider-scoped reference uniqueness | Provider callbacks resolve Integration first; never lookup by provider ID globally |

Recommended classification for the physical design is **B + C** for the central high-risk paths: composite/same-tenant relational strategy plus database constraints and service/repository validation. **A** direct foreign keys are sufficient only for a single-parent relationship whose parent key already carries the tenant context and is not independently exposed. **D** service/repository-only enforcement is acceptable for polymorphic Activity/Note subjects or opaque provider payloads where a relational composite FK is impractical, but tenant and resource authorization remain mandatory.

## 11. Direct organizationId Review

The prior model’s broad recommendation is refined below. Direct ownership is a security and query-safety aid, not permission by itself and not a replacement for parent consistency.

| Entity | Classification | Direct organizationId recommendation | Reason |
|---|---|---:|---|
| User | NOT APPROPRIATE | No | Global identity may belong to many Organizations. |
| Organization | REQUIRED | Yes/self | Tenant root. |
| Membership | REQUIRED | Yes | Tenant role context and active-membership lookup. |
| Invitation | REQUIRED | Yes | Tenant/email lifecycle and active-invitation protection. |
| Job | REQUIRED | Yes | Independent, frequently queried authorization root. |
| HiringTeamMember | USEFUL denormalization | Prefer yes | High-risk Job/Membership join; validate against both parents. |
| Pipeline | USEFUL denormalization | Prefer yes | Independently queried configuration and safe Job scoping. |
| PipelineStage | USEFUL denormalization | Prefer yes | Independently referenced history/current stage; reduces cross-tenant stage risk. |
| Application | REQUIRED | Yes | Central sensitive tenant boundary. |
| ApplicationStageHistory | REQUIRED | Yes | Append-only workflow history and cross-tenant query safety. |
| ApplicationForm | USEFUL denormalization | Prefer yes | Public form/version reads and Job scoping. |
| ApplicationFormVersion | USEFUL denormalization | Prefer yes | Published definitions may be read independently and must remain scoped. |
| ApplicationFormQuestion | DERIVED ownership is sufficient, but useful | Prefer yes only if independently queried | It is a child of an immutable version; duplicate key adds consistency cost. |
| ApplicationAnswer | REQUIRED | Prefer yes | Candidate-submitted sensitive data and tenant-safe bulk reads. |
| Candidate | REQUIRED | Yes | Tenant-contextual identity and independent PII queries. |
| CandidateDocument | REQUIRED | Yes | File authorization and signed-access safety. |
| Interview | REQUIRED | Yes | Scheduling/participant privacy and independent queries. |
| InterviewParticipant | USEFUL denormalization | Prefer yes | Same-tenant Membership validation and interviewer queries. |
| ScorecardTemplate | REQUIRED | Yes | Organization-scoped configuration. |
| ScorecardTemplateVersion/Criterion | USEFUL denormalization | Prefer yes for independently read history | Feedback definition privacy and safe joins. |
| Scorecard | REQUIRED | Yes | Private feedback and evaluator-scoped queries. |
| ScorecardResponse | USEFUL denormalization | Prefer yes | Sensitive feedback bulk access and criterion alignment. |
| Note | REQUIRED | Yes | Collaboration lookup and resource authorization. |
| Comment | DEFERRED | Not applicable now | Comment is deferred from current logical model. |
| Communication | REQUIRED | Yes | Delivery retries and recipient privacy. |
| CommunicationRecipient | USEFUL denormalization | Prefer yes | Per-recipient delivery and callback safety. |
| Offer | REQUIRED | Yes | Confidential terms and independent status operations. |
| OfferVersion | DERIVED ownership is sufficient, but useful | Prefer yes | Issued terms may be independently retrieved under strict scope. |
| ApplicationOutcomeEvent | REQUIRED | Yes | Hiring/rejection decision history is sensitive and auditable. |
| TalentPool | REQUIRED | Yes | Organization-owned named collection. |
| TalentPoolMember | REQUIRED | Yes | Composite Pool/Candidate tenant check and active-pair uniqueness. |
| Activity | REQUIRED | Yes | Timeline queries are independently scoped. |
| AuditLog | REQUIRED for tenant events | Yes when event is tenant-scoped | Protected audit queries must not infer scope through arbitrary subject joins. |
| Integration | REQUIRED | Yes | Tenant-bound connection and secret reference. |
| ExternalReference | USEFUL denormalization | Prefer yes | Provider callbacks and references must resolve within tenant. |
| IntegrationEvent | USEFUL denormalization | Prefer yes | Replay/reconciliation work needs tenant context. |
| Application submission deduplication record | REQUIRED | Yes | Scoped replay protection must not be a global or cross-tenant key. |

Refinement from the prior model: `organizationId` is not appropriate on User; it is required on central sensitive roots and high-risk independently queried records; it is merely useful on low-risk children and may be derived when the physical design can enforce the parent relationship safely. If duplicated, it must be transactionally maintained and checked against the parent. It is never an authorization decision by itself.

## 12. Mutability / History Matrix

| Entity | Classification | Historical requirement |
|---|---|---|
| Job | MUTABLE CURRENT STATE | Preserve lifecycle/configuration changes in Activity/AuditLog; archive instead of destructive delete. |
| Pipeline | MUTABLE CURRENT STATE + ARCHIVED/DEACTIVATED | Retain retired configurations if Applications reference them; no in-place reinterpretation of used history. |
| PipelineStage | MUTABLE CURRENT STATE + ARCHIVED/DEACTIVATED | Preserve stable identity; used stages are retired/deactivated, not deleted. |
| ApplicationFormVersion | VERSIONED DEFINITION | Immutable after publication/use; historical Applications reference exact version. |
| Application | MUTABLE CURRENT STATE | Stage/outcome transitions append history and are transactionally guarded. |
| ApplicationStageHistory | APPEND-ORIENTED HISTORY | Never update away a movement; preserve old/new stage, actor, time, and reason. |
| ApplicationAnswer | IMMUTABLE AFTER SUBMISSION | Original Candidate value remains; future correction is an amendment, not overwrite. |
| Interview | MUTABLE CURRENT STATE | Reschedule/cancel/completion changes preserve event/activity/audit history. |
| ScorecardTemplateVersion | VERSIONED DEFINITION | Immutable after publication/use; completed Scorecards reference exact version. |
| Scorecard | MUTABLE CURRENT STATE -> IMMUTABLE AFTER SUBMISSION | Draft editable; Submitted locked except elevated audited correction. |
| ScorecardResponse | MUTABLE CURRENT STATE -> IMMUTABLE AFTER SUBMISSION | Response follows Scorecard lifecycle and criterion/version lineage. |
| Offer | MUTABLE CURRENT STATE + ARCHIVED/DEACTIVATED | Lifecycle transitions retained; prior offers remain queryable. |
| OfferVersion | VERSIONED DEFINITION / IMMUTABLE AFTER ISSUE | Issued terms cannot be overwritten; draft terms may change before issue. |
| ApplicationOutcomeEvent | APPEND-ORIENTED HISTORY | Immutable hiring/rejection/withdraw/reopen events with replay identity. |
| Activity | APPEND-ORIENTED HISTORY | User-visible business timeline, not authoritative state. |
| AuditLog | APPEND-ORIENTED HISTORY | Protected security/administrative trace; redaction is controlled and auditable. |
| Candidate | MUTABLE CURRENT STATE + ARCHIVED/DEACTIVATED | PII changes and anonymization preserve controlled history. |
| CandidateDocument | MUTABLE CURRENT STATE + ARCHIVED/DEACTIVATED | File metadata/status changes preserve scan/access/supersession history. |
| TalentPoolMember | MUTABLE CURRENT STATE + history on removal | Prevent duplicate active membership while preserving prior membership events. |
| Integration | MUTABLE CURRENT STATE | Connection/sync status changes and provider failures retain operational history. |

## 13. Logical Entity Simplification Review

| Existing logical entity | Decision | Reason |
|---|---|---|
| PipelineStagePlacement | REMOVE FROM CURRENT LOGICAL MODEL | Application current stage plus ApplicationStageHistory is sufficient; avoids duplicate current-state authority. |
| Resume | MERGE INTO CandidateDocument | Resume is a document category/type, not a separate relationship needed by current requirements. CandidateDocument can identify resume documents while preserving future document categories. |
| CandidateDocument | KEEP | File metadata, ownership, lifecycle, scan, and storage-boundary facts need a durable entity. |
| Note | KEEP | Current minimal internal annotation concept with explicit target/visibility. |
| Comment | DEFER | Threaded collaboration requirements are not evidenced sufficiently. |
| Communication | KEEP | Message intent and delivery lifecycle are distinct from recipient rows. |
| CommunicationRecipient | KEEP | Recipient-specific identity/status is a real repeating relationship and must not be an array. |
| CommunicationTemplate | DEFER | Roadmap mentions templates, but template versioning/content requirements are later-phase and not schema-blocking now. |
| OfferVersion | KEEP | Issued offer terms require immutable historical preservation. |
| IntegrationEvent | KEEP | Provider callback/operation history and replay/reconciliation are distinct from current Integration state. |
| Generic IdempotencyRecord | DEFER as a shared infrastructure abstraction | Its exact scope varies by command. The approved application-submission deduplication invariant still needs a scoped logical record, but a universal table should not be invented before command requirements are known. |
| Application submission deduplication record | KEEP as a logical requirement; physical shape OPEN | Public retries cannot be safely handled by Application uniqueness. It may later share infrastructure with idempotency records. |
| ApplicationOutcomeEvent | KEEP | Hire/reject decisions need append-oriented history and must remain separate from Offer. |
| ScorecardCriterion | KEEP | Criteria are repeating, versioned definitions and cannot be hidden in Scorecard JSON. |
| ExternalReference | KEEP | Provider identifiers must remain behind integration/reference boundaries. |
| IntegrationEvent / IdempotencyRecord combined entity | REMOVE as a combined model | Provider events and generic command idempotency have different ownership, lifecycle, and uniqueness semantics. |
| Standalone Hire | REMOVE | Approved direction represents hiring as an Application outcome/event initially. |
| Configurable Role/Permission entities | REMOVE | Fixed Membership roles are approved; resource-level authorization remains separate. |

The resulting current logical model removes `PipelineStagePlacement` and standalone `Resume`, defers `Comment`, `CommunicationTemplate`, and generic `IdempotencyRecord`, and keeps the remaining entities only where their independent identity or relationship history is justified.

## 14. Remaining Physical-Schema Questions

The model is now sufficiently resolved for physical design, but these implementation questions must still be answered before migrations are written:

1. What exact PostgreSQL key and timestamp conventions will be used?
2. How will same-tenant composite references be implemented for Application, Pipeline/Stage, Interview/Participant, Scorecard, Offer, and TalentPoolMember?
3. What bounded replay window, key format, status, and cleanup policy will the application-submission deduplication record use?
4. Will manual/import Applications permit a null form-version reference, and if so, what source evidence is captured?
5. What exact pipeline replacement/reopen behavior is required for a Job with historical Applications?
6. What normalized-email algorithm is approved, and how are duplicate warnings and future merges represented?
7. Who may reopen or reverse Rejected, Withdrawn, or Hired outcomes, and what correction events are required?
8. Are answer and scorecard amendment records needed in the first physical release, or only reserved for later workflows?
9. What exact resource targets and visibility policy apply to Notes?
10. What defines an active Offer, and does a revised offer create a new Offer or a new OfferVersion?
11. What field-level anonymization/redaction map and audit access policy are approved?
12. Which direct organizationId duplications will be implemented versus derived, and what database/service consistency mechanism will protect them?
13. What indexes, pagination keys, concurrency/version fields, and migration/test-database conventions follow from actual repository use cases?

These are physical implementation or explicit product-policy questions, not reasons to reopen the approved Candidate/Application, versioning, tenant, Offer/Hire, or history boundaries.

---

# Physical PostgreSQL Design Plan

## Physical design scope

This section is a reviewed PostgreSQL design plan that can later be translated into Prisma models and migrations. It is not executable SQL, Prisma syntax, a migration, or an implementation approval. It fixes project-wide physical conventions where the repository evidence supports them and identifies the PostgreSQL features that will require deliberate migration work.

The database remains the authoritative store. Backend repositories will remain responsible for tenant context, resource authorization, lifecycle transitions, replay behavior, and transaction orchestration. Database constraints provide defense in depth and protect data from accidental cross-tenant or duplicate relationships; they do not replace authorization.

## 1. Primary Key Strategy

### Recommendation: native UUID columns with application-generated UUIDv7 values

Use PostgreSQL’s native `uuid` type for all HiringLoop-owned primary keys. The project-wide default value format should be UUIDv7 generated at the application boundary once the runtime dependency/implementation is selected. PostgreSQL stores UUIDv7 as an ordinary native UUID value; UUIDv7’s time-ordered layout improves locality for append-heavy records while retaining an opaque, non-sequential public identifier.

This is a storage/value-format recommendation, not a request to add a package now. If the supported Node runtime or future Prisma version cannot reliably generate UUIDv7, the approved fallback is application-generated UUIDv4 while retaining the same PostgreSQL `uuid` columns. The fallback should be selected before physical implementation rather than mixing strategies without documentation.

| Option | Assessment |
|---|---|
| UUIDv7 | Recommended default. Distributed creation, opaque identifiers, native PostgreSQL storage, Prisma-compatible scalar representation, and better write locality than random UUIDs. Requires an explicit application generation strategy. |
| UUIDv4 | Safe fallback. Broad compatibility and simple generation, but more random index insertion and less locality for large append-heavy tables. |
| CUID-like IDs | Avoid as the project-wide database type. Application-friendly but less native to PostgreSQL, adds string storage/index cost, and makes composite/FK conventions less uniform. |
| BIGINT sequence | Avoid as the public/project-wide identity. Excellent locality and compact indexes, but predictable/enumerable identifiers and tighter dependence on one database sequence for distributed creation. It can be considered for a future internal append-only metric table, not core entities. |

UUIDs do not prevent authorization failures; every lookup still requires tenant and resource policy checks. External provider identifiers are not primary keys and remain scoped in `ExternalReference`/`IntegrationEvent` records.

### Key conventions

- Every persisted HiringLoop entity has a single immutable UUID primary key named logically `id`.
- Do not use business slugs, emails, provider IDs, version numbers, or composite business keys as primary keys.
- Business identifiers remain unique constraints or indexes in addition to `id`.
- Primary keys are never updated. `ON UPDATE` should therefore be `NO ACTION`/restrictive by default.
- Version rows also have UUID primary keys; `(parentId, versionNumber)` is a business uniqueness constraint, not the primary key.

## 2. Common Physical Columns

| Column/convention | Scope | Physical recommendation | Notes |
|---|---|---|---|
| `id` | Universal persisted entities | `uuid NOT NULL` primary key | UUIDv7 application-generated by default; UUIDv4 fallback if required. |
| `createdAt` | Universal persisted entities | `timestamptz` and `NOT NULL` | Set once by the authoritative write path; UTC-aware database value. |
| `updatedAt` | Mutable current-state entities | `timestamptz` and `NOT NULL` | Change on meaningful current-state mutation; not required on immutable history rows. |
| `archivedAt` | Entities with administrative archive/deactivation | Nullable `timestamptz` | Use only where archive is a real lifecycle state: Job, Candidate, Pool, Offer, Integration, and similar roots. |
| `deletedAt` | Exceptional controlled deletion only | Nullable `timestamptz`, entity-specific | Do not add universally. Prefer archival/anonymization and preserve references. Candidate/document deletion semantics require approved privacy workflow. |
| `organizationId` | Tenant-owned or high-risk independently queried records | Native `uuid NOT NULL` unless a documented lifecycle exception exists | Direct ownership is an isolation aid; parent consistency must be enforced. Never on User. |
| `createdByMembershipId` | User-created tenant records where authorship matters | Nullable or required by entity | Required when creator attribution is a business/audit fact; avoid on purely system-generated rows. |
| `updatedByMembershipId` | Sensitive mutable records where actor attribution matters | Nullable FK where required | Prefer Activity/AuditLog for full history; this is current-state attribution only. |
| `version`/concurrency token | Concurrently edited current-state records | Entity-specific integer or opaque token | Not a template version number. Use on Application stage, Job/Pipeline configuration, Scorecard draft, Offer draft, and similar conflict points if implementation requires it. |
| `versionNumber` | Versioned definitions | Positive integer, required | Unique within the stable parent; immutable after creation. |
| `status` | Lifecycle-bearing records | Required constrained text or selected enum | A status represents current state; history entities record transitions. Do not encode absence as a status when nullable relationship semantics are clearer. |

`createdAt` and `id` are the only broadly universal columns. `updatedAt`, archive timestamps, direct tenant keys, actor keys, concurrency values, and deletion markers are entity-specific. Audit/history rows should not receive generic `updatedAt` because their append-oriented semantics must remain clear.

## 3. Data Type Conventions

| Logical value | PostgreSQL recommendation | Rationale/constraint |
|---|---|---|
| HiringLoop IDs | `uuid` | Native FK/index support and opaque identifiers. |
| Email and normalized email | `text` | Email length/format validation belongs in application checks; normalized comparison value is stored separately. Do not require `citext` extension for the initial model. |
| Names, titles, slugs | `text` | Add application length validation and targeted uniqueness where approved; avoid arbitrary `varchar(n)` as business validation. |
| Descriptions, notes, comments, answer text | `text` | Sensitive free text needs output, length, and redaction policy rather than a misleading fixed SQL width. |
| Boolean flags | `boolean NOT NULL` | Use only for true binary facts; prefer lifecycle status for multi-state behavior. |
| Instants | `timestamptz` | Preserve timezone-aware instants; application and database operate in UTC. Precision is a final convention decision, with millisecond precision sufficient for most business timestamps. |
| Calendar dates | `date` | Use when time-of-day/timezone is not part of the fact, such as a date-only offer or availability date. |
| Times/durations | `timestamptz` plus separate duration/interval concept as needed | Interviews need explicit start/end instants and timezone/display context; do not store local wall time as an unqualified timestamp. |
| Ordering/position | Positive integer (`integer` or `bigint` if scale demands) | Initial ordered stages/questions/criteria use integer positions; renumbering is transactional. Fractional ranking is not needed without measured reorder pressure. |
| Version number | Positive `integer` | Human-auditable monotonic version within parent. |
| Provider IDs | `text` | Provider formats vary; uniqueness is scoped by Integration/provider/object type. Never use as a global FK or PK. |
| URLs and object keys | `text` | Validate shape, allowed provider/path semantics, and secrecy at the boundary; do not expose storage credentials. |
| Money/offer terms | Physical representation remains open | Prefer exact numeric/currency structures or a versioned terms model; never use floating point for financial amounts. Exact currency/terms fields require offer-policy review. |
| JSON/JSONB | Narrow, versioned metadata only | Allowed for opaque provider metadata, bounded form presentation/validation configuration, or versioned offer snapshot only when relational queries/constraints are not required. Never for relationships, answers, criteria, recipients, stages, or tenant ownership. |

## 4. Enum Strategy

The default is `CHECK`-constrained text for business lifecycle values. This keeps additions and deprecations reviewable without requiring PostgreSQL enum alteration choreography and avoids making Prisma enum migrations the only way to evolve a product state machine. Prisma does not natively model arbitrary PostgreSQL CHECK constraints in the schema definition, so checks will require migration-level SQL later.

| Vocabulary | Recommendation | Reason |
|---|---|---|
| Membership role | CHECK-constrained text | Four approved values are fixed now, but role policy may evolve; no Role/Permission tables. |
| Job status | CHECK-constrained text | Lifecycle may gain an approved state; transition policy belongs in application services. |
| Application status | CHECK-constrained text | Current five conceptual states are stable enough to constrain but may need policy evolution. |
| Invitation status | CHECK-constrained text | Pending/accepted/expired/revoked are lifecycle values; partial uniqueness depends on active states. |
| Offer status | CHECK-constrained text | Draft/sent/viewed/accepted/declined/withdrawn/superseded may evolve with workflow. |
| Scorecard status | CHECK-constrained text | Draft/Submitted is a guarded lifecycle; future correction states should be reviewed. |
| Communication status/provider type/channel | CHECK-constrained text | Providers and delivery states can expand; provider identity is not a configurable permission table. |
| Document type/status | CHECK-constrained text | Resume is a document type; scan/lifecycle vocabularies may expand. |
| Integration/provider kind | CHECK-constrained text | Initial provider set is not a stable global reference taxonomy. |
| Audit/activity event type | CHECK-constrained text | Event vocabulary is application-controlled and should remain append-compatible. |

Plain text without a check is justified only for opaque provider values, externally supplied labels, free-form reasons, and metadata that is not a controlled state. Reference tables are not justified for the current fixed-role or lifecycle scope.

## 5. Physical Entity Key/FK Matrix

The matrix uses `S` for a simple FK, `C` for a composite/same-tenant FK candidate, and `V` for application/repository validation in addition to the physical relationship. `R` means restrictive `NO ACTION` behavior is preferred; `N` means `SET NULL` is a possible lifecycle-safe action; `A` means application-controlled archive/anonymization rather than deletion. `ON UPDATE` is `NO ACTION` for all identity FKs unless stated otherwise.

| Entity | PK | Direct orgId | Important required FKs | Optional FKs | Tenant/FK strategy | Delete behavior |
|---|---|---:|---|---|---|---|
| User | uuid | No | — | — | Global identity; membership validates tenant | R; account deactivation, not cascade |
| Organization | uuid | Self | — | — | Tenant root | R/A; controlled closure only |
| Membership | uuid | Yes | organizationId -> Organization; userId -> User | — | C/V for Organization + User context | R; retain history, mark removed |
| Invitation | uuid | Yes | organizationId -> Organization | acceptedMembershipId -> Membership; invitedUserId -> User | C/V for tenant and optional resolved membership | R/N for resolved User only if policy permits; retain invitation |
| Job | uuid | Yes | organizationId -> Organization | createdByMembershipId | C/V for creator; direct tenant root | R/A; archive/close |
| HiringTeamMember | uuid | Yes | jobId -> Job; membershipId -> Membership | — | C recommended for Job + Membership + org | R; deactivate assignment |
| Pipeline | uuid | Yes | jobId -> Job; organizationId -> Organization | — | C for Job + org; one active per Job | R/A; retain retired configs |
| PipelineStage | uuid | Yes | pipelineId -> Pipeline; organizationId -> Organization | — | C for Pipeline + org | R/A; retire used stage |
| ApplicationForm | uuid | Yes | jobId -> Job; organizationId -> Organization | createdByMembershipId | C for Job + org | R/A; retain used forms |
| ApplicationFormVersion | uuid | Yes | formId -> ApplicationForm; organizationId -> Organization | publishedByMembershipId | C for Form + org | R; immutable historical row |
| ApplicationFormQuestion | uuid | Prefer yes | formVersionId -> ApplicationFormVersion | — | C if direct orgId retained; otherwise derived | R; preserve used definition |
| ApplicationAnswer | uuid | Yes | applicationId -> Application; questionId -> ApplicationFormQuestion | — | C for Application + org and version validation | R; immutable/anonymize value |
| Candidate | uuid | Yes | organizationId -> Organization | createdByMembershipId | Direct tenant root | R/A; controlled anonymization |
| Application | uuid | Yes | organizationId -> Organization; candidateId -> Candidate; jobId -> Job; pipelineId -> Pipeline | formVersionId; createdByMembershipId | C strongly recommended for Candidate, Job, Pipeline and org | R/A; preserve history |
| ApplicationStageHistory | uuid | Yes | applicationId -> Application; pipelineId -> Pipeline; optional fromStageId/toStageId -> PipelineStage | actorMembershipId | C for all workflow context | R; append-oriented |
| CandidateDocument | uuid | Yes | candidateId -> Candidate; organizationId -> Organization | applicationId; offerId; createdByMembershipId | C for Candidate + org; optional parent checks | R/A; remove bytes/reference through workflow |
| Interview | uuid | Yes | applicationId -> Application; organizationId -> Organization | createdByMembershipId | C for Application + org | R/A; preserve event history |
| InterviewParticipant | uuid | Yes | interviewId -> Interview; membershipId -> Membership; organizationId -> Organization | — | C strongly recommended for Interview + Membership + org | R; mark removed |
| ScorecardTemplate | uuid | Yes | organizationId -> Organization | jobId; createdByMembershipId | C for optional Job + org | R/A; retain used template |
| ScorecardTemplateVersion | uuid | Yes | templateId -> ScorecardTemplate; organizationId -> Organization | publishedByMembershipId | C for Template + org | R; immutable |
| ScorecardCriterion | uuid | Prefer yes | templateVersionId -> ScorecardTemplateVersion | — | C if direct orgId retained; otherwise derived | R; preserve used criterion |
| Scorecard | uuid | Yes | interviewId -> Interview; evaluatorMembershipId -> Membership; templateVersionId -> ScorecardTemplateVersion; organizationId -> Organization | — | C for Interview, evaluator, template version and org | R; preserve submission |
| ScorecardResponse | uuid | Prefer yes | scorecardId -> Scorecard; criterionId -> ScorecardCriterion | — | C if direct orgId retained; version lineage validated | R; immutable after submit/anonymize text |
| Note | uuid | Yes | organizationId -> Organization; authorMembershipId -> Membership | candidateId; applicationId; interviewId/jobId only if approved target set | C for explicit target + org; no unconstrained polymorphic FK | R/A; archive/redact body |
| Communication | uuid | Yes | organizationId -> Organization | candidateId; applicationId; createdByMembershipId; integrationId | C for parent/integration + org | R/A; retain delivery history, redact content |
| CommunicationRecipient | uuid | Yes | communicationId -> Communication; organizationId -> Organization | candidateId; userId | C for Communication + org | R/A; redact address |
| Offer | uuid | Yes | applicationId -> Application; organizationId -> Organization | createdByMembershipId | C for Application + org | R/A; retain offer history |
| OfferVersion | uuid | Yes | offerId -> Offer; organizationId -> Organization | issuedByMembershipId | C for Offer + org | R; immutable issued terms |
| ApplicationOutcomeEvent | uuid | Yes | applicationId -> Application; organizationId -> Organization | actorMembershipId | C for Application + org | R; append-only |
| TalentPool | uuid | Yes | organizationId -> Organization; createdByMembershipId | — | Direct tenant root | R/A; archive |
| TalentPoolMember | uuid | Yes | talentPoolId -> TalentPool; candidateId -> Candidate; organizationId -> Organization | addedByMembershipId | C strongly recommended for Pool + Candidate + org | R; deactivate membership |
| Activity | uuid | Yes | organizationId -> Organization | actorMembershipId; candidateId; applicationId; jobId; interviewId; offerId | C for explicit subject FKs where modeled; otherwise V | R/A; append-oriented/redact |
| AuditLog | uuid | Tenant ID when tenant event | organizationId -> Organization optional for global events | actorUserId; actorMembershipId; resource IDs | C/V; protected append path | R; retain/redact by policy |
| Integration | uuid | Yes | organizationId -> Organization | createdByMembershipId | Direct tenant root | R/A; revoke/deactivate |
| ExternalReference | uuid | Yes | integrationId -> Integration; organizationId -> Organization | target IDs by approved reference pattern | C for Integration + org; target context V | R/A; retain reconciliation history |
| IntegrationEvent | uuid | Yes | integrationId -> Integration; organizationId -> Organization | target IDs; externalReferenceId | C for Integration + org; provider event uniqueness | R/A; retain processing history |
| ApplicationSubmissionDeduplication | uuid | Yes | organizationId -> Organization; jobId -> Job; applicationId nullable -> Application | — | C for Organization + Job; application result checked same tenant | R/A; bounded cleanup only after policy |

CandidateDocument replaces the former standalone Resume entity; a resume is represented by a constrained document type. PipelineStagePlacement is not included. A future physical design may use explicit nullable target FKs for Note/Activity rather than a polymorphic target pair; target cardinality and “exactly one subject” checks require implementation review.

## 6. Same-Tenant Composite FK Strategy

### Pattern and cost

For a high-risk parent-child relationship, give the parent a unique logical key `(id, organizationId)`, store both `parentId` and `organizationId` on the child, and reference the pair. This makes a child row unable to point to a parent from another tenant while retaining the child’s direct scope. It requires additional parent composite uniqueness and child-side composite indexes; it also makes relation definitions and update paths more verbose in Prisma. Since IDs are immutable, the extra key is stable and the maintenance cost is acceptable for central security paths.

The pattern is not required for every child. Direct `organizationId` plus a simple parent FK still permits a mismatched parent unless a database CHECK/trigger or composite relationship verifies equality. Therefore, where the relationship is independently queried or carries sensitive data, use the composite pattern. Where a child is never independently authorized and ownership is unambiguously derived, a simple FK plus repository validation can be sufficient.

| Relationship | Classification | Recommendation |
|---|---|---|
| Application -> Candidate | COMPOSITE TENANT FK RECOMMENDED | Application carries orgId; reference Candidate `(id, orgId)`; candidate identity is tenant-scoped. |
| Application -> Job | COMPOSITE TENANT FK RECOMMENDED | Prevents a Candidate from one tenant combining with a Job from another. |
| Job -> Pipeline | COMPOSITE TENANT FK RECOMMENDED | Pipeline carries Job and org context; only Job-owned active configuration is valid. |
| Pipeline -> PipelineStage | COMPOSITE TENANT FK RECOMMENDED | Prevents stage reuse across pipelines/tenants. |
| Application -> current PipelineStage | COMPOSITE TENANT FK RECOMMENDED | Validate stage belongs to Application’s selected Pipeline; composite stage key alone does not prove Job lineage, so repository validation remains required. |
| Application -> ApplicationFormVersion | COMPOSITE TENANT FK RECOMMENDED | Application form version must be from the Application’s Job/form lineage; composite org FK plus service/check validation. |
| Interview -> Application | COMPOSITE TENANT FK RECOMMENDED | Interview is sensitive and independently queried. |
| InterviewParticipant -> Interview + Membership | COMPOSITE TENANT FK RECOMMENDED | Prevents assigning another tenant’s Membership; both relationships and active status require application validation. |
| Scorecard -> Interview + evaluator Membership | COMPOSITE TENANT FK RECOMMENDED | Prevents feedback context and evaluator crossing tenants; assignment/visibility remains application authorization. |
| CandidateDocument -> Candidate | COMPOSITE TENANT FK RECOMMENDED | File metadata and signed access require strict Candidate/tenant alignment. |
| Offer -> Application | COMPOSITE TENANT FK RECOMMENDED | Confidential terms cannot attach across tenants. |
| TalentPoolMember -> Pool + Candidate | COMPOSITE TENANT FK RECOMMENDED | Both roots must share Organization; active membership uniqueness is tenant-scoped. |
| Activity -> referenced resources | SIMPLE FK + DIRECT TENANT CHECK SUFFICIENT for explicit modeled subjects; APPLICATION-LAYER VALIDATION REQUIRED for subject choice | Avoid unconstrained polymorphic references; use explicit nullable subject FKs and verify exactly one where required. |
| ExternalReference -> Integration + target | COMPOSITE TENANT FK RECOMMENDED for Integration; APPLICATION-LAYER VALIDATION REQUIRED for target | Provider IDs are opaque; resolve Integration/tenant first and validate target context. |
| ApplicationSubmissionDeduplication -> Job/Application | COMPOSITE TENANT FK RECOMMENDED | Idempotency must never resolve across organizations; resulting Application is nullable until completion. |

The composite strategy is **B: composite/same-tenant FK plus C: database constraint and service/repository validation** for high-risk paths. Lifecycle rules such as active Membership, published version, assigned participant, and current active Offer remain application/workflow rules even when tenant equality is physically enforced.

## 7. Uniqueness Constraint Matrix

| Constraint | Columns/condition | Type | Reason | Prisma support |
|---|---|---|---|---|
| Membership identity | Organization + User | Ordinary unique | One membership relationship per tenant/user; status changes do not create another active identity | Direct compound unique |
| Active Invitation | Organization + normalized target email where status is active | **Partial unique index** | Prevent uncontrolled simultaneous active invitations while retaining terminal history | Not directly representable; raw migration required later |
| Job slug | Organization + normalized slug, if slugs are adopted | Ordinary unique | Safe tenant-scoped public/resource identifier | Direct compound unique; slug requirement itself remains product-dependent |
| Active Pipeline | Job where active state | **Partial unique index** or equivalent current-pointer uniqueness | At most one active Pipeline configuration per Job while retired history remains | Likely raw migration; application guard also required |
| PipelineStage position | Pipeline + position for active/current stages | Ordinary unique or partial unique | Prevent duplicate ordering positions during active configuration | Direct compound unique if all rows participate; partial if retired rows retain old position |
| ApplicationForm | Job | Ordinary unique | One logical form container per Job in initial model | Direct compound/unique FK |
| Published form version | Form + versionNumber; one current published pointer | Ordinary unique plus partial unique if status-based | Stable version numbering and one current published version | Version unique direct; published uniqueness may require raw migration |
| Form question identity/order | FormVersion + questionKey; FormVersion + position | Ordinary unique | Stable question identity and deterministic presentation order | Direct compound unique |
| Application submission dedupe | Organization + source/surface scope + submissionKey | Ordinary unique | One request intent maps to one result within bounded scope | Direct compound unique; expiry is application cleanup |
| TalentPool name | Organization + normalized name, if product requires | Ordinary unique | Avoid confusing duplicate named collections | Product decision; direct compound unique if approved |
| TalentPool membership | TalentPool + Candidate for active membership | Ordinary unique or partial unique | Prevent duplicate active pair while retaining removal history | Partial active form likely raw migration |
| Interview participant | Interview + Membership | Ordinary unique | One assignment per internal member/interview initially | Direct compound unique |
| Scorecard assignment | Interview + evaluator Membership for active/current scorecard | Ordinary unique or partial unique | One independent evaluation per assignment; retries must not duplicate | Ordinary unique if replacements are history rows elsewhere; partial if retaining superseded rows in same table |
| Active Offer | Application where offer is active | **Partial unique index** | No more than one currently active Offer per Application | Not directly representable; raw migration required later |
| Offer version | Offer + versionNumber | Ordinary unique | Immutable sequential terms snapshots within Offer | Direct compound unique |
| Provider reference | Integration + provider object type + provider object ID | Ordinary unique | Provider-scoped identity and replay-safe lookup | Direct compound unique |
| Provider event | Integration/provider + provider event ID or operation key | Ordinary unique | Webhook/operation replay idempotency | Direct compound unique; null/key variants may need raw index |

Partial unique indexes are explicit **PHYSICAL POSTGRESQL REQUIREMENTS** for active invitation, active Pipeline, active pool membership if history shares the table, active Scorecard assignment if superseded rows share it, and active Offer. Prisma schema declarations do not express arbitrary predicates; later migrations will likely need carefully reviewed raw SQL/custom migration adjustments. The application must still use transactions and guarded state transitions because a uniqueness error is a safety net, not the workflow.

## 8. Nullability Rules

| Field | Rule | Meaning of NULL |
|---|---|---|
| Candidate.email / normalizedEmail | Nullable | Candidate has no known email, or email is intentionally unavailable/redacted; null is not a duplicate and does not identify a Candidate. |
| Job.active Pipeline reference | Nullable while Draft | Job is not yet configured/operational; publication/submittability requires an active Pipeline. |
| Application.current stage | Required once workflow begins; nullable only at initial pre-stage state if allowed | No stage has been assigned yet; do not use null to mean rejected/withdrawn/hired. Final rule follows Application creation workflow. |
| Application.formVersion | Nullable only for non-form/manual/import Applications if approved | No HiringLoop form version was used; public-form Applications must never have null here. |
| outcome timestamps | Nullable until event occurs | No such outcome has occurred; use ApplicationOutcomeEvent for history rather than multiple competing null timestamps. |
| Interview.start/end/location | Nullable while Draft/Pending | Event is not fully scheduled; Scheduled requires valid start/end and approved location/link requirements. |
| Scorecard.submittedAt | Nullable in Draft; required in Submitted | No submission has occurred; state, not null alone, controls editability. |
| Offer.sentAt/viewedAt/acceptedAt/declinedAt | Nullable until corresponding transition | The transition has not occurred; timestamps are not independent statuses and must agree with lifecycle workflow. |
| anonymized PII values | Nullable or neutral replacement after controlled workflow | Value was removed/redacted; null must not be interpreted as never collected. An anonymization event records the change. |
| optional actor/createdBy references | Nullable for system-generated records | No human Membership is the author; system actor/correlation is captured through Activity/AuditLog where required. |
| archivedAt | Nullable | Record is currently active/not archived. It is not a universal soft-delete marker. |
| deletedAt | Absent unless entity-specific deletion is approved | No ordinary deletion semantics should be inferred from its absence. |

Use explicit status for lifecycle state, not nulls. Use null only for genuine absence, not-yet-occurred transitions, or privacy redaction. Physical `NOT NULL` should follow the logical lifecycle and creation path rather than be applied indiscriminately.

## 9. Referential Action Matrix

| Relationship/record | Recommended delete action | Reason |
|---|---|---|
| Organization -> Membership/Job/Candidate | RESTRICT/NO ACTION | Tenant removal must not cascade through recruiting history. Use controlled closure/archive/anonymization. |
| User -> Membership | RESTRICT or controlled deactivation | Preserve actor/audit references; do not delete a global User through membership removal. |
| Organization -> Invitation | RESTRICT or archive | Invitation security history remains useful; terminal invitations are retained. |
| Job -> Pipeline/Forms/Applications | RESTRICT | Job is a historical root; close/archive instead of deleting dependent records. |
| Pipeline -> Stages | RESTRICT | Used stage identities and historical movements must remain resolvable. Retire/deactivate stages. |
| Application -> StageHistory/Answers/Interviews/Offers/Outcomes | RESTRICT | Recruiting history is not safely cascade-deletable. Application anonymization/archival preserves relationships. |
| Form/Template -> Versions/Questions/Criteria | RESTRICT | Published/used definitions are immutable historical references. |
| Candidate -> Documents/Applications | RESTRICT | Candidate deletion is a controlled anonymization workflow; relationships preserve history. |
| CandidateDocument -> object bytes | Application-controlled cleanup | Object storage is external; metadata/history and byte deletion require separate authorized workflow. |
| Interview -> Participants/Scorecards | RESTRICT | Feedback and assignment history must survive cancellation/archive. |
| Scorecard -> Responses | RESTRICT | Submitted feedback must not disappear through accidental parent deletion. |
| Offer -> OfferVersions | RESTRICT | Issued terms remain reproducible. |
| TalentPool -> Memberships | RESTRICT or controlled deactivation | Preserve pool history; remove/deactivate membership intentionally. |
| Integration -> ExternalReferences/Events | RESTRICT or archive | Provider reconciliation and incident history must remain available. |
| Optional author/actor FKs | SET NULL only where actor deletion/deactivation policy requires it | Preserve the record while avoiding a dangling identity; audit policy decides whether User is retained instead. |

`CASCADE` is reserved for narrowly owned, non-authoritative dependent data only after review; it should not span Organization, Candidate, Application, pipeline history, feedback, offers, or audit. `ON UPDATE CASCADE` is not needed for immutable UUID identities. Archive/anonymization workflows are the default for operational records.

## 10. Versioned Entity Physical Model

### Application forms

```text
ApplicationForm (stable parent)
  -> ApplicationFormVersion (uuid, positive versionNumber, publication state)
    -> ApplicationFormQuestion (uuid, questionKey, position, definition)
Application (selected formVersionId)
  -> ApplicationAnswer (applicationId + questionId)
```

`ApplicationForm` has one stable ID per Job. Each version has its own UUID and a unique `(formId, versionNumber)`. Version and question definitions become immutable once published or referenced by a submitted Application. The form may have a current published-version pointer for convenient reads, but the Application’s `formVersionId` is the historical authority. If status is used to identify published versions, enforce one current published version per form with an appropriate partial unique index or use a parent pointer whose update is transactionally guarded.

### Scorecard templates

```text
ScorecardTemplate (stable parent)
  -> ScorecardTemplateVersion (uuid, positive versionNumber)
    -> ScorecardCriterion (uuid, criterionKey, position, definition)
Scorecard (templateVersionId)
  -> ScorecardResponse (scorecardId + criterionId)
```

Version has unique `(templateId, versionNumber)`. Criteria are rows, not JSON arrays. A completed Scorecard references exactly one immutable version; changing the template creates a new version. Template scope (organization or Job) is enforced by parent/context checks, not by copying template content into each Scorecard.

### Offers

```text
Offer (stable attempt/lifecycle parent)
  -> OfferVersion (uuid, positive versionNumber, immutable after issue)
```

Offer has unique `(offerId, versionNumber)`. Draft editing can replace the current draft version only before issue, subject to the chosen physical history rule; issued/sent terms receive immutable versions. Offer status/history and version terms are distinct: status says what happened to the offer attempt, while version says what terms were prepared or issued.

## 11. Current State / History Physical Model

| Current-state representation | Historical representation | Consistency invariant |
|---|---|---|
| Application.currentStageId and Application.pipelineId | ApplicationStageHistory rows | Every stage change updates current state and appends one history row in one transaction; current stage belongs to selected pipeline. |
| Application.status and optional current outcome projection | ApplicationOutcomeEvent rows | Each decision/reopen is an append event plus guarded current-state update; event replay cannot duplicate effect. |
| Job.active Pipeline pointer/configuration | Retired Pipeline and stage identities plus Activity/AuditLog | Only one active pipeline per Job; historical Applications retain their pipeline context. |
| ApplicationForm current published version pointer | Immutable FormVersion/Question rows | Pointer changes do not mutate prior versions; submitted Applications keep exact version FK. |
| ScorecardTemplate current version pointer | Immutable TemplateVersion/Criterion rows | Completed Scorecards keep exact version FK. |
| Scorecard.status and draft responses | Submission/audit/amendment history if later enabled | Draft is mutable; Submitted is locked; elevated correction preserves original. |
| Offer.status and current/latest version reference | OfferVersion rows plus status/activity history | Issued terms are immutable; only one active Offer per Application. |
| Candidate current profile/anonymization state | Anonymization/merge Activity and AuditLog | PII redaction and relationship preservation occur in a controlled workflow. |

The application must use transactions for stage transitions, outcome decisions, form publication, scorecard submission, offer issue/reissue, invitation acceptance, pool membership changes, and idempotent submission completion. Concurrency tokens or guarded current-state predicates should be selected during implementation to prevent lost updates.

## 12. Idempotency Storage Design

Use a logical `ApplicationSubmissionDeduplication` record for public and deterministic import submissions. It should contain:

- `id` and `organizationId`;
- source/surface scope, such as public form or import operation;
- `jobId` and, where known, form/version context;
- opaque `submissionKey` supplied/generated for one request intent;
- optional request fingerprint for bounded duplicate detection, never as Candidate identity;
- processing status such as pending/completed/failed according to retry needs;
- `createdAt` and an expiration/cleanup-support timestamp without a fixed duration here;
- nullable `applicationId` until the application is created, then a same-tenant reference;
- correlation/error metadata that excludes secrets and unnecessary PII.

The uniqueness scope is `(organizationId, source/surface scope, submissionKey)` and may include Job if the product defines keys only per Job. The final scope must ensure a key from one tenant cannot resolve another tenant’s Application. A completed record points to exactly one resulting Application. A retry of the same key returns or reuses that effect; a later intentional reapplication uses a new key and can create a new Application.

This is distinct from `IntegrationEvent`: application submission deduplication protects an inbound business command and its resulting Application; IntegrationEvent protects provider callback/operation replay and reconciliation. They have different keys, ownership, payload sensitivity, and retention semantics. A future shared idempotency library may reuse physical infrastructure, but the domain scopes must remain distinct.

## 13. Physical Normalization Review

The physical plan remains in 1NF, 2NF, and 3NF:

- Repeating participants, answers, responses, recipients, assignments, pool memberships, stages, questions, criteria, and version rows are separate records.
- Junction-specific facts remain on junction entities.
- Candidate profile data is not repeated on Application; form/template definitions are not copied into answers/responses; provider identities are not copied onto core entities.
- Version references are intentional historical dependencies, not denormalized copies of full definitions.

Direct `organizationId` is a deliberate denormalization on high-risk roots/children. Its justification is tenant-safe query scoping, composite FK construction, and avoiding unsafe parent traversal during authorization. The consistency invariant is `child.organizationId = parent.organizationId` for every tenant-bearing relationship. The preferred enforcement is a composite FK using `(parentId, organizationId)` plus repository validation and transaction boundaries. For explicit polymorphic subjects where a composite FK is impractical, direct tenant ownership plus application-layer subject validation is required; a free-form target type/id must not be treated as relationally safe.

## 14. Required Structural Indexes — Inventory Only

This is not a performance-index design. It lists indexes structurally required by identity and relationship integrity; later query work must add evidence-based indexes separately.

### Automatically supplied or uniqueness-required

- Every primary key index on each UUID `id`.
- Every ordinary unique constraint listed in the uniqueness matrix.
- Parent composite unique keys `(id, organizationId)` required as targets of composite FKs.
- Partial unique indexes for active Invitation, active Pipeline, active Pool membership where history shares rows, active Scorecard assignment where superseded rows share rows, and active Offer.
- Provider/integration uniqueness indexes for ExternalReference and IntegrationEvent.

### Likely child-side FK support

Create child-side indexes for composite or high-volume foreign keys when PostgreSQL will otherwise need to scan children for parent checks or controlled deletes:

- `(organizationId, candidateId)`, `(organizationId, jobId)`, and `(organizationId, pipelineId)` on Application;
- `(organizationId, applicationId)` on ApplicationStageHistory, Interview, Offer, OutcomeEvent, and deduplication records;
- `(organizationId, pipelineId)` on PipelineStage and stage-history references;
- `(organizationId, formId)`/`(organizationId, formVersionId)` on form versions/questions/answers;
- `(organizationId, interviewId)` on participants/scorecards;
- `(organizationId, scorecardId)` on responses;
- `(organizationId, candidateId)` on CandidateDocument and TalentPoolMember;
- `(organizationId, talentPoolId)` on TalentPoolMember;
- `(organizationId, integrationId)` on ExternalReference and IntegrationEvent.

Exact column order, covering indexes, partial predicates, search indexes, and pagination indexes are deferred to the later query-pattern/index review.

## 15. PostgreSQL / Prisma Compatibility Notes

| Feature | Prisma schema | Raw PostgreSQL migration/custom adjustment | Application rule |
|---|---|---|---|
| Native UUID scalar | Directly representable as a UUID-backed scalar | Default generation choice remains implementation work | Generate opaque IDs at application boundary; never authorize by guessable ID. |
| UUIDv7 generation | Storage is representable; generation support depends on chosen runtime/Prisma strategy | Database-side generation may require version/extension-specific support | Select one generator and test before implementation; UUIDv4 fallback is allowed. |
| Ordinary compound unique | Directly representable | None normally | Validate friendly errors and tenant context. |
| Composite FK with `(id, organizationId)` | Relation fields/references can be represented with compound parent uniqueness, but mapping complexity requires a Prisma proof-of-concept | May require custom migration review for exact constraints | Repository writes must supply matching tenant context. |
| CHECK constraints | Not fully declared as portable Prisma model semantics | Raw migration/custom migration adjustment required | Application validates transitions and values too. |
| Partial unique indexes | Not directly representable as a general Prisma schema attribute | Raw PostgreSQL migration required later | Transactional state transitions handle race errors. |
| Case-insensitive email | Avoid requiring `citext` initially | Expression/extension index not needed for non-unique signal; optional later | Maintain deterministic normalizedEmail and preserve original display email policy. |
| Deferrable constraints | Not a normal Prisma schema feature | Raw migration/custom adjustment required | Not recommended initially; design writes to satisfy constraints immediately. |
| Exclusion constraints | PostgreSQL feature, not needed for current model | Would require raw migration if future scheduling overlap requires it | Do not use for current interview model; overlap policy is later. |
| Generated columns | Possible PostgreSQL feature, but normalization algorithm/versioning concerns | Raw migration if adopted | Prefer application-maintained normalized signal initially. |
| JSONB | Direct scalar possible | Check/size/index policy requires migration review | Only opaque bounded metadata; no relational relationships in JSON. |
| ON DELETE actions | Relations are representable, but exact action review is required | Custom migration may be needed for composite/action details | Archive/anonymize rather than destructive cascade. |

Prisma compatibility must be validated with the chosen Prisma version later; no package installation or schema generation occurs in this task. Partial indexes, CHECK constraints, provider-specific generated behavior, and any extension use must be visible in migration review rather than assumed to come from the Prisma schema.

## 16. Migration Dependency Plan

This is a conceptual ordering only; no migration files are created.

1. **Database extensions/roles policy, if any** — decide whether native UUID support requires no extension and whether any future extension is approved.
2. **Organization and User roots** — stable IDs, timestamps, lifecycle foundations.
3. **Membership and Invitation** — tenant authorization context, fixed role checks, invitation lifecycle and active uniqueness.
4. **Job** — tenant root, creator references, lifecycle.
5. **Pipeline and PipelineStage** — Job configuration, active pipeline uniqueness, ordered stages.
6. **Candidate** — tenant-scoped candidate identity and optional email signal.
7. **Application and ApplicationSubmissionDeduplication** — Candidate + Job same-tenant relationship, Pipeline context, source/form-version placeholder, replay protection.
8. **ApplicationForm, ApplicationFormVersion, ApplicationFormQuestion, ApplicationAnswer** — form definitions and exact submitted-version references; the Application FK may be added after versions exist, with final cycle handling reviewed.
9. **ApplicationStageHistory and ApplicationOutcomeEvent** — append-oriented workflow/decision history.
10. **CandidateDocument** — candidate file metadata and optional Application/Offer associations; Resume is a document type.
11. **Interview and InterviewParticipant** — scheduling event and internal Membership assignments.
12. **ScorecardTemplate, ScorecardTemplateVersion, ScorecardCriterion, Scorecard, ScorecardResponse** — versioned evaluation definitions and feedback.
13. **Offer and OfferVersion** — confidential offer attempts and immutable issued terms.
14. **TalentPool and TalentPoolMember** — organization-owned collections and Candidate junction.
15. **Note** — explicit collaboration targets after the chosen target relationships are finalized.
16. **Communication and CommunicationRecipient** — message intent, recipients, delivery state, and optional Integration association.
17. **Activity and AuditLog** — append-oriented business/security records; resource FK strategy and redaction policy must be settled.
18. **Integration, ExternalReference, and IntegrationEvent** — provider connection roots and scoped external identities/events.
19. **Structural indexes and partial/check constraints** — add only after relation/order/uniqueness definitions are reviewed; raw migration requirements are documented.

Potential dependency cycles, especially Application -> FormVersion -> Form -> Job -> Application and audit/actor references, should be handled by migration ordering or later constraint addition. The physical implementation must not weaken tenant constraints merely to avoid a cycle.

## 17. Remaining Questions Before Implementation

1. Confirm whether the project will use application-generated UUIDv7 or the documented UUIDv4 fallback, and select the runtime generator.
2. Confirm timestamp precision and whether database defaults or application timestamps are authoritative.
3. Confirm exact approved status values and transition guards for Job, Application, Invitation, Offer, Communication, Document, and Integration.
4. Confirm the physical shape of the application-submission deduplication record, replay-window cleanup, and whether import keys include Job.
5. Confirm whether manual/import Applications may have a null formVersionId and what source metadata is required.
6. Confirm whether retired Pipeline configurations remain attached directly to Applications and how current Job pipeline replacement is exposed.
7. Confirm direct organizationId duplication on lower-risk definition children versus derived ownership, balancing composite FK value against Prisma complexity.
8. Confirm whether partial unique indexes should share history rows or whether superseded/removed states move to separate history tables.
9. Confirm exact Candidate email normalization without introducing `citext` or global uniqueness.
10. Confirm answer/scorecard amendment tables are deferred from the first physical release or required immediately.
11. Confirm Note target relationships before physical FKs are chosen; Comment remains deferred.
12. Confirm Offer terms representation, active-state definition, and reissue/version rules.
13. Confirm anonymization field map, storage-byte cleanup workflow, and audit redaction/access rules without assigning legal retention durations.
14. Confirm initial Integration providers and ExternalReference target types before provider-specific checks are written.
15. Confirm migration/testing conventions, database credentials, and whether any PostgreSQL extension is permitted.

The physical plan is ready for a focused key/constraint/index review. It is not approval to create Prisma files or migrations until the remaining implementation choices above are accepted.

Resolve the inventory's blocking product/domain questions—especially duplicate Applications, form/template versioning, offer/Hire semantics, retention/deletion, role scope, and Talent Pool definition—then produce a reviewed logical model with explicit key/foreign-key/nullability/ownership decisions. Only after that review should the backend add Prisma/PostgreSQL setup, migration conventions, seed/test-database strategy, and repository smoke tests.

## Key and Constraint Review

This section is the focused key, constraint, tenant-integrity, lifecycle, and structural-index review requested for the physical design. It is still a design artifact: it contains no Prisma schema, executable SQL, migration, or application implementation.

### Primary key decision

The preferred strategy remains native PostgreSQL `uuid` columns populated by the application with UUIDv7 values. PostgreSQL should not generate IDs for the initial model. Application generation gives the modular monolith, workers, import paths, and future distributed writers one consistent identity boundary and permits IDs to be allocated before persistence. Database-generated UUIDs are not prohibited forever, but adopting them later would require an explicit convention change and compatibility review; they are not a second default.

All major persisted entities use UUID primary keys, including roots, join records, version rows, history rows, and idempotency records. No current immutable lookup-like entity justifies a different strategy: roles/permissions are not approved as physical reference tables, and small vocabularies are controlled values. A future internal metric or append-only technical table may use a numeric key only after a separate workload review; it would not change core domain identity.

UUIDv7 ordering is a locality optimization, not a chronological truth. Values created in the same timestamp range can be reordered by clock skew, concurrent writers, batching, or random bits; queries must use explicit timestamps for business ordering. The strategy is acceptable because it improves expected insertion locality over UUIDv4 without making identifiers enumerable, but it must not be used to infer event order.

The future JavaScript generator must:

- emit RFC 9562 UUIDv7 values with correct version and variant bits;
- use a trustworthy wall-clock millisecond source and tolerate clock rollback without producing invalid or misleading ordering guarantees;
- preserve sufficient monotonicity for same-process same-millisecond generation, or document the collision/order behavior if it does not;
- use cryptographically strong randomness for the non-time bits;
- return canonical lowercase hyphenated UUID text accepted by PostgreSQL `uuid` and Prisma's UUID scalar;
- be safe under concurrent asynchronous calls and worker processes;
- fail closed rather than silently falling back to predictable IDs;
- be covered by tests for format, version/variant bits, uniqueness under burst generation, rollback behavior, and independent process generation.

UUIDv4 remains the documented compatibility fallback if the supported Node runtime cannot meet these criteria. No package is selected in this review.

### Composite Tenant Parent Keys

A composite parent key is required only where a dependent relationship must be protected by a database-level same-tenant foreign key. A parent primary key alone is sufficient for global parents or relationships whose tenant alignment is deliberately a service rule.

| Parent Entity | Composite Candidate Key Needed? | Dependent Relationships | Reason |
|---|---|---|---|
| Membership | Yes: `(id, organizationId)` | HiringTeamMember, InterviewParticipant, actor/evaluator/creator membership references where tenant-bearing | User is global; membership context is tenant-owned. The pair prevents a tenant row from reusing another organization's membership. |
| Job | Yes: `(id, organizationId)` | Pipeline, Application, ApplicationForm, ApplicationSubmissionDeduplication | Job is a tenant root and is a high-risk cross-tenant boundary. |
| Pipeline | Yes: `(id, organizationId)` | PipelineStage, Application pipeline, stage history | Keeps workflow configuration and application placement in one organization. |
| PipelineStage | Yes, with pipeline context: `(id, pipelineId, organizationId)` where used | Application current stage, stage history | Stage identity alone is insufficient to prove that it belongs to the application's selected pipeline. |
| ApplicationForm | Yes: `(id, organizationId)` | ApplicationFormVersion | Form is tenant-owned through Job and is independently referenced by versions. |
| ApplicationFormVersion | Yes, with Job context: `(id, organizationId, jobId)` where used | Application exact version; question lineage through version | The Job context is needed to prevent selecting a version belonging to another Job's form. |
| Candidate | Yes: `(id, organizationId)` | Application, CandidateDocument, TalentPoolMember | Candidate identity is tenant-scoped and reusable only within its organization. |
| Application | Yes: `(id, organizationId)` | Interview, Offer, answers, stage/outcome history, submission result | Application is the tenant-owned lifecycle root for several sensitive records. |
| Interview | Yes: `(id, organizationId)` | InterviewParticipant, Scorecard | Prevents participants and feedback from crossing application/organization boundaries. |
| ScorecardTemplateVersion | Yes: `(id, organizationId)`; include Job context if template scope is Job-specific | Scorecard | A scorecard must retain the exact tenant-owned template version used for evaluation. |
| Offer | Yes: `(id, organizationId)` | OfferVersion | Offer terms are confidential historical records and must remain tenant-aligned. |
| TalentPool | Yes: `(id, organizationId)` | TalentPoolMember | Pool membership is a tenant-scoped relationship to a candidate. |
| Integration | Yes: `(id, organizationId)` | ExternalReference, IntegrationEvent, provider-owned communication references | Provider callbacks and external identities must resolve through the correct tenant connection. |

The extra context columns in the table are intentional denormalized integrity columns, not general query indexes. Do not add a composite unique merely because an entity has `organizationId`; add it when a dependent composite FK targets it.

### Application Integrity Constraint Map

`Application.organizationId` is required. Candidate, Job, and Pipeline relationships use same-tenant composite FKs. `currentPipelineStageId` is nullable until the Application is placed; when present, the application stores/uses the selected `pipelineId` and references a stage with matching `(stageId, pipelineId, organizationId)`. This prevents a stage from a different pipeline or tenant from being selected. A stage transition also validates that the pipeline is a configuration allowed for the Application's Job.

`formVersionId` is nullable for sources that do not submit through an application form, if that source policy is approved. When present, it uses a same-tenant FK carrying Job context so the exact version belongs to the Application's Job and its logical ApplicationForm. A simple `organizationId -> Organization` FK remains useful as a root check, but it is not sufficient by itself.

The database can enforce organization alignment, Candidate/Job/Pipeline identity, stage-to-pipeline identity, and form-version tenant/Job identity when the context columns are present. The service/transaction must additionally enforce that the selected Pipeline is associated with the Job, that a stage transition is legal, that the form version is published/usable for the submission source, and that concurrent current-state updates do not lose a change. Authorization still derives tenant context from the authenticated Membership rather than trusting a request-supplied organization ID.

### Pipeline Constraint Map

- A Job may have zero Pipelines while it is Draft when product policy permits it.
- There is at most one `ACTIVE` Pipeline per Job: use a partial unique index on the Job identity for rows whose status is `ACTIVE`.
- Retired Pipeline rows remain addressable so existing Applications and history retain their configuration context. Applications must reference the Pipeline used for their placement, not dynamically resolve the Job's newest active Pipeline.
- PipelineStage has a positive integer `position` and ordinary unique `(pipelineId, position)`; the same-tenant parent key is used where the stage is referenced with tenant context.
- Stage name/key uniqueness within a Pipeline is a UX/data-quality policy, not a required integrity invariant. If product later approves it, normalize a stable stage key and add ordinary scoped uniqueness.
- Used stages are retired/deactivated, not destructively removed. Referential restriction protects current and historical references.
- The database can enforce stage ownership and order; service transactions enforce legal transitions, allowed active-pipeline changes, and preservation of referenced stages.

Multiple retired Pipelines do not create Application ambiguity because the Application stores its selected Pipeline context. The active-per-Job rule concerns future configuration, not historical Application interpretation.

### Form Constraint Map

- `ApplicationForm` has one logical row per Job: ordinary unique `(jobId)` (or `(organizationId, jobId)` if the direct tenant key participates in the chosen composite design).
- `ApplicationFormVersion` has positive `versionNumber` and ordinary unique `(formId, versionNumber)`.
- At most one version is published/current for a form. Prefer a partial unique index over the published/current state when the version table retains all historical rows. A parent `currentPublishedVersionId` pointer is optional convenience state, not the historical authority, and requires a guarded transaction update if used.
- `ApplicationFormQuestion` has positive `position` and ordinary unique `(formVersionId, position)`. A stable question key is unique within a version if needed to identify answers, but display text is not a key.
- `ApplicationAnswer` has ordinary unique `(applicationId, questionId)`. The answer's Question must belong to the exact form version selected by the Application; this requires a composite/version-lineage FK strategy or a transaction/service validation when the ORM cannot express the full relationship.
- Published or submitted form versions and their questions are immutable. Publication, submission, and any later correction workflow are service/transaction rules.

### Membership and Invitation Constraints

Use one persistent Membership row per `(organizationId, userId)`. Status and role change on that row; inactive/removed history belongs in membership/audit history rather than duplicate Membership rows. This gives one unambiguous authorization context and ordinary unique `(organizationId, userId)`. Role is a fixed required field, initially CHECK-constrained text. Active status is required by authorization and assignment services, not encoded by allowing duplicate rows.

Invitation stores a deterministically normalized invitation email plus the original/display form according to the privacy policy. History rows remain after acceptance, expiry, or revocation. Enforce one active/pending invitation per `(organizationId, normalizedEmail)` with a partial unique index covering the active state set. Acceptance must be transactional: consume the invitation, create or reuse the persistent Membership, and reject an already-consumed invitation. Expiry/revocation transitions are service rules; the index protects the race between concurrent invitations.

### Candidate Constraints

Candidate identity is tenant-scoped through `(id, organizationId)`. Email is nullable, normalized when supplied, indexed later for lookup, and never unique. Multiple candidates may share an email, and a candidate may exist before any Application. Archival/anonymization is a controlled workflow that preserves required relationships and replaces/redacts PII according to the future privacy field map. CandidateDocument uses a same-tenant composite relationship to Candidate; optional Application/Offer associations require their own context validation and must not weaken Candidate ownership.

### Interview / Participant Constraints

Interview uses a same-tenant composite FK to Application. InterviewParticipant uses same-tenant composite FKs to Interview and Membership, plus ordinary unique `(interviewId, membershipId)` to prevent duplicate assignment. Initially only internal Membership participants are modeled; external participants remain a product decision.

The database can prove Interview/Application and participant/Membership tenant alignment and assignment uniqueness. It cannot by itself decide whether a Membership is active, whether the participant is permitted to see the Interview, or whether an actor may schedule/cancel/edit it. Those are authorization/resource-policy and service rules. Scorecard eligibility may additionally require the evaluator to be a current InterviewParticipant; that is covered below.

### Scorecard Constraints

Use ordinary unique `(interviewId, evaluatorMembershipId)` for one current Scorecard assignment when the row is persistent and status changes from Draft to Submitted. If superseded/reassigned Scorecards share the same table, replace this with a partial unique index over the active/non-superseded state set. The evaluator Membership and TemplateVersion use same-tenant composite FKs. If templates are Job-scoped, the template version also carries Job context and the Scorecard transaction verifies it matches the Interview's Application Job.

ScorecardResponse has ordinary unique `(scorecardId, criterionId)`. The criterion must belong to the exact TemplateVersion referenced by the Scorecard; use a context-bearing composite relationship where practical and service validation otherwise. Draft responses are mutable. Submitted Scorecards and responses are locked by service/transaction rules; any correction must preserve the submitted record and require an explicit, authorized amendment workflow. The evaluator-must-be-assigned-participant rule is a service/authorization rule even when a database relationship can record the assignment.

### Offer Constraints

Offer uses a same-tenant composite FK to Application and has at most one active Offer per Application through a partial unique index over the approved active state set. Multiple historical or superseded Offer attempts remain. OfferVersion has positive `versionNumber` and ordinary unique `(offerId, versionNumber)`. A current/latest version pointer is not required for correctness; it is derivable as the latest valid version or may be retained as a guarded convenience pointer if reads justify it. Issued versions are immutable. Issue, withdraw, accept, supersede, reissue, and the rule that an accepted Offer is not a Hire are service/transaction/domain rules, not ordinary FK constraints.

### Talent Pool Constraints

TalentPool name uniqueness is not required for relational integrity; recommend ordinary unique `(organizationId, normalizedName)` only if the product wants duplicate-name prevention as a UX rule. TalentPoolMember uses same-tenant composite FKs to TalentPool and Candidate and ordinary unique `(talentPoolId, candidateId)`. The initial model is current-state only: membership is removed/deactivated intentionally, without inventing a history table. Archived Candidates may remain in a pool so historical organization curation is not silently lost; service policy controls whether they are hidden from active views.

### Idempotency Constraints

`ApplicationSubmissionDeduplication` requires `organizationId`, `source/surface`, and an opaque `submissionKey`. The minimum candidate key is `(organizationId, sourceOrSurface, submissionKey)`; include `jobId` only if the product defines keys as Job-local. Although `organizationId` is technically derivable from Job, retaining it is desirable for safe cleanup, tenant-scoped operations, and a direct composite boundary. `jobId` therefore uses a same-tenant FK.

`applicationId` is nullable while processing and becomes non-null when completion creates the Application. If a completed row has an Application, the result must be same-tenant. Processing status is required and should have a CHECK-constrained allowed set such as pending/completed/failed; retryability and terminal semantics remain service rules. Add a structural cleanup-support index on expiration/created time only if the table is retained for cleanup; exact TTL is deliberately not decided here. This mechanism is separate from IntegrationEvent and must not share identity rules.

IntegrationEvent idempotency is scoped to the tenant-owned Integration/provider boundary. The candidate uniqueness is `(integrationId, providerEventId)` or `(organizationId, providerKind, externalEventId)` when events arrive before a connection can be resolved; the final form depends on the callback contract. IntegrationEvent must have a same-tenant relationship to Integration and retain processing outcome for duplicate callback protection. ExternalReference is a separate identity relation, scoped by Integration plus provider object type/external ID; it must not be merged with event identity.

### Partial Unique Index Matrix

| Invariant | Preferred Enforcement | Why | Prisma-native? | Custom PostgreSQL migration later? |
|---|---|---|---|---|
| One ACTIVE Pipeline per Job | Partial unique index | Retired configurations remain in the same table and only ACTIVE is exclusive | No general portable declaration | Yes |
| One published/current FormVersion per Form | Partial unique index | Historical versions remain and only one can be published | No | Yes |
| One active/pending Invitation per organization/email | Partial unique index | Terminal invitation history must remain | No | Yes |
| One active Scorecard per Interview/evaluator | Ordinary unique if rows are current assignment rows; partial unique if superseded rows share the table | Avoid a partial index unless historical row shape requires it | Ordinary unique: yes; partial: no | Partial form: yes |
| One active Offer per Application | Partial unique index | Multiple historical offer attempts are explicitly allowed | No | Yes |
| One active TalentPoolMember per Pool/Candidate | Ordinary unique `(poolId, candidateId)` | Initial membership is current-state only; no historical duplicate rows | Yes | No |
| Current Integration/provider reference | No generic invariant yet | Provider current-reference semantics are not approved; enforce per provider when known | Depends on final shape | Only if a provider-specific rule is approved |

Partial indexes are justified only where retained historical rows coexist with an exclusive active subset. Ordinary uniqueness is simpler for current-state-only relationships. Application transactions must still handle unique violations as concurrency outcomes.

### CHECK vs Enum Decision Matrix

HiringLoop's consistent default is CHECK-constrained text for controlled business values. This keeps lifecycle evolution reviewable and avoids PostgreSQL enum alteration choreography. Arbitrary CHECK constraints are not fully represented by Prisma and will require custom migration SQL later; application validation remains necessary for useful errors and transition guards.

| Vocabulary | Classification | Decision |
|---|---|---|
| Membership role | CHECK-constrained text | Fixed initial roles, with room for policy evolution. |
| Invitation status | CHECK-constrained text | Lifecycle values and active-state predicate need migration-level visibility. |
| Job status | CHECK-constrained text | Product lifecycle may expand; transitions are service-owned. |
| Pipeline status | CHECK-constrained text | Supports active/retired configuration lifecycle. |
| Application status | CHECK-constrained text | State values need storage protection while transitions stay in services. |
| Scorecard status | CHECK-constrained text | Draft/submitted locking is not reducible to a type. |
| Offer status | CHECK-constrained text | Workflow and reissue states may evolve. |
| Communication status | CHECK-constrained text | Delivery states and provider behavior evolve. |
| Document type/status | CHECK-constrained text | Resume/document lifecycle is controlled but not a stable reference taxonomy. |
| Integration/provider type | CHECK-constrained text after initial provider set is approved | Mechanism is consistent; exact allowed values remain provider-scope work. |

PRISMA ENUM is not recommended for the current controlled vocabularies. Reference tables are deferred because no current requirement needs tenant-configurable vocabulary, localized labels, or metadata-bearing states. DEFER means the exact value set/provider catalog, not the default storage mechanism.

### NULL, UNIQUE, and Partial-Index Semantics

PostgreSQL permits multiple NULLs in ordinary unique constraints. This is correct for nullable Candidate email, nullable Application formVersionId for non-form sources, nullable in-process `applicationId`, optional provider IDs, and optional current pointers. No uniqueness rule may rely on NULL to mean “only one absent value.” If “one current value” is required, use a non-null pointer with guarded service updates or a partial unique index on rows where the value/state is present.

Invitation normalized email is required for invitation creation; a missing email cannot participate in the active-invitation invariant. Optional provider identifiers are unique only when non-null and only within their Integration/provider/object scope. A candidate's absent email does not create a global or tenant-wide uniqueness claim.

### Referential Action Matrix

| Relationship | Preferred action | Rationale |
|---|---|---|
| Organization -> Membership, Job, Candidate | RESTRICT / NO ACTION | Close/archive/anonymize the tenant; never cascade recruiting history. |
| User -> Membership and actor/evaluator references | RESTRICT; SET NULL only for explicitly nullable non-account attribution | Deactivate identities while preserving accountability. |
| Organization -> Invitation | RESTRICT / archive | Security history is retained. |
| Job -> Pipeline, ApplicationForm, Application | RESTRICT | Jobs close/archive; their history remains addressable. |
| Pipeline -> PipelineStage | RESTRICT | Retire stages; preserve references. |
| Candidate -> Application, CandidateDocument, TalentPoolMember | RESTRICT | Controlled anonymization preserves history. |
| Application -> StageHistory, Answers, Interview, Offer | RESTRICT | Do not erase recruiting history through a parent delete. |
| ApplicationFormVersion -> submitted Application | RESTRICT | Exact submitted version must remain reproducible. |
| Interview -> Participants, Scorecards | RESTRICT | Cancellation is not deletion of assignment or feedback history. |
| Scorecard -> Responses | RESTRICT | Submitted feedback must not disappear. |
| Offer -> OfferVersion | RESTRICT | Issued terms are immutable evidence. |
| TalentPool -> TalentPoolMember | RESTRICT or controlled deactivation | Membership changes are explicit. |
| Integration -> ExternalReference/Event | RESTRICT or archive | Provider reconciliation history remains available. |
| Optional actor Membership/User reference | SET NULL only when approved by attribution policy | Preserve the record if the actor can no longer be retained. |

CASCADE is reserved for narrowly owned disposable dependents that are not authoritative business history. No update cascade is needed because UUID identities are immutable.

### Structural Index Matrix

| Index class | Decision | Scope |
|---|---|---|
| Required for identity | Required | Primary-key indexes and ordinary unique indexes, including all composite parent keys targeted by composite FKs. |
| Required for exclusive lifecycle invariant | Required | The partial unique indexes listed above for active Pipeline, published FormVersion, active Invitation, and active Offer; Scorecard only when its history shape requires it. |
| Required for provider idempotency | Required | Integration/provider external-event and external-reference uniqueness indexes once provider scope is finalized. |
| Recommended for FK maintenance | Recommended selectively | Child-side indexes for high-volume composite relationships and controlled parent archive/restrict checks, especially Application `(organizationId, candidateId/jobId/pipelineId)`, history/interview/offer `(organizationId, applicationId)`, stage/form/interview/scorecard/pool/integration children by their parent context. |
| Cleanup support | Recommended if cleanup is scheduled | Deduplication expiration/createdAt support index; exact predicate and TTL are deferred. |
| Query-performance indexes | Defer | Search, list ordering, pagination, dashboard, reporting, covering, expression, and full-text indexes belong to the later query-pattern review. |

PostgreSQL does not automatically create indexes on referencing columns. Child-side indexes are therefore recommended where parent updates/deletes, tenant-scoped joins, or high-volume relationship maintenance would otherwise scan a large child table. They are not an “index every FK” rule: small/low-write relationships can defer until measured query and write/storage costs justify them.

### Prisma / PostgreSQL / Service Enforcement Matrix

| Approved constraint/rule | Prisma schema direct | Custom PostgreSQL migration | Service/transaction rule | Authorization policy |
|---|---:|---:|---:|---:|
| UUID scalar PK and ordinary FK | Yes | No normally | ID generation and friendly error mapping | Tenant/resource checks still required |
| Ordinary composite unique | Yes | No normally | Validate conflict and tenant context | No |
| Ordinary composite same-tenant FK | Representable, requiring a Prisma proof-of-concept | Review exact generated constraint/action | Supply trusted tenant context | Defense in depth only |
| Partial unique index | No general portable form | Yes | Handle race/unique violation | No |
| CHECK-constrained text | Not fully portable | Yes | Validate values and transitions | No |
| Positive position/version number | Basic scalar direct; bound check needs migration | Yes for CHECK | Reorder/version transaction | No |
| Stage belongs to Application Pipeline | Not as a simple independent FK | Possible only with full denormalized context key | Yes, including Job/Pipeline lifecycle | Resource authorization also applies |
| FormVersion belongs to Application Job and Question matches exact version | Partial relation shape only | Possible with context-bearing keys | Yes for source/publication/submission state | Tenant access policy |
| Submitted Scorecard immutability | No | Trigger not recommended initially | Yes, guarded state transition and amendment workflow | Evaluator/visibility policy |
| Evaluator must be InterviewParticipant | Relationship uniqueness can be direct | Not generally sufficient without complex assertion | Yes | Yes, resource assignment authorization |
| Offer state transitions and accepted Offer != Hire | No | No generic FK | Yes | Confidential offer policy |
| Cross-tenant access prevention | No | Composite FKs reinforce data integrity | Yes on every repository/use case | Yes, authoritative boundary |
| Delete/archive/anonymization policy | Relation actions are representable | Exact actions may need migration review | Yes, controlled workflow | Yes, privileged operation policy |

### Final Constraint Readiness Review

- Entity keys: sufficiently defined; UUID PKs and business unique keys are separated.
- Tenant composite keys: sufficiently defined for high-risk dependent relationships; redundant keys are explicitly rejected.
- FK relationships: sufficiently defined, including Application context and exact form/stage lineage.
- Uniqueness: sufficiently defined for membership, versions, positions, answers, participants, responses, offers, pools, and provider scopes.
- Partial indexes: sufficiently defined for active/published/pending semantics, with ordinary unique alternatives where simpler.
- CHECK/enum decisions: sufficiently defined; CHECK text is the project default and Prisma migration work is visible.
- Delete actions: sufficiently defined around restrictive history preservation, controlled SET NULL, and no broad cascades.
- Structural indexes: sufficiently defined as required identity indexes, selective FK-maintenance indexes, and deferred query indexes.

Remaining pre-Prisma decisions are the UUID generator/runtime proof, exact approved status values, manual/import form nullability, provider callback scope, final direct-context columns for lower-risk children, Note target shape, offer terms representation, and the anonymization/retention field map. These can be resolved during Prisma implementation planning without changing the reviewed integrity principles. Product decisions that would materially change duplicate Applications, external participants, or retention must be accepted before those feature schemas are implemented.

This review approves proceeding to the separate QUERY PATTERN + PERFORMANCE INDEX design task. It does not mark Phase 02 complete and does not approve creating Prisma files, migrations, SQL, or application database code.
