# Phase 18 — Analytics & Audit Handoff

## Final status

**COMPLETE — PASS WITH NOTES.** The final audit found no blocking Phase 18
defects. Phase 19 — Redis, BullMQ & Background Jobs remains **NOT STARTED**.

## Objective and completed scope

Phase 18 provides hiring analytics and protected audit logging without making
analytics authoritative recruiting state.

- Seven tenant-scoped analytics APIs provide overview, funnel, pipeline,
  interview, communication, outcome, and job metrics.
- Two authenticated audit APIs provide paginated, filtered list and detail
  access to protected audit events.
- Frontend routes are
  `/app/organizations/:organizationId/analytics` and
  `/app/organizations/:organizationId/audit`.
- Audit integrations cover interview schedule/update/reschedule/cancel,
  scorecard-template publication, scorecard submission, and the relevant
  organization, membership, invitation, job, pipeline, form, communication,
  offer, application-outcome, and talent-pool flows.

## Metric definitions and data lineage

All metrics are derived at read time from PostgreSQL domain records; no
analytics read model or aggregate table is authoritative.

### Current-state metrics

- **Active applications:** `Application.outcome = ACTIVE`, scoped to the
  organization and selected job where applicable.
- **Open jobs:** `Job.status = OPEN`, scoped to the organization; a selected
  job limits this count to that job when it is open.
- **Awaiting offer decision:** `Offer.status = SENT`, scoped through the
  organization and selected job application where applicable.
- **Pipeline current-stage counts:** current `Application.currentPipelineStageId`
  grouped by the selected organization's job pipeline stages.
- **Upcoming interviews:** `Interview.status = SCHEDULED` with
  `scheduledStartAt` at or after report generation time.
- **Offer decision-state counts:** `Offer.status` grouped for accepted,
  declined, withdrawn, and awaiting-decision values. The outcomes report's
  `offers.created` and `offers.sent` values are intentionally `null` because
  those date-window definitions are not implemented in that response.
- **Talent-pool current counts:** `TalentPool` count; `TalentPoolMember` count;
  and distinct `TalentPoolMember.candidateId` count, all organization-scoped.

### Date-window/event metrics

The API uses inclusive `from` and exclusive `to` timestamps. These metrics use
the selected window and organization, plus the selected job where the source
has a job relationship:

- **Applications received:** `Application.submittedAt`.
- **Scheduled interviews:** `Interview.scheduledStartAt`.
- **Cancelled interviews:** `Interview.cancelledAt`.
- **Submitted feedback:** submitted `Scorecard.submittedAt`.
- **Offers sent:** offers with non-null `Offer.sentAt`.
- **Outcome counts and rejection reasons:** `ApplicationOutcomeEvent.occurredAt`;
  hires, rejections, and reopenings count distinct applications, while
  rejection reasons group rejected events by `reasonCode`.
- **Time to hire:** the latest in-window `HIRED` outcome event per application,
  minus `Application.submittedAt`, averaged in seconds.
- **Initial pipeline entries:** `ApplicationStageHistory` events of
  `APPLICATION_SUBMITTED`, grouped by destination stage.
- **Communications:** `Communication.createdAt`, grouped by status; attempted
  is pending plus sent plus failed, and delivery success rate is
  sent divided by sent plus failed when that denominator is non-zero.
- **Talent-pool members added:** `TalentPoolMember.createdAt`.
- **Job-performance rows:** every organization job is sorted by title then ID;
  application, scheduled-interview, sent-offer, hire, and rejection columns
  use the matching date-window sources above, while the active column is a
  current-state count.
- **Generated time:** the overview report's `generatedAt` is the server clock
  at report generation, rather than a domain-event timestamp.

### Talent-pool scope with a selected job

Talent-pool counts remain organization-wide when a job is selected. A
`TalentPoolMember` has no required job association, so the implementation has
no job-scoped talent-pool formula. The frontend labels these values as current
or selected-period metrics; this documentation makes their organization-wide
scope explicit. They must not be interpreted as job-specific counts.

## Audit integrity, privacy, and access

`AuditEvent` has organization and actor foreign keys with `RESTRICT` actions,
an actor-type consistency check, tenant/investigative indexes, and a database
trigger that rejects updates and deletes. Audit writes occur in the same Prisma
transaction as the audited mutation where atomicity is required.

Analytics and audit routes require authentication, membership-derived tenant
context, and their corresponding server-side permissions. Repositories apply
organization predicates. Audit list and detail reads are tenant-scoped, and
foreign/nonexistent analytics job IDs are protected by the same resource rule.

Audit reads expose only action-specific scalar allowlists for change summaries
and metadata. They omit private offer terms, communication bodies and recipient
data, scorecard content, and other unallowlisted payloads.

## Reliability corrections completed

- Communication-template duplicate-name PATCH and talent-pool duplicate-name
  PATCH return structured `409` errors.
- Missing notification reads return structured JSON `404` errors.
- Communication-template PATCH requires `expectedRevision`.
- Offer compensation is bounded to PostgreSQL signed `BIGINT`; oversized values
  are rejected before persistence.
- Offer revision allocation locks the tenant-scoped parent offer, known version
  conflicts return controlled application errors, and transaction-scoped offer
  reads use the transaction client.
- Analytics jobs `jobId` filtering is applied in the database query before
  sorting and pagination; `totalItems` applies the same organization and job
  filters. Foreign and nonexistent jobs follow existing tenant/resource rules.

## Final verification

- Backend non-database: **252/252 passed**.
- Relevant Phase 17/18 HTTP, including tenant isolation and authorization:
  **30/30 passed**.
- Full backend database suite: **112/112 passed**.
- Full frontend suite: **281/281 passed**.
- Backend/frontend lint and formatting: passed.
- Frontend typecheck and production build: passed.
- Prisma validation, migration status, and `git diff --check`: passed.
- The backend has no configured typecheck or production-build script.

Migration `20260914120000_analytics_audit` is current on `hiringloop_test`.
`hiringloop_dev` was not reset or destructively modified.

## Non-blocking technical debt and open decisions

- Interview and scorecard audit writers do not currently pass the HTTP request
  ID to audit events. Events remain attributable by actor, resource, and time,
  but request-to-event tracing is weaker.
- Talent-pool metrics are organization-wide under a selected job because pool
  membership has no required job association. This is a documentation/UI
  clarity issue, not a Phase 18 defect.
- Existing non-blocking warnings remain: the `pg@9` concurrent-query
  deprecation warning in database tests, the React ref-during-render lint
  warning in `PublicApplyPage.tsx`, and the production-build large-chunk
  advisory.
- Audit retention, legal hold, redaction/anonymization policy, and export
  policy are open product/architecture decisions. No retention duration or
  export behavior is implemented or implied by Phase 18.

## Next phase

Phase 19 — Redis, BullMQ & Background Jobs is **NOT STARTED**. Its intended
scope remains justified asynchronous infrastructure with PostgreSQL as the
authority; no Phase 19 implementation is included in this handoff.
