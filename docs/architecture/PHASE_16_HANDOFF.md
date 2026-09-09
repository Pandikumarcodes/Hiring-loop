# Phase 16 - Candidate Communication & Notifications Handoff

## Status

**COMPLETE.** Phase 16 delivers tenant-scoped outbound candidate email,
organization templates, user notifications, and own-user notification
preferences. Phase 17 remains not started.

## Architecture and database

The modular-monolith boundary remains Route -> Middleware -> Controller/use
case -> Prisma -> PostgreSQL. Phase 16 adds `Communication`,
`CommunicationTemplate`, `Notification`, and `NotificationPreference`, plus
email/outbound communication enums, `PENDING/SENT/FAILED` lifecycle states,
and five notification types.

The forward migrations are
`20260912120000_candidate_communication_notifications` and
`20260912123000_notification_interview_tenant_integrity`. Communication rows
retain organization/application/creator scope, an authoritative recipient
snapshot, bounded plain-text content, lifecycle timestamps, provider message
ID, safe failure category, and a unique organization/application/creator/
idempotency-key constraint. Templates are organization-scoped, unique by
organization/name, and revision guarded.

Notifications have an organization and authenticated recipient, exactly one
tenant-aligned Application or Interview target, deterministic inbox indexes,
and a partial unread index. Preferences require a real
OrganizationMembership and are unique by organization/user/type; missing rows
are enabled by default. Restrictive foreign keys and database checks protect
tenant alignment, target cardinality, content bounds, and communication state
timestamps.

## APIs and authorization

There are 12 Phase 16 APIs under `/api/v1`:

- Communication: POST/GET `/organizations/:organizationId/applications/:applicationId/communications`
- Templates: GET/POST `/organizations/:organizationId/communication-templates`, PATCH/DELETE `/organizations/:organizationId/communication-templates/:templateId`
- Notifications: GET `/organizations/:organizationId/notifications`, GET `/organizations/:organizationId/notifications/unread-count`, PATCH `/organizations/:organizationId/notifications/:notificationId/read`, POST `/organizations/:organizationId/notifications/read-all`
- Preferences: GET/PUT `/organizations/:organizationId/notification-preferences`

ADMIN and RECRUITER can view/send communication and manage templates.
HIRING_MANAGER and INTERVIEWER cannot access those capabilities. All
organization members can access only their own notifications and preferences.
Backend permission middleware and tenant-scoped queries are authoritative.

All mutations use CSRF protection, strict Zod validation, bounded text,
structured errors, sanitized DTOs, and page/pageSize defaults of 1/25 with a
maximum of 100 and deterministic ordering.

## Communication lifecycle and reliability

The send request accepts only subject, body, and a UUID idempotency key. The
server loads the tenant-scoped Application and Candidate and resolves the
recipient email; the browser cannot choose a destination. Provider success
transitions to SENT with `sentAt`. Confirmed provider failure transitions to
FAILED with `failedAt`, a safe classification, and a mandatory sender
notification. Ambiguous outcomes remain PENDING and return a safe unconfirmed
status. The unique idempotency constraint plus duplicate-key recovery prevents
concurrent identical requests from producing a second provider call; changed
payloads using the same key return conflict.

The existing provider abstraction remains synchronous for Phase 16. The send
route alone uses the existing in-memory limiter: 30 requests/hour per
authenticated user, resolved tenant, and client IP. Raw provider errors and
credentials are not exposed or persisted. Notification insertion failures are
isolated from successful primary interview/scorecard operations and emit
diagnostic messages through existing logging.

## Templates, notifications, and frontend

Templates support list/create/update/delete, revision conflicts, confirmation
before deletion, and plain-text selection that prefills—but never sends—the
composer. Communication history is independent of template deletion.

Notifications are created for communication failure to the sender; interview
scheduled/rescheduled/cancelled to current participants except the actor; and
scorecard submission to the interview creator except the submitter.
Informational events respect preferences; communication failure is mandatory.

Feature-first frontend modules are `src/features/communications` and
`src/features/notifications`; TanStack Query owns server state with
organization/application/pagination-aware keys and targeted invalidation.
Application Detail has an authorized Communication section with a read-only
recipient, accessible Send Email dialog, history, pagination, and SENT/FAILED/
PENDING states. Templates are managed in a compact dialog.

The authenticated shell has an accessible bell, unread count, compact recent
popover, and safe Application/Interview navigation. The dedicated route is
`/app/organizations/:organizationId/notifications`, with list/pagination,
mark-read, mark-all-read, empty/error/loading states, and preferences. Only
interview and scorecard informational types are editable; candidate
communication failure is always enabled/read-only.

## Security, accessibility, performance, and deferred work

All resource reads and writes include tenant and authenticated-user scope.
Recipient input is not accepted from the browser. Communication content is
rendered as text; no unsafe HTML or browser persistence is used. Existing
Radix dialogs, labeled fields, focus-visible controls, keyboard actions,
read/unread semantics, non-color status cues, responsive grids, and bounded
dialogs support the required accessibility and responsive behavior.

Queries are paginated, polling/realtime delivery is absent, and no global
server-state store was added. No Redis, BullMQ, worker, retry, reconciliation,
webhook, realtime, mailbox sync, SMS, WhatsApp, campaigns, bulk communication,
rich text, AI, offers, hire/reject, or talent-pool work was introduced.
Phase 19 owns worker delivery/retries/reconciliation. Phase 20 owns provider
webhooks, delivery updates, realtime notifications, and broader reliability.

## Verification

Backend: Prisma validate PASS, Prisma generate PASS, lint PASS, format check
PASS, non-database suite 242/242 PASS, database suite 91/91 PASS.

Frontend: focused Phase 16/router tests 12/12 PASS, full suite 47 files /
251 tests PASS, lint PASS with one pre-existing non-blocking warning in
`PublicApplyPage.tsx`, typecheck PASS, format check PASS, and production build
PASS. The earlier timing-sensitive auth test passed alone, in its suite, and
in the final full suite.

## Next phase

**Phase 17 - Offers, Hire/Reject & Talent Pool - NOT STARTED.**
