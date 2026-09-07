# Phase 12 — Candidate Application Flow Handoff

## Final status and scope

**Phase 12 — Candidate Application Flow: COMPLETE.** This phase adds the anonymous candidate-facing application flow only: public Apply, dynamic published-form submission, resume upload, and immutable application records. Recruiter candidate management remains Phase 13.

## Architecture and database

PostgreSQL is authoritative; Organization is the tenant boundary. Candidate represents one person in one Organization and is uniquely identified by `(organizationId, normalizedEmail)`. Application represents that Candidate's submission to one Job, with `(organizationId, jobId, candidateId)` uniqueness. Candidates may apply to different jobs; same email in separate organizations is separate.

Applications retain submitted candidate snapshots, exact published ApplicationFormVersion, answers, current initial pipeline stage, history, idempotency fingerprint, and resume metadata. Migration `20260909120000_candidate_application_flow_foundation` adds Candidate, Application, ApplicationAnswer, CandidateDocument, ApplicationUpload, and ApplicationStageHistory; restrictive FKs, focused indexes, and PostgreSQL triggers enforce form/version/question, stage/history, document, upload, job, and tenant ownership.

## Submission, file storage, and concurrency

The public GET serves only the active published form. Submission accepts any published version belonging to the scoped Job, so an older immutable published snapshot remains valid after a newer version becomes active. All eight Phase 11 types validate end-to-end: SHORT_TEXT, LONG_TEXT, NUMBER, YES_NO, SINGLE_SELECT, MULTI_SELECT, DATE, and URL. Unknown/duplicate questions, foreign options, duplicate multi-select IDs, and missing required answers are rejected.

Resumes use direct private S3 PUT. ApplicationUpload reserves an opaque generated key under `organizations/{organizationId}/application-uploads/{id}` and is tenant/job bound, expiring, and single-use (`PENDING` → `CONSUMED`). PostgreSQL holds metadata only; never bytes, public object URLs, or PII-bearing keys. AWS SDK signing uses a configured 300–600 second TTL, signed Content-Type, and HeadObject verification before the DB transaction. PDF, DOC, and DOCX are capped at 5 MB.

The short transaction creates/reuses Candidate, Application, answers, CandidateDocument, initial stage history, and consumes the reservation together. It uses the existing Phase 09 ENTRY/position-1 Job pipeline stage and `APPLICATION_SUBMITTED` history event. UUID Idempotency-Key is organization/job scoped; a SHA-256 canonical fingerprint enables same-key replay, same-key/different-request conflict, and safe duplicate handling for concurrent different-key requests.

## APIs and frontend

Exactly three public APIs are provided:

1. `GET /api/v1/public/careers/:organizationSlug/jobs/:jobId/application-form`
2. `POST /api/v1/public/careers/:organizationSlug/jobs/:jobId/application-uploads`
3. `POST /api/v1/public/careers/:organizationSlug/jobs/:jobId/applications`

The public route is `/careers/:organizationSlug/jobs/:jobId/apply`. TanStack Query owns job/form server data; React Hook Form owns form state; Zod builds client validation from served form metadata. The modular renderer supports all question types, labels, fieldsets, errors, responsive wrapping, and first-invalid focus. Resume UX has accessible selection, type/size feedback, replace/remove, direct-upload retry, no fake progress, and no signed URL/key display. Logical retries retain their idempotency key and uploaded reservation across uncertain failures; confirmed success blocks a duplicate submission.

## Security, performance, and verification

Tenant identity derives only from organization slug then tenant-scoped Job lookup. Client input never authorizes organization, candidate, application, pipeline, stage, or S3 object key. Public DTOs omit internal candidate/application, answer, stage, and storage data. Public limits are form 60/hour, upload 12/hour, submission 8/hour. No request body, answer, signed URL, file byte, credential, or unnecessary PII logging was found. Direct S3 upload avoids binary proxying; no polling or speculative cache was added.

Audit passed with one targeted accessibility fix: dynamic text/select fields now reference the Field-generated hint/error IDs and RHF refs flow through the renderer (including Select/Textarea ref forwarding), verified by a focused test.

Prisma validation and migration status pass. Focused backend application tests pass (5); direct Phase 12 PostgreSQL tests pass (2); full non-database backend suite passes (32 files/217 tests). Focused frontend Phase 12/public-career tests pass; typecheck, lint, targeted format check, and production build pass. Aggregate DB runs still show unrelated member-management/tenant-foundation timeouts; focused fork-pool frontend runs pass but the aggregate runner remains worker-sensitive. No Phase 12 leaked handle or unresolved network call was found.

Manual QA prerequisites: backend/frontend running, migrations applied, private S3 bucket plus S3_BUCKET/S3_REGION/runtime AWS identity, browser PUT CORS for the frontend origin and Content-Type, and an OPEN Job with published form and ENTRY stage. This audit did not claim a live browser-to-AWS upload.

No Phase 13 recruiter candidate management, interviews, scorecards, communications, offers, analytics, or AI was added.

**Next: Manual QA for Phase 12. Phase 13 — Candidate Management: NOT STARTED.**
