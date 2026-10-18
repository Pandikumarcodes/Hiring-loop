# 15 - Technical debt and finding register

**Phase 4D update (2026-10-18):** Local browser and database remediation evidence resolves the prior missing browser harness and resume-trigger findings. Cloud provider validation, malware scanning, email reconciliation, CI/CD, backup/recovery and migration-rollout evidence remain unresolved. See [29-final-regression-verification.md](29-final-regression-verification.md).

**Phase 4B resume follow-up (2026-10-18):** The unresolved resume Prisma write error is reproduced and repaired: the shared document/upload relationship trigger referenced fields absent from the current table's `NEW` record, yielding PostgreSQL `42703` / Prisma `P2022`. A new trigger-only migration separates the branches and preserves ownership checks. All 16 focused resume PostgreSQL tests and the full serial DB suite (137 tests) pass. See [27-resume-persistence-verification.md](27-resume-persistence-verification.md). Live S3 controls, full parsing/malware scanning and orphan cleanup remain open; this does not certify production readiness.

Analysis date: 2026-10-17. Static repository investigation; no application execution, dependency installation, migrations, services, or deployment. Source presence is not proof of runtime success.

## VERIFIED

This register contains **24 distinct findings**. VERIFIED means the source condition or mismatch is established; it does not imply a reproduced runtime failure or security exploit. INFERRED identifies a credible consequence requiring runtime/concurrency/provider/deployment validation. Priorities are engineering order: P0 critical blocker, P1 high, P2 medium, P3 low. No P0 was established.

| ID  | Priority | Security severity          | Evidence class                                        | Finding                                                                            |
| --- | -------- | -------------------------- | ----------------------------------------------------- | ---------------------------------------------------------------------------------- |
| E01 | Resolved | Not classified as security | Repaired 2026-10-17                                   | Interview participant replacement omitted required interviewId                     |
| E02 | Resolved | Not classified as security | Repaired 2026-10-17                                   | Interview notifications consumed fields excluded by repository projection          |
| E03 | Resolved | Not classified as security | Repaired 2026-10-17                                   | Recruiter interview form depended on Admin-only member endpoint                    |
| E04 | Resolved | Not classified as security | Repaired 2026-10-17                                   | Offer edit/revision had sent path ID inside strict body                            |
| E05 | Resolved | Not classified as security | Repaired 2026-10-17                                   | Communication template update had sent an extra id                                 |
| E06 | P1       | Not classified as security | VERIFIED                                              | Scorecard business-error outcomes can commit partial writes                        |
| E07 | Resolved | Not classified as security | Repaired and PostgreSQL concurrency-tested 2026-10-17 | Concurrent scheduling could bypass overlap precheck                                |
| E08 | P1       | Not classified as security | VERIFIED                                              | Email delivery classification confuses provider acceptance and persistence failure |
| E09 | P2       | Not classified as security | VERIFIED                                              | Candidate pagination loses total on an empty page                                  |
| E10 | P1       | Not classified as security | VERIFIED                                              | No repository CI or deploy/recovery configuration found                            |
| E11 | P1       | Not classified as security | VERIFIED                                              | Default backend verification excludes all integration HTTP tests                   |
| E12 | P2       | Not classified as security | VERIFIED                                              | Health endpoint is liveness only                                                   |
| E13 | P2       | Not classified as security | VERIFIED                                              | Notification preference batch can partially apply                                  |
| E14 | P2       | Not classified as security | VERIFIED                                              | Important database rules live outside Prisma schema                                |
| E15 | P3       | Not classified as security | VERIFIED                                              | Startup relies on undeclared transitive dotenv                                     |
| E16 | P3       | Not classified as security | VERIFIED                                              | Documentation retains outdated phase instructions                                  |
| E17 | P3       | Not classified as security | VERIFIED                                              | Eager route imports and large feature surfaces                                     |
| E18 | Resolved | Not classified as security | Repaired in Phase 4A                                  | Concurrent offer-send loser returned 500 instead of a deterministic conflict       |
| S01 | P1       | High                       | RESOLVED (Phase 3E)                                   | Accepted resume remains writable through a still-valid signed PUT                  |
| S02 | P2       | Medium                     | VERIFIED / PARTIALLY MITIGATED (Phase 3E)             | Resume validation uses metadata and shallow signatures without content scanning    |
| S03 | P2       | Medium                     | VERIFIED                                              | Invitation HTML interpolates tenant-controlled organization name                   |
| S04 | P2       | Medium                     | VERIFIED                                              | Anonymous applications can overwrite an existing candidate profile by email        |
| S05 | P2       | Medium                     | INFERRED                                              | Email-provider failures can weaken enumeration-safe acknowledgements               |
| S06 | P2       | Medium                     | INFERRED                                              | Abuse limits depend on process count and reverse proxy setup                       |

## E01 - Interview participant replacement omits required interviewId

**REPAIRED 2026-10-17 (Phase 3B)** -> Security: Not classified as security.

**Evidence:** [hiringloop-backend/src/modules/interviews/repositories/interview-repository.js:265](../../hiringloop-backend/src/modules/interviews/repositories/interview-repository.js#L265); [hiringloop-backend/src/modules/interviews/use-cases/interview-use-cases.js:95](../../hiringloop-backend/src/modules/interviews/use-cases/interview-use-cases.js#L95); [hiringloop-backend/prisma/schema.prisma:716](../../hiringloop-backend/prisma/schema.prisma#L716).

**Root cause:** Standalone createMany receives objects containing only id and userId; unlike nested creation it has no parent relation context. Existing participant rows are also deleted and recreated, conflicting with restrictive Scorecard references.

**Impact:** Updating participants fails validation; with scorecards, deletion can fail a foreign key check. Transaction rolls back.

**Resolution:** Participant replacement preserves unchanged rows, adds `interviewId` to inserted relations, and rejects removal of participants that already have scorecards. The interview row is locked before the roster is read; selected memberships are rechecked and key-shared inside the transaction. Focused PostgreSQL integration covers persistence and invalid replacement rejection without partial changes.

**Dependencies:** Interview and scorecard history policy.

**Verification:** Focused PostgreSQL scheduling tests passed for creation/edit persistence, tenant-only discovery, invalid replacement rejection without changes, and concurrent booking/replacement serialization. A scored-removal PostgreSQL case remains a residual test opportunity. See document 20.

**Estimated complexity:** Medium. Estimates describe change surface, not calendar commitments.

## E02 - Interview notifications consume fields excluded by repository projection

**REPAIRED 2026-10-17 (Phase 3B)** -> Security: Not classified as security.

**Evidence:** [hiringloop-backend/src/modules/interviews/repositories/interview-repository.js:9](../../hiringloop-backend/src/modules/interviews/repositories/interview-repository.js#L9); [hiringloop-backend/src/modules/interviews/use-cases/interview-use-cases.js:59](../../hiringloop-backend/src/modules/interviews/use-cases/interview-use-cases.js#L59); [hiringloop-backend/tests/modules/phase16-notification-triggers.test.js:15](../../hiringloop-backend/tests/modules/phase16-notification-triggers.test.js#L15).

**Root cause:** INTERVIEW_SELECT omits organizationId and participant.userId. notifyParticipants reads both; test fixtures supply them despite real projection.

**Impact:** Schedule/reschedule/cancel can succeed while notification creation fails and is only logged.

**Resolution:** The internal projection now includes `organizationId` and participant `userId`; the public interview DTO remains limited to response fields. Focused interview notification tests passed.

**Dependencies:** E01 was repaired in Phase 3B; integrated projection checks are recorded in document 20.

**Suggested validation:** Exercise real repository, use case and notification service together; assert recipient and organization IDs.

**Estimated complexity:** Small. Estimates describe change surface, not calendar commitments.

## E03 - Recruiter interview form depends on Admin-only member endpoint

**REPAIRED 2026-10-17 (Phase 3B)** -> Security: Not classified as security.

**Evidence:** [hiringloop-frontend/src/features/interviews/components/InterviewFormDialog.tsx:68](../../hiringloop-frontend/src/features/interviews/components/InterviewFormDialog.tsx#L68); [hiringloop-backend/src/modules/members/routes/member-routes.js:32](../../hiringloop-backend/src/modules/members/routes/member-routes.js#L32); [hiringloop-backend/src/authorization/permissions.js:89](../../hiringloop-backend/src/authorization/permissions.js#L89).

**Root cause:** Recruiter can create interviews, but cannot read members; picker uses the team endpoint without a separate participant directory contract.

**Impact:** Recruiter cannot populate the required participant selection through the normal form.

**Resolution:** Added an interview-specific participant lookup permission to Admin and Recruiter roles and a tenant-scoped directory route. Interviewer and Hiring Manager roles remain denied; team management retains its existing member permission. Focused HTTP authorization tests and PostgreSQL tenant filtering passed.

**Dependencies:** Role scope is now explicit: Admin and Recruiter may discover tenant participants; membership management remains governed separately.

**Suggested validation:** Recruiter browser-to-HTTP scheduling with real authorization; Admin and Interviewer negative checks.

**Estimated complexity:** Medium. Estimates describe change surface, not calendar commitments.

## E04 - Offer edit/revision sends path ID inside strict body

**VERIFIED** -> **P1** -> Security: Not classified as security.

**Evidence:** [hiringloop-frontend/src/features/offers/hooks/mutations.ts:31](../../hiringloop-frontend/src/features/offers/hooks/mutations.ts#L31); [hiringloop-frontend/src/features/offers/api/offers.api.ts:46](../../hiringloop-frontend/src/features/offers/api/offers.api.ts#L46); [hiringloop-backend/src/modules/offers/schemas/offer-schemas.js:40](../../hiringloop-backend/src/modules/offers/schemas/offer-schemas.js#L40).

**Root cause:** The hook forwarded the full object with id to transport. The backend strict terms schema accepts terms plus expectedRevision, not id.

**Historical impact:** UI offer editing and revision requests were rejected with 400 VALIDATION_ERROR. The form also used parent offer.revision for edits whose repository checks OfferVersion.revision; repeated draft saves could conflict after removing id.

**Repair:** The mutation hook and API client now omit route id from edit/revision bodies. Draft edits now use currentVersion.revision, while revisions retain the parent offer revision. The backend schema remains strict.

**Dependencies:** None.

**Verification:** Focused frontend API/client and component tests cover the payload, version revision, and displayed server conflict. A backend router/schema test accepts the corrected body, rejects id, and verifies OFFER_UPDATE denial. Database persistence remains blocked without an explicitly isolated database.

**Estimated complexity:** Small to medium. Estimates describe change surface, not calendar commitments.

## E05 - Communication template update sends an extra id

**REPAIRED 2026-10-17** -> Security: Not classified as security.

**Evidence:** [hiringloop-frontend/src/features/communications/hooks/mutations.ts:47](../../hiringloop-frontend/src/features/communications/hooks/mutations.ts#L47); [hiringloop-frontend/src/features/communications/api/communications.api.ts:97](../../hiringloop-frontend/src/features/communications/api/communications.api.ts#L97); [hiringloop-backend/src/modules/communications/communications-module.js:43](../../hiringloop-backend/src/modules/communications/communications-module.js#L43).

**Root cause:** The update mutation passed path id in the body to a strict schema.

**Historical impact:** Template update requests from this hook received 400.

**Repair:** The mutation hook and API client now separate id for the URL and serialize only name, subject, body and expectedRevision. The backend schema remains strict.

**Dependencies:** None.

**Verification:** A focused frontend API-client test asserts the request body; a component test presents a server 409 conflict; the backend schema test rejects id and accepts the corrected update shape.

**Estimated complexity:** Small. Estimates describe change surface, not calendar commitments.

## E06 - Scorecard business-error outcomes could commit partial writes — REPAIRED (Phase 3C)

**REPAIRED (Phase 3C)** -> **P1** -> Security: Not classified as security.

**Evidence:** [hiringloop-backend/src/modules/scorecards/repositories/scorecard-repository.js:172](../../hiringloop-backend/src/modules/scorecards/repositories/scorecard-repository.js#L172); [hiringloop-backend/src/modules/scorecards/repositories/scorecard-repository.js:288](../../hiringloop-backend/src/modules/scorecards/repositories/scorecard-repository.js#L288); [hiringloop-backend/src/modules/scorecards/use-cases/scorecard-use-cases.js:129](../../hiringloop-backend/src/modules/scorecards/use-cases/scorecard-use-cases.js#L129).

**Root cause:** Repository writes card/revision and deletes or upserts responses before returning an invalid_response or incomplete outcome. Returning normally commits the transaction; the use case throws only afterward.

**Reproduction (2026-10-17):** PostgreSQL integration against verified local `hiringloop_test` seeded a valid draft, then attempted a response with the wrong criterion type. The use case returned `VALIDATION_ERROR`, but the database showed revision 2 instead of 1, changed overall fields, and deleted the prior response. The error-after-transaction-resolution harness from document 19 was therefore confirmed as durable behavior.

**Root cause:** Validation was interleaved with response replacement. The repository returned a business outcome normally after writes, so Prisma committed; the use case raised the error outside the transaction. Incomplete submission similarly returned after a draft save.

**Resolution:** The repository now aborts the transaction for rejected save/submit outcomes and translates the internal rollback signal only after rollback. Invalid and incomplete submissions leave card fields, revision and responses unchanged. Successful saves/submissions remain transactional; notification delivery stays after commit and outside the database transaction. See [21-scorecard-transaction-verification.md](21-scorecard-transaction-verification.md) for exact test evidence.

**Residual risk:** A notification failure after a successful submission is logged and swallowed; notifications are not durable/outbox-backed. Concurrent same-revision mutation and the removal-wins participant-removal/scorecard-submission ordering are covered by PostgreSQL integration. See [24-interview-concurrency-verification.md](24-interview-concurrency-verification.md). The reverse ordering and broader stress behavior are not exhaustively tested.

**Verification:** Focused PostgreSQL test proves invalid response rollback; concurrent update test permits only one expected-revision winner; existing forced audit failure proves submission and audit rollback. Full verification recorded in document 21.

**Estimated complexity:** Medium. Estimates describe change surface, not calendar commitments.

## E07 - Concurrent scheduling can bypass overlap precheck

**REPAIRED AND POSTGRESQL-CONCURRENCY-TESTED 2026-10-17 (Phase 3B)** -> Security: Not classified as security.

**Evidence:** [hiringloop-backend/src/modules/interviews/repositories/interview-repository.js:51](../../hiringloop-backend/src/modules/interviews/repositories/interview-repository.js#L51); [hiringloop-backend/prisma/migrations/20260910120000_interview_scheduling_foundation/migration.sql:34](../../hiringloop-backend/prisma/migrations/20260910120000_interview_scheduling_foundation/migration.sql#L34).

**Root cause:** The baseline used check-then-write transactions with no shared participant lock or exclusion mechanism.

**Impact before repair:** Simultaneous requests could book the same participant twice.

**Resolution and verification:** Schedule, replacement, and reschedule acquire transaction-scoped advisory locks for tenant/participant keys in sorted order before checking overlap. Replacement and reschedule also lock the interview row before reading participants. PostgreSQL tests confirm one of two identical concurrent bookings succeeds and concurrent replacements leave exactly one requested participant set.

**Dependencies:** Cross-organization scheduling policy.

**Residual validation:** The direct simultaneous-booking case passed. Broader load and deadlock behavior are not covered; the implementation does not add automatic retries.

**Phase 3F follow-up (2026-10-17):** Deterministic `hiringloop_test` barriers also verified simultaneous rescheduling into one overlapping slot (one commit, one conflict) and serialized participant removal against scorecard submission. Scorecard mutations now take a shared lock on the tenant-scoped interview row, compatible with one another and conflicting with roster replacement's update lock. The member-management suite had one unrelated remove/demote race failure in the full run; the exact case passed in isolation. See [24-interview-concurrency-verification.md](24-interview-concurrency-verification.md) for limits and results.

**Estimated complexity:** Medium to large. Estimates describe change surface, not calendar commitments.

## E08 - Email delivery classification confused provider acceptance and persistence failure — REPAIRED (Phase 3D)

**REPAIRED for synchronous request paths (Phase 3D)** -> **P1** -> Security: Not classified as security.

**Evidence:** [hiringloop-backend/src/modules/communications/candidate-communication-service.js:14](../../hiringloop-backend/src/modules/communications/candidate-communication-service.js#L14); [hiringloop-backend/src/modules/auth/email/email-delivery.js:46](../../hiringloop-backend/src/modules/auth/email/email-delivery.js#L46); [hiringloop-backend/src/modules/offers/use-cases/offer-use-cases.js:192](../../hiringloop-backend/src/modules/offers/use-cases/offer-use-cases.js#L192).

**Original root cause:** One try/catch wrapped provider dispatch and the `SENT` database update, treating a persistence error after provider acceptance as provider failure. The adapter also mapped every SendGrid error to `sendgrid-error`, preventing transport ambiguity from reaching the `PENDING` branch.

**Resolution:** Provider errors now map to `provider-rejected`, `not-sent`, or `ambiguous`. Only the first two can transition a pending communication to `FAILED`. `ETIMEDOUT`, `ECONNRESET`, HTTP 408/5xx, and unknown outcomes remain `PENDING`. Provider acceptance and delivery-state persistence have separate error handling; a failed `SENT` write propagates without marking the request failed. Candidate communication replays and offer retries do not redispatch `PENDING` rows. Tenant/application-scoped reads and status updates remain enforced.

**Idempotency limits:** Unique tenant/application/actor/idempotency constraints and offer retry claims prevent duplicate requests through the existing APIs. Exactly-once provider delivery is not guaranteed. A process crash or database failure can leave a request `PENDING` with unknown provider acceptance; this phase deliberately avoids resending it automatically. No worker/outbox/reconciliation infrastructure was added.

**Operational follow-up:** Add durable reconciliation/manual resolution and provider delivery/bounce webhooks only with a separately designed outbox/provider policy.

**Verification:** Deterministic SendGrid error classification; fake provider acceptance/rejection/timeout/reset/rate limit; real PostgreSQL state after accepted-then-database-write failure; same-key duplicate/concurrency and offer retry regression. Exact results are in [22-email-delivery-verification.md](22-email-delivery-verification.md).

**Estimated complexity:** Large. Estimates describe change surface, not calendar commitments.

## E09 - Candidate pagination loses total on an empty page

**VERIFIED** -> **P2** -> Security: Not classified as security.

**Evidence:** [hiringloop-backend/src/modules/candidates/repositories/candidate-management-repository.js:63](../../hiringloop-backend/src/modules/candidates/repositories/candidate-management-repository.js#L63).

**Root cause:** Window count is available only on returned rows.

**Impact:** Out-of-range page reports zero total although matching candidates exist.

**Recommended fix:** Separate count query or return count independently of the limited row set.

**Dependencies:** Pagination contract.

**Suggested validation:** Request one page beyond last while matching data exists.

**Estimated complexity:** Small. Estimates describe change surface, not calendar commitments.

## E10 - No repository CI or deploy/recovery configuration found

**VERIFIED** -> **P1** -> Security: Not classified as security.

**Evidence:** [hiringloop-backend/package.json:19](../../hiringloop-backend/package.json#L19); [docs/architecture/INFRASTRUCTURE_ARCHITECTURE.md:1](../../docs/architecture/INFRASTRUCTURE_ARCHITECTURE.md#L1).

**Root cause:** Local verification scripts and architecture plans exist; enumerated repository contains no CI workflow, container/IaC or concrete backup/rollback configuration.

**Impact:** Production readiness and enforced merge gates cannot be established.

**Recommended fix:** Create approved CI gates and a deployment/runbook with environment, migration, secrets, rollback and tested restore ownership.

**Dependencies:** Hosting and production database decisions.

**Suggested validation:** Clean-checkout pipeline plus staging rollout and restore rehearsal.

**Estimated complexity:** Large. Estimates describe change surface, not calendar commitments.

## E11 - Default backend verification excludes all integration HTTP tests

**VERIFIED** -> **P1** -> Security: Not classified as security.

**Evidence:** [hiringloop-backend/package.json:11](../../hiringloop-backend/package.json#L11); [hiringloop-backend/package.json:12](../../hiringloop-backend/package.json#L12); [hiringloop-backend/tests/integration/phase17-offers-http.test.js:1](../../hiringloop-backend/tests/integration/phase17-offers-http.test.js#L1).

**Root cause:** test excludes tests/integration/\*\*; test:db only runs tests/integration/database. Top-level phase17/18 HTTP files require a separate invocation and are absent from verify scripts.

**Impact:** A normal verify plus verify:db run can miss tenant/role/contract regressions covered in top-level integration tests.

**Recommended fix:** Add an explicit complete integration gate with safe isolated PostgreSQL configuration.

**Dependencies:** E10.

**Suggested validation:** Enumerate collected test paths for every gate and assert all intended suites are selected.

**Estimated complexity:** Small to medium. Estimates describe change surface, not calendar commitments.

## E12 - Health endpoint is liveness only

**VERIFIED** -> **P2** -> Security: Not classified as security.

**Evidence:** [hiringloop-backend/src/app.js:40](../../hiringloop-backend/src/app.js#L40); [hiringloop-backend/src/server.js:28](../../hiringloop-backend/src/server.js#L28).

**Root cause:** Health always returns ok without checking DB; shutdown has no deadline.

**Impact:** After startup a DB outage is invisible to health probes; shutdown can wait on lingering connections.

**Recommended fix:** Separate readiness/liveness, bounded checks and shutdown deadline.

**Dependencies:** Deployment proxy/orchestrator contract.

**Suggested validation:** Readiness fails on DB loss; liveness stays appropriate; long request drains within shutdown budget.

**Estimated complexity:** Medium. Estimates describe change surface, not calendar commitments.

## E13 - Notification preference batch can partially apply

**VERIFIED** -> **P2** -> Security: Not classified as security.

**Evidence:** [hiringloop-backend/src/modules/notifications/notifications-module.js:184](../../hiringloop-backend/src/modules/notifications/notifications-module.js#L184).

**Root cause:** Sequential independent upserts without a transaction; duplicate types not rejected.

**Impact:** Mid-loop failure leaves partial preferences; duplicate type entries are last-write wins.

**Recommended fix:** Validate uniqueness and apply one transaction or document partial-update semantics.

**Dependencies:** None.

**Suggested validation:** Inject failure on second preference and assert chosen atomicity contract.

**Estimated complexity:** Small. Estimates describe change surface, not calendar commitments.

## E14 - Important database rules live outside Prisma schema

**VERIFIED** -> **P2** -> Security: Not classified as security.

**Evidence:** [hiringloop-backend/prisma/migrations/20260909120000_candidate_application_flow_foundation/migration.sql:168](../../hiringloop-backend/prisma/migrations/20260909120000_candidate_application_flow_foundation/migration.sql#L168); [hiringloop-backend/prisma/migrations/20260914120000_analytics_audit/migration.sql:30](../../hiringloop-backend/prisma/migrations/20260914120000_analytics_audit/migration.sql#L30).

**Root cause:** SQL migrations add composite foreign keys, partial indexes, guards and reporting indexes not fully represented in schema.prisma.

**Impact:** A schema-only database setup misses integrity protections; future diffs need SQL-aware review.

**Recommended fix:** Keep SQL as required source of truth; document drift and test migration-from-empty parity. Model supported indexes in Prisma where appropriate.

**Dependencies:** Migration review discipline.

**Suggested validation:** Build a fresh database exclusively from migrations and inspect constraints/indexes/triggers.

**Estimated complexity:** Medium. Estimates describe change surface, not calendar commitments.

## E15 - Startup relies on undeclared transitive dotenv

**VERIFIED** -> **P3** -> Security: Not classified as security.

**Evidence:** [hiringloop-backend/src/server.js:2](../../hiringloop-backend/src/server.js#L2); [hiringloop-backend/prisma.config.js:1](../../hiringloop-backend/prisma.config.js#L1); [hiringloop-backend/package.json:26](../../hiringloop-backend/package.json#L26).

**Root cause:** dotenv is imported but not a direct dependency; lockfile currently includes 17.4.2 transitively.

**Impact:** Dependency-tree changes may break startup/config loading. A current startup failure is not established.

**Recommended fix:** Declare runtime dependency or use a deliberate Node environment-file startup strategy.

**Dependencies:** Pin supported Node release.

**Suggested validation:** Clean production-only dependency install and isolated startup smoke test.

**Estimated complexity:** Small. Estimates describe change surface, not calendar commitments.

## E16 - Documentation retains outdated phase instructions

**VERIFIED** -> **P3** -> Security: Not classified as security.

**Evidence:** [PROJECT_INSTRUCTIONS.md:13](../../PROJECT_INSTRUCTIONS.md#L13); [hiringloop-frontend/README.md:332](../../hiringloop-frontend/README.md#L332); [PROJECT_STATE.md:9](../../PROJECT_STATE.md#L9).

**Root cause:** Historical foundation and phase notes coexist with current product state.

**Impact:** New maintainers can infer wrong implementation scope and test status.

**Recommended fix:** Mark phase snapshots as historical and establish one current entry point.

**Dependencies:** None.

**Suggested validation:** Cross-check counts and workflows with mounted routes.

**Estimated complexity:** Small. Estimates describe change surface, not calendar commitments.

## E17 - Eager route imports and large feature surfaces

**VERIFIED** -> **P3** -> Security: Not classified as security.

**Evidence:** [hiringloop-frontend/src/app/router/routes.tsx:51](../../hiringloop-frontend/src/app/router/routes.tsx#L51); [hiringloop-frontend/src/features/candidate-application/pages/PublicApplyPage.tsx:29](../../hiringloop-frontend/src/features/candidate-application/pages/PublicApplyPage.tsx#L29).

**Root cause:** All page imports are eager; no route lazy/Suspense boundary found. Some pages combine form, transport orchestration and extensive markup.

**Impact:** Initial JavaScript size and maintenance cost may grow; no measured performance regression.

**Recommended fix:** Measure bundles and route timings, then split heavy feature routes and cohesive UI sections.

**Dependencies:** Baseline measurements.

**Suggested validation:** Compare bundle and navigation performance with unchanged error/loading behavior.

**Estimated complexity:** Medium. Estimates describe change surface, not calendar commitments.

## E18 - Concurrent offer-send loser returns an internal error

**REPAIRED (Phase 4A, 2026-10-18)** -> Historical **P2** -> Security: Not classified as security.

**Evidence:** [hiringloop-backend/src/modules/offers/use-cases/offer-use-cases.js:137](../../hiringloop-backend/src/modules/offers/use-cases/offer-use-cases.js#L137); [hiringloop-backend/src/modules/offers/repositories/offer-repository.js:170](../../hiringloop-backend/src/modules/offers/repositories/offer-repository.js#L170); [hiringloop-backend/prisma/migrations/20260913120000_offers_outcomes_talent_pools/migration.sql:73](../../hiringloop-backend/prisma/migrations/20260913120000_offers_outcomes_talent_pools/migration.sql#L73); [hiringloop-backend/tests/integration/phase17-offers-http.test.js:518](../../hiringloop-backend/tests/integration/phase17-offers-http.test.js#L518).

**Root cause:** Two requests with distinct idempotency keys can both read the same offer version as unissued. `prepareSend` creates a communication and then updates that shared `OfferVersion`; if the first transaction marks it issued before the second update, the `OfferVersion_immutable` trigger rejects the second mutation. The resulting Prisma exception is not translated to a conflict response.

**Reproduction (2026-10-17):** Against verified disposable `hiringloop_test`, the real HTTP concurrency test intermittently returned one `201` and one `500 INTERNAL_ERROR` rather than one `201` and one `409`. In the captured failing run, the fake provider was called once and one communication row remained, so duplicate delivery/partial persistence was not observed. The underlying server log intentionally exposed only the error type and request ID; the exact Prisma/PostgreSQL error code was not recorded. Source and trigger behavior strongly identify the immutable-version update as the failing boundary.

**Confirmed reproduction (Phase 4A):** Controlled PostgreSQL row-lock barriers forced both requests past the old unissued-state read. The loser raised Prisma `P2039`, PostgreSQL `P0001: issued offer versions are immutable`, and returned 500. This establishes the trigger failure precisely; it was not a unique collision or Prisma transaction-conflict error. One communication and one fake-provider invocation remained after rollback.

**Historical impact:** A valid concurrent loser received an internal error instead of a stable conflict/retry response. The observed transaction rollback kept one communication and one provider call, but callers and monitoring saw a server failure.

**Resolution:** Send preparation now locks the tenant-scoped parent Offer row before reading lifecycle/idempotency state, using the same lock as revision creation. A distinct-key loser rereads committed issued/revision state and returns `409 OFFER_INVALID_TRANSITION`. Same-key replays preserve pending/sent recovery and the existing atomic failed-retry claim. Unique-error recovery is restricted to `Communication_idempotency_key`; unexpected database errors remain 500. Provider dispatch remains after commit. See [26-offer-send-concurrency-verification.md](26-offer-send-concurrency-verification.md) for exact evidence and full verification.

**Dependencies:** Offer-send idempotency and retry contract.

**Verification:** Deterministic HTTP/PostgreSQL regressions cover distinct/same keys, stale revision, rollback, rejection/retry, ambiguity, accepted-then-persistence-failure, tenant/role denial and persisted offer/communication/audit/provider counts. Exactly-once provider delivery remains unguaranteed; unknown acceptance stays PENDING without automatic resend.

**Estimated complexity:** Small to medium. Estimates describe change surface, not calendar commitments.

## S01 - RESOLVED (Phase 3E): Accepted resume remains writable through a still-valid signed PUT

**Original status: INFERRED** -> **P1** -> Security: High. Remediation status: Resolved in application code; production controls remain unverified.

**Evidence:** [hiringloop-backend/src/modules/applications/storage/aws-s3-application-storage.js:37](../../hiringloop-backend/src/modules/applications/storage/aws-s3-application-storage.js#L37); [hiringloop-backend/src/modules/applications/repositories/application-repository.js:154](../../hiringloop-backend/src/modules/applications/repositories/application-repository.js#L154); [hiringloop-backend/src/modules/applications/use-cases/public-application-use-cases.js:348](../../hiringloop-backend/src/modules/applications/use-cases/public-application-use-cases.js#L348).

**Original root cause:** Document retained the same object key authorized for PUT, and signed requests had no storage-side create-only precondition.

**Repair:** The AWS adapter now signs `If-None-Match: *` and returns it as a required header. The browser forwards all required headers. AWS S3 conditional writes reject creation if a current object exists. Generated upload keys remain unpredictable; acceptance remains organization/job-scoped and the application transaction consumes the upload once.

**Verification:** Offline presign test confirms this condition is signed; fake object store confirms replay does not replace original bytes. No real S3/bucket policy test was run. Production bucket CORS must allow the header, and production IAM/bucket policy should require conditional writes and deny unneeded delete operations.

**Residual:** S3 conditional write applies to current object version; deletes/versioning and other IAM principals were not examined. PUT body size is validated before acceptance but not capped by the signed PUT itself.

**Suggested validation:** Verify deployed S3 bucket policy, CORS, versioning and IAM; exercise a real non-production bucket with replay and delete-marker cases.

**Estimated complexity:** Medium to large. Estimates describe change surface, not calendar commitments.

## S02 - Resume validation uses metadata and shallow signatures without content scanning

**VERIFIED** -> **P2** -> Security: Medium.

**Evidence:** [hiringloop-backend/src/modules/applications/use-cases/public-application-use-cases.js:234](../../hiringloop-backend/src/modules/applications/use-cases/public-application-use-cases.js#L234); [hiringloop-backend/src/modules/applications/storage/aws-s3-application-storage.js:72](../../hiringloop-backend/src/modules/applications/storage/aws-s3-application-storage.js#L72).

**Root cause:** Submission now checks a short PDF/OLE/ZIP signature as well as metadata and declared size/MIME. It does not parse full document structure or scan/quarantine content. The max size is enforced at reservation and acceptance, not at the direct S3 PUT boundary.

**Impact:** Malicious or mislabeled files can reach staff downloads; actual malware acceptance not tested.

**Recommended fix:** Add safe parsing and malware scan/quarantine if required by product threat model; consider presigned POST `content-length-range` or another provider-enforced upload cap.

**Dependencies:** Parser/scanner and upload-cap design.

**Suggested validation:** MIME mismatch, malformed document and harmless malware-test fixtures; enforce access gate.

**Estimated complexity:** Large. Estimates describe change surface, not calendar commitments.

## S03 - Invitation HTML interpolates tenant-controlled organization name

**VERIFIED** -> **P2** -> Security: Medium.

**Evidence:** [hiringloop-backend/src/modules/auth/email/email-delivery.js:141](../../hiringloop-backend/src/modules/auth/email/email-delivery.js#L141); [hiringloop-backend/src/modules/organizations/schemas/organization-schemas.js:19](../../hiringloop-backend/src/modules/organizations/schemas/organization-schemas.js#L19).

**Root cause:** Organization name is bounded text but is inserted unescaped into HTML email.

**Impact:** Tenant Admin can inject markup into invitation email; phishing/layout effects depend on mail-client sanitization. Script execution not claimed.

**Recommended fix:** HTML-escape untrusted strings with a tested template renderer.

**Dependencies:** None.

**Suggested validation:** Invite with tag, quote, ampersand and link payloads; confirm rendered text.

**Estimated complexity:** Small. Estimates describe change surface, not calendar commitments.

## S04 - Anonymous applications can overwrite an existing candidate profile by email

**VERIFIED** -> **P2** -> Security: Medium.

**Evidence:** [hiringloop-backend/src/modules/applications/repositories/application-repository.js:91](../../hiringloop-backend/src/modules/applications/repositories/application-repository.js#L91); [hiringloop-backend/src/modules/candidates/domain/candidate-management-dto.js:60](../../hiringloop-backend/src/modules/candidates/domain/candidate-management-dto.js#L60).

**Root cause:** Public submission upserts by organization and normalized email, updating firstName, lastName and phone without proof of mailbox ownership. Application submitted snapshots exist but candidate views use current profile.

**Impact:** A successful application to another job can alter shared candidate identity/contact presentation. Duplicate same-job applications roll back; cross-job case remains.

**Recommended fix:** Treat submitted identity as untrusted per-application data or require verified ownership before canonical profile replacement.

**Dependencies:** Candidate identity/dedup product decision.

**Suggested validation:** Submit two jobs using same normalized email and different names/phones; verify approved identity policy.

**Estimated complexity:** Medium. Estimates describe change surface, not calendar commitments.

## S05 - Email-provider failures can weaken enumeration-safe acknowledgements

**INFERRED** -> **P2** -> Security: Medium.

**Evidence:** [hiringloop-backend/src/modules/auth/use-cases/forgot-password.js:24](../../hiringloop-backend/src/modules/auth/use-cases/forgot-password.js#L24); [hiringloop-backend/src/modules/auth/use-cases/resend-verification.js:21](../../hiringloop-backend/src/modules/auth/use-cases/resend-verification.js#L21); [hiringloop-backend/src/modules/auth/use-cases/register-user.js:26](../../hiringloop-backend/src/modules/auth/use-cases/register-user.js#L26).

**Root cause:** Ineligible identities immediately receive accepted; eligible identities call provider and expose 503 on failure. Registration also has different hash/provider timing.

**Impact:** During provider outage or through timing, account eligibility may be inferred. Not measured; rate limiting reduces throughput.

**Recommended fix:** Return a uniform public acknowledgement after durable delivery request and monitor failures internally.

**Dependencies:** Durable email processing.

**Suggested validation:** Compare existent/inexistent responses under injected provider failures and timing samples.

**Estimated complexity:** Medium. Estimates describe change surface, not calendar commitments.

## S06 - Abuse limits depend on process count and reverse proxy setup

**INFERRED** -> **P2** -> Security: Medium.

**Evidence:** [hiringloop-backend/src/middleware/rate-limit.js:153](../../hiringloop-backend/src/middleware/rate-limit.js#L153); [hiringloop-backend/src/app.js:15](../../hiringloop-backend/src/app.js#L15).

**Root cause:** Limiters use in-memory stores; all forwarded IPs are deliberately untrusted.

**Impact:** Multiple API replicas have independent budgets; a reverse proxy can collapse users into one apparent IP. Deployed topology is unknown.

**Recommended fix:** Define trusted proxy boundary and use a shared limiter store when replicas/proxies require it.

**Dependencies:** Hosting topology and Redis decision.

**Suggested validation:** Multi-instance and proxy tests for spoof resistance, fair per-client limits and outage behavior.

**Estimated complexity:** Medium. Estimates describe change surface, not calendar commitments.

## INFERRED

At baseline, the highest-value sequence was request/role contract repair, interview persistence/notification repair, scorecard atomicity, provider/file integrity, complete verification gates, then deployment/operational work. Phases 3A–3E have repaired their scoped contract, interview, scorecard, email and resume upload findings. Production S3 policy/CORS/IAM and full content inspection remain follow-up. A deployment is not certified by health routes or historical passing tests.

## NOT VERIFIED / UNKNOWN

The baseline analysis did not verify runtime/database/browser/load/provider/production behavior. Scoped phases 3B–3E ran their respective test/database suites as documented in documents 20–23; these results do not establish broader production readiness. In particular, real S3 bucket controls remain unknown.

The baseline investigation implemented no fixes; Phase 3A–3E changes are documented separately. No known exploit was confirmed in production. Uninspected code may contain additional defects; absence of findings in a domain is not proof of correctness.
