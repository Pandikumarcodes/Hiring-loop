# HiringLoop Module Boundaries

These boundaries describe conceptual ownership for the modular monolith. They are intended to guide later implementation. Cross-module workflows should be orchestrated through services or use cases, not by directly manipulating another module's tables or internal repository methods.

## Auth

- **Responsibility:** identity authentication, sessions/tokens, credential lifecycle, and authentication events.
- **Conceptual data:** credentials, sessions, authentication identities, and authentication-provider links.
- **Exposes:** authenticate, sign out, refresh/revoke session, and identify the authenticated user.
- **May collaborate with:** users, organizations, integrations, audit.
- **Must not own:** organization membership authorization, jobs, applications, or business workflow permissions.

## Organizations

- **Responsibility:** tenant organization lifecycle and organization-level settings.
- **Conceptual data:** organizations, tenant settings, and organization lifecycle state.
- **Exposes:** create/update organization, resolve tenant context, and manage organization settings.
- **May collaborate with:** users, auth, audit, integrations.
- **Must not own:** global user identity, job records, or application lifecycle.

## Users

- **Responsibility:** user profiles and organization membership.
- **Conceptual data:** user profile, membership, role assignment, and membership status.
- **Exposes:** membership management, role lookup, and profile operations.
- **May collaborate with:** auth, organizations, jobs, interviews, feedback, audit.
- **Must not own:** credentials or organization records.

## Jobs

- **Responsibility:** job requisition lifecycle and job-specific configuration.
- **Conceptual data:** job definitions, requirements, ownership, and job lifecycle state.
- **Exposes:** create, edit, publish, pause, close, and query jobs.
- **May collaborate with:** organizations, users, applications, pipeline, analytics, audit.
- **Must not own:** candidate identity or application history.

## Applications

- **Responsibility:** a candidate's application to a specific job and its application-specific lifecycle.
- **Conceptual data:** application, source, application status, timestamps, and job-specific submission data.
- **Exposes:** submit, review, withdraw, and query applications.
- **May collaborate with:** candidates, jobs, pipeline, interviews, feedback, communications, offers, audit.
- **Must not own:** the reusable candidate identity or the job definition.

## Candidates

- **Responsibility:** reusable candidate profile and candidate-level information.
- **Conceptual data:** candidate identity/profile, contact details, and consent/preferences as defined later.
- **Exposes:** create, update, merge, search, and retrieve candidate profiles.
- **May collaborate with:** applications, talent-pool, communications, analytics, audit.
- **Must not own:** job-specific application status or pipeline stage.

## Pipeline

- **Responsibility:** workflow stages and movement of an application through a hiring process.
- **Conceptual data:** pipeline configuration, stages, transitions, and stage history.
- **Exposes:** configure stages, move applications, and query workflow history.
- **May collaborate with:** jobs, applications, candidates, interviews, feedback, offers, analytics, audit.
- **Must not own:** candidate identity, job lifecycle, or final employment records.

## Interviews

- **Responsibility:** interview scheduling and interview event lifecycle.
- **Conceptual data:** interview events, participants, scheduling state, and provider references.
- **Exposes:** schedule, reschedule, cancel, and query interviews.
- **May collaborate with:** applications, candidates, users, feedback, communications, integrations, notifications, audit.
- **Must not own:** calendar provider credentials or the complete candidate profile.

## Feedback

- **Responsibility:** structured and unstructured interviewer feedback tied to an interview or application workflow.
- **Conceptual data:** feedback submissions, ratings, comments, and review state.
- **Exposes:** submit, edit where allowed, request, and retrieve feedback.
- **May collaborate with:** interviews, applications, users, pipeline, offers, audit.
- **Must not own:** interview scheduling, user identity, or authorization policy.

## Communications

- **Responsibility:** communication intent, templates, delivery requests, and communication history.
- **Conceptual data:** messages, templates, recipients, delivery status, and provider references.
- **Exposes:** compose, request, schedule, and query communications.
- **May collaborate with:** candidates, applications, interviews, offers, notifications, integrations, audit.
- **Must not own:** email provider credentials or the source domain record that triggered a message.

## Offers

- **Responsibility:** offer lifecycle and offer-specific terms/workflow.
- **Conceptual data:** offer records, versions, terms, statuses, and decision timestamps.
- **Exposes:** create, issue, withdraw, accept, decline, and query offers.
- **May collaborate with:** applications, candidates, communications, users, audit.
- **Must not own:** job lifecycle or an automatic employment decision. Offer acceptance is not an employment decision unless the explicit business workflow performs that transition.

## Talent Pool

- **Responsibility:** organization-managed candidate pools and inclusion rules.
- **Conceptual data:** pools, memberships, labels, and pool-level notes.
- **Exposes:** create pools, add/remove candidates, and search pool membership.
- **May collaborate with:** candidates, organizations, jobs, communications, analytics, audit.
- **Must not own:** candidate identity or application status.

## Analytics

- **Responsibility:** reporting views, metrics, and derived read models from authoritative domain events/state.
- **Conceptual data:** metric definitions, report configuration, and derived aggregates.
- **Exposes:** dashboards, reports, and metric queries.
- **May collaborate with:** jobs, applications, pipeline, interviews, offers, organizations.
- **Must not own:** authoritative job, candidate, application, or offer state.

## Notifications

- **Responsibility:** user-facing notification preferences, notification records, and delivery orchestration.
- **Conceptual data:** notification intents, recipients, preferences, and delivery status.
- **Exposes:** create, list, read, dismiss, and preference operations.
- **May collaborate with:** users, organizations, interviews, applications, communications, integrations.
- **Must not own:** the source workflow or external delivery credentials.

## Integrations

- **Responsibility:** adapters to external providers and synchronization/orchestration at provider boundaries.
- **Conceptual data:** connection metadata, provider references, sync state, and integration errors; secrets remain protected server-side.
- **Exposes:** connect, disconnect, synchronize, and provider capability operations through stable contracts.
- **May collaborate with:** auth, organizations, interviews, communications, notifications, audit, background workers.
- **Must not own:** domain authority for jobs, candidates, applications, interviews, or messages.

## Audit

- **Responsibility:** security and business-critical audit records.
- **Conceptual data:** actor, organization, action, target, timestamp, and relevant change metadata.
- **Exposes:** append audit event and authorized audit queries.
- **May collaborate with:** every module for event generation; organizations and auth for scope and actor context.
- **Must not own:** product activity timelines or mutable domain state.

## Important Distinctions

- **Candidate ≠ Application:** a candidate is a reusable person/profile; an application is that candidate's relationship with one job.
- **Activity Timeline ≠ Audit Log:** an activity timeline supports product workflow context; an audit log records security- or business-critical actions and must be protected accordingly.
- **Authentication ≠ Authorization:** authentication establishes who the actor is; authorization decides what that actor may do in a tenant and context.
- **Organization membership ≠ User identity:** identity can exist independently of membership; membership grants tenant participation and roles.
- **Job lifecycle ≠ Pipeline candidate lifecycle:** a job can be drafted, published, paused, or closed while applications move through separate stages.
- **Offer acceptance ≠ automatic employment decision:** acceptance does not itself change employment state unless an explicit business workflow defines that transition.

## Dependency Guidance

Modules should depend on stable contracts and use cases rather than internal tables. Prefer one-way collaboration and orchestration at application-service boundaries. When a workflow touches several modules, the coordinating use case owns the sequence and transaction boundary; no module reaches through another module to directly mutate its persistence internals.
