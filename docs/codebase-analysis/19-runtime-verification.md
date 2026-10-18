# 19 - Runtime verification and baseline quality audit

**Phase 4B follow-up (2026-10-18):** The resume missing-column limitation in the historical Phase 3E/4 notes below is resolved for the current workflow. Raw PostgreSQL `42703` and Prisma `P2022` identify invalid fields on the shared document/upload trigger's `NEW` record. The original 17 migrations/checksums and physical resume columns were correct. An additive migration uses table-specific control-flow branches; 16 focused resume PostgreSQL tests and the full serial DB suite (24 files / 137 tests) pass with fake storage. A separately stale generated client was regenerated, and the trigger error reproduced afterward before repair. See [27-resume-persistence-verification.md](27-resume-persistence-verification.md) for exact reproduction, database identity, complete checks and remaining limits. Historical original error metadata cannot be recovered.

Verification date: 2026-10-17. Workspace: `C:\Users\Pandikumar\Desktop\HiringLoop`. This report supplements documents 01–18; it does not retroactively turn static conclusions into runtime proof.

## 1. Verification environment

- Windows PowerShell, Node **v24.18.0**, npm **11.16.0**, existing local dependencies. Root has no package.json; frontend and backend are independent npm applications.
- Application source, manifests and lockfiles were not edited. No dependencies were installed, updated, pruned or regenerated. No migration, reset, seed, deployment or real provider request was performed.
- Existing analysis documents were consulted, prioritizing API inventory (07), database (08), security (09), flows (10), testing (12), findings (15), roadmap (16), summary (17) and coverage (18). The 113-endpoint baseline was cross-checked with runtime route registration and frontend source.
- Backend subprocess isolation: NODE_ENV=test; DATABASE_URL and TEST_DATABASE_URL blank; Google and S3 configuration disabled unless a probe explicitly uses synthetic configuration. SendGrid settings were synthetic, and production composition uses in-memory email in test mode. DOTENV_CONFIG_PATH pointed at a nonexistent audit-only path, preventing backend dotenv imports from loading the repository's real environment file.
- Frontend public API origin was overridden with a loopback port that has no service. API probes intercepted transport; no application API request used real data. Supertest used temporary local HTTP listeners with synthetic identities.
- Offline S3 signing used synthetic credentials, a fictitious unprovisioned bucket name and disabled instance metadata. No signed URL or credential value is included in this report.
- Docker, psql and pg_ctl were not found by the command lookup. More importantly, no explicitly confirmed disposable local database was supplied. A clarification was requested; absence of a reply was not treated as permission. Live DB verification is **BLOCKED**.
- Ignored build/test artifacts were produced under frontend dist/ and application coverage/ directories. They are verification output, not dependency or application source changes.

### Dependency baseline

Both `npm.cmd ls --depth=0 --offline` commands exited 0. All declared direct dependencies' installed versions match their current package-lock entries. Backend npm output nevertheless lists extraneous Redis/BullMQ-related packages; these were not installed or removed by this audit. Their presence is not evidence that queue functionality is implemented.

The current installed/locked frontend TypeScript version is **6.0.3**, while document 17's summary says 6.0.2 (the declared baseline range). Document 02 correctly records 6.0.3. Other actual tool versions include frontend Oxlint 1.80.0 / Prettier 3.6.2 and backend Oxlint 1.79.0 / Prettier 3.9.6. This is a correction to summary prose, not dependency drift.

## 2. Correct commands and execution boundaries

Run each command from its owning application directory. An isolation prefix as described above was applied to verification subprocesses. Neither npm install/ci nor npx fetching was used.

| Check | Correct existing command / safe invocation | Boundary |
| --- | --- | --- |
| Dependency presence | npm.cmd ls --depth=0 --offline in each app | Read-only tree validation; no vulnerability/advisory audit |
| TypeScript | Frontend: npm.cmd run typecheck | Backend has no typecheck script |
| Lint | npm.cmd run lint in each app | **Oxlint**, not ESLint; ESLint is not configured |
| Formatting | npm.cmd run format:check in each app | Never run the mutating format scripts for this audit |
| Frontend production build | npm.cmd run build | tsc -b then Vite; emits ignored build/cache artifacts |
| Backend build/syntax | node --check for all backend JS under src/scripts/tests and both JS config files | No backend build script; syntax is not a runtime import test |
| Backend unit / isolated HTTP | npm.cmd run test -- --maxWorkers=1 --coverage --coverage.reporter=json-summary --coverage.reporter=text-summary --reporter=default --reporter=json --outputFile=coverage/runtime-verification-tests.json | Existing test script excludes tests/integration/** |
| Frontend standard tests | npm.cmd run test -- --maxWorkers=2 --reporter=default --reporter=json --outputFile=coverage/runtime-verification-baseline-tests.json | Existing jsdom/component/hook/API tests; no live backend |
| Frontend instrumented attempt | npm.cmd run test -- --maxWorkers=1 --coverage --coverage.reporter=json-summary --coverage.reporter=text-summary --reporter=default --reporter=json --outputFile=coverage/runtime-verification-tests.json | Interrupted after slow execution and three failures; not a completed baseline |
| Prisma schema | npm.cmd run prisma:validate | Offline validation with a synthetic loopback URL on port 1; no connection |
| DB integration | Existing npm.cmd run test:db loads .env; safe alternative after confirmation: node node_modules/vitest/vitest.mjs run tests/integration/database under an explicitly isolated environment | **Not executed**; do not run against the current unknown target |
| Top-level integration HTTP | node node_modules/vitest/vitest.mjs run tests/integration --exclude tests/integration/database/** after confirmed disposable DB setup | **Not executed**; seven files depend on Prisma fixtures |
| Migration status | npm.cmd run prisma:migrate:test -- status, or direct local Prisma migrate status with a confirmed isolated URL | **Not executed**; the existing helper loads .env and only checks DB name |
| Browser E2E | No existing Playwright/Cypress/WebDriver script/config located | **BLOCKED: no configured harness or isolated full-stack resources** |

Root has no aggregate verification script. Backend verify + verify:db omit the seven top-level integration HTTP test files. They must be selected explicitly in a later database-backed gate.

## 3. Executed command outcomes

The table below reports real process exit results. A zero exit from a defect probe means its assertions successfully reproduced the bad behavior, not that the application workflow passed.

| Check / probe | Working directory | Command | Outcome |
| --- | --- | --- | --- |
| Backend dependency validation | hiringloop-backend | npm.cmd ls --depth=0 --offline | PASS; extraneous packages reported |
| Frontend dependency validation | hiringloop-frontend | npm.cmd ls --depth=0 --offline | PASS |
| Backend lint | hiringloop-backend | npm.cmd run lint | PASS |
| Frontend lint | hiringloop-frontend | npm.cmd run lint | PASS; 1 warning |
| Backend formatting | hiringloop-backend | npm.cmd run format:check | PASS |
| Frontend formatting | hiringloop-frontend | npm.cmd run format:check | PASS |
| Frontend typecheck | hiringloop-frontend | npm.cmd run typecheck | PASS |
| Backend syntax checks | hiringloop-backend | node via stdin; Backend syntax checks (source capsule / method below) | PASS |
| Prisma schema validation | hiringloop-backend | $env:DATABASE_URL='postgresql://audit:unused@127.0.0.1:1/hiringloop_test'; npm.cmd run prisma:validate | PASS |
| Backend non-database tests with coverage | hiringloop-backend | npm.cmd run test -- --maxWorkers=1 --coverage --coverage.reporter=json-summary --coverage.reporter=text-summary --reporter=default --reporter=json --outputFile=coverage/runtime-verification-tests.json | PASS |
| Frontend tests with coverage | hiringloop-frontend | npm.cmd run test -- --maxWorkers=1 --coverage --coverage.reporter=json-summary --coverage.reporter=text-summary --reporter=default --reporter=json --outputFile=coverage/runtime-verification-tests.json | INTERRUPTED (exit 1) |
| Frontend production build | hiringloop-frontend | npm.cmd run build | PASS; bundle-size warning |
| Isolated frontend-to-backend contract probes | hiringloop-backend | node via stdin; Isolated frontend-to-backend contract probes (source capsule / method below) | PASS |
| Isolated high-risk workflow probes | hiringloop-backend | node via stdin; Isolated high-risk workflow probes (source capsule / method below) | PASS |
| All-endpoint frontend-consumer structural cross-check | HiringLoop | node via stdin; All-endpoint frontend-consumer structural cross-check (source capsule / method below) | PASS |
| Offline migration inventory and database-isolation guard probes | hiringloop-backend | node via stdin; Offline migration inventory and database-isolation guard probes (source capsule / method below) | PASS |
| Runtime route-tree count with conditional Google routes enabled | hiringloop-backend | node via stdin; Runtime route-tree count with conditional Google routes enabled (source capsule / method below) | PASS |
| Offline resume signed-capability inspection | hiringloop-backend | node via stdin; Offline resume signed-capability inspection (source capsule / method below) | PASS |
| Frontend standard test suite | hiringloop-frontend | npm.cmd run test -- --maxWorkers=2 --reporter=default --reporter=json --outputFile=coverage/runtime-verification-baseline-tests.json | PASS |

Backend syntax check result: **245 JS files checked, zero syntax failures**. This includes source, scripts, tests and two JS configs; it does not execute imports/business logic.

Formatting passed in both applications. Frontend lint warning: PublicApplyPage.tsx:315:11, react(refs), “Cannot access refs during render.” Build transformed 2,260 modules; minified JS chunk **1,143.46 kB / 300.81 kB gzip**, CSS **40.21 kB / 8.72 kB gzip**, HTML **0.39 kB**. Vite emitted a >500 kB chunk warning. No browser performance claim is inferred from bundle size.

## 4. Actual test results

| Execution | Files completed | Tests passed | Tests failed | Skipped / pending | Exit / qualification |
| --- | --- | --- | --- | --- | --- |
| Backend existing non-DB suite | 40 | 252 | 0 | 0 | 0; completed with V8 coverage |
| Frontend existing standard suite | 53 | 281 | 0 | 0 | 0; completed |
| Frontend coverage attempt | 10 | 65 | 3 | Unknown outside completed file summaries | Interrupted by audit after slow execution; exit 1; not a full-suite result |
| Database integration | 0 | Not executed | Not executed | Not Vitest skipped tests | 23 files BLOCKED |
| Top-level integration HTTP | 0 | Not executed | Not executed | Not Vitest skipped tests | 7 files BLOCKED |

The instrumented attempt completed 10 file summaries containing 68 tests, with 65 reported successful and three failures: ApplicationFormBuilderPage “prevents option fifty-one…” and PublicApplyPage “validates required fields…” / “reuses the idempotency key…”. Durations exceeded the configured 15-second per-test timeout for those cases, but the run was interrupted before the final failure-detail report. It is not treated as a completed coverage measurement. Those three cases passed in the subsequent standard run. Changed instrumentation/worker count and host load prevent attributing the difference to one cause. **NOT REPRODUCED in standard run; timing/instrumentation reliability REQUIRES FURTHER TESTING.**

Existing test output includes expected stderr from deliberately injected backend errors/notification failures; the completed backend suite reports no failed tests or execution errors. The initial interrupted frontend attempt has no complete JSON report, so its in-progress work is not aggregated into unique completed baseline totals.

Completed standard suites executed **93 distinct files** of 123 inventoried. Backend + frontend baseline tests: **533 passed, 0 failed, 0 skipped/pending**. The 30 DB-dependent files were not run and are not counted as test-runner skips.

The completed frontend standard JSON report contains no failing assertions. No execution errors were reported by the completed standard suites. Frontend stderr did include one React act(...) test-environment warning in team/hooks/mutations.test.tsx; that test passed. This warning remains a test-harness quality concern.

### Measured backend coverage

Scope: src/**/*.js under the non-database test selection. These are actual V8 summary values, not whole-system integration coverage.

| Metric | Covered / total | Percentage |
| --- | --- | --- |
| lines | 1641 / 3075 | 53.36% |
| statements | 1735 / 3343 | 51.89% |
| functions | 413 / 976 | 42.31% |
| branches | 734 / 1890 | 38.83% |

Frontend coverage is **UNAVAILABLE for this audit**: the instrumented run was interrupted and the completed standard run did not instrument coverage. No frontend coverage percentage is inferred.

### Critical functionality not proven by these suites

UI-to-real-session-to-DB workflows; 30 DB-dependent files; PostgreSQL scorecard durability, participant-history integrity and concurrent interview overlap; S3 immutable/scan/overwrite behavior; provider acceptance versus timeout/crash recovery; real Google/browser-cookie behavior; browser accessibility/reflow and deployment restore/readiness. Mock/component success cannot close these gaps.


## 5. Database verification

**Prisma schema validation: PASS.** The existing Prisma 7.10 CLI loaded prisma.config.js and reported the schema valid. The command was given a synthetic localhost URL at port 1; it did not test connectivity.

**Offline migration inventory: PASS for the limited checks performed.** There are 17 SQL migrations, 39 Prisma models, 39 distinct CREATE TABLE definitions, no model/table name omissions in either direction, and 17 trigger declarations. migration_lock.toml identifies PostgreSQL. This does not verify applied migration checksums, drift, data invariants, rollback behavior or a live schema.

**Isolation guard probes:** the real getTestDatabaseUrl() rejects missing TEST_DATABASE_URL and a wrong database name. A URL using a remote invalid hostname and database name hiringloop_test is accepted by the guard without opening a connection. Therefore this guard enforces the name, **not local host or disposability**. Audit isolation was enforced by the subprocess environment rather than trusting that guard.

**BLOCKED:** connectivity, prisma migrate status/diff against a database, migration application consistency, real FK/check/trigger behavior, transaction durability, concurrent writes and all database-backed test fixtures. No production/shared database was contacted. The required explicit confirmation of a disposable local target was not available.

Evidence: [Prisma config](../../hiringloop-backend/prisma.config.js), [database client](../../hiringloop-backend/src/database/client.js), [test migration helper](../../hiringloop-backend/scripts/migrate-test-database.js), [schema](../../hiringloop-backend/prisma/schema.prisma).

## 6. API contract verification

Runtime Express registration with synthetic Google configuration counted **114 explicit method/path declarations: 113 versioned plus /health, including two conditional Google routes**. Merely registering routes did not invoke discovery, providers or a database.

All **113 versioned endpoints** were cross-checked against frontend API source by parsing TypeScript call expressions and normalizing route templates/helper prefixes. **111 have candidate frontend consumer matches.** The two exceptions are:

- GET /api/v1/auth/google/callback: an identity-provider browser callback, so no frontend fetch wrapper is expected.
- GET /api/v1/organizations/:organizationId/offers/:offerId: no dedicated by-ID wrapper found; the UI reads offers by application.

The mapping appendix below covers every endpoint. It is a structural method/path match, not proof that every field, status, authorization branch or UI call site is correct. Dynamic placeholders can broaden candidate matches.

### Executed priority contract probes

The real frontend TypeScript API and mutation-hook files were transpiled **in memory** with the installed TypeScript compiler. Query hooks and CSRF bootstrap were stubbed, transport captured the resulting body, and the payload was supplied to actual backend routing/validation with synthetic context. No source or test file was edited.

| Probe | Actual result | Conclusion |
| --- | --- | --- |
| Offer edit | Historical probe: 400 VALIDATION_ERROR; body included id; business handler not called | **E04 repaired in Phase 3A** |
| Offer revision | Historical probe: 400 VALIDATION_ERROR; body included id; business handler not called | **E04 repaired in Phase 3A** |
| Communication template update | Historical probe: 400 VALIDATION_ERROR; body included id | **E05 repaired in Phase 3A** |
| Recruiter member picker | 403, while INTERVIEW_CREATE permission is true | **CONFIRMED E03** |
| Admin member picker control | 200 | Demonstrates role-specific denial, not a broken route for all roles |

Offer probes used the actual offer router/schema. Template validation evaluated the exact inline templateBody/templateUpdateBody declaration from the module, then used the real validateRequest/errorHandler; the full DB-coupled communication router was not invoked. Member probes used the actual member router and permission middleware, with authentication/tenant resolution and list service stubbed. These are isolated contract tests, not authenticated full-stack E2E tests.

Evidence: [offer hooks](../../hiringloop-frontend/src/features/offers/hooks/mutations.ts), [offer API](../../hiringloop-frontend/src/features/offers/api/offers.api.ts), [offer schema](../../hiringloop-backend/src/modules/offers/schemas/offer-schemas.js), [template hooks](../../hiringloop-frontend/src/features/communications/hooks/mutations.ts), [template API](../../hiringloop-frontend/src/features/communications/api/communications.api.ts), [inline template schema](../../hiringloop-backend/src/modules/communications/communications-module.js), [picker](../../hiringloop-frontend/src/features/interviews/components/InterviewFormDialog.tsx), [member route](../../hiringloop-backend/src/modules/members/routes/member-routes.js), [permissions](../../hiringloop-backend/src/authorization/permissions.js).

### Phase 3A verified repairs

On 2026-10-17, the Offer edit/revision and Communication Template update clients were repaired to keep route identifiers in the URL and omit them from strict request bodies. Draft Offer edits now send the current OfferVersion revision, while new revisions retain the Offer revision. Focused frontend client/component tests and a backend router/schema test passed: valid corrected Offer requests reach the use case, unknown `id` fields remain rejected with validation failure, and `OFFER_UPDATE` denial prevents a use-case invocation. The complete frontend suite (55 files, 285 tests) and backend non-database suite (41 files, 256 tests) passed. Database-backed persistence verification remains blocked by the environment described above.

## 7. High-risk workflow verification matrix

CONFIRMED below refers only to the explicitly described runtime boundary. It does not imply a successful live PostgreSQL/provider reproduction.

| Risk | Status | Actual evidence | Remaining verification |
| --- | --- | --- | --- |
| Interview participant integrity (E01) | **CONFIRMED at repository interface** | Real use case + repository called deleteMany, then standalone createMany with only id/userId and no required interviewId; a recording adapter detected the invalid boundary | PostgreSQL validation/rollback and preservation of scorecard references BLOCKED |
| Missing interview notifications (E02) | **CONFIRMED** | Real repository projection + use case produced one notifier call with both organizationId and recipientUserId undefined | Real notification insert and delivery integration BLOCKED |
| Scorecard transaction semantics (E06) | **CONFIRMED at transaction contract** | Real repository/use case performed card update and response delete; transaction callback resolved normally; use case then raised VALIDATION_ERROR | Real DB commit/rollback and failed-submission policy require further DB testing |
| Email delivery recovery (E08) | **CONFIRMED in fault-injection harness** | Synthetic provider accepted once; SENT status update failed; service attempted FAILED update and returned FAILED. Real SendGrid adapter maps synthetic ETIMEDOUT to sendgrid-error, not ambiguous | Live provider ambiguity, crash recovery, retry and reconciliation need a disposable provider/DB harness |
| Resume overwrite (S01) | **BLOCKED for actual overwrite** | Offline real SDK signing confirms PUT/GET target the same key, neither binds versionId, TTLs 600/300 seconds; no request sent | Explicit disposable bucket/emulator, overwrite before/after commit, checksum/version/access checks |
| Concurrent interview scheduling (E07) | **BLOCKED** | Source precheck remains; no concurrency test was executed | Disposable PostgreSQL and synchronized parallel schedule/reschedule tests |

The scorecard adapter implemented normal transaction completion and recorded writes; it did not emulate PostgreSQL constraints. The interview adapter honored the real select projection but is not an ORM validation engine. The email adapter used deterministic synthetic failures. These limits are material: the probes confirm call ordering, data shape and error classification, while durable/provider outcomes remain unverified.

The signed-capability probe printed only booleans, expiry values and header names; no URL/token/credential. The observed signed header list was host, and returned required headers contained Content-Type. Storage-side policies, retention, versioning and IAM remain unknown.

## 8. Confirmed defects and discrepancies

1. **E04:** frontend offer edit/revise includes path id in a strict request body; runtime server validation rejects it. The separate Offer versus OfferVersion revision concern remains source-derived and was not independently reproduced in this pass.
2. **E05:** template update forwards id into a strict body; runtime validation rejects it.
3. **E03:** recruiter scheduling UI requires a member list denied to Recruiter; actual role middleware returns 403.
4. **E01/E02:** interview replacement omits relation key and notifications consume fields absent from the actual projection.
5. **E06:** invalid scorecard data can reach a normally completed transaction callback after mutations; PostgreSQL durability not tested.
6. **E08:** post-send persistence errors enter delivery-failure handling; timeout classification does not reach the ambiguous branch.
7. **Isolation limitation:** test DB name guard accepts nonlocal hosts; it cannot independently enforce this audit's local/disposable-only rule.
8. **Documentation discrepancy:** executive summary TypeScript 6.0.2 should be read as installed/locked 6.0.3; no dependency files changed.
9. **Baseline warnings:** frontend lint ref warning and production bundle size warning; neither caused a nonzero exit.

No implementation fixes were made. Passing existing mocked suites does not invalidate the independently reproduced boundary defects.

## 9. Blocked verification steps

| Step | Status / exact reason |
| --- | --- |
| Live DB connectivity and migration status | **BLOCKED**: no explicitly confirmed disposable local database |
| 23 database integration test files | **BLOCKED**: fixtures insert/delete data and alter constraint/trigger handling; unsafe against an unknown target |
| Seven top-level integration HTTP files | **BLOCKED**: fixtures create Prisma-backed tenant/user/job/application data |
| Real model constraint/trigger and scorecard durability tests | **BLOCKED**: offline schema validity cannot replace DB execution |
| Parallel interview overlap test | **BLOCKED**: requires isolated transactional PostgreSQL |
| Resume overwrite / scan / retention verification | **BLOCKED**: no disposable storage target; real S3 was not accessed |
| Live Google/SendGrid behavior | **BLOCKED**: no isolated provider account/harness authorized; fake-client behavior only |
| Browser E2E | **BLOCKED**: no existing browser automation harness and no confirmed full-stack disposable resources |
| ESLint / backend compiler build | **NOT CONFIGURED**, not an application test failure: Oxlint and Node syntax checks are the available gates |
| Clean-install reproducibility / dependency advisory audit | **NOT RUN**: installs/lockfile changes prohibited; installed-tree/lock validation only |
| Production readiness | **NOT ESTABLISHED**: known defects and absent live integration/recovery/deployment evidence |

## 10. Recommended next verification actions

1. Explicitly confirm a local disposable hiringloop_test target and its host/port/isolation, without publishing credentials. Prefer an isolated instance/account, not merely a test-like name on a shared host.
2. Verify migration status and schema constraints on that target; review fixture cleanup before running all 23 DB plus seven top-level integration HTTP files.
3. Run PostgreSQL reproductions for participant replacement/history, real notification insertion, scorecard atomicity and concurrent scheduling.
4. Promote the memory-only contract probes into regression tests in a separately authorized implementation task; repair request mapping and role-directory policy afterward.
5. Establish disposable storage/provider harnesses for overwrite and delivery-recovery fault injection.
6. Investigate frontend instrumentation/timing variability with controlled worker count and host load before enforcing coverage gates. Do not erase the failed/interrupted run from baseline history.
7. Add a real browser-to-API-to-DB verification gate and verify readiness/proxy/cookie/backup/restore configuration before production sign-off.

Stop point: verification and documentation only; no source fix, refactor, dependency change or deployment.

## 11. Final verification classifications

| Requested status | Classification | Supporting evidence |
| --- | --- | --- |
| STATICALLY REVIEWED | YES, with selective-depth limits | Documents 01–18 and their coverage ledger; all 113 endpoints indexed in this pass |
| BUILD VERIFIED | YES for frontend; backend syntax verified | Frontend tsc/Vite exit 0; 245 backend JS syntax checks pass; no backend compiler script |
| TEST VERIFIED | PARTIAL: available standard suites passed | 40 backend files / 252 tests; 53 frontend files / 281 passed; 30 DB files blocked; interrupted instrumented attempt retained |
| DATABASE VERIFIED | NO / BLOCKED | Prisma validation and offline migration inventory pass, but no confirmed disposable live DB |
| INTEGRATION VERIFIED | PARTIAL ISOLATED ONLY; full integration NO | Existing isolated HTTP tests + five contract probes passed their assertions; real DB/provider integration blocked |
| E2E VERIFIED | NO / BLOCKED | No configured browser harness or confirmed disposable full-stack resources |
| PRODUCTION READY | NO: not established | Confirmed functional/integrity defects, blocked DB/provider/E2E evidence and unresolved operational readiness |

## 12. All 113 endpoints: frontend consumer cross-check

Method/path matching used TypeScript AST call expressions, helper-prefix expansion and normalized dynamic segments. “Candidate” is deliberate: this table does not prove request/response schema compatibility or actual UI reachability. Runtime contract probes are the stronger evidence for the prioritized failures.

| Method / complete route | Candidate frontend wrapper and source |
| --- | --- |
| GET /api/v1/organizations/:organizationId/analytics/overview | getAnalyticsOverview — [hiringloop-frontend/src/features/analytics/api/analytics.api.ts:53](../../hiringloop-frontend/src/features/analytics/api/analytics.api.ts#L53) |
| GET /api/v1/organizations/:organizationId/analytics/funnel | getAnalyticsFunnel — [hiringloop-frontend/src/features/analytics/api/analytics.api.ts:62](../../hiringloop-frontend/src/features/analytics/api/analytics.api.ts#L62) |
| GET /api/v1/organizations/:organizationId/analytics/pipeline | getAnalyticsPipeline — [hiringloop-frontend/src/features/analytics/api/analytics.api.ts:71](../../hiringloop-frontend/src/features/analytics/api/analytics.api.ts#L71) |
| GET /api/v1/organizations/:organizationId/analytics/interviews | getAnalyticsInterviews — [hiringloop-frontend/src/features/analytics/api/analytics.api.ts:80](../../hiringloop-frontend/src/features/analytics/api/analytics.api.ts#L80) |
| GET /api/v1/organizations/:organizationId/analytics/communications | getAnalyticsCommunications — [hiringloop-frontend/src/features/analytics/api/analytics.api.ts:89](../../hiringloop-frontend/src/features/analytics/api/analytics.api.ts#L89) |
| GET /api/v1/organizations/:organizationId/analytics/outcomes | getAnalyticsOutcomes — [hiringloop-frontend/src/features/analytics/api/analytics.api.ts:101](../../hiringloop-frontend/src/features/analytics/api/analytics.api.ts#L101) |
| GET /api/v1/organizations/:organizationId/analytics/jobs | getAnalyticsJobs — [hiringloop-frontend/src/features/analytics/api/analytics.api.ts:112](../../hiringloop-frontend/src/features/analytics/api/analytics.api.ts#L112) |
| GET /api/v1/organizations/:organizationId/jobs/:jobId/application-form | getApplicationForm — [hiringloop-frontend/src/features/application-form/api/application-form.api.ts:30](../../hiringloop-frontend/src/features/application-form/api/application-form.api.ts#L30) |
| POST /api/v1/organizations/:organizationId/jobs/:jobId/application-form/draft | createDraft — [hiringloop-frontend/src/features/application-form/api/application-form.api.ts:41](../../hiringloop-frontend/src/features/application-form/api/application-form.api.ts#L41) |
| POST /api/v1/organizations/:organizationId/jobs/:jobId/application-form/draft/questions | addQuestion — [hiringloop-frontend/src/features/application-form/api/application-form.api.ts:48](../../hiringloop-frontend/src/features/application-form/api/application-form.api.ts#L48) |
| PATCH /api/v1/organizations/:organizationId/jobs/:jobId/application-form/draft/questions/:questionId | updateQuestion — [hiringloop-frontend/src/features/application-form/api/application-form.api.ts:61](../../hiringloop-frontend/src/features/application-form/api/application-form.api.ts#L61) |
| DELETE /api/v1/organizations/:organizationId/jobs/:jobId/application-form/draft/questions/:questionId | deleteQuestion — [hiringloop-frontend/src/features/application-form/api/application-form.api.ts:74](../../hiringloop-frontend/src/features/application-form/api/application-form.api.ts#L74) |
| PUT /api/v1/organizations/:organizationId/jobs/:jobId/application-form/draft/questions/order | reorderQuestions — [hiringloop-frontend/src/features/application-form/api/application-form.api.ts:87](../../hiringloop-frontend/src/features/application-form/api/application-form.api.ts#L87) |
| POST /api/v1/organizations/:organizationId/jobs/:jobId/application-form/draft/publish | publishDraft — [hiringloop-frontend/src/features/application-form/api/application-form.api.ts:99](../../hiringloop-frontend/src/features/application-form/api/application-form.api.ts#L99) |
| DELETE /api/v1/organizations/:organizationId/jobs/:jobId/application-form/draft | discardDraft — [hiringloop-frontend/src/features/application-form/api/application-form.api.ts:110](../../hiringloop-frontend/src/features/application-form/api/application-form.api.ts#L110) |
| POST /api/v1/organizations/:organizationId/applications/:applicationId/hire | changeOutcome — [hiringloop-frontend/src/features/offers/api/offers.api.ts:93](../../hiringloop-frontend/src/features/offers/api/offers.api.ts#L93) |
| POST /api/v1/organizations/:organizationId/applications/:applicationId/reject | changeOutcome — [hiringloop-frontend/src/features/offers/api/offers.api.ts:93](../../hiringloop-frontend/src/features/offers/api/offers.api.ts#L93) |
| POST /api/v1/organizations/:organizationId/applications/:applicationId/reopen | changeOutcome — [hiringloop-frontend/src/features/offers/api/offers.api.ts:93](../../hiringloop-frontend/src/features/offers/api/offers.api.ts#L93) |
| GET /api/v1/organizations/:organizationId/audit-events | data — [hiringloop-frontend/src/features/audit/api/audit.api.ts:47](../../hiringloop-frontend/src/features/audit/api/audit.api.ts#L47) |
| GET /api/v1/organizations/:organizationId/audit-events/:auditEventId | data — [hiringloop-frontend/src/features/audit/api/audit.api.ts:67](../../hiringloop-frontend/src/features/audit/api/audit.api.ts#L67) |
| GET /api/v1/auth/google/start | getGoogleAuthStartUrl — [hiringloop-frontend/src/features/auth/api/auth.api.ts:165](../../hiringloop-frontend/src/features/auth/api/auth.api.ts#L165) |
| GET /api/v1/auth/google/callback | Provider/browser callback; no fetch wrapper expected |
| POST /api/v1/auth/login | login — [hiringloop-frontend/src/features/auth/api/auth.api.ts:87](../../hiringloop-frontend/src/features/auth/api/auth.api.ts#L87) |
| POST /api/v1/auth/password/forgot | forgotPassword — [hiringloop-frontend/src/features/auth/api/auth.api.ts:134](../../hiringloop-frontend/src/features/auth/api/auth.api.ts#L134) |
| POST /api/v1/auth/password/reset | resetPassword — [hiringloop-frontend/src/features/auth/api/auth.api.ts:143](../../hiringloop-frontend/src/features/auth/api/auth.api.ts#L143) |
| GET /api/v1/auth/me | getCurrentUser — [hiringloop-frontend/src/features/auth/api/auth.api.ts:94](../../hiringloop-frontend/src/features/auth/api/auth.api.ts#L94) |
| GET /api/v1/auth/csrf | getCsrfToken — [hiringloop-frontend/src/features/auth/api/auth.api.ts:98](../../hiringloop-frontend/src/features/auth/api/auth.api.ts#L98) |
| POST /api/v1/auth/logout | logout — [hiringloop-frontend/src/features/auth/api/auth.api.ts:102](../../hiringloop-frontend/src/features/auth/api/auth.api.ts#L102) |
| POST /api/v1/auth/sessions/revoke-all | revokeAllSessions — [hiringloop-frontend/src/features/auth/api/auth.api.ts:109](../../hiringloop-frontend/src/features/auth/api/auth.api.ts#L109) |
| POST /api/v1/auth/password/change | changePassword — [hiringloop-frontend/src/features/auth/api/auth.api.ts:153](../../hiringloop-frontend/src/features/auth/api/auth.api.ts#L153) |
| POST /api/v1/auth/verification/resend | resendVerification — [hiringloop-frontend/src/features/auth/api/auth.api.ts:118](../../hiringloop-frontend/src/features/auth/api/auth.api.ts#L118) |
| POST /api/v1/auth/register | register — [hiringloop-frontend/src/features/auth/api/auth.api.ts:80](../../hiringloop-frontend/src/features/auth/api/auth.api.ts#L80) |
| POST /api/v1/auth/verify-email | verifyEmail — [hiringloop-frontend/src/features/auth/api/auth.api.ts:127](../../hiringloop-frontend/src/features/auth/api/auth.api.ts#L127) |
| GET /api/v1/organizations/:organizationId/candidates | response — [hiringloop-frontend/src/features/candidate-management/api/candidate-management.api.ts:40](../../hiringloop-frontend/src/features/candidate-management/api/candidate-management.api.ts#L40) |
| GET /api/v1/organizations/:organizationId/candidates/:candidateId | response — [hiringloop-frontend/src/features/candidate-management/api/candidate-management.api.ts:64](../../hiringloop-frontend/src/features/candidate-management/api/candidate-management.api.ts#L64) |
| GET /api/v1/organizations/:organizationId/applications/:applicationId | response — [hiringloop-frontend/src/features/candidate-management/api/candidate-management.api.ts:77](../../hiringloop-frontend/src/features/candidate-management/api/candidate-management.api.ts#L77) |
| POST /api/v1/organizations/:organizationId/candidate-documents/:documentId/access | response — [hiringloop-frontend/src/features/candidate-management/api/candidate-management.api.ts:90](../../hiringloop-frontend/src/features/candidate-management/api/candidate-management.api.ts#L90) |
| POST /api/v1/organizations/:organizationId/applications/:applicationId/communications | changeOutcome — [hiringloop-frontend/src/features/offers/api/offers.api.ts:93](../../hiringloop-frontend/src/features/offers/api/offers.api.ts#L93); response — [hiringloop-frontend/src/features/communications/api/communications.api.ts:56](../../hiringloop-frontend/src/features/communications/api/communications.api.ts#L56) |
| GET /api/v1/organizations/:organizationId/applications/:applicationId/communications | response — [hiringloop-frontend/src/features/communications/api/communications.api.ts:44](../../hiringloop-frontend/src/features/communications/api/communications.api.ts#L44) |
| GET /api/v1/organizations/:organizationId/communication-templates | response — [hiringloop-frontend/src/features/communications/api/communications.api.ts:72](../../hiringloop-frontend/src/features/communications/api/communications.api.ts#L72) |
| POST /api/v1/organizations/:organizationId/communication-templates | response — [hiringloop-frontend/src/features/communications/api/communications.api.ts:83](../../hiringloop-frontend/src/features/communications/api/communications.api.ts#L83) |
| PATCH /api/v1/organizations/:organizationId/communication-templates/:templateId | response — [hiringloop-frontend/src/features/communications/api/communications.api.ts:103](../../hiringloop-frontend/src/features/communications/api/communications.api.ts#L103) |
| DELETE /api/v1/organizations/:organizationId/communication-templates/:templateId | deleteTemplate — [hiringloop-frontend/src/features/communications/api/communications.api.ts:122](../../hiringloop-frontend/src/features/communications/api/communications.api.ts#L122) |
| POST /api/v1/organizations/:organizationId/applications/:applicationId/interviews | changeOutcome — [hiringloop-frontend/src/features/offers/api/offers.api.ts:93](../../hiringloop-frontend/src/features/offers/api/offers.api.ts#L93); scheduleInterview — [hiringloop-frontend/src/features/interviews/api/interviews.api.ts:75](../../hiringloop-frontend/src/features/interviews/api/interviews.api.ts#L75) |
| GET /api/v1/organizations/:organizationId/applications/:applicationId/interviews | listApplicationInterviews — [hiringloop-frontend/src/features/interviews/api/interviews.api.ts:41](../../hiringloop-frontend/src/features/interviews/api/interviews.api.ts#L41) |
| GET /api/v1/organizations/:organizationId/interviews | listInterviews — [hiringloop-frontend/src/features/interviews/api/interviews.api.ts:55](../../hiringloop-frontend/src/features/interviews/api/interviews.api.ts#L55) |
| GET /api/v1/organizations/:organizationId/interviews/:interviewId | getInterview — [hiringloop-frontend/src/features/interviews/api/interviews.api.ts:63](../../hiringloop-frontend/src/features/interviews/api/interviews.api.ts#L63) |
| PATCH /api/v1/organizations/:organizationId/interviews/:interviewId | updateInterview — [hiringloop-frontend/src/features/interviews/api/interviews.api.ts:92](../../hiringloop-frontend/src/features/interviews/api/interviews.api.ts#L92) |
| POST /api/v1/organizations/:organizationId/interviews/:interviewId/reschedule | rescheduleInterview — [hiringloop-frontend/src/features/interviews/api/interviews.api.ts:106](../../hiringloop-frontend/src/features/interviews/api/interviews.api.ts#L106) |
| POST /api/v1/organizations/:organizationId/interviews/:interviewId/cancel | cancelInterview — [hiringloop-frontend/src/features/interviews/api/interviews.api.ts:123](../../hiringloop-frontend/src/features/interviews/api/interviews.api.ts#L123) |
| POST /api/v1/organizations/:organizationId/invitations | response — [hiringloop-frontend/src/features/team/api/team.api.ts:59](../../hiringloop-frontend/src/features/team/api/team.api.ts#L59) |
| GET /api/v1/organizations/:organizationId/invitations | listInvitations — [hiringloop-frontend/src/features/team/api/team.api.ts:46](../../hiringloop-frontend/src/features/team/api/team.api.ts#L46) |
| DELETE /api/v1/organizations/:organizationId/invitations/:invitationId | revokeInvitation — [hiringloop-frontend/src/features/team/api/team.api.ts:107](../../hiringloop-frontend/src/features/team/api/team.api.ts#L107) |
| POST /api/v1/invitations/accept | response — [hiringloop-frontend/src/features/team/api/team.api.ts:113](../../hiringloop-frontend/src/features/team/api/team.api.ts#L113) |
| POST /api/v1/organizations/:organizationId/jobs | createJob — [hiringloop-frontend/src/features/jobs/api/jobs.api.ts:31](../../hiringloop-frontend/src/features/jobs/api/jobs.api.ts#L31) |
| GET /api/v1/organizations/:organizationId/jobs | response — [hiringloop-frontend/src/features/jobs/api/jobs.api.ts:47](../../hiringloop-frontend/src/features/jobs/api/jobs.api.ts#L47) |
| GET /api/v1/organizations/:organizationId/jobs/:jobId | getJob — [hiringloop-frontend/src/features/jobs/api/jobs.api.ts:68](../../hiringloop-frontend/src/features/jobs/api/jobs.api.ts#L68) |
| PATCH /api/v1/organizations/:organizationId/jobs/:jobId | updateJob — [hiringloop-frontend/src/features/jobs/api/jobs.api.ts:80](../../hiringloop-frontend/src/features/jobs/api/jobs.api.ts#L80) |
| POST /api/v1/organizations/:organizationId/jobs/:jobId/open | transitionJob — [hiringloop-frontend/src/features/jobs/api/jobs.api.ts:96](../../hiringloop-frontend/src/features/jobs/api/jobs.api.ts#L96) |
| POST /api/v1/organizations/:organizationId/jobs/:jobId/close | transitionJob — [hiringloop-frontend/src/features/jobs/api/jobs.api.ts:96](../../hiringloop-frontend/src/features/jobs/api/jobs.api.ts#L96) |
| POST /api/v1/organizations/:organizationId/jobs/:jobId/reopen | transitionJob — [hiringloop-frontend/src/features/jobs/api/jobs.api.ts:96](../../hiringloop-frontend/src/features/jobs/api/jobs.api.ts#L96) |
| POST /api/v1/organizations/:organizationId/jobs/:jobId/archive | transitionJob — [hiringloop-frontend/src/features/jobs/api/jobs.api.ts:96](../../hiringloop-frontend/src/features/jobs/api/jobs.api.ts#L96) |
| GET /api/v1/organizations/:organizationId/members | listMembers — [hiringloop-frontend/src/features/team/api/team.api.ts:34](../../hiringloop-frontend/src/features/team/api/team.api.ts#L34) |
| PATCH /api/v1/organizations/:organizationId/members/:membershipId/role | response — [hiringloop-frontend/src/features/team/api/team.api.ts:80](../../hiringloop-frontend/src/features/team/api/team.api.ts#L80) |
| DELETE /api/v1/organizations/:organizationId/members/:membershipId | removeMember — [hiringloop-frontend/src/features/team/api/team.api.ts:97](../../hiringloop-frontend/src/features/team/api/team.api.ts#L97) |
| GET /api/v1/organizations/:organizationId/notifications | r — [hiringloop-frontend/src/features/notifications/api/notifications.api.ts:23](../../hiringloop-frontend/src/features/notifications/api/notifications.api.ts#L23) |
| GET /api/v1/organizations/:organizationId/notifications/unread-count | r — [hiringloop-frontend/src/features/notifications/api/notifications.api.ts:35](../../hiringloop-frontend/src/features/notifications/api/notifications.api.ts#L35) |
| PATCH /api/v1/organizations/:organizationId/notifications/:notificationId/read | r — [hiringloop-frontend/src/features/notifications/api/notifications.api.ts:47](../../hiringloop-frontend/src/features/notifications/api/notifications.api.ts#L47) |
| POST /api/v1/organizations/:organizationId/notifications/read-all | markAllNotificationsRead — [hiringloop-frontend/src/features/notifications/api/notifications.api.ts:55](../../hiringloop-frontend/src/features/notifications/api/notifications.api.ts#L55) |
| GET /api/v1/organizations/:organizationId/notification-preferences | r — [hiringloop-frontend/src/features/notifications/api/notifications.api.ts:61](../../hiringloop-frontend/src/features/notifications/api/notifications.api.ts#L61) |
| PUT /api/v1/organizations/:organizationId/notification-preferences | putPreferences — [hiringloop-frontend/src/features/notifications/api/notifications.api.ts:73](../../hiringloop-frontend/src/features/notifications/api/notifications.api.ts#L73) |
| GET /api/v1/organizations/:organizationId/applications/:applicationId/offer | getOffer — [hiringloop-frontend/src/features/offers/api/offers.api.ts:23](../../hiringloop-frontend/src/features/offers/api/offers.api.ts#L23) |
| POST /api/v1/organizations/:organizationId/applications/:applicationId/offer | createOffer — [hiringloop-frontend/src/features/offers/api/offers.api.ts:32](../../hiringloop-frontend/src/features/offers/api/offers.api.ts#L32); changeOutcome — [hiringloop-frontend/src/features/offers/api/offers.api.ts:93](../../hiringloop-frontend/src/features/offers/api/offers.api.ts#L93) |
| GET /api/v1/organizations/:organizationId/offers/:offerId | No dedicated frontend by-ID wrapper found |
| PATCH /api/v1/organizations/:organizationId/offers/:offerId/draft | editOffer — [hiringloop-frontend/src/features/offers/api/offers.api.ts:43](../../hiringloop-frontend/src/features/offers/api/offers.api.ts#L43) |
| POST /api/v1/organizations/:organizationId/offers/:offerId/revisions | reviseOffer — [hiringloop-frontend/src/features/offers/api/offers.api.ts:54](../../hiringloop-frontend/src/features/offers/api/offers.api.ts#L54); transitionOffer — [hiringloop-frontend/src/features/offers/api/offers.api.ts:81](../../hiringloop-frontend/src/features/offers/api/offers.api.ts#L81) |
| POST /api/v1/organizations/:organizationId/offers/:offerId/send | sendOffer — [hiringloop-frontend/src/features/offers/api/offers.api.ts:66](../../hiringloop-frontend/src/features/offers/api/offers.api.ts#L66); transitionOffer — [hiringloop-frontend/src/features/offers/api/offers.api.ts:81](../../hiringloop-frontend/src/features/offers/api/offers.api.ts#L81) |
| POST /api/v1/organizations/:organizationId/offers/:offerId/accept | transitionOffer — [hiringloop-frontend/src/features/offers/api/offers.api.ts:81](../../hiringloop-frontend/src/features/offers/api/offers.api.ts#L81) |
| POST /api/v1/organizations/:organizationId/offers/:offerId/decline | transitionOffer — [hiringloop-frontend/src/features/offers/api/offers.api.ts:81](../../hiringloop-frontend/src/features/offers/api/offers.api.ts#L81) |
| POST /api/v1/organizations/:organizationId/offers/:offerId/withdraw | transitionOffer — [hiringloop-frontend/src/features/offers/api/offers.api.ts:81](../../hiringloop-frontend/src/features/offers/api/offers.api.ts#L81) |
| GET /api/v1/organizations | response — [hiringloop-frontend/src/features/organizations/api/organizations.api.ts:41](../../hiringloop-frontend/src/features/organizations/api/organizations.api.ts#L41) |
| POST /api/v1/organizations | response — [hiringloop-frontend/src/features/organizations/api/organizations.api.ts:69](../../hiringloop-frontend/src/features/organizations/api/organizations.api.ts#L69) |
| GET /api/v1/organizations/:organizationId | response — [hiringloop-frontend/src/features/organizations/api/organizations.api.ts:58](../../hiringloop-frontend/src/features/organizations/api/organizations.api.ts#L58) |
| GET /api/v1/organizations/:organizationId/jobs/:jobId/pipeline | getPipeline — [hiringloop-frontend/src/features/pipelines/api/pipelines.api.ts:32](../../hiringloop-frontend/src/features/pipelines/api/pipelines.api.ts#L32) |
| POST /api/v1/organizations/:organizationId/jobs/:jobId/pipeline/stages | createPipelineStage — [hiringloop-frontend/src/features/pipelines/api/pipelines.api.ts:42](../../hiringloop-frontend/src/features/pipelines/api/pipelines.api.ts#L42) |
| PATCH /api/v1/organizations/:organizationId/jobs/:jobId/pipeline/stages/:stageId | renamePipelineStage — [hiringloop-frontend/src/features/pipelines/api/pipelines.api.ts:58](../../hiringloop-frontend/src/features/pipelines/api/pipelines.api.ts#L58) |
| PUT /api/v1/organizations/:organizationId/jobs/:jobId/pipeline/stages/order | reorderPipelineStages — [hiringloop-frontend/src/features/pipelines/api/pipelines.api.ts:76](../../hiringloop-frontend/src/features/pipelines/api/pipelines.api.ts#L76) |
| DELETE /api/v1/organizations/:organizationId/jobs/:jobId/pipeline/stages/:stageId | deletePipelineStage — [hiringloop-frontend/src/features/pipelines/api/pipelines.api.ts:92](../../hiringloop-frontend/src/features/pipelines/api/pipelines.api.ts#L92) |
| GET /api/v1/public/careers/:organizationSlug/jobs | response — [hiringloop-frontend/src/features/public-careers/api/public-careers.api.ts:26](../../hiringloop-frontend/src/features/public-careers/api/public-careers.api.ts#L26) |
| GET /api/v1/public/careers/:organizationSlug/jobs/:jobId | response — [hiringloop-frontend/src/features/public-careers/api/public-careers.api.ts:52](../../hiringloop-frontend/src/features/public-careers/api/public-careers.api.ts#L52) |
| GET /api/v1/public/careers/:organizationSlug/jobs/:jobId/application-form | getPublicApplicationForm — [hiringloop-frontend/src/features/public-careers/api/public-application.api.ts:78](../../hiringloop-frontend/src/features/public-careers/api/public-application.api.ts#L78) |
| POST /api/v1/public/careers/:organizationSlug/jobs/:jobId/application-uploads | authorizePublicApplicationUpload — [hiringloop-frontend/src/features/public-careers/api/public-application.api.ts:88](../../hiringloop-frontend/src/features/public-careers/api/public-application.api.ts#L88) |
| POST /api/v1/public/careers/:organizationSlug/jobs/:jobId/applications | submitPublicApplication — [hiringloop-frontend/src/features/public-careers/api/public-application.api.ts:110](../../hiringloop-frontend/src/features/public-careers/api/public-application.api.ts#L110) |
| GET /api/v1/organizations/:organizationId/jobs/:jobId/scorecard-template | getTemplate — [hiringloop-frontend/src/features/scorecards/api/scorecards.api.ts:45](../../hiringloop-frontend/src/features/scorecards/api/scorecards.api.ts#L45) |
| POST /api/v1/organizations/:organizationId/jobs/:jobId/scorecard-template/draft | createDraft — [hiringloop-frontend/src/features/scorecards/api/scorecards.api.ts:47](../../hiringloop-frontend/src/features/scorecards/api/scorecards.api.ts#L47) |
| PATCH /api/v1/organizations/:organizationId/jobs/:jobId/scorecard-template/draft | updateDraft — [hiringloop-frontend/src/features/scorecards/api/scorecards.api.ts:60](../../hiringloop-frontend/src/features/scorecards/api/scorecards.api.ts#L60) |
| POST /api/v1/organizations/:organizationId/jobs/:jobId/scorecard-template/publish | publishDraft — [hiringloop-frontend/src/features/scorecards/api/scorecards.api.ts:73](../../hiringloop-frontend/src/features/scorecards/api/scorecards.api.ts#L73) |
| GET /api/v1/organizations/:organizationId/interviews/:interviewId/scorecards | getSummary — [hiringloop-frontend/src/features/scorecards/api/scorecards.api.ts:81](../../hiringloop-frontend/src/features/scorecards/api/scorecards.api.ts#L81) |
| GET /api/v1/organizations/:organizationId/interviews/:interviewId/my-scorecard | getMine — [hiringloop-frontend/src/features/scorecards/api/scorecards.api.ts:87](../../hiringloop-frontend/src/features/scorecards/api/scorecards.api.ts#L87) |
| PATCH /api/v1/organizations/:organizationId/interviews/:interviewId/my-scorecard | saveMine — [hiringloop-frontend/src/features/scorecards/api/scorecards.api.ts:94](../../hiringloop-frontend/src/features/scorecards/api/scorecards.api.ts#L94) |
| POST /api/v1/organizations/:organizationId/interviews/:interviewId/my-scorecard/submit | submitMine — [hiringloop-frontend/src/features/scorecards/api/scorecards.api.ts:107](../../hiringloop-frontend/src/features/scorecards/api/scorecards.api.ts#L107) |
| GET /api/v1/organizations/:organizationId/interviews/:interviewId/scorecards/:scorecardId | getSubmitted — [hiringloop-frontend/src/features/scorecards/api/scorecards.api.ts:120](../../hiringloop-frontend/src/features/scorecards/api/scorecards.api.ts#L120) |
| GET /api/v1/organizations/:organizationId/applications/:applicationId/scorecards | getApplicationScorecards — [hiringloop-frontend/src/features/scorecards/api/scorecards.api.ts:130](../../hiringloop-frontend/src/features/scorecards/api/scorecards.api.ts#L130) |
| GET /api/v1/organizations/:organizationId/applications/:applicationId/notes | getNotes — [hiringloop-frontend/src/features/scorecards/api/scorecards.api.ts:136](../../hiringloop-frontend/src/features/scorecards/api/scorecards.api.ts#L136) |
| POST /api/v1/organizations/:organizationId/applications/:applicationId/notes | changeOutcome — [hiringloop-frontend/src/features/offers/api/offers.api.ts:93](../../hiringloop-frontend/src/features/offers/api/offers.api.ts#L93); createNote — [hiringloop-frontend/src/features/scorecards/api/scorecards.api.ts:138](../../hiringloop-frontend/src/features/scorecards/api/scorecards.api.ts#L138) |
| PATCH /api/v1/organizations/:organizationId/applications/:applicationId/notes/:noteId | updateNote — [hiringloop-frontend/src/features/scorecards/api/scorecards.api.ts:153](../../hiringloop-frontend/src/features/scorecards/api/scorecards.api.ts#L153) |
| DELETE /api/v1/organizations/:organizationId/applications/:applicationId/notes/:noteId | deleteNote — [hiringloop-frontend/src/features/scorecards/api/scorecards.api.ts:166](../../hiringloop-frontend/src/features/scorecards/api/scorecards.api.ts#L166) |
| GET /api/v1/organizations/:organizationId/talent-pools | listPools — [hiringloop-frontend/src/features/talent-pools/api/talent-pools.api.ts:27](../../hiringloop-frontend/src/features/talent-pools/api/talent-pools.api.ts#L27) |
| POST /api/v1/organizations/:organizationId/talent-pools | createPool — [hiringloop-frontend/src/features/talent-pools/api/talent-pools.api.ts:47](../../hiringloop-frontend/src/features/talent-pools/api/talent-pools.api.ts#L47) |
| PATCH /api/v1/organizations/:organizationId/talent-pools/:talentPoolId | updatePool — [hiringloop-frontend/src/features/talent-pools/api/talent-pools.api.ts:58](../../hiringloop-frontend/src/features/talent-pools/api/talent-pools.api.ts#L58) |
| GET /api/v1/organizations/:organizationId/talent-pools/:talentPoolId/members | listMembers — [hiringloop-frontend/src/features/talent-pools/api/talent-pools.api.ts:38](../../hiringloop-frontend/src/features/talent-pools/api/talent-pools.api.ts#L38) |
| POST /api/v1/organizations/:organizationId/talent-pools/:talentPoolId/members | addMember — [hiringloop-frontend/src/features/talent-pools/api/talent-pools.api.ts:69](../../hiringloop-frontend/src/features/talent-pools/api/talent-pools.api.ts#L69) |
| DELETE /api/v1/organizations/:organizationId/talent-pools/:talentPoolId/members/:candidateId | removeMember — [hiringloop-frontend/src/features/talent-pools/api/talent-pools.api.ts:75](../../hiringloop-frontend/src/features/talent-pools/api/talent-pools.api.ts#L75) |

## 13. All 123 inventoried test files and execution disposition

Per-file pass/fail counts below come from completed JSON reports. The interrupted coverage attempt is separately reported above, never double-counted. BLOCKED is an audit disposition, not a skipped assertion.

| Test file | Disposition | Pass / fail / skipped |
| --- | --- | --- |
| [hiringloop-backend/tests/config/env.test.js](../../hiringloop-backend/tests/config/env.test.js) | PASSED | 11 / 0 / 0 |
| [hiringloop-backend/tests/error-handling.test.js](../../hiringloop-backend/tests/error-handling.test.js) | PASSED | 4 / 0 / 0 |
| [hiringloop-backend/tests/health.test.js](../../hiringloop-backend/tests/health.test.js) | PASSED | 4 / 0 / 0 |
| [hiringloop-backend/tests/ids.test.js](../../hiringloop-backend/tests/ids.test.js) | PASSED | 1 / 0 / 0 |
| [hiringloop-backend/tests/integration/database/application-form-foundation.test.js](../../hiringloop-backend/tests/integration/database/application-form-foundation.test.js) | BLOCKED: unconfirmed disposable DB | Not executed |
| [hiringloop-backend/tests/integration/database/application-form-http.test.js](../../hiringloop-backend/tests/integration/database/application-form-http.test.js) | BLOCKED: unconfirmed disposable DB | Not executed |
| [hiringloop-backend/tests/integration/database/auth-browser-lifecycle.test.js](../../hiringloop-backend/tests/integration/database/auth-browser-lifecycle.test.js) | BLOCKED: unconfirmed disposable DB | Not executed |
| [hiringloop-backend/tests/integration/database/auth-session-lifecycle.test.js](../../hiringloop-backend/tests/integration/database/auth-session-lifecycle.test.js) | BLOCKED: unconfirmed disposable DB | Not executed |
| [hiringloop-backend/tests/integration/database/candidate-application-foundation.test.js](../../hiringloop-backend/tests/integration/database/candidate-application-foundation.test.js) | BLOCKED: unconfirmed disposable DB | Not executed |
| [hiringloop-backend/tests/integration/database/interview-scheduling-foundation.test.js](../../hiringloop-backend/tests/integration/database/interview-scheduling-foundation.test.js) | BLOCKED: unconfirmed disposable DB | Not executed |
| [hiringloop-backend/tests/integration/database/invitation-foundation.test.js](../../hiringloop-backend/tests/integration/database/invitation-foundation.test.js) | BLOCKED: unconfirmed disposable DB | Not executed |
| [hiringloop-backend/tests/integration/database/job-foundation.test.js](../../hiringloop-backend/tests/integration/database/job-foundation.test.js) | BLOCKED: unconfirmed disposable DB | Not executed |
| [hiringloop-backend/tests/integration/database/job-management.test.js](../../hiringloop-backend/tests/integration/database/job-management.test.js) | BLOCKED: unconfirmed disposable DB | Not executed |
| [hiringloop-backend/tests/integration/database/member-management.test.js](../../hiringloop-backend/tests/integration/database/member-management.test.js) | BLOCKED: unconfirmed disposable DB | Not executed |
| [hiringloop-backend/tests/integration/database/organization-public-slug.test.js](../../hiringloop-backend/tests/integration/database/organization-public-slug.test.js) | BLOCKED: unconfirmed disposable DB | Not executed |
| [hiringloop-backend/tests/integration/database/phase16-communication-notification-integrity.test.js](../../hiringloop-backend/tests/integration/database/phase16-communication-notification-integrity.test.js) | BLOCKED: unconfirmed disposable DB | Not executed |
| [hiringloop-backend/tests/integration/database/phase16-http.test.js](../../hiringloop-backend/tests/integration/database/phase16-http.test.js) | BLOCKED: unconfirmed disposable DB | Not executed |
| [hiringloop-backend/tests/integration/database/phase17-offer-talent-integrity.test.js](../../hiringloop-backend/tests/integration/database/phase17-offer-talent-integrity.test.js) | BLOCKED: unconfirmed disposable DB | Not executed |
| [hiringloop-backend/tests/integration/database/phase18-analytics-formulas.test.js](../../hiringloop-backend/tests/integration/database/phase18-analytics-formulas.test.js) | BLOCKED: unconfirmed disposable DB | Not executed |
| [hiringloop-backend/tests/integration/database/phase18-audit-integrity.test.js](../../hiringloop-backend/tests/integration/database/phase18-audit-integrity.test.js) | BLOCKED: unconfirmed disposable DB | Not executed |
| [hiringloop-backend/tests/integration/database/phase18-audit-rollback.test.js](../../hiringloop-backend/tests/integration/database/phase18-audit-rollback.test.js) | BLOCKED: unconfirmed disposable DB | Not executed |
| [hiringloop-backend/tests/integration/database/phase18-interview-audit.test.js](../../hiringloop-backend/tests/integration/database/phase18-interview-audit.test.js) | BLOCKED: unconfirmed disposable DB | Not executed |
| [hiringloop-backend/tests/integration/database/phase18-scorecard-audit.test.js](../../hiringloop-backend/tests/integration/database/phase18-scorecard-audit.test.js) | PASSED in Phase 3C | 7 / 0 / 0 against verified local `hiringloop_test`; see document 21 |
| [hiringloop-backend/tests/integration/database/pipeline-configuration.test.js](../../hiringloop-backend/tests/integration/database/pipeline-configuration.test.js) | BLOCKED: unconfirmed disposable DB | Not executed |
| [hiringloop-backend/tests/integration/database/pipeline-foundation.test.js](../../hiringloop-backend/tests/integration/database/pipeline-foundation.test.js) | BLOCKED: unconfirmed disposable DB | Not executed |
| [hiringloop-backend/tests/integration/database/public-career-site.test.js](../../hiringloop-backend/tests/integration/database/public-career-site.test.js) | BLOCKED: unconfirmed disposable DB | Not executed |
| [hiringloop-backend/tests/integration/database/tenant-foundation.test.js](../../hiringloop-backend/tests/integration/database/tenant-foundation.test.js) | BLOCKED: unconfirmed disposable DB | Not executed |
| [hiringloop-backend/tests/integration/phase17-access-http.test.js](../../hiringloop-backend/tests/integration/phase17-access-http.test.js) | BLOCKED: unconfirmed disposable DB | Not executed |
| [hiringloop-backend/tests/integration/phase17-offers-http.test.js](../../hiringloop-backend/tests/integration/phase17-offers-http.test.js) | BLOCKED: unconfirmed disposable DB | Not executed |
| [hiringloop-backend/tests/integration/phase17-outcomes-http.test.js](../../hiringloop-backend/tests/integration/phase17-outcomes-http.test.js) | BLOCKED: unconfirmed disposable DB | Not executed |
| [hiringloop-backend/tests/integration/phase17-talent-pools-http.test.js](../../hiringloop-backend/tests/integration/phase17-talent-pools-http.test.js) | BLOCKED: unconfirmed disposable DB | Not executed |
| [hiringloop-backend/tests/integration/phase17-tenant-isolation-http.test.js](../../hiringloop-backend/tests/integration/phase17-tenant-isolation-http.test.js) | BLOCKED: unconfirmed disposable DB | Not executed |
| [hiringloop-backend/tests/integration/phase18-analytics-audit-http.test.js](../../hiringloop-backend/tests/integration/phase18-analytics-audit-http.test.js) | BLOCKED: unconfirmed disposable DB | Not executed |
| [hiringloop-backend/tests/integration/phase18-analytics-jobs-filter-http.test.js](../../hiringloop-backend/tests/integration/phase18-analytics-jobs-filter-http.test.js) | BLOCKED: unconfirmed disposable DB | Not executed |
| [hiringloop-backend/tests/layered-request-flow.test.js](../../hiringloop-backend/tests/layered-request-flow.test.js) | PASSED | 5 / 0 / 0 |
| [hiringloop-backend/tests/middleware/cors.test.js](../../hiringloop-backend/tests/middleware/cors.test.js) | PASSED | 3 / 0 / 0 |
| [hiringloop-backend/tests/middleware/rate-limit.test.js](../../hiringloop-backend/tests/middleware/rate-limit.test.js) | PASSED | 9 / 0 / 0 |
| [hiringloop-backend/tests/middleware/require-permission.test.js](../../hiringloop-backend/tests/middleware/require-permission.test.js) | PASSED | 8 / 0 / 0 |
| [hiringloop-backend/tests/modules/applications/public-application-http.test.js](../../hiringloop-backend/tests/modules/applications/public-application-http.test.js) | PASSED | 1 / 0 / 0 |
| [hiringloop-backend/tests/modules/applications/public-application-use-cases.test.js](../../hiringloop-backend/tests/modules/applications/public-application-use-cases.test.js) | PASSED | 4 / 0 / 0 |
| [hiringloop-backend/tests/modules/auth/app-cors.test.js](../../hiringloop-backend/tests/modules/auth/app-cors.test.js) | PASSED | 1 / 0 / 0 |
| [hiringloop-backend/tests/modules/auth/auth-utilities.test.js](../../hiringloop-backend/tests/modules/auth/auth-utilities.test.js) | PASSED | 11 / 0 / 0 |
| [hiringloop-backend/tests/modules/auth/auth-workflows.test.js](../../hiringloop-backend/tests/modules/auth/auth-workflows.test.js) | PASSED | 6 / 0 / 0 |
| [hiringloop-backend/tests/modules/auth/authenticate-session.test.js](../../hiringloop-backend/tests/modules/auth/authenticate-session.test.js) | PASSED | 7 / 0 / 0 |
| [hiringloop-backend/tests/modules/auth/cors-csrf.test.js](../../hiringloop-backend/tests/modules/auth/cors-csrf.test.js) | PASSED | 4 / 0 / 0 |
| [hiringloop-backend/tests/modules/auth/email-delivery.test.js](../../hiringloop-backend/tests/modules/auth/email-delivery.test.js) | PASSED | 7 / 0 / 0 |
| [hiringloop-backend/tests/modules/auth/google-oidc.test.js](../../hiringloop-backend/tests/modules/auth/google-oidc.test.js) | PASSED | 5 / 0 / 0 |
| [hiringloop-backend/tests/modules/auth/login.test.js](../../hiringloop-backend/tests/modules/auth/login.test.js) | PASSED | 6 / 0 / 0 |
| [hiringloop-backend/tests/modules/auth/logout.test.js](../../hiringloop-backend/tests/modules/auth/logout.test.js) | PASSED | 4 / 0 / 0 |
| [hiringloop-backend/tests/modules/auth/password-recovery.test.js](../../hiringloop-backend/tests/modules/auth/password-recovery.test.js) | PASSED | 7 / 0 / 0 |
| [hiringloop-backend/tests/modules/auth/resend-verification.test.js](../../hiringloop-backend/tests/modules/auth/resend-verification.test.js) | PASSED | 4 / 0 / 0 |
| [hiringloop-backend/tests/modules/candidates/candidate-management-http.test.js](../../hiringloop-backend/tests/modules/candidates/candidate-management-http.test.js) | PASSED | 2 / 0 / 0 |
| [hiringloop-backend/tests/modules/candidates/candidate-management-use-cases.test.js](../../hiringloop-backend/tests/modules/candidates/candidate-management-use-cases.test.js) | PASSED | 5 / 0 / 0 |
| [hiringloop-backend/tests/modules/interviews/interview-use-cases.test.js](../../hiringloop-backend/tests/modules/interviews/interview-use-cases.test.js) | PASSED | 7 / 0 / 0 |
| [hiringloop-backend/tests/modules/invitations/accept-invitation.test.js](../../hiringloop-backend/tests/modules/invitations/accept-invitation.test.js) | PASSED | 3 / 0 / 0 |
| [hiringloop-backend/tests/modules/invitations/invitation-workflows.test.js](../../hiringloop-backend/tests/modules/invitations/invitation-workflows.test.js) | PASSED | 7 / 0 / 0 |
| [hiringloop-backend/tests/modules/jobs/job-workflows.test.js](../../hiringloop-backend/tests/modules/jobs/job-workflows.test.js) | PASSED | 42 / 0 / 0 |
| [hiringloop-backend/tests/modules/members/member-workflows.test.js](../../hiringloop-backend/tests/modules/members/member-workflows.test.js) | PASSED | 5 / 0 / 0 |
| [hiringloop-backend/tests/modules/offer-repository-transaction.test.js](../../hiringloop-backend/tests/modules/offer-repository-transaction.test.js) | PASSED | 1 / 0 / 0 |
| [hiringloop-backend/tests/modules/organizations/organization-workflows.test.js](../../hiringloop-backend/tests/modules/organizations/organization-workflows.test.js) | PASSED | 15 / 0 / 0 |
| [hiringloop-backend/tests/modules/organizations/tenant-context.test.js](../../hiringloop-backend/tests/modules/organizations/tenant-context.test.js) | PASSED | 5 / 0 / 0 |
| [hiringloop-backend/tests/modules/phase16-notification-triggers.test.js](../../hiringloop-backend/tests/modules/phase16-notification-triggers.test.js) | PASSED | 7 / 0 / 0 |
| [hiringloop-backend/tests/modules/phase17-offer-outcome-use-cases.test.js](../../hiringloop-backend/tests/modules/phase17-offer-outcome-use-cases.test.js) | PASSED | 8 / 0 / 0 |
| [hiringloop-backend/tests/modules/pipelines/pipeline-workflows.test.js](../../hiringloop-backend/tests/modules/pipelines/pipeline-workflows.test.js) | PASSED | 8 / 0 / 0 |
| [hiringloop-backend/tests/modules/public-careers/public-career-http.test.js](../../hiringloop-backend/tests/modules/public-careers/public-career-http.test.js) | PASSED | 3 / 0 / 0 |
| [hiringloop-backend/tests/modules/public-careers/public-career-use-cases.test.js](../../hiringloop-backend/tests/modules/public-careers/public-career-use-cases.test.js) | PASSED | 2 / 0 / 0 |
| [hiringloop-backend/tests/modules/scorecards/scorecard-http.test.js](../../hiringloop-backend/tests/modules/scorecards/scorecard-http.test.js) | PASSED | 2 / 0 / 0 |
| [hiringloop-backend/tests/modules/scorecards/scorecard-schemas.test.js](../../hiringloop-backend/tests/modules/scorecards/scorecard-schemas.test.js) | PASSED | 3 / 0 / 0 |
| [hiringloop-backend/tests/request-correlation.test.js](../../hiringloop-backend/tests/request-correlation.test.js) | PASSED | 8 / 0 / 0 |
| [hiringloop-backend/tests/validation.test.js](../../hiringloop-backend/tests/validation.test.js) | PASSED | 7 / 0 / 0 |
| [hiringloop-frontend/src/app/App.test.tsx](../../hiringloop-frontend/src/app/App.test.tsx) | PASSED | 6 / 0 / 0 |
| [hiringloop-frontend/src/app/config/env.test.ts](../../hiringloop-frontend/src/app/config/env.test.ts) | PASSED | 4 / 0 / 0 |
| [hiringloop-frontend/src/app/providers/query-client.test.tsx](../../hiringloop-frontend/src/app/providers/query-client.test.tsx) | PASSED | 9 / 0 / 0 |
| [hiringloop-frontend/src/app/router/job-routes.test.tsx](../../hiringloop-frontend/src/app/router/job-routes.test.tsx) | PASSED | 9 / 0 / 0 |
| [hiringloop-frontend/src/app/router/routes.test.tsx](../../hiringloop-frontend/src/app/router/routes.test.tsx) | PASSED | 8 / 0 / 0 |
| [hiringloop-frontend/src/app/router/safe-route.test.ts](../../hiringloop-frontend/src/app/router/safe-route.test.ts) | PASSED | 6 / 0 / 0 |
| [hiringloop-frontend/src/features/analytics/analytics.test.tsx](../../hiringloop-frontend/src/features/analytics/analytics.test.tsx) | PASSED | 3 / 0 / 0 |
| [hiringloop-frontend/src/features/analytics/utils/analytics-utils.test.ts](../../hiringloop-frontend/src/features/analytics/utils/analytics-utils.test.ts) | PASSED | 2 / 0 / 0 |
| [hiringloop-frontend/src/features/application-form/api/application-form.api.test.ts](../../hiringloop-frontend/src/features/application-form/api/application-form.api.test.ts) | PASSED | 2 / 0 / 0 |
| [hiringloop-frontend/src/features/application-form/hooks/mutations.test.tsx](../../hiringloop-frontend/src/features/application-form/hooks/mutations.test.tsx) | PASSED | 2 / 0 / 0 |
| [hiringloop-frontend/src/features/application-form/pages/ApplicationFormBuilderPage.test.tsx](../../hiringloop-frontend/src/features/application-form/pages/ApplicationFormBuilderPage.test.tsx) | PASSED | 18 / 0 / 0 |
| [hiringloop-frontend/src/features/audit/audit.test.tsx](../../hiringloop-frontend/src/features/audit/audit.test.tsx) | PASSED | 2 / 0 / 0 |
| [hiringloop-frontend/src/features/auth/api/auth.api.test.ts](../../hiringloop-frontend/src/features/auth/api/auth.api.test.ts) | PASSED | 14 / 0 / 0 |
| [hiringloop-frontend/src/features/auth/auth-pages.test.tsx](../../hiringloop-frontend/src/features/auth/auth-pages.test.tsx) | PASSED | 26 / 0 / 0 |
| [hiringloop-frontend/src/features/auth/hooks/mutations.test.tsx](../../hiringloop-frontend/src/features/auth/hooks/mutations.test.tsx) | PASSED | 19 / 0 / 0 |
| [hiringloop-frontend/src/features/auth/hooks/queries.test.tsx](../../hiringloop-frontend/src/features/auth/hooks/queries.test.tsx) | PASSED | 7 / 0 / 0 |
| [hiringloop-frontend/src/features/candidate-application/pages/PublicApplyPage.test.tsx](../../hiringloop-frontend/src/features/candidate-application/pages/PublicApplyPage.test.tsx) | PASSED | 6 / 0 / 0 |
| [hiringloop-frontend/src/features/candidate-application/utils/application-utils.test.ts](../../hiringloop-frontend/src/features/candidate-application/utils/application-utils.test.ts) | PASSED | 4 / 0 / 0 |
| [hiringloop-frontend/src/features/candidate-application/utils/direct-upload.test.ts](../../hiringloop-frontend/src/features/candidate-application/utils/direct-upload.test.ts) | PASSED | 1 / 0 / 0 |
| [hiringloop-frontend/src/features/candidate-management/api/candidate-management.api.test.ts](../../hiringloop-frontend/src/features/candidate-management/api/candidate-management.api.test.ts) | PASSED | 2 / 0 / 0 |
| [hiringloop-frontend/src/features/candidate-management/candidate-management.test.tsx](../../hiringloop-frontend/src/features/candidate-management/candidate-management.test.tsx) | PASSED | 6 / 0 / 0 |
| [hiringloop-frontend/src/features/communications/communications.test.tsx](../../hiringloop-frontend/src/features/communications/communications.test.tsx) | PASSED | 2 / 0 / 0 |
| [hiringloop-frontend/src/features/interviews/interviews.test.tsx](../../hiringloop-frontend/src/features/interviews/interviews.test.tsx) | PASSED | 4 / 0 / 0 |
| [hiringloop-frontend/src/features/interviews/utils/interview-utils.test.ts](../../hiringloop-frontend/src/features/interviews/utils/interview-utils.test.ts) | PASSED | 2 / 0 / 0 |
| [hiringloop-frontend/src/features/jobs/job-permissions.test.tsx](../../hiringloop-frontend/src/features/jobs/job-permissions.test.tsx) | PASSED | 2 / 0 / 0 |
| [hiringloop-frontend/src/features/jobs/jobs.test.ts](../../hiringloop-frontend/src/features/jobs/jobs.test.ts) | PASSED | 4 / 0 / 0 |
| [hiringloop-frontend/src/features/jobs/pages/CreateJobPage.test.tsx](../../hiringloop-frontend/src/features/jobs/pages/CreateJobPage.test.tsx) | PASSED | 3 / 0 / 0 |
| [hiringloop-frontend/src/features/jobs/pages/JobDetailPage.test.tsx](../../hiringloop-frontend/src/features/jobs/pages/JobDetailPage.test.tsx) | PASSED | 8 / 0 / 0 |
| [hiringloop-frontend/src/features/notifications/notifications.test.tsx](../../hiringloop-frontend/src/features/notifications/notifications.test.tsx) | PASSED | 2 / 0 / 0 |
| [hiringloop-frontend/src/features/offers/components/ApplicationOutcomeSection.test.tsx](../../hiringloop-frontend/src/features/offers/components/ApplicationOutcomeSection.test.tsx) | PASSED | 8 / 0 / 0 |
| [hiringloop-frontend/src/features/offers/components/OfferSection.test.tsx](../../hiringloop-frontend/src/features/offers/components/OfferSection.test.tsx) | PASSED | 10 / 0 / 0 |
| [hiringloop-frontend/src/features/organizations/organizations.test.tsx](../../hiringloop-frontend/src/features/organizations/organizations.test.tsx) | PASSED | 6 / 0 / 0 |
| [hiringloop-frontend/src/features/pipelines/api/pipelines.api.test.ts](../../hiringloop-frontend/src/features/pipelines/api/pipelines.api.test.ts) | PASSED | 2 / 0 / 0 |
| [hiringloop-frontend/src/features/pipelines/hooks/mutations.test.tsx](../../hiringloop-frontend/src/features/pipelines/hooks/mutations.test.tsx) | PASSED | 2 / 0 / 0 |
| [hiringloop-frontend/src/features/pipelines/pages/PipelineConfigurationPage.test.tsx](../../hiringloop-frontend/src/features/pipelines/pages/PipelineConfigurationPage.test.tsx) | PASSED | 3 / 0 / 0 |
| [hiringloop-frontend/src/features/pipelines/utils/pipeline-utils.test.ts](../../hiringloop-frontend/src/features/pipelines/utils/pipeline-utils.test.ts) | PASSED | 2 / 0 / 0 |
| [hiringloop-frontend/src/features/public-careers/api/public-application.api.test.ts](../../hiringloop-frontend/src/features/public-careers/api/public-application.api.test.ts) | PASSED | 3 / 0 / 0 |
| [hiringloop-frontend/src/features/public-careers/hooks/query-keys.test.ts](../../hiringloop-frontend/src/features/public-careers/hooks/query-keys.test.ts) | PASSED | 1 / 0 / 0 |
| [hiringloop-frontend/src/features/public-careers/public-careers.test.tsx](../../hiringloop-frontend/src/features/public-careers/public-careers.test.tsx) | PASSED | 7 / 0 / 0 |
| [hiringloop-frontend/src/features/scorecards/components/FeedbackSections.test.tsx](../../hiringloop-frontend/src/features/scorecards/components/FeedbackSections.test.tsx) | PASSED | 8 / 0 / 0 |
| [hiringloop-frontend/src/features/scorecards/components/ScorecardForm.test.tsx](../../hiringloop-frontend/src/features/scorecards/components/ScorecardForm.test.tsx) | PASSED | 2 / 0 / 0 |
| [hiringloop-frontend/src/features/scorecards/pages/MyScorecardPage.test.tsx](../../hiringloop-frontend/src/features/scorecards/pages/MyScorecardPage.test.tsx) | PASSED | 2 / 0 / 0 |
| [hiringloop-frontend/src/features/scorecards/pages/ScorecardTemplatePage.test.tsx](../../hiringloop-frontend/src/features/scorecards/pages/ScorecardTemplatePage.test.tsx) | PASSED | 4 / 0 / 0 |
| [hiringloop-frontend/src/features/talent-pools/talent-pools.test.tsx](../../hiringloop-frontend/src/features/talent-pools/talent-pools.test.tsx) | PASSED | 5 / 0 / 0 |
| [hiringloop-frontend/src/features/team/api/team.api.test.ts](../../hiringloop-frontend/src/features/team/api/team.api.test.ts) | PASSED | 1 / 0 / 0 |
| [hiringloop-frontend/src/features/team/components/ConfirmDialog.test.tsx](../../hiringloop-frontend/src/features/team/components/ConfirmDialog.test.tsx) | PASSED | 4 / 0 / 0 |
| [hiringloop-frontend/src/features/team/hooks/mutations.test.tsx](../../hiringloop-frontend/src/features/team/hooks/mutations.test.tsx) | PASSED | 1 / 0 / 0 |
| [hiringloop-frontend/src/features/team/pages/InvitationAcceptancePage.test.tsx](../../hiringloop-frontend/src/features/team/pages/InvitationAcceptancePage.test.tsx) | PASSED | 5 / 0 / 0 |
| [hiringloop-frontend/src/features/team/pages/TeamPage.test.tsx](../../hiringloop-frontend/src/features/team/pages/TeamPage.test.tsx) | PASSED | 2 / 0 / 0 |
| [hiringloop-frontend/src/features/team/team.test.tsx](../../hiringloop-frontend/src/features/team/team.test.tsx) | PASSED | 3 / 0 / 0 |
| [hiringloop-frontend/src/shared/components/components.test.tsx](../../hiringloop-frontend/src/shared/components/components.test.tsx) | PASSED | 5 / 0 / 0 |
| [hiringloop-frontend/src/shared/components/foundation.test.tsx](../../hiringloop-frontend/src/shared/components/foundation.test.tsx) | PASSED | 3 / 0 / 0 |
| [hiringloop-frontend/src/shared/lib/apiClient.test.ts](../../hiringloop-frontend/src/shared/lib/apiClient.test.ts) | PASSED | 9 / 0 / 0 |

## 14. Reproduction capsules and artifact locations

Ad hoc scripts were supplied to node on stdin, with the isolation prefix from section 1; no new application/test source files were created. Synthetic fixtures and recording adapters are explicit in the scripts. The following are exact executable probe bodies used in this audit; they must not be interpreted as PostgreSQL/provider verification.

### Priority contract probes

```js

const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),path=require('path');
const ts=require('../hiringloop-frontend/node_modules/typescript');
const captures=[];const transport={apiRequest:async(p,o={})=>{captures.push({path:p,options:o});return {data:{id:'audit-object',name:'n',subject:'s',body:'b',revision:1}};}};
class ApiError extends Error{constructor(x){super(x.message);Object.assign(this,x);}}
function loadFront(file,extra={}){const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;const out={exports:{}};const req=n=>{if(n.includes('apiClient'))return transport;if(n.includes('apiErrors'))return {ApiError};if(n==='@tanstack/react-query')return {useMutation:x=>({mutateAsync:x.mutationFn}),useQueryClient:()=>({invalidateQueries:async()=>{}})};if(n.includes('authenticated-mutation'))return {runAuthenticatedAuthMutation:async(_c,fn)=>fn('audit-csrf')};if(n.includes('query-keys'))return {offerKeys:new Proxy({},{get:()=>()=>[]}),communicationKeys:new Proxy({},{get:()=>()=>[]}),talentPoolKeys:new Proxy({},{get:()=>()=>[]})};if(extra[n])return extra[n];throw Error('Unstubbed frontend import '+n);};vm.runInNewContext('(function(require,module,exports){'+code+'\n})',{crypto:require('crypto').webcrypto})(req,out,out.exports);return out.exports;}
(async()=>{
const express=(await import('express')).default,request=(await import('supertest')).default;
const {createOfferRouter}=await import('./src/modules/offers/routes/offer-routes.js');
const {createMemberRouter}=await import('./src/modules/members/routes/member-routes.js');
const {validateRequest}=await import('./src/middleware/validate-request.js');
const {errorHandler}=await import('./src/middleware/error-handler.js');
const {hasPermission,PERMISSIONS}=await import('./src/authorization/permissions.js');
const org='00000000-0000-4000-8000-000000000001',id='00000000-0000-4000-8000-000000000002',user='00000000-0000-4000-8000-000000000003';
const auth=(q,s,n)=>{q.auth={userId:user};n();};const tenant=role=>(q,s,n)=>{q.tenantContext={organizationId:org,membershipId:id,role};n();};
let calls=0;const app=express();app.use(express.json());app.use('/organizations/:organizationId',createOfferRouter({authenticateSession:auth,requireCsrf:(q,s,n)=>n(),tenantContextMiddleware:tenant('RECRUITER'),offerUseCases:{editDraft:async()=>{calls++;return{}},revise:async()=>{calls++;return{}}}}));app.use(errorHandler);
const api=loadFront('../hiringloop-frontend/src/features/offers/api/offers.api.ts');
const hooks=loadFront('../hiringloop-frontend/src/features/offers/hooks/mutations.ts',{'../api/offers.api':api});
const actions=hooks.useOfferActions(org,id),terms={jobTitle:'Audit synthetic role',currency:'USD',baseCompensationMinor:'100',expectedRevision:1,id};
const results=[];
for(const op of ['edit','revise']){await actions[op].mutateAsync(terms);const c=captures.at(-1);const r=await request(app)[c.options.method.toLowerCase()](c.path).send(c.options.body);assert.equal(r.status,400);assert.equal(r.body.error.code,'VALIDATION_ERROR');assert.equal(c.options.body.id,id);results.push({probe:'offer-'+op,status:r.status,code:r.body.error.code,bodyKeys:Object.keys(c.options.body),businessHandlerCalls:calls});}
const ca=loadFront('../hiringloop-frontend/src/features/communications/api/communications.api.ts');
const ch=loadFront('../hiringloop-frontend/src/features/communications/hooks/mutations.ts',{'../api/communications.api':ca});
await ch.useTemplateMutations(org).update.mutateAsync({id,name:'Audit synthetic template',subject:'s',body:'b',expectedRevision:1});
const c=captures.at(-1);
// Evaluate the exact inline schema declaration, without loading production composition or DB.
const source=fs.readFileSync('src/modules/communications/communications-module.js','utf8');
const schemaSource=source.slice(source.indexOf('const templateBody ='),source.indexOf('const page ='));
const {z}=await import('zod');const schema=new Function('z',schemaSource+';return templateUpdateBody;')(z);
const a=express();a.use(express.json());a.patch('/organizations/:organizationId/communication-templates/:templateId',validateRequest({body:schema}),(q,s)=>s.json({data:{}}));a.use(errorHandler);
const r=await request(a).patch(c.path).send(c.options.body);assert.equal(r.status,400);results.push({probe:'template-update',status:r.status,code:r.body.error.code,bodyKeys:Object.keys(c.options.body)});
for(const role of ['RECRUITER','ADMIN']){const a=express();a.use('/organizations/:organizationId/members',createMemberRouter({authenticateSession:auth,requireCsrf:(q,s,n)=>n(),tenantContextMiddleware:tenant(role),listMembers:async()=>[]}));a.use(errorHandler);const r=await request(a).get('/organizations/'+org+'/members');assert.equal(r.status,role==='RECRUITER'?403:200);results.push({probe:'member-picker-'+role,status:r.status,canCreateInterview:hasPermission({role,permission:PERMISSIONS.INTERVIEW_CREATE})});}
console.log(JSON.stringify({kind:'isolated-runtime-contract-probes',results}));
})().catch(e=>{console.error(e.stack);process.exitCode=1;});

```

### High-risk fault-injection probes

```js

const assert=require('assert/strict');
(async()=>{
const {createInterviewRepository}=await import('./src/modules/interviews/repositories/interview-repository.js');
const {createInterviewUseCases}=await import('./src/modules/interviews/use-cases/interview-use-cases.js');
const {createScorecardRepository}=await import('./src/modules/scorecards/repositories/scorecard-repository.js');
const {createScorecardUseCases}=await import('./src/modules/scorecards/use-cases/scorecard-use-cases.js');
const {createCandidateCommunicationService}=await import('./src/modules/communications/candidate-communication-service.js');
const {createSendGridEmailDelivery}=await import('./src/modules/auth/email/email-delivery.js');
const org='00000000-0000-4000-8000-000000000001',user='00000000-0000-4000-8000-000000000002',appId='00000000-0000-4000-8000-000000000003',iid='00000000-0000-4000-8000-000000000004';
const results=[];let row;
const application={id:appId,candidate:{id:user,firstName:'Synthetic',lastName:'Applicant',email:'synthetic@example.test'},job:{id:iid,title:'Synthetic role'}};
const project=(obj,sel)=>Object.fromEntries(Object.entries(sel).map(([k,v])=>[k,v===true?obj[k]:Array.isArray(obj[k])?obj[k].map(x=>project(x,v.select)):obj[k]?project(obj[k],v.select):null]));
const notes=[],replacements=[];let deleteCalls=0;
const db={application:{findFirst:async()=>application},organizationMembership:{findMany:async()=>[{userId:user}]},interview:{findFirst:async q=>q.where.scheduledStartAt?null:project(row,q.select),create:async({data,select})=>{row={...data,application,participants:data.participants.createMany.data.map(p=>({...p,interviewId:data.id,user:{id:p.userId,email:'staff@example.test'}})),status:'SCHEDULED',createdAt:new Date(),updatedAt:new Date()};return project(row,select);}},interviewParticipant:{deleteMany:async()=>{deleteCalls++;return {count:1}},createMany:async({data})=>{replacements.push(...data);throw Error('SYNTHETIC_SCHEMA_BOUNDARY: missing interviewId');}}};db.$transaction=async fn=>fn(db);
const repo=createInterviewRepository(db),uc=createInterviewUseCases({repository:repo,notificationService:{create:async x=>{notes.push(x);return null}},clock:()=>new Date('2026-10-17')});
await uc.schedule({organizationId:org,applicationId:appId,actorRole:'RECRUITER',actorUserId:iid,title:'Synthetic panel',format:'PHONE',scheduledStartAt:new Date('2030-01-01T10:00:00Z'),durationMinutes:60,timeZone:'UTC',participantUserIds:[user]});
assert.equal(notes.length,1);assert.equal(notes[0].organizationId,undefined);assert.equal(notes[0].recipientUserId,undefined);
results.push({probe:'interview-notification-projection',calls:notes.length,hasOrganizationId:notes[0].organizationId!==undefined,hasRecipientUserId:notes[0].recipientUserId!==undefined,boundary:'real repository projection and use case; recording notifier'});
await assert.rejects(uc.update({organizationId:org,interviewId:row.id,actorRole:'RECRUITER',actorUserId:iid,participantUserIds:[user]}),/SYNTHETIC_SCHEMA_BOUNDARY/);
assert.equal(replacements.length,1);assert.equal(replacements[0].interviewId,undefined);
results.push({probe:'interview-participant-replacement',deleteCalls,insertedFieldNames:Object.keys(replacements[0]),missingInterviewId:true,boundary:'recording persistence adapter, not PostgreSQL'});
const card={id:iid,status:'DRAFT',revision:1,templateVersion:{criteria:[{id:user,type:'RATING',required:true}]},responses:[]};
const writes=[];let committed=false;
const sdb={interview:{findFirst:async()=>({id:iid,application:{jobId:iid},participants:[{id:user,scorecard:card}]})},scorecard:{updateMany:async({data})=>{writes.push('scorecard update');card.revision++;return{count:1}},findUnique:async()=>card},scorecardResponse:{deleteMany:async()=>{writes.push('response delete');return{count:0}}}};
sdb.$transaction=async fn=>{const x=await fn(sdb);committed=true;return x;};
const sr=createScorecardRepository(sdb),su=createScorecardUseCases({repository:sr});
let code;try{await su.saveMy({organizationId:org,interviewId:iid,userId:user,actorUserId:user,expectedRevision:1,responses:[{criterionId:user,textValue:'wrong type'}]});}catch(e){code=e.code;}
assert.equal(code,'VALIDATION_ERROR');assert.equal(committed,true);assert.deepEqual(writes,['scorecard update','response delete']);
results.push({probe:'scorecard-error-after-transaction-resolution',errorCode:code,transactionResolvedNormally:committed,writes,boundary:'transaction contract harness; PostgreSQL durability not tested'});
let sends=0,updates=[];
const cdb={communication:{findUnique:async()=>({id:iid,recipientEmail:'synthetic@example.test',subject:'synthetic',body:'synthetic',status:'PENDING'}),update:async({data})=>{updates.push(data.status);if(data.status==='SENT')throw Error('Synthetic DB failure after provider acceptance');return{};}},notification:{create:async()=>({})}};
const cs=createCandidateCommunicationService({prisma:cdb,emailDelivery:{sendCandidateEmail:async()=>{sends++;return{providerMessageId:'synthetic'}}}});
const r=await cs.dispatchPersisted({communicationId:iid,organizationId:org,applicationId:appId,createdByUserId:user});
assert.equal(r.kind,'FAILED');assert.deepEqual(updates,['SENT','FAILED']);assert.equal(sends,1);
results.push({probe:'email-accepted-then-status-write-fails',providerSendCalls:sends,persistenceStatusAttempts:updates,result:r.kind,boundary:'deterministic provider and DB stubs; no external mail'});
const delivery=createSendGridEmailDelivery({client:{setApiKey(){},send:async()=>{const e=Error('Synthetic timeout');e.code='ETIMEDOUT';throw e;}},apiKey:'synthetic',from:'synthetic@example.test',frontendOrigin:'http://localhost:5173'});
let category;try{await delivery.sendCandidateEmail({to:'synthetic@example.test',subject:'synthetic',text:'synthetic'});}catch(e){category=e.category;}
assert.equal(category,'sendgrid-error');
results.push({probe:'provider-timeout-classification',category,ambiguousBranchReachableFromThisError:category==='ambiguous',boundary:'real adapter with synthetic provider'});
console.log(JSON.stringify({kind:'isolated-high-risk-probes',results}));
})().catch(e=>{console.error(e.stack);process.exitCode=1;});

```

### Endpoint consumer mapping

```js

const fs=require('fs'),cp=require('child_process'),ts=require('./hiringloop-frontend/node_modules/typescript');
const files=cp.execFileSync('rg',['--files','hiringloop-frontend/src/features'],{encoding:'utf8'}).trim().split(/\r?\n/).map(p=>p.replaceAll('\\','/')).filter(p=>p.includes('/api/')&&p.endsWith('.ts')&&!p.includes('.test.'));
const entries=[];
for(const file of files){
const src=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true),defs=new Map();
for(const st of src.statements){if(ts.isFunctionDeclaration(st)&&st.name)defs.set(st.name.text,st);if(ts.isVariableStatement(st))for(const d of st.declarationList.declarations)if(ts.isIdentifier(d.name)&&d.initializer)defs.set(d.name.text,d.initializer);}
function ev(n,depth=0){if(!n||depth>8)return ':';if(ts.isParenthesizedExpression(n)||ts.isAsExpression(n)||ts.isNonNullExpression(n))return ev(n.expression,depth+1);if(ts.isStringLiteralLike(n))return n.text;if(ts.isTemplateExpression(n))return n.head.text+n.templateSpans.map(x=>ev(x.expression,depth+1)+x.literal.text).join('');if(ts.isIdentifier(n)){const x=defs.get(n.text);return x&&!ts.isFunctionLike(x)?ev(x,depth+1):':';}if(ts.isBinaryExpression(n)&&n.operatorToken.kind===ts.SyntaxKind.PlusToken)return ev(n.left,depth+1)+ev(n.right,depth+1);if(ts.isCallExpression(n)&&ts.isIdentifier(n.expression)){if(n.expression.text==='encodeURIComponent')return ':';const x=defs.get(n.expression.text);if(x&&ts.isFunctionLike(x)){if(!ts.isBlock(x.body))return ev(x.body,depth+1);const r=x.body.statements.find(ts.isReturnStatement);return ev(r?.expression,depth+1);}}return ':';}
function owner(n){while(n){if(ts.isFunctionDeclaration(n)&&n.name)return n.name.text;if(ts.isVariableDeclaration(n)&&ts.isIdentifier(n.name))return n.name.text;n=n.parent;}return '(helper)';}
function walk(n){if(ts.isCallExpression(n)&&n.arguments.length){const value=ev(n.arguments[0]).split('?')[0];if(value.startsWith('/')&&!value.includes('://')){let method='GET',a=n.arguments[1];if(a&&ts.isObjectLiteralExpression(a)){const m=a.properties.find(p=>ts.isPropertyAssignment(p)&&p.name.getText(src)==='method');if(m)method=ev(m.initializer);}else if(a&&ts.isStringLiteralLike(a)&&/^(GET|POST|PATCH|PUT|DELETE)$/.test(a.text))method=a.text;
entries.push({file,fn:owner(n),path:value.replace(/\/$/,''),method,line:src.getLineAndCharacterOfPosition(n.getStart(src)).line+1});}}ts.forEachChild(n,walk);}walk(src);
}
const api=fs.readFileSync('docs/codebase-analysis/07-api-inventory.md','utf8');const endpoints=[...api.matchAll(/^### (GET|POST|PATCH|PUT|DELETE) (\/api\/v1[^\n]+)/gm)].map(m=>({method:m[1],route:m[2]}));
function matches(p,r){const a=p.split('/'),b=r.replace(/^\/api\/v1/,'').split('/');return a.length===b.length&&a.every((s,i)=>s===':'||s.startsWith(':')||b[i].startsWith(':')||s===b[i]);}
const rows=endpoints.map(e=>({...e,consumers:entries.filter(c=>c.method===e.method&&matches(c.path,e.route)).map(c=>({file:c.file,fn:c.fn,line:c.line,path:c.path}))}));
console.log(JSON.stringify({endpoints:rows.length,mapped:rows.filter(x=>x.consumers.length).length,unmapped:rows.filter(x=>!x.consumers.length),rows}));

```

Local ignored artifacts: [hiringloop-backend/coverage/runtime-verification-tests.json](../../hiringloop-backend/coverage/runtime-verification-tests.json); [hiringloop-backend/coverage/coverage-summary.json](../../hiringloop-backend/coverage/coverage-summary.json); [hiringloop-frontend/coverage/runtime-verification-baseline-tests.json](../../hiringloop-frontend/coverage/runtime-verification-baseline-tests.json). These generated files may be removed by future test runs and are not source-controlled evidence; the relevant counts are retained in this document.

## VERIFIED / INFERRED / NOT VERIFIED summary

**VERIFIED:** command exit results, completed test/report counts, dependency/lock matches, build output, offline schema/inventory checks and isolated probe observations above.

**INFERRED:** storage overwrite exploitability, production impact, timing/instrumentation causes and concurrent scheduling consequences remain hypotheses beyond the executed boundary.

**NOT VERIFIED / UNKNOWN:** real database connectivity/applied migrations/constraints, full integration, provider behavior, E2E, frontend coverage, deployed policies and production readiness. Verification stopped without implementing fixes.

## Phase 3B follow-up (2026-10-17)

Phase 3B subsequently implemented and verified the scoped interview repairs; the statements above describe the earlier baseline audit and are not the current implementation status. See [20-interview-integrity-verification.md](20-interview-integrity-verification.md) for changed files and current results.

**VERIFIED:** backend lint and formatting; 262 non-database backend tests; focused backend interview/notification tests (20); frontend typecheck, lint (one pre-existing warning), formatting, production build (existing chunk-size advisory), and focused interview tests (6); Prisma schema validation; migration target verified as local `hiringloop_test`.

**VERIFIED:** full frontend Vitest passed with one worker (55 files, 285 tests). The complete PostgreSQL database integration suite passed serially (23 files, 114 tests), including tenant filtering, stale and cross-tenant replacement rejection without partial changes, concurrent replacement serialization, and concurrent same-participant booking serialization. The isolated interview audit integration suite also passed (3 tests).

### Final preservation and artifact checks

The baseline audit's preservation checks were completed before Phase 3A/3B implementation. Phase 3B intentionally changes interview application files and analysis documents 07, 10, 15, 16, and 19, and adds document 20. No stage, commit, push, or deployment was performed.

## Phase 3C follow-up (2026-10-17)

The E06 transaction-contract harness was reproduced against verified local disposable PostgreSQL `hiringloop_test`. Before the fix, rejecting a wrong-type response returned `VALIDATION_ERROR` after the callback completed normally; the first persisted-state assertion confirmed the revision had advanced despite the error. The response deletion and overall-field write precede the invalid type check in source, but later assertions in that failing pre-fix test did not execute. The repository now forces rollback on rejected save/submit outcomes, translating the outcome only after transaction rollback. Incomplete submissions now preserve the prior draft rather than silently saving input while returning an error. Successful audit writes remain in the submission transaction; scorecard notifications remain post-commit and no network/provider call runs in the transaction.

Phase 3C command-level results and remaining verification limits are recorded in [21-scorecard-transaction-verification.md](21-scorecard-transaction-verification.md). The original E06 statement above describes the baseline audit, not current behavior. The focused frontend scorecard suite also passed (4 files, 16 tests); frontend typecheck/build were not run because no frontend source changed. No stage, commit, push, or deployment was performed.

## Phase 3D follow-up (2026-10-17)

E08 was reproduced from the prior fault-injection evidence and source path: the provider accepted once, then the `SENT` persistence write failed; the prior combined catch classified the database error as provider failure and attempted to mark the accepted communication `FAILED`. The SendGrid adapter also mapped synthetic timeout errors to `sendgrid-error`, preventing the ambiguous branch. Phase 3D separates provider send from persistence and classifies 4xx rejection (except 408), known pre-transmission errors, and ambiguous outcomes. Ambiguous outcomes now remain `PENDING` and same-key replays do not redispatch.

**VERIFIED:** Backend non-database suite passed (42 files, 270 tests); complete clean PostgreSQL suite passed on local `hiringloop_test` (23 files, 119 tests); focused offer HTTP integration passed (1 file, 9 tests); focused frontend communications tests passed (2 files, 4 tests); backend lint, format, Prisma validation, and changed-module syntax checks passed. Database integration used fake providers only. The accepted-then-database-write failure test confirmed the communication stays `PENDING` and replay does not call the provider again. See [22-email-delivery-verification.md](22-email-delivery-verification.md).

Live SendGrid acceptance, delivery/bounce, webhook and process-crash recovery remain unverified. The original E08 table above describes the baseline finding, not current synchronous classification behavior. No stage, commit, push, or deployment was performed.

## Phase 3E follow-up (2026-10-17)

S01 was repaired with a storage-side conditional write in the existing S3 direct-upload flow. The presigned `PutObject` now signs `If-None-Match: *`; the reservation already returned `requiredHeaders`, and the browser forwards them without exposing credentials. Submission still enforces tenant/job reservation ownership, expiry, declared/actual size and MIME equality, and now performs a ranged read to verify a short PDF/OLE DOC/ZIP DOCX signature before its existing atomic persistence transaction. Authorized resume downloads remain behind candidate-document permission and organization-scoped lookup.

**VERIFIED:** AWS SDK presigning with synthetic credentials (no request sent) included `if-none-match` in the signed header set; fake object storage rejected a replay and retained the initially accepted bytes; use-case MIME/signature negative test and public HTTP tests passed. Backend non-database suite passed (43 files, 273 tests); full PostgreSQL database suite passed serially against verified local `hiringloop_test` (23 files, 119 tests); backend lint, format check, changed-file syntax checks and Prisma validation passed; focused frontend upload test passed (1 file, 1 test) and formatting check passed. A parallel run of the database suite timed out in unrelated suites; the serial rerun passed. An exploratory Prisma write for a new resume-specific database assertion failed with a generic missing-column error even though catalog inspection showed the declared columns; the assertion was removed, so no new resume-specific PostgreSQL test is claimed.

**NOT VERIFIED / UNKNOWN:** no real S3 request, replay, bucket policy, IAM, CORS, versioning, delete-marker or lifecycle behavior was exercised. Production CORS must allow `If-None-Match`; production should enforce conditional writes in bucket policy and restrict deletes/writes. The signed PUT does not cap bytes during transfer; max size is enforced before application acceptance. Byte signatures are shallow format checks, not safe document parsing or malware scanning. Failed submissions and abandoned uploads may leave stored objects; no cleanup mechanism was found. See [23-resume-storage-security-verification.md](23-resume-storage-security-verification.md).

## Phase 3F follow-up (2026-10-17)

Phase 3F traced interview schedule, replacement, reschedule and scorecard writes. Schedule and reschedule share sorted tenant/participant advisory locks before overlap checks; replacement and reschedule acquire the interview row `FOR UPDATE` first, then membership key-share locks and sorted participant advisory locks. At PostgreSQL's default `READ COMMITTED` isolation, scorecard writes now take `FOR SHARE` on the organization-scoped interview before reading the participant, serializing scorecard creation/submission against replacement while allowing compatible scorecard writes. No DB schema change was needed.

**VERIFIED:** focused DB regressions passed (2 files, 13 tests), including barrier-controlled overlapping reschedules (one success/one conflict) and participant-removal-wins against scorecard submission (`NOT_FOUND`, no scorecard). Backend non-DB suite passed (43 files, 273 tests); lint, formatting, Prisma validation and changed-file syntax checks passed. Complete serial DB suite reported 22 passed files, 1 failed file, 120 passed tests, 1 failed test: the unrelated existing member-management remove/demote race assertion. Rerunning that exact test in isolation passed (1 passed, 7 skipped). The previous full run had 1 infrastructure fault while developing the test barrier (PostgreSQL void lock result cannot be deserialized through Prisma); the helper was corrected to select an integer and the focused tests then passed. The concurrency-barrier scheduling test was retained.

**LIMITS:** The full DB suite was not rerun after the isolated flaky-case pass, so no all-green full-suite result is claimed. Membership deletion racing schedule, explicit different-organization concurrency, reverse scorecard-wins ordering, adversarial lock cycles, and load/stress remain unverified. These finite tests do not prove all races absent. See [24-interview-concurrency-verification.md](24-interview-concurrency-verification.md). No stage, commit, push, or deployment was performed.

## Phase 4 follow-up (2026-10-17)

The Phase 3F member-management suite failure was an order-dependent test assertion, not a reproduced lost-Admin state. Both serialized outcomes preserve one Admin: remove then reject demotion, or demote then reject removal of the last Admin. The test now holds the organization row to establish contention and accepts either valid outcome while asserting the persisted invariant. The exact test passed five consecutive isolated runs, and the complete serial PostgreSQL suite subsequently passed (23 files, 121 tests).

The broader top-level HTTP integration run (7 files) reported 29 passed / 1 failed. The offer-send concurrency test intermittently produced one `201` and one `500 INTERNAL_ERROR` instead of one `201` and one `409`; repeated isolated executions both passed and failed. A captured failing run showed one fake provider call and one persisted communication. Source correlation points to a second concurrent update of an already-issued `OfferVersion` rejected by the immutable-version trigger; the request error logger does not retain the Prisma code. This is recorded as E18 in [15-technical-debt.md](15-technical-debt.md) and is not changed in this verification phase.

Phase 4 full frontend checks: lint passed with one React-ref warning; formatting and typecheck passed; serial full frontend tests passed (55 files, 285 tests); build passed with the existing >500 kB chunk advisory. The initial parallel/default-worker frontend run had 2 failures (283/285) and prolonged test execution; the same full suite passed with `--maxWorkers=1`. Backend non-database tests passed serially (43 files, 273 tests); a simultaneous run with frontend verification had one AWS presigning test timeout, which passed isolated and in the clean serial suite. Backend lint, formatting, Prisma validation and syntax checks (165 source files plus changed test) passed.

The prior resume persistence “missing column” report could not be reconstructed because its raw statement/error detail was not retained. Read-only verification now confirms `hiringloop_test`, schema `public`, PostgreSQL 18.4, 17 applied migrations, schema-declared resume columns and successful generated Prisma 7.10 projections. No speculative write assertion was added; cause and PostgreSQL persistence behavior remain unverified. No Playwright package/browser harness or repository CI/deployment workflows were found. See [25-consolidated-verification.md](25-consolidated-verification.md) for exact commands, E2E and operations gaps, and gate statuses.
