# Phase 14 - Interview Scheduling & Calendar Handoff

## 1. Phase status

**COMPLETE.** Phase 15 - Scorecards & Collaboration is **NOT STARTED**.

## 2. Scope delivered

Application Detail scheduling/assignment, Interview view/edit/reschedule/cancel, organization agenda, and My Interviews are delivered. Scorecards, feedback, recommendations, notes, candidate communications/invitation email, offers, analytics, Redis, BullMQ, realtime, Google Calendar/OAuth, and AI are deferred.

## 3. Architecture

The existing modular monolith remains Route -> Middleware -> Controller -> Use Case/Service -> Repository -> Prisma -> PostgreSQL. Controllers are thin; Zod validates inputs; DTOs are explicit/sanitized; repositories are organization-scoped. Phase 07 permissions, participant-membership validation, conflict detection, and transaction boundaries are preserved.

## 4. Database

Migration `prisma/migrations/20260910120000_interview_scheduling_foundation/migration.sql` adds `Interview` and `InterviewParticipant`; enums are `InterviewFormat` (`VIDEO`, `PHONE`, `ONSITE`) and `InterviewStatus` (`SCHEDULED`, `CANCELLED`). Interview holds tenant/application relationships, title, format, absolute timestamps, IANA `timeZone`, meeting/location, status/cancellation metadata, creator, and timestamps. Restrictive FKs include composite `(applicationId, organizationId)`; checks enforce time and cancellation state. `UNIQUE(interviewId, userId)` prevents duplicate participants. Indexes are `(organizationId, scheduledStartAt)`, `(applicationId, scheduledStartAt)`, and `(userId, interviewId)` for agenda, application history, and assigned lookup.

## 5. API count and routes

Planned: **7**. Actual: **7**.

1. `POST /organizations/:organizationId/applications/:applicationId/interviews` — creates and returns `201` Interview DTO.
2. `GET /organizations/:organizationId/applications/:applicationId/interviews` — application list.
3. `GET /organizations/:organizationId/interviews` — bounded organization range / `mine` list.
4. `GET /organizations/:organizationId/interviews/:interviewId` — detail.
5. `PATCH /organizations/:organizationId/interviews/:interviewId` — metadata/participants.
6. `POST /organizations/:organizationId/interviews/:interviewId/reschedule` — updates the existing Interview.
7. `POST /organizations/:organizationId/interviews/:interviewId/cancel` — retains and marks it cancelled.

Responses use the existing `data` envelope and sanitized Interview DTOs; validation, authorization, not-found, and conflict outcomes use the existing error contract.

## 6. Authorization

ADMIN and RECRUITER can schedule, view, edit, reschedule, and cancel within their organization. HIRING_MANAGER has read-only Interview access under the existing Phase 07 resource policy, not organization-wide administrator access. INTERVIEWER has read-only assigned-Interview access only and cannot schedule, edit, reschedule, cancel, or see unrelated Interviews. Frontend forces `mine=true` for Interviewer agenda requests; backend is authoritative.

## 7. Tenant isolation

Organization remains the tenant boundary. Reads/writes are organization-scoped; applications and participant memberships are validated in the same organization; cross-tenant guessed IDs expose no protected data; and Interviewer access also requires an InterviewParticipant relationship. Integration coverage verifies these invariants.

## 8. Scheduling and timezone design

PostgreSQL stores absolute `TIMESTAMPTZ` values and the IANA timezone separately. Clients provide duration; the server derives end time. Frontend converts selected local controls plus timezone to UTC ISO, displays/prefills in stored timezone, and has Asia/Kolkata and America/New_York DST-focused coverage.

## 9. Conflict, reschedule, and cancellation behavior

Shared-participant overlap is rejected; cancelled Interviews do not conflict; adjacent events are allowed. Reschedule updates one Interview; cancellation retains it as `CANCELLED` with metadata and visibility.

## 10. Calendar and meeting architecture

HiringLoop Interview records are the source of truth. The responsive bounded seven-day agenda supports previous/next navigation, My Interviews, cancelled visibility, and Interview Detail navigation. VIDEO supports an HTTP(S) meeting URL, ONSITE supports a location, and PHONE needs neither. External links use safe `rel` attributes. Google Calendar is deferred: Google login is not Calendar authorization, and scopes/consent, tokens, account linkage, provider event IDs, retries, reconciliation, failures, background processing, and observability belong to a later reliability/integration phase. Creation never depends on it.

## 11. Frontend screens and routes

`hiringloop-frontend/src/features/interviews/` contains API/types, query keys, queries/mutations, `ApplicationInterviews`, `InterviewFormDialog`, `InterviewsPage`, `InterviewDetailPage`, and timezone utilities/tests. Primary routes are `/app/organizations/:organizationId/interviews` and `/app/organizations/:organizationId/interviews/:interviewId`; Application Detail integrates the list/dialog. It includes loading/error/empty states, agenda/list, edit/reschedule/cancel, and read-only Interviewer UX; Candidate Detail was not redesigned.

## 12. TanStack Query

Query keys cover application list, calendar/list, and detail; schedule, update, reschedule, and cancel mutations target invalidation of all affected keys. There is no global Interview store or custom cache.

## 13. Security

Authentication, membership, Phase 07 policy, CSRF/security middleware, participant tenant validation, sanitized DTOs, safe HTTP(S) validation/rendering, no raw HTML injection, minimized candidate PII, no Calendar tokens, and no intentional meeting-link logging are maintained.

## 14. Accessibility

Accessibility includes visible labels, native accessible date/time controls, keyboard participant controls and links, semantic statuses, Radix dialogs/focus, alerts, and responsive agenda layout.

## 15. Performance

Performance uses bounded queries, query-driven indexes, batch participant validation, deliberate projections, targeted invalidation, and no unmeasured cache or virtualization.

## 16. Testing

Backend targeted use-case tests: **7/7 PASS**. PostgreSQL integration coverage covers tenant isolation, conflicts, cancellation, assigned Interviewer access, and derived timestamps. Prisma validation: **PASS**. Frontend Phase 14 focused tests: **6/6 PASS**; coverage includes rendering/navigation, seven-day range, `mine=true`, read-only controls, Asia/Kolkata conversion, and New York DST round-trip. Relevant Phase 13 regression: **6/6 PASS**.

## 17. Manual QA

PASS: video scheduling, onsite scheduling, timezone correctness, conflicts, reschedule, cancellation, and core assigned/read-only Interviewer behavior. PHONE worked; cancelled Interviews remained visible; INTERVIEWER could not open Team Management or general Candidate Management. Tenant isolation and Hiring Manager policy are verified by automated coverage, not asserted as manual QA.

## 18. Development QA seed

`hiringloop-backend/scripts/seed-phase14-qa.js` is run by `npm run seed:qa`. It is idempotent, local/manual-QA-only, and refuses production. It creates/reuses QA ADMIN/INTERVIEWER users, the QA organization, job, candidate, and application; it intentionally creates no CandidateDocument, resume, S3 object, or Interview. Interviews are created through the UI.

## 19. Deferred scope

No scorecards/feedback/collaboration, candidate communications/invitation email, offers, analytics, Redis/BullMQ/realtime, external calendar/OAuth, or AI was added.

## 20. Known issues / technical debt

Non-blocking and unrelated: historical Prisma composite-FK/index drift, the PublicApply React refs lint warning, and the large frontend bundle/chunk warning. The Phase 14 schema formatting issue was corrected in this closeout.

## 21. Files/modules changed

Backend: Prisma schema/migration, `modules/interviews`, permissions, route registration, tests, QA seed and scripts. Frontend: `features/interviews`, app router, Application Detail integration, and focused tests. Documentation: this handoff, project state/roadmap/README/database design, and shared copies.

## 22. Final verification

Prisma, targeted backend tests, frontend Phase 14 tests, Phase 13 regressions, typecheck, lint, production build, formatting, and `git diff --check` pass.

## 23. Next phase

**Phase 15 - Scorecards & Collaboration — NOT STARTED.**
