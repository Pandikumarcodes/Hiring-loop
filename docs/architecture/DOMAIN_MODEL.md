# HiringLoop Domain Model

## Purpose

This document defines HiringLoop's conceptual business domain before implementation. It identifies entities, ownership, relationships, lifecycle, invariants, current state, and history without choosing physical tables, an ORM, APIs, or infrastructure.

It guides backend modules, future database design, API boundaries, authorization, frontend feature boundaries, and activity/audit design. The repository has no local PRD; unconfirmed product behavior is marked **Proposed / Requires Product Decision**.

## Modeling Scope and Conventions

An **entity** has stable conceptual identity. An attribute describes an entity. A **value object** is descriptive data identified by its values and containing context. Current state answers “what is true now”; historical state records what happened. Cardinalities below are conceptual, not schema instructions.

## Core Domain Areas

| Area | Responsibility and primary concepts |
|---|---|
| Identity | User identity; Auth separately owns credentials, sessions, and provider identities. |
| Organization | Tenant boundary, organization lifecycle, and settings. |
| Authorization | Membership, invitations, roles, permissions, and policy context. |
| Jobs | Hiring requirements, hiring team, application form, and job lifecycle. |
| Applications | One Candidate's candidacy for one Job, answers, source, status, and job-specific workflow. |
| Candidates | Reusable organization-scoped candidate profile and candidate-level information. |
| Documents/Resumes | Uploaded resource metadata and ownership; original documents remain source records. |
| Pipeline | Job workflow configuration, stages, placement, and movement history. |
| Interviews | Scheduled/conducted events, participants, availability, and provider references. |
| Feedback | Scorecard templates, scorecards, responses, and interviewer evaluation. |
| Collaboration | Internal notes, comments, and mentions. |
| Communications | Templates, message intent, recipients, delivery status, and provider references. |
| Offers | Proposal terms, offer lifecycle, versions, and documents. |
| Talent Pool | Organization-managed candidate collections and membership. |
| Notifications | User-facing alerts and read/delivery state triggered by several domains. |
| Analytics | Derived metrics and reporting views; never authoritative recruiting state. |
| Activity | User-visible recruiting timeline and business history. |
| Audit | Protected security/administrative trace of sensitive changes. |
| Integrations | External-provider connections, references, synchronization, and errors; providers are not domain authorities. |
| Future AI boundary | Reserved only. No AI entities, implementation, model, parsing, or decision behavior is defined here. |

## Core Entities

The catalog below documents each requested entity's purpose, identity, owner, tenant ownership, lifecycle, relationships, invariants, and temporal character. These are conceptual responsibilities, not database models.

### Identity and authorization

#### User

- **Purpose:** global person/account identity that can authenticate or participate in organizations.
- **Identity/owner:** stable account identity; Users owns profile, Auth owns credentials/sessions/provider links.
- **Tenant:** global identity, not inherently tenant-owned.
- **Lifecycle:** created, active, possibly deactivated; exact recovery/deletion states are **Proposed / Requires Product Decision**.
- **Relationships:** `1 → many OrganizationMemberships`; may act in jobs, interviews, feedback, collaboration, offers, notifications, and audit.
- **Invariants:** identity alone grants no organization access.
- **Time:** current profile plus separate authentication/action history.

#### Organization

- **Purpose:** tenant/workspace for one recruiting business.
- **Identity/owner:** stable tenant root; Organizations.
- **Tenant:** root of tenant-owned data.
- **Lifecycle:** created → active; suspended/closed are **Proposed / Requires Product Decision**.
- **Relationships:** `1 → many Memberships, Jobs, Candidates, Notifications, ActivityRecords, AuditRecords`; indirectly owns applications, pipelines, interviews, communications, offers, and documents.
- **Invariants:** every tenant object belongs to one organization; cross-organization access is forbidden.
- **Time:** current tenant state plus lifecycle audit/history.

#### OrganizationMembership

- **Purpose:** a User's relationship and authorization context in one Organization.
- **Identity/owner:** User–Organization relationship; Users/Authorization.
- **Tenant:** organization-owned relationship data referencing global User.
- **Lifecycle:** invited/pending → active → suspended/removed; re-invitation rules are **Proposed / Requires Product Decision**.
- **Relationships:** `many → 1 User`, `many → 1 Organization`, `many → 1+ Roles` depending on policy.
- **Invariants:** membership is required for tenant access; roles are contextual to this organization.
- **Time:** current membership/role state plus membership and authorization history.

#### Invitation

- **Purpose:** invitation process for joining an Organization.
- **Identity/owner:** invitation/process identity; Users/Organizations.
- **Tenant:** organization-owned.
- **Lifecycle:** pending → accepted, expired, or revoked; states are **Proposed / Requires Product Decision**.
- **Relationships:** one Organization; email or User target; accepted invitation may create/activate one Membership.
- **Invariants:** acceptance is bound to the intended organization and assigned access.
- **Time:** current process state plus security/audit history.

#### Role

- **Purpose:** named grouping of permissions in an organization context.
- **Identity/owner:** scoped role definition; Users/Authorization.
- **Tenant:** system roles may be global; custom roles are **Proposed / Requires Product Decision** as organization-owned.
- **Lifecycle:** defined, assigned, changed, retired; customization is **Proposed / Requires Product Decision**.
- **Relationships:** many-to-many with Memberships and Permissions conceptually.
- **Invariants:** role cannot grant outside policy; changes must not silently escalate access.
- **Time:** current policy plus assignment/audit history.

#### Permission

- **Purpose:** atomic capability such as managing jobs or viewing audit records.
- **Identity/owner:** stable policy key; Users/Authorization.
- **Tenant:** generally global vocabulary; effective permission is membership-contextual.
- **Lifecycle:** defined/versioned/retired by policy.
- **Relationships:** assigned through Roles or another approved policy mechanism.
- **Invariants:** backend checks effective permission; frontend visibility is not authority.
- **Time:** current policy plus sensitive policy-change audit.

### Jobs, applications, candidates, and documents

#### Job

- **Purpose:** hiring requirement/requisition and job-specific configuration.
- **Identity/owner:** organization-scoped job; Jobs.
- **Tenant:** organization-owned.
- **Lifecycle:** `Draft → Published → Paused → Closed → Archived`; reopen and exact transition rules are **Proposed / Requires Product Decision**.
- **Relationships:** team members, one default/configurable ApplicationForm, one/configurable Pipeline, many Applications.
- **Invariants:** lifecycle/configuration requires authorization; closed/archived acceptance behavior needs an explicit rule.
- **Time:** current configuration/lifecycle plus activity/audit history.

#### JobHiringTeamMember

- **Purpose:** assigns an organization member to a Job with a recruiting responsibility.
- **Identity/owner:** Job–Membership relationship; Jobs.
- **Tenant:** organization-owned context data.
- **Lifecycle:** assigned, role changed, unassigned.
- **Relationships:** many → 1 Job and many → 1 OrganizationMembership.
- **Invariants:** member is active and in the same organization; assignment never bypasses authorization.
- **Time:** current assignment plus assignment history.

#### ApplicationForm

- **Purpose:** application questions and configuration for a Job.
- **Identity/owner:** form/revision associated with a Job; Jobs, consumed by Applications.
- **Tenant:** organization-owned through Job.
- **Lifecycle:** draft/configured → published/used → revised/retired; versioning is **Proposed / Requires Product Decision**.
- **Relationships:** `1 → many ApplicationQuestions`; one Job/default form is the working assumption.
- **Invariants:** historical submissions remain interpretable when forms change.
- **Time:** current form plus revisions/snapshots if required.

#### ApplicationQuestion

- **Purpose:** one question with validation and presentation semantics.
- **Identity/owner:** identity within a form revision; Jobs/Application Forms.
- **Tenant:** organization-owned through form/job.
- **Lifecycle:** configured, active, retired; reuse across forms is **Proposed / Requires Product Decision**.
- **Relationships:** one form; many conceptual answers across applications.
- **Invariants:** answer type/validation matches the applicable question version.
- **Time:** current definition plus historical definition.

#### ApplicationAnswer

- **Purpose:** Candidate's answer to one question in one Application.
- **Identity/owner:** answer within a submission; Applications.
- **Tenant:** organization-owned through Application/Job.
- **Lifecycle:** submitted; later edits/revisions are **Proposed / Requires Product Decision**.
- **Relationships:** many → 1 Application and many → 1 ApplicationQuestion.
- **Invariants:** Application, question, form, and Job contexts align.
- **Time:** submitted state plus revisions if edits are permitted.

#### Candidate

- **Purpose:** reusable organization recruiting profile for a person.
- **Identity/owner:** organization-scoped candidate identity; Candidates.
- **Tenant:** organization-owned; different organizations may have separate records for the same person.
- **Lifecycle:** active/archived/merged/anonymized are **Proposed / Requires Product Decision**.
- **Relationships:** `1 → many Applications, CandidateDocuments/Resumes, CandidateNotes, Communications, pool memberships`; offers through applications.
- **Invariants:** candidate data does not carry one application's stage/status; merge/anonymization preserves permitted traceability.
- **Time:** current normalized profile plus profile/activity/audit history.

#### Application

- **Purpose:** one Candidate's candidacy for one Job.
- **Identity/owner:** Candidate–Job relationship with independent identity; Applications.
- **Tenant:** organization-owned; Candidate and Job must share organization.
- **Lifecycle:** `Applied → Screening → Interview → Offer → Hired`; Rejected is an exit retaining history. Withdrawn/other exits are **Proposed / Requires Product Decision**.
- **Relationships:** many → 1 Candidate, many → 1 Job, many → 1 current PipelineStage; many Answers, ActivityRecords, Interviews, and possibly Offers.
- **Invariants:** valid same-tenant Candidate/Job; current stage is in the Job's Pipeline; transitions retain history.
- **Time:** current status/stage plus append-oriented history.

#### Resume

- **Purpose:** uploaded resume source document/resource.
- **Identity/owner:** resource/version identity; Candidates/Documents.
- **Tenant:** organization-owned through Candidate; later file bytes may be in object storage while metadata remains authoritative in PostgreSQL.
- **Lifecycle:** uploaded → available/associated → superseded/deleted per policy; exact states are **Proposed / Requires Product Decision**.
- **Relationships:** belongs to Candidate; may be referenced by Application.
- **Invariants:** original source remains separate from normalized/derived profile; private access is authorized.
- **Time:** current resource/version plus upload/access/deletion history.

#### CandidateDocument

- **Purpose:** broader candidate-related document metadata/association, including Resume.
- **Identity/owner:** document/resource identity; Candidates/Documents.
- **Tenant:** organization-owned through Candidate.
- **Lifecycle:** uploaded, active, superseded, archived, deleted per retention policy; exact states are **Proposed / Requires Product Decision**.
- **Relationships:** many → 1 Candidate; may link to Application or Offer.
- **Invariants:** metadata/access scope matches Candidate's organization; required history is not erased by file deletion.
- **Time:** current metadata/resource plus versions and access/audit history.

### Pipeline, interview, and feedback

#### Pipeline

- **Purpose:** workflow configuration used by Applications for a Job.
- **Identity/owner:** pipeline identity associated with Job; Pipeline.
- **Tenant:** organization-owned through Job.
- **Lifecycle:** configured, active, retired; exact lifecycle is **Proposed / Requires Product Decision**.
- **Relationships:** `1 → many PipelineStages`; associated with Job; used by Applications.
- **Invariants:** stages belong to this pipeline; configuration changes do not invalidate history.
- **Time:** current configuration plus revisions/transition history.

#### PipelineStage

- **Purpose:** ordered step within a Pipeline.
- **Identity/owner:** stable stage within pipeline; Pipeline.
- **Tenant:** organization-owned through Pipeline/Job.
- **Lifecycle:** active, reordered, retired; edit rules are **Proposed / Requires Product Decision**.
- **Relationships:** one Pipeline; many placements/transitions.
- **Invariants:** cannot place an Application from another Pipeline/Job; terminal semantics need product decision.
- **Time:** current definition plus historical definition/transition context.

#### ApplicationStage / PipelinePlacement

- **Purpose:** current placement of an Application in a PipelineStage.
- **Identity/owner:** Application–Stage current relationship; Pipeline coordinated with Applications.
- **Tenant:** organization-owned through Application/Pipeline.
- **Lifecycle:** changes on movement; old placement is history, not discarded meaning.
- **Relationships:** many → 1 Application and many → 1 PipelineStage conceptually; one current placement per Application.
- **Invariants:** stage belongs to Job's Pipeline; accepted movement records actor/time and prior/new state in history.
- **Time:** current state only; transitions are Activity/history.

#### Interview

- **Purpose:** scheduled or conducted event for an Application/Candidate.
- **Identity/owner:** event identity; Interviews.
- **Tenant:** organization-owned through Application/Job.
- **Lifecycle:** `Draft/Pending → Scheduled → Completed`; Cancelled/No-show are **Proposed / Requires Product Decision**.
- **Relationships:** many → 1 Application; many-to-many Users through InterviewParticipants; `1 → many Scorecards`; Availability and integration references.
- **Invariants:** participants are permitted; rescheduling preserves context; provider is not sole authority.
- **Time:** current event state plus reschedule/cancel/activity/audit history.

#### InterviewParticipant

- **Purpose:** assigns a User/participant and role to an Interview.
- **Identity/owner:** Interview–participant relationship; Interviews.
- **Tenant:** organization-owned through Interview.
- **Lifecycle:** assigned/invited, confirmed, declined, removed; exact states are **Proposed / Requires Product Decision**.
- **Relationships:** many → 1 Interview; normally many → 1 User.
- **Invariants:** internal interviewer has valid membership; feedback eligibility follows this permitted association.
- **Time:** current assignment plus response history.

#### Availability

- **Purpose:** time window used in Interview arrangement.
- **Identity/owner:** availability submission/window; Interviews.
- **Tenant:** organization-owned scheduling context; calendar details remain integration references.
- **Lifecycle:** proposed, selected, expired, withdrawn; **Proposed / Requires Product Decision**.
- **Relationships:** scheduling process; references User/Candidate as applicable.
- **Invariants:** availability is not a scheduled Interview; timezone/context are preserved.
- **Time:** time-bound current proposal plus scheduling history.

#### ScorecardTemplate

- **Purpose:** reusable evaluation criteria/questions.
- **Identity/owner:** template/revision; Feedback.
- **Tenant:** organization-owned; organization-wide vs Job-scoped is **Proposed / Requires Product Decision**.
- **Lifecycle:** draft, active, retired; exact states are **Proposed / Requires Product Decision**.
- **Relationships:** creates Scorecards; may relate to Job, Interview type, or Interview.
- **Invariants:** revision changes do not reinterpret submitted feedback.
- **Time:** current configuration plus historical versions.

#### Scorecard

- **Purpose:** one evaluation assigned to an interviewer for an Interview.
- **Identity/owner:** Interview–interviewer evaluation instance; Feedback.
- **Tenant:** organization-owned through Interview/Application.
- **Lifecycle:** requested/draft → submitted → locked or editable by policy; edit policy is **Proposed / Requires Product Decision**.
- **Relationships:** many → 1 Interview; evaluator User; template version; Responses.
- **Invariants:** only permitted interviewer submits; correct Interview/Application/Job context; does not itself decide hire.
- **Time:** current review state plus submission/edit history.

#### ScorecardResponse

- **Purpose:** answer/rating/comment for one Scorecard criterion.
- **Identity/owner:** response within Scorecard/template version; Feedback.
- **Tenant:** organization-owned through Scorecard.
- **Lifecycle:** draft/submitted/locked with Scorecard.
- **Relationships:** one Scorecard and one criterion/version.
- **Invariants:** format matches criterion; visibility follows a policy that is **Proposed / Requires Product Decision**.
- **Time:** current response plus edit/submission history.

### Collaboration, communication, offers, notifications, and records

#### CandidateNote

- **Purpose:** internal recruiting note for Candidate or Application context.
- **Identity/owner:** note identity; Collaboration.
- **Tenant:** organization-owned.
- **Lifecycle:** created, edited, archived/deleted subject to policy; mutability is **Proposed / Requires Product Decision**.
- **Relationships:** Candidate, optional Application, author Membership/User.
- **Invariants:** visibility/edit requires authorization; never crosses tenants.
- **Time:** current content plus edit/activity/audit history.

#### Comment

- **Purpose:** discussion entry attached to a supported recruiting object.
- **Identity/owner:** comment/thread identity; Collaboration.
- **Tenant:** organization-owned.
- **Lifecycle:** posted, edited, removed under policy; moderation/retention is **Proposed / Requires Product Decision**.
- **Relationships:** author User/Membership; Candidate, Application, Interview, or other supported context.
- **Invariants:** author/viewers are authorized; removal preserves required audit trace.
- **Time:** current content plus thread/edit history.

#### Mention

- **Purpose:** User reference in Note/Comment that may trigger a Notification.
- **Identity/owner:** mention within parent item; Collaboration.
- **Tenant:** organization-owned through parent.
- **Lifecycle:** created/updated with parent; notification read/delivery is separate.
- **Relationships:** many → 1 Note/Comment and many → 1 User.
- **Invariants:** recipient can view parent; mention grants no access.
- **Time:** historical collaboration event.

#### EmailTemplate

- **Purpose:** reusable organization communication content and variables.
- **Identity/owner:** template/revision; Communications.
- **Tenant:** organization-owned; global defaults are possible but **Proposed / Requires Product Decision**.
- **Lifecycle:** draft, active, retired; approval/version policy is **Proposed / Requires Product Decision**.
- **Relationships:** used by Communications triggered by other workflows.
- **Invariants:** substitution is safe and context-authorized; sensitive content remains tenant-scoped.
- **Time:** current content plus revisions.

#### Communication

- **Purpose:** message intent and delivery history, e.g. candidate email.
- **Identity/owner:** message/request identity independent of provider message ID; Communications.
- **Tenant:** organization-owned.
- **Lifecycle:** requested/queued → sent/delivered or failed; scheduled/bounced/cancelled are **Proposed / Requires Product Decision**.
- **Relationships:** recipients, optional EmailTemplate, source Candidate/Application/Interview/Offer, provider reference.
- **Invariants:** provider status cannot overwrite source workflow; retries must not unintentionally duplicate; recipient access is scoped.
- **Time:** current delivery state plus delivery-attempt history.

#### Offer

- **Purpose:** proposal of employment terms in a recruiting context.
- **Identity/owner:** offer and version/terms identity; Offers.
- **Tenant:** organization-owned.
- **Lifecycle:** `Draft → Sent → Viewed → Accepted / Declined`; Withdrawn/Expired are **Proposed / Requires Product Decision**.
- **Relationships:** Candidate/Application/Job context; OfferDocuments; Communications; Activity/Audit.
- **Invariants:** all contexts agree; terms are confidential; acceptance is not automatically Hire.
- **Time:** current status/version plus decision/audit history.

#### OfferDocument

- **Purpose:** offer terms/artifact document.
- **Identity/owner:** document/version; Offers, with storage boundary collaboration.
- **Tenant:** organization-owned through Offer.
- **Lifecycle:** generated/uploaded, issued, superseded, archived/deleted; exact states are **Proposed / Requires Product Decision**.
- **Relationships:** many → 1 Offer; storage and Communication references.
- **Invariants:** permitted access; terms and document versions remain traceable.
- **Time:** current version plus issuance/access history.

#### Notification

- **Purpose:** in-product/user-facing alert for one recipient.
- **Identity/owner:** notification identity; Notifications.
- **Tenant:** organization-owned with User/Membership recipient context.
- **Lifecycle:** created/unread → read/dismissed; delivery/retry states are **Proposed / Requires Product Decision**.
- **Relationships:** Organization, recipient, source Mention/Interview/Application/Communication/Offer/event.
- **Invariants:** recipient eligibility and source authorization are checked; reading does not change source state by implication.
- **Time:** current read/delivery state plus creation history.

#### ActivityRecord

- **Purpose:** user-visible business recruiting timeline entry.
- **Identity/owner:** event identity with type, actor, target, timestamp; Activity, generated with owning modules.
- **Tenant:** organization-owned.
- **Lifecycle:** append-oriented; correction/redaction is **Proposed / Requires Product Decision**.
- **Relationships:** Candidate/Application/Job/Interview/Offer and other contexts.
- **Invariants:** important transitions generate activity; activity is not an audit substitute.
- **Time:** historical record.

#### AuditRecord

- **Purpose:** protected security/business-critical trace of actor, action, target, time, and change metadata.
- **Identity/owner:** append-oriented audit event; Audit.
- **Tenant:** organization-scoped for tenant actions; controlled global/system scope may be needed.
- **Lifecycle:** append-only/append-oriented with restricted retention/redaction; exact policy is **Proposed / Requires Product Decision**.
- **Relationships:** generated by relevant modules; actor User/Membership and target resource.
- **Invariants:** critical mutations are auditable; access is restricted; history is not silently rewritten.
- **Time:** historical security/administrative record.

## Important Domain Distinctions

### User vs Organization Membership

User is a person/account identity. Membership is that User's relationship with one Organization. A User can belong to multiple organizations with different roles or none. Roles and organization-specific permissions therefore belong to membership/context, not globally to User, preventing tenant leakage and allowing action-specific authorization.

### Candidate vs Application

Candidate is a reusable organization recruiting record. Application is that Candidate's relationship with one Job. One Candidate can have many Applications, each with independent answers, stage, status, interviews, feedback, and outcome. Duplicating Candidate per application causes conflicting profile data, poor deduplication, and lost cross-job history.

### Job vs Pipeline

Job is the hiring requirement and its lifecycle/configuration. Pipeline is the workflow stages used to process the Job's Applications. They are related but distinct: publishing a job and configuring stages are different business actions and owners.

### Current Stage vs Stage History

Current stage is present state. Activity/stage-transition history records prior stage, new stage, actor, and time. History cannot be reconstructed from the current placement alone because prior placements are lost.

### Interview vs Feedback

Interview is the scheduled/conducted event. Scorecard/Feedback is an interviewer's evaluation. One Interview can have multiple participants and feedback submissions, and can exist before feedback.

### Activity vs Audit

Activity is user-visible recruiting history. Audit is protected accountability history for security/administration. One action may produce both, but they differ in audience, retention, redaction, and access.

### Offer vs Hire

Offer is a proposal. Hire is a business outcome/explicit transition. Acceptance must not equal Hire unless a separately approved workflow performs that transition. No separate Hire entity is defined; this is **Proposed / Requires Product Decision**.

### Resume vs Candidate Profile

Resume is an uploaded source document. Candidate Profile is normalized data. Future processing may derive profile suggestions, but the original file remains separate and authoritative. No AI design is included.

## Relationships and Cardinality

| Relationship | Cardinality | Meaning / uncertainty |
|---|---:|---|
| User → Membership | 1 → many | A user may belong to several organizations. |
| Organization → Membership | 1 → many | Each membership is tenant-contextual. |
| Organization → Job/Candidate | 1 → many | Both are tenant-owned. |
| Candidate → Application | 1 → many | Candidate is reusable across jobs. |
| Job → Application | 1 → many | A job receives many applications. |
| Job → ApplicationForm | 1 → one/configurable | Default one is working assumption; multiple/versioned forms require decision. |
| Form → Question | 1 → many | Questions belong to a form/revision. |
| Application → Answer | 1 → many | Answers belong to one submission. |
| Job → Pipeline | 1 → one/configurable | One default pipeline assumed; shared/reusable pipelines require decision. |
| Pipeline → Stage | 1 → many | Ordered workflow stages. |
| Application → current Stage | many → one | Stage must belong to the Job's Pipeline. |
| Application → ActivityRecord | 1 → many | Timeline includes transitions and business events. |
| Application → Interview | 1 → many | Multiple interviews are possible. |
| Interview ↔ User | many ↔ many | Through InterviewParticipant; external participants require decision. |
| Interview → Scorecard | 1 → many | Multiple interviewers/evaluations. |
| Candidate → Documents | 1 → many | Resumes and other versions/documents. |
| Application → Offer | 0/1 → many | Multiple offers/revisions require explicit business rule. |
| Offer → OfferDocument | 1 → many | Terms/artifact versions. |
| Organization → Notifications/Activity/Audit | 1 → many | Separate current/history concerns. |
| Organization → TalentPools | 1 → many | Pool membership is contextual. |

## Tenant Ownership

### A. Global identity data

User and Auth credentials/sessions/provider identities are global/account-scoped. They do not grant tenant access.

### B. Organization-owned data

Organization owns Jobs, hiring team assignments, forms/questions, Candidates, Applications/Answers, Pipelines/Stages, Interviews/Participants/Availability, ScorecardTemplates/Scorecards/Responses, notes/comments/mentions, EmailTemplates/Communications, Offers/Documents, Talent Pools, Notifications, ActivityRecords, and tenant-scoped AuditRecords. Documents remain tenant-owned through their domain parent even if bytes later live in object storage.

### C. Relationship/context data

Membership, Invitation, JobHiringTeamMember, Application, Answer, ApplicationStage/Placement, InterviewParticipant, Mention, Talent Pool membership, and Candidate–Job relationships derive validity from their parent organization/context.

### D. External/integration references

Provider connection metadata, external IDs, sync state, and errors are integration references. Providers are fallible and not domain authorities; secrets remain server-side.

The invariant is: one organization's domain objects must never be accessible through another organization's context. Later repository methods, foreign keys, tenant-scoped uniqueness, indexes, authorization, and tests must reinforce it. No SQL is defined here.

## Aggregate / Consistency Boundaries

These are likely consistency boundaries and transaction candidates, not implementations:

| Boundary | Must change together | May happen asynchronously |
|---|---|---|
| Organization + initial admin Membership | Tenant and first usable authorization context | Welcome email, analytics setup, notifications |
| Candidate + Application creation | Same-tenant Candidate resolution and valid Application for Job | Duplicate suggestions, search, notifications, document work |
| Job + default Pipeline | Job setup and required default workflow | Projections, analytics, notifications |
| Application stage transition + ActivityRecord | Current placement/status and transition history | Notifications, analytics, outbound communication |
| Interview scheduling + Participants | Coherent Interview and intended participant assignment | Calendar provider calls, invites, reminders |
| Offer state transition | Valid transition, offer state/version, decision metadata, required history | Communication, document delivery, analytics |
| Hiring/Rejection workflow | Application outcome/stage and required history | Notifications and reports; whether Hired is distinct is a product decision |

Cross-module coordination belongs in a service/use case/orchestrator; a module must not directly mutate another module's persistence internals.

## Business Invariants

1. All organization-owned resources remain tenant-scoped.
2. Candidate and Job must belong to the same Organization before Application creation.
3. ApplicationAnswers reference the correct Application, form, question, and Job context.
4. PipelineStages belong to their Pipeline; current Application stage belongs to the Job's Pipeline.
5. Important lifecycle transitions generate Activity; security-sensitive operations generate Audit.
6. Feedback is submitted only by a permitted interviewer for the correct Interview/Application context.
7. Offer Candidate/Application/Job/Organization context agrees and terms are access-controlled.
8. Archived/rejected/exited records remain historically traceable according to retention policy.
9. Notifications and Communications react to sources but do not become source-of-truth workflow state.
10. External provider state cannot bypass HiringLoop rules.
11. Backend authorization is authoritative.
12. Future AI cannot silently become an autonomous hiring authority and must preserve source provenance/human control.

**Proposed / Requires Product Decision:** duplicate Application policy, withdrawal, Job reopening, stage graph/terminal semantics, feedback visibility/editing, offer count/version rules, retention/anonymization, explicit Hire outcome, external interviewers, and custom roles.

## Entity Lifecycles

Baseline examples requested by the task:

- **Job:** `Draft → Published → Paused → Closed → Archived`. Reopen/automatic archival are **Proposed / Requires Product Decision**.
- **Application:** `Applied → Screening → Interview → Offer → Hired`; `Rejected` exits while retaining history. Withdrawn/duplicate exits are **Proposed / Requires Product Decision**.
- **Offer:** `Draft → Sent → Viewed → Accepted / Declined`. Withdrawn/Expired are **Proposed / Requires Product Decision**.
- **Interview:** `Draft/Pending → Scheduled → Completed`. Cancelled/No-show are **Proposed / Requires Product Decision**.

Supporting records have lifecycles in their definitions; exact deletion, retention, visibility, and version policies require product/privacy/security decisions.

## Domain Ownership Matrix

| Domain Concept | Owning Module | Tenant-Owned? | Current/History | Key Relationships |
|---|---|---|---|---|
| User | Users/Auth split | No/global | Both | Memberships, actions |
| Organization | Organizations | Tenant root | Both | All tenant data |
| Membership | Users | Yes/context | Both | User, Organization, Roles |
| Invitation | Users/Organizations | Yes | Both | Organization, Membership |
| Role/Permission | Users/Authorization | Policy/global or custom tenant | Both | Memberships |
| Job | Jobs | Yes | Both | Team, Form, Pipeline, Applications |
| JobHiringTeamMember | Jobs | Yes/context | Both | Job, Membership |
| ApplicationForm/Question | Jobs | Yes | Both/versioned | Job, Answers |
| ApplicationAnswer | Applications | Yes/context | Submitted/history | Application, Question |
| Candidate | Candidates | Yes | Both | Applications, Documents, Pools |
| Application | Applications | Yes | Both | Candidate, Job, Stage, Interviews, Offers |
| Resume/CandidateDocument | Candidates/Documents | Yes via parent | Both/versioned | Candidate, Application/Offer |
| Pipeline/Stage | Pipeline | Yes via Job | Both/versioned | Applications |
| ApplicationStage/Placement | Pipeline | Yes/context | Current + history | Application, Stage, Activity |
| Interview/Participant/Availability | Interviews | Yes | Both | Application, Users, Scorecards |
| ScorecardTemplate/Scorecard/Response | Feedback | Yes | Both/history | Interview, User |
| CandidateNote/Comment/Mention | Collaboration | Yes | Both/history | Context, User |
| EmailTemplate/Communication | Communications | Yes | Both/history | Candidates, Applications, Offers |
| Offer/OfferDocument | Offers | Yes | Both/history | Candidate, Application, Job |
| Notification | Notifications | Yes | Current + history | Recipient, source event |
| ActivityRecord | Activity | Yes | History | Recruiting targets |
| AuditRecord | Audit | Yes or controlled system scope | History | Actor, target |
| Talent Pool membership | Talent Pool | Yes/context | Current + history | Pool, Candidate |
| Integration reference | Integrations/relevant module | Yes/context | Current + sync history | Organization, provider |

## Cross-Module Collaboration

Applications collaborate with Candidates, Jobs, and Pipeline; Interviews with Applications and Users; Feedback with Interviews, Applications, and Users; Offers with Applications, Candidates, Communications, and Audit. Notifications may react to events from several modules. Audit may record critical actions from every module. Analytics reads authoritative state/history to derive metrics. Integrations translate provider calls and synchronization through stable contracts.

Collaboration does not permit a module to bypass another module's business rules, authorization, or persistence boundary. The coordinating use case owns sequencing and likely transaction boundaries.

## Implications for Future Database Design

Phase 02 must later resolve primary-key strategy, foreign keys and tenant context, composite uniqueness, nullability, delete/restrict/archive/anonymize behavior, evidence-based indexes, tenant-scoped uniqueness, transaction isolation, concurrency for stage/interview/offer/membership changes, and version/history representation. No physical tables, Prisma models, SQL, migrations, indexes, or provider implementation are defined here.

## Teaching Notes

1. Domain modeling describes business concepts and rules before code/storage.
2. An entity has identity; an attribute describes it.
3. An entity persists as a recognizable object; a value object is defined by its values and containing context.
4. An aggregate/consistency boundary is what must be validated and changed coherently together.
5. Cardinality states how many instances relate, such as one Candidate to many Applications.
6. A business invariant is a rule that must always hold, such as same-tenant Candidate and Job.
7. Candidate/Application separation preserves reusable identity and independent job workflow.
8. User/Membership separation keeps global identity distinct from organization-specific access.
9. Current state says what is true now; history says how it became true.
10. The model later informs PostgreSQL keys, constraints, indexes, transactions, and history without prematurely deciding them.

### Concepts to learn from ARCH-02

Bounded contexts, module ownership, entity identity, value objects, cardinality, state machines, invariants, aggregate/transaction boundaries, temporal modeling, multi-tenant isolation, RBAC context, audit versus activity/event logs, idempotency, concurrency control, derived read models, and source-of-truth versus external-provider state.
