# Phase 13 - Candidate Management Handoff

## Final status and scope

**Phase 13 - Candidate Management: COMPLETE.** The phase provides recruiter read-only candidate, application, answer, stage-history, and resume-access workflows. It does not add candidate editing, stage movement, notes, bulk actions, interviews, scorecards, communications, offers, analytics, or AI.

## APIs and routes

Exactly four authenticated APIs are provided:

1. `GET /api/v1/organizations/:organizationId/candidates`
2. `GET /api/v1/organizations/:organizationId/candidates/:candidateId`
3. `GET /api/v1/organizations/:organizationId/applications/:applicationId`
4. `POST /api/v1/organizations/:organizationId/candidate-documents/:documentId/access`

Frontend routes:

- `/app/organizations/:organizationId/candidates`
- `/app/organizations/:organizationId/candidates/:candidateId`
- `/app/organizations/:organizationId/applications/:applicationId`

## Behavior and security

Candidate list rows represent one tenant-scoped Candidate. Search covers name/email; Job and current-stage filters, four allowlisted sort keys, bounded database-side pagination, application counts, and latest relevant application summaries are server-side. Filter/search changes reset the URL page.

Candidate detail shows the profile/contact summary and organization-scoped applications. Application detail shows the Candidate and Job, submitted answers for all Phase 12 types, backend-provided select labels, current stage, chronological stage history, and document metadata.

ADMIN and RECRUITER are allowed. HIRING_MANAGER and INTERVIEWER are denied by backend permissions; frontend navigation hiding is only a UX aid. Candidate, Application, and Document lookups are organization scoped.

Resume access performs a CSRF-protected POST, resolves the tenant-scoped document before signing, and returns a five-minute private S3 GET URL without exposing or persisting the object key. The frontend invokes this only on user action and clears the mutation result immediately after opening the URL.

## Verification

- Phase 13 backend focused tests: 3 files, 14 tests passed.
- Phase 13 frontend focused tests: 3 files, 17 tests passed.
- Backend non-database suite: 34 files, 223 tests passed.
- Frontend typecheck, lint, format check, and production build passed.
- Backend lint, format check, and Prisma validation passed.
- `git diff --check` passed.

The aggregate frontend suite had 223 passed and two unrelated worker-sensitive failures: the known auth navigation test (26/26 passed in isolation) and an application-form option stress test. The database suite had 74 passed and one unrelated auth-browser timeout. No Phase 13 focused failure remains.

## Boundary

Phase 14 remains outside this handoff. Next step: Manual QA for Phase 13.
