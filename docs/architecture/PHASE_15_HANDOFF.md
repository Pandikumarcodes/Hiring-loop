# Phase 15 - Scorecards & Collaboration Handoff

## 1. Phase status

**COMPLETE.** Phase 16 - Candidate Communication & Notifications is **NOT STARTED**.

## 2. Scope delivered

Phase 15 adds Job-scoped scorecard template lifecycle, immutable published template versions, interviewer-specific scorecards, submitted-feedback review, and application-scoped internal Notes. It integrates feedback into Interview Detail and Application Detail and adds dedicated template and interviewer scorecard routes. Comments, mentions, candidate communications, notifications, offers, analytics, realtime, external calendar synchronization, and AI remain out of scope.

Final verified counts:

- Database models added: **6**
- Planned APIs: **14**
- Actual APIs: **14**
- Primary dedicated frontend routes: **2**

## 3. Architecture decisions

The existing modular-monolith boundary remains Route -> Middleware -> Controller -> Use Case -> Repository -> Prisma -> PostgreSQL. The scorecard module owns validation, DTO mapping, workflow rules, and tenant-scoped persistence. Controllers remain thin; Zod validates request inputs; repositories receive trusted tenant context and use explicit projections. Frontend permission checks are UX only; backend middleware and use cases are authoritative.

Scorecard templates are Job-scoped, with one stable `ScorecardTemplate` per Job. A template has historical versions. Draft editing is mutable and revision-guarded; publishing makes a version immutable and sets it as the active version. A scorecard pins the published version used at creation, so later template changes cannot reinterpret submitted feedback.

Feedback is independent per `InterviewParticipant`. An interviewer can draft, save, and submit only their own assigned scorecard. Submitted scorecards are immutable. Recruiting-team review reads submitted feedback only and never exposes another user's draft through summary or application aggregation.

Notes are deliberately limited to plain-text, application-scoped internal Notes. This phase does not add a general polymorphic comments/mentions system or notifications.

## 4. Domain model

The implemented model is:

```text
Organization -> Job -> ScorecardTemplate -> ScorecardTemplateVersion
                                             -> ScorecardCriterion
Application -> Interview -> InterviewParticipant -> Scorecard
                                                     -> ScorecardResponse
Application -> Note -> User (author)
```

`ScorecardTemplate` has one Job and one optional active published version. `ScorecardTemplateVersion` owns its criteria and is the historical evaluation schema. `Scorecard` belongs to one InterviewParticipant and pins one published template version. `ScorecardResponse` belongs to one scorecard and one criterion in that pinned version. `Note` belongs to one Application and records its author User.

## 5. Database

Migration: `hiringloop-backend/prisma/migrations/20260911120000_scorecards_collaboration_foundation/migration.sql`.

Added models:

1. `ScorecardTemplate`
2. `ScorecardTemplateVersion`
3. `ScorecardCriterion`
4. `Scorecard`
5. `ScorecardResponse`
6. `Note`

Enums:

- `ScorecardTemplateVersionStatus`: `DRAFT`, `PUBLISHED`
- `ScorecardCriterionType`: `RATING`, `TEXT`
- `ScorecardStatus`: `DRAFT`, `SUBMITTED`
- `ScorecardRecommendation`: `STRONG_NO`, `NO`, `MIXED`, `YES`, `STRONG_YES`

Important constraints, checks, and triggers:

- `ScorecardTemplate.jobId` and `activeVersionId` are unique; `(templateId, versionNumber)` is unique; one Draft version per template is enforced by a partial unique index.
- Titles and criterion labels are non-blank and bounded; criterion positions are positive and unique per version; response ratings are constrained to 1-5; Note bodies are non-blank and bounded to 10,000 characters.
- Template-version state requires `publishedAt` only for Published rows. Scorecard state requires `submittedAt` for Submitted rows, and Submitted rows require an overall recommendation.
- Restrictive foreign keys preserve tenant and historical records. Database guards require the active version to belong to its template and organization, require a scorecard's Interview/Participant/organization to agree, require the pinned published template version to match the Interview/Application Job, require each response criterion to belong to the pinned version, and require Note Application/organization consistency.
- Published template versions and their criteria are protected from database-level update/delete mutation.

Indexes are limited to query-backed access paths: template organization/Job lookup; template-version template/status lookup; scorecard organization/Interview/status and Interview lookup; and Note organization/Application/created-at lookup. Redundant indexes identified during final audit were removed.

Trigger implementations are named `ScorecardTemplate_active_version_guard`, `Scorecard_relationship_guard`, `ScorecardResponse_relationship_guard`, `ScorecardTemplateVersion_immutable_guard`, `ScorecardCriterion_draft_guard`, and `Note_relationship_guard`.

## 6. Template versioning and scorecard workflow

Managers create the initial Draft or clone the active Published version into a new Draft. Draft updates replace the draft criterion snapshot under an expected revision. Publishing is revision-guarded, atomically marks the version Published, and updates the template's active version. Published snapshots and criteria are immutable.

An assigned participant initially receives `NOT_STARTED` plus the active published template. The first save creates a Scorecard pinned to that version; later saves update only that participant's Draft and responses. Response shape must match the criterion type. Submission validates required criteria and the overall recommendation, then atomically changes the Scorecard to `SUBMITTED`. Submitted feedback is read-only.

## 7. Authorization matrix

| Capability | ADMIN | RECRUITER | HIRING_MANAGER | INTERVIEWER |
|---|---:|---:|---:|---:|
| View template | Yes | Yes | Yes | No |
| Manage template Draft/publish | Yes | Yes | No | No |
| View submitted feedback | Yes | Yes | Yes | No |
| Complete own assigned scorecard | Yes | Yes | Yes | Yes |
| View/create internal Notes | Yes | Yes | Yes | No |
| Edit/delete Notes | Any permitted Note; Admin override | Own Notes | Own Notes | No |

The `scorecard:complete` workflow still requires an InterviewParticipant relationship for the current user. `scorecard:view-submitted` returns submitted records only. Frontend permission gating does not replace backend authorization.

## 8. Tenant isolation and privacy

Organization is the tenant boundary. Every route establishes trusted tenant context from the authenticated membership, and repositories include `organizationId` in resource lookups. Job, Application, Interview, Participant, template/version, criterion, Scorecard, response, and Note relationship chains are validated in the same organization. Cross-organization guessed IDs resolve as not found or forbidden without protected data disclosure.

DTOs expose only workflow data required by each audience: interviewer reads contain their own scorecard; review DTOs contain submitted feedback; Note DTOs contain author ID and plain-text content; credentials, sessions, tokens, raw hashes, and unnecessary PII are excluded. Notes and template content are rendered as text, not raw HTML.

## 9. APIs

Planned: **14**. Actual: **14**. All are mounted under `/api/v1`.

1. `GET /organizations/:organizationId/jobs/:jobId/scorecard-template` - get the Job template.
2. `POST /organizations/:organizationId/jobs/:jobId/scorecard-template/draft` - create the initial or next Draft.
3. `PATCH /organizations/:organizationId/jobs/:jobId/scorecard-template/draft` - update a Draft with an expected revision.
4. `POST /organizations/:organizationId/jobs/:jobId/scorecard-template/publish` - publish a Draft with an expected revision.
5. `GET /organizations/:organizationId/interviews/:interviewId/scorecards` - get participant feedback summary.
6. `GET /organizations/:organizationId/interviews/:interviewId/my-scorecard` - get the current user's scorecard.
7. `PATCH /organizations/:organizationId/interviews/:interviewId/my-scorecard` - save the current user's Draft.
8. `POST /organizations/:organizationId/interviews/:interviewId/my-scorecard/submit` - submit the current user's scorecard.
9. `GET /organizations/:organizationId/interviews/:interviewId/scorecards/:scorecardId` - get one submitted scorecard.
10. `GET /organizations/:organizationId/applications/:applicationId/scorecards` - aggregate submitted feedback for an Application.
11. `GET /organizations/:organizationId/applications/:applicationId/notes` - list Application Notes.
12. `POST /organizations/:organizationId/applications/:applicationId/notes` - create an internal Note.
13. `PATCH /organizations/:organizationId/applications/:applicationId/notes/:noteId` - edit an authorized Note with an expected revision.
14. `DELETE /organizations/:organizationId/applications/:applicationId/notes/:noteId` - delete an authorized Note.

## 10. DTO, validation, and security decisions

Request bodies are strict Zod schemas with bounded text, UUID, enum, rating, unique-criterion, and positive-position validation. Responses use the existing `data` envelope and explicit sanitized DTOs. Mutations require the existing CSRF protection. Published feedback is never mixed with Draft feedback in review responses. Notes are plain text and limited to the Application target.

## 11. Concurrency and transaction boundaries

Template Draft update and publish use `expectedRevision` with a conditional revision increment inside a transaction; stale writers receive a conflict. Scorecard save uses the same conditional revision guard, creates the initial participant scorecard only when no revision was supplied, upserts responses, and keeps the scorecard and response changes in one transaction. Submission saves, validates required responses/recommendation, and conditionally transitions to Submitted in one transaction. Note edits use an expected revision and author/admin guard; Note create/delete and reads are tenant-scoped repository operations.

## 12. Frontend screens and routes

Primary dedicated routes: **2**:

- `/app/organizations/:organizationId/jobs/:jobId/scorecard` - template configuration.
- `/app/organizations/:organizationId/interviews/:interviewId/scorecard` - assigned user's scorecard.

Existing-screen integrations:

- Interview Detail shows submitted-feedback summaries/details and the current user's scorecard action when authorized; submitted cards are read-only.
- Application Detail shows submitted feedback aggregated by Interview and the Internal Notes panel with role/ownership controls.

Job Detail also links authorized users to the Job scorecard configuration route. Forms provide loading, empty, error, conflict, confirmation, and read-only states. Responsive layouts use bounded content, mobile-friendly grids, accessible labels, native controls, keyboard-operable actions, semantic status badges/alerts, and Radix dialog focus handling.

## 13. TanStack Query

TanStack Query owns template-by-Job, Interview summary/detail, current-user scorecard, Application feedback, and Application Notes caches. Query keys include organization and resource IDs. Successful template mutations replace the template cache; scorecard saves/submits replace the own-scorecard cache and invalidate the Interview summary; Note mutations invalidate the Application Notes cache. There is no global scorecard store or custom cache.

## 14. Tests and verification

Tests added include backend scorecard request-schema coverage and focused HTTP authorization coverage, plus frontend template-page, scorecard-form, interviewer-page, and feedback/Notes component coverage. Existing candidate-management and interview tests cover the integrated screens.

Backend final-audit verification:

- Final audit: **PASS WITH TARGETED FIXES**

- Prisma validate: **PASS**
- lint: **PASS**
- format check: **PASS**
- focused Phase 15 backend tests: **PASS**
- Phase 13/14 backend regression subset: **PASS**
- `git diff --check`: **PASS**

Frontend verification:

- production build: **PASS**
- 45 test files: **PASS**
- 247 tests: **PASS**
- TypeScript typecheck: **PASS**
- format check: **PASS**
- lint had no Phase 15 blocking errors

The production bundle-size warning remains non-blocking and belongs to later performance engineering.

## 15. Final audit fixes

The final audit recorded and fixed these targeted production issues: active template versions must belong to their template; Scorecard template versions must align to the Interview/Application Job; Note Application/organization consistency is enforced; published template versions and criteria are protected at database level; redundant indexes were removed; and focused HTTP authorization tests were added.

## 16. Manual QA

**PASS.** Verified template create/edit/publish/version lifecycle; stale-template conflict handling; interviewer Draft/save/submit/read-only behavior; independent feedback isolation; recruiting-team submitted-feedback visibility; Notes role and ownership rules; cross-tenant denial; and Application Detail feedback/Notes integration.

## 17. Known non-blocking technical debt

The frontend production bundle/chunk-size warning remains for later performance engineering. No Phase 15 blocker remains.

## 18. Files/modules affected

Backend: Prisma schema and migration, `src/modules/scorecards`, organization route/module wiring, permissions, and scorecard tests. Frontend: `src/features/scorecards`, router, Job Detail, Interview Detail, Application Detail, job routes, organization permission typing, and related tests. Documentation: this handoff plus synchronized project state/roadmap and relevant architecture/database/security records.

## 19. Next phase

**Phase 16 - Candidate Communication & Notifications - NOT STARTED.**
