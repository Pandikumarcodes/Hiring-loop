# Phase 12 Candidate Application Flow Database + Backend

This document records the Phase 12 Prompt 1 persistence and public API
boundary. It does not mark Phase 12 as complete.

## Ownership and invariants

`Candidate` is organization-owned and identified by the database unique key
`(organizationId, normalizedEmail)`. `Application` is a candidate's one
submission to one job and has unique keys `(organizationId, jobId, candidateId)`
and `(organizationId, jobId, idempotencyKey)`. Therefore a candidate can apply
to several jobs in one organization, while a second submission to the same job
is rejected. The same normalized email in another organization is independent.

Applications store the submitted immutable `ApplicationFormVersion`, core
candidate-field snapshot, current Phase 09 `ENTRY` stage, answers, resume
metadata, and their initial stage-history event. `ApplicationAnswer.value` is
JSONB, but service validation is based on the persisted question type/options,
not client metadata. A migration trigger additionally requires answer questions
to belong to the application's submitted version; another trigger requires the
published form version and current stage to belong to the application job.

The `Application` listing index `(organizationId, jobId, submittedAt)` supports
the expected Phase 13 recruiter list query without adding any recruiter API.

## Direct private-object upload

`ApplicationUpload` is a tenant/job-bound, opaque reservation. The backend
creates keys in `organizations/{organizationId}/application-uploads/{uploadId}`
and returns a short-lived S3 PUT capability. PostgreSQL stores only metadata;
the resume binary is never sent through Express or stored in PostgreSQL.

At submission the service HEADs the private object and requires exact reserved
size and MIME match before opening the database transaction. The reservation is
consumed with the application inside that transaction. A later lifecycle rule
should delete expired/orphaned objects under this prefix with an S3 lifecycle
policy (and optionally reconcile expired reservations); no worker was added in
this prompt.

## Public endpoints

- `GET /api/v1/public/careers/:organizationSlug/jobs/:jobId/application-form`
- `POST /api/v1/public/careers/:organizationSlug/jobs/:jobId/application-uploads`
- `POST /api/v1/public/careers/:organizationSlug/jobs/:jobId/applications`

All derive tenant identity from the organization slug and tenant-scoped job.
They have independent IP-based public rate limits. The submit command requires
a UUID `Idempotency-Key`; it stores only a SHA-256 fingerprint of canonical
submission data, not the raw PII payload.
