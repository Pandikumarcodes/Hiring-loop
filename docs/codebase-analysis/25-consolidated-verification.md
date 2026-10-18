# 25 - Consolidated regression, integration and E2E verification

Verification date: 2026-10-17. Phase 4 consolidates automated repository checks and reviews remaining production evidence after Phases 3A–3F. No production database, real email provider, or real object storage was used. No reset, schema migration, staging, deployment, commit, or push was performed.

## 1. Executive verification summary

**Phase 4B follow-up (2026-10-18):** Resume persistence is now verified with 16 focused PostgreSQL tests and the complete serial database suite (24 files / 137 tests). Backend non-database tests (43 files / 274 tests), all top-level API integration tests (8 files / 40 tests), syntax (251 JS files), lint, formatting, Prisma validation and diff checks pass. The missing-column error reproduced as PostgreSQL `42703` / Prisma `P2022` from a shared trigger's invalid `NEW` record fields. An additive trigger-function migration fixes it while retaining ownership checks; no resume column/model change was needed. A separate stale generated client was regenerated and excluded as the resume cause by reproducing afterward. Local `hiringloop_test` now has 18 matching applied migrations. Full results and limits: [27-resume-persistence-verification.md](27-resume-persistence-verification.md). Historical Phase 4 results below are retained.

**Phase 4C follow-up (2026-10-18):** A local Chromium Playwright harness now exercises the real Vite/Express/Prisma path using guarded `hiringloop_test`, fake mailbox and fake capability-based object storage. The final suite passed 4/4 browser scenarios with no skips, covering the hiring lifecycle, authentication/session expiry, tenant/role denials, stale revision and UI retry. It found and corrected strict client request-body defects in scorecards and talent-pool membership. See [28-browser-e2e-verification.md](28-browser-e2e-verification.md) for isolation, artifacts, exact results and limits.

**Phase 4A follow-up (2026-10-18):** E18 is repaired. A controlled reproduction captured PostgreSQL `P0001` / Prisma `P2039` from the immutable-version trigger. Send preparation now locks the tenant-scoped parent offer before reading state; distinct-key contention returns 201/409 with one communication and provider call. All top-level API integration tests passed (8 files, 40 tests); focused offers passed 19 tests; the full non-database suite passed 274 tests and the complete serial PostgreSQL suite passed 121 tests. Ten repeated rounds passed all three targeted contention cases (30 passed; other tests filtered). Backend syntax (249 files), lint, formatting, Prisma validation and diff checks passed. Full Phase 4A command results, development-run failures and remaining delivery limits are tracked in [26-offer-send-concurrency-verification.md](26-offer-send-concurrency-verification.md). The Phase 4 execution history below is retained as originally observed.

The frontend, backend unit suite, and complete PostgreSQL database suite pass when run serially. The previous intermittent member-management failure was traced to a schedule-order-specific test assertion: both valid serialized orders preserve an Admin, but one order returns `updated` plus `final_admin` rather than `removed` plus `final_admin`. The test now establishes organization-lock contention and checks the actual invariant. Five consecutive isolated runs and the complete database suite passed.

Phase 4 also reproduced an outstanding offer-send concurrency response defect in an existing top-level HTTP integration test. The loser intermittently receives `500 INTERNAL_ERROR` instead of the expected deterministic `409`; the captured failing run had one persisted communication and one fake provider call. Application code was not changed, consistent with the verification-only scope. Browser E2E and production readiness remain blocked by absent harness/deployment evidence.

## 2. Environment and tools

- Git branch: `main`. The initial worktree was already dirty with uncommitted Phases 3A–3F source, test and documentation files. Those changes were preserved; no staging or commit occurred. Phase 4 added a focused test correction and report/analysis updates only.
- Runtime: Node.js `v24.18.0`; npm `11.16.0`; PostgreSQL `18.4` on Windows.
- Database identity: guarded status command verified `hiringloop_test`, host `localhost`, port `7498`, schema `public`, search path `"$user", public`; all 17 migrations were applied and schema was up to date. Identity and migration state were checked before DB tests. `psql` CLI was not installed; read-only database inspection used the application’s Prisma adapter.
- ORM/client: Prisma CLI and generated client `7.10.0`; generated client and adapter use `@prisma/adapter-pg`.
- Test frameworks: Vitest `4.1.11` for both applications; backend HTTP integration uses Supertest. Frontend tests run in jsdom. Backend `npm test` excludes `tests/integration/**`; `npm run test:db` selects only `tests/integration/database`, so top-level integration HTTP tests require explicit invocation.
- Environment files were present. Only variable names were inspected; no secret values are included here. Backend configuration includes database/test database URLs, frontend origin, CSRF, email, S3 and upload settings; frontend has `VITE_API_BASE_URL`.
- No Playwright package or executable was installed, no Playwright/Cypress harness or browser E2E script was present, and no repository CI/deployment workflow directory was found.

## 3. Exact commands executed

Commands below were run from their named application directory unless otherwise noted.

| Command | Result |
| --- | --- |
| `git branch --show-current`; `git status --short` | `main`; pre-existing dirty 3A–3F worktree recorded and preserved |
| `node.exe --version`; `npm.cmd --version` | Node `v24.18.0`; npm `11.16.0` |
| `npm.cmd run prisma:migrate:test -- status` | PASS — verified only `hiringloop_test`; 17 migrations, up to date; no migration/reset run |
| Read-only Prisma `SELECT current_database(), current_schema(), current_setting('search_path'), version()` and `information_schema.columns` query | PASS — identity/version and resume columns documented in §9 |
| Prisma read-only `applicationUpload.findMany({take:0})` and `candidateDocument.findMany({take:0})` | PASS — generated client resolved both models |
| `npm.cmd run verify` (frontend) | Lint/format/typecheck passed; default-worker full tests had 2 failures; the chained command therefore stopped before build |
| `npm.cmd test -- --maxWorkers=1` (frontend) | PASS — 55 files, 285 tests |
| `npm.cmd run build` (frontend) | PASS — production bundle built; existing >500 kB chunk advisory |
| `npm.cmd test` (backend; simultaneous with frontend verification) | 272 passed, 1 timeout in AWS presigning test; isolated rerun and subsequent clean serial full run passed |
| `npm.cmd test -- tests/modules/applications/aws-s3-application-storage.test.js` | PASS — 1 file, 2 tests; synthetic credentials, no network/storage request |
| `npm.cmd test` (backend, serial clean rerun after frontend work ended) | PASS — 43 files, 273 tests |
| `npm.cmd run lint` (backend) | PASS |
| `npm.cmd run format:check` (backend) | PASS |
| `npm.cmd run prisma:validate` | PASS |
| PowerShell loop invoking `node.exe --check` for all `src/**/*.js` plus the changed member test | PASS — 165 backend source files plus changed integration test |
| `npm.cmd run test:db -- --maxWorkers=1` (backend) | PASS — 23 files, 121 tests, after the member test correction |
| Five consecutive isolated member-management race test invocations | PASS — 1 test each; no timeout/failure |
| Seven top-level HTTP integration files via `node.exe --env-file=.env .\node_modules\vitest\vitest.mjs run ... --maxWorkers=1` | FAIL — 6 files passed, offer HTTP file had 8 passed / 1 failed; aggregate 29 passed / 1 failed |
| Repeated isolated offer-send concurrency test | INTERMITTENT — both passing and failing runs observed; failing run details in §§7, 8 and 13 |
| `git diff --check` | PASS before final report edits; repeated after report edits as part of final artifact check |

The initial frontend test run used Vitest’s default parallel workers and reported 283/285 passing, with failures in the auth page test and a form-builder test timeout. The full suite passed unchanged when run with one worker; no timeout was raised. Backend verification similarly had an AWS signing test time out only during simultaneous verification load; it passed isolated and in the subsequent clean serial full suite. These first runs are retained as resource-contention observations, not hidden.

## 4. Frontend verification

- Lint: PASS with one warning at `src/features/candidate-application/pages/PublicApplyPage.tsx:315` (`react(refs)`: ref access during render). This warning was not changed in Phase 4.
- Formatting: PASS (`prettier . --check`).
- TypeScript: PASS (`tsc -b --pretty false`).
- Full tests: PASS with one worker, 55 files / 285 tests. Default parallel run was flaky under concurrent verification load as detailed above.
- Production build: PASS, 2,258 modules transformed. The generated JavaScript chunk is 796.72 kB (225.17 kB gzip); Vite emitted its existing advisory for chunks over 500 kB.
- Frontend offer/template, interview, communication and upload contract tests are included in the full suite; no new frontend code was changed in Phase 4.

## 5. Backend verification

- Syntax: all 165 backend source JavaScript files passed `node --check`; the corrected member-management integration test passed syntax checking and Vitest execution.
- Lint, formatting and Prisma schema validation: PASS.
- Non-database suite: PASS, 43 files / 273 tests on clean serial rerun.
- The run performed simultaneously with frontend checks had one 5-second timeout in AWS signing; the same file passed 2/2 isolated and the full clean suite passed without increasing test timeouts.
- Real provider credentials were not used. The AWS signing regression supplies synthetic credentials and only performs local signing; provider sending is stubbed in offer/email HTTP tests.

## 6. PostgreSQL and HTTP integration verification

The guarded helper reported `database = hiringloop_test; host = localhost`. Prisma status reported PostgreSQL schema `public` and all 17 migrations current. The complete serial DB folder passed 23 files / 121 tests, including auth/session lifecycle, HTTP authorization, offer/talent-pool persistence, scorecard rollback and interview scheduling concurrency. No DB reset or migration was needed.

The backend’s top-level HTTP integration tests are excluded from both `npm test` and the `tests/integration/database` selection. Seven top-level HTTP suites were therefore run separately against `hiringloop_test` and fake email delivery. Result: 29/30 passed. The lone failing case is the concurrent offer-send test (see §8). Other access, offer confidentiality, outcome, talent-pool and tenant-isolation HTTP tests passed in that run.

No real email or object-store operation was performed. Database integration fixtures use generated synthetic identities and disposable test rows. Test fixture rows from top-level HTTP helpers are unique per run; no reset was used.

## 7. Contract and remediation-phase confirmation

- **3A — Offer/template request contracts:** backend/frontend contract tests passed in the clean unit and frontend suites; HTTP offer read/edit/revise and template flows passed apart from the distinct concurrent-send case. Path IDs/body contracts remain aligned in the tested single-request cases.
- **3B — Interview permissions/data integrity:** scoped participant discovery, role checks, tenant filtering, corrected fields and atomic participant replacement passed relevant frontend, HTTP and PostgreSQL tests.
- **3C — Scorecard transaction rollback:** PostgreSQL tests passed invalid/incomplete rollback, audit rollback, stale expected revision and duplicate submission checks. Scorecard writes serialize with interview participant replacement under Phase 3F’s shared interview lock.
- **3D — Email delivery classification:** unit and PostgreSQL tests passed acceptance, rejection, ambiguous/pending, replay/idempotency and provider-failure cases with fake providers. Live SendGrid, webhook and crash recovery remain unverified. The separate offer-send concurrency response defect does not show a duplicate provider attempt in the captured failure.
- **3E / 4B — Resume protection and persistence:** offline AWS presigning and fake-store replay tests passed; browser conditional-header test passed in Phase 4. Phase 4B identified and repaired the invalid-record-field trigger defect and added 16 passing focused PostgreSQL tests (§9 and document 27). Real S3, bucket controls, live retrieval, malware scanning and size enforcement during transfer remain unverified.
- **3F — Interview concurrency:** scheduling/rescheduling overlap and scorecard/removal barriers passed in the DB suite. Participant replacement and stale membership regressions passed. The suite does not exhaustively cover every lock order or prove all races absent.

## 8. Member-management and other concurrency findings

The prior `remove/demote` test assumed exactly one outcome must be `removed`. Under valid serialization, if demotion commits first, removing the other Admin must return `final_admin`; the result pair is `updated` + `final_admin`, and exactly one Admin remains. If removal commits first, the pair is `removed` + `final_admin`. The prior assertion incorrectly rejected the first valid order, explaining the intermittent failure without evidence of lost-Admin state.

Phase 4’s test-only correction holds the organization row, queues both operations, verifies lock contention, accepts either valid serialized outcome, and asserts one remaining Admin. It does not raise the Vitest timeout. This test passed five isolated runs and the subsequent complete database suite.

Separately, the offer-send HTTP test requests one successful send and one conflict for concurrent sends with different idempotency keys. The captured failing request pair was one `201`, one `500 INTERNAL_ERROR`; one fake provider invocation and one `Communication` row remained. Repeated isolated executions alternated between pass and failure. `prepareSend` reads an unissued version, creates a communication, updates the shared offer version’s `issuedAt`, and changes offer status; the PostgreSQL `OfferVersion_immutable` trigger rejects writes after `issuedAt` is set. A losing transaction can therefore hit that database guard instead of translating the race to a domain conflict. The server logs only the Prisma error class/request ID, so the exact database error code/message was not captured. This is recorded as E18 in the technical debt register; no offer source code was changed.

The S3 and interview locking cases discussed in documents 23 and 24 remain subject to the limitations listed there. No stress/load or adversarial deadlock campaign was attempted.

## 9. Resume persistence investigation

**Resolved in Phase 4B:** The current error is caused by `assert_document_and_upload_relationships()` referencing absent fields on its table-specific `NEW` record inside a combined Boolean expression. Raw qualified/unqualified SQL and Prisma reproduce it; regeneration alone does not fix it. The new additive migration separates the table branches. All 16 resume PostgreSQL tests pass, including rollback and concurrent/repeated completion; the full serial DB suite passes 137 tests. See [document 27](27-resume-persistence-verification.md). The paragraphs below retain the narrower historical Phase 4 investigation and its then-unresolved limitation.

The earlier Phase 3E note reported a generic missing-column error during an exploratory Prisma write, although catalog inspection showed the model’s columns. Phase 4 rechecked without writing:

- Connection identity: `hiringloop_test`, `public`, `"$user", public`; PostgreSQL `18.4`.
- `prisma migrate status`: 17 migrations found and schema up to date.
- `information_schema.columns`: all current `ApplicationUpload` and `CandidateDocument` columns declared in Prisma/migration SQL were present with expected UUID, varchar, enum, integer and timestamp types.
- Generated Prisma client: version `7.10.0`; `applicationUpload.findMany({take:0})` and `candidateDocument.findMany({take:0})` both completed successfully, showing that the current client resolves both table projections on this connection.

The exact earlier SQL, Prisma error metadata, and test-process connection identity were not retained. Current checks rule out a present migration/search-path/client-projection mismatch, but they do not identify the historical write’s cause. In accordance with the instruction to add a persistence assertion only after identifying that cause, no speculative write assertion was added. Root cause and actual `CandidateDocument`/`ApplicationUpload` persistence remain **NOT VERIFIED** in a focused Phase 4 test; a future attempt should retain `$queryRaw`/Prisma error metadata and use a transaction or uniquely keyed fixture with deterministic cleanup.

## 10. End-to-end hiring lifecycle

No browser E2E run was possible safely from the existing repository setup: neither application includes Playwright/Cypress, no browser E2E script/config or browser package was installed, and no end-to-end test environment is documented. No dependencies were installed and no local server was started. The backend `.env` contains both development and test DB configuration; starting the normal server without a carefully injected test configuration risks selecting the development DB. The application’s production upload adapters also require storage configuration; there is no single browser test harness injecting fake email and object storage through the whole public-applicant-to-hire lifecycle.

There are separate Supertest/database suites for authentication/session+CSRF, organization/membership and permissions, job/application forms/public career pages, interview/scorecards, communication, offers/outcomes and talent pools. These are not one browser-driven lifecycle and do not prove that the UI journey across all 14 requested steps works end-to-end.

| Requested journey | Phase 4 evidence |
| --- | --- |
| Register/login | Auth/session HTTP lifecycle test passed; no browser interaction |
| Organization/team/job/public career page | Separate API and DB workflows passed; no single chained journey |
| Resume application and candidate review | Phase 4B adds real PostgreSQL resume persistence and public completion router tests with fake storage; no browser chaining or real storage |
| Interview, interviewer assignment, scorecard | PostgreSQL integration passed; no browser chaining |
| Candidate communication | HTTP tests use fake provider; delivery-state tests passed |
| Create/revise/accept offer and hiring outcome | Separate offer/outcome HTTP and DB flows passed except intermittent concurrent offer-send HTTP loser 500 |
| Talent pool | Separate API/DB tests passed; no browser chaining |

Browser E2E is **BLOCKED** at harness/setup availability; there is no established first product workflow failure because the browser journey was not executed.

## 11. Security regression results

Automated checks passed for session lifecycle, CSRF-protected mutations, role denials, tenant-scoped resource lookups, candidate-document authorization source/HTTP coverage, offer compensation confidentiality for denied roles, invalid request rejection and database concurrency invariants. The relevant full suites passed except the independent offer-send concurrency response failure (E18). The observed failed send did not create a second communication or provider call. No live provider, storage, browser, deployed cookie/TLS/CORS or production tenant attack test was performed; therefore this is an automated regression result, not a security certification.

## 12. Operational readiness review

- **CI/CD and deployment:** no first-party repository workflow, deployment manifest, container/compose file or release automation was found. Test and development scripts are present; no staging/release evidence exists.
- **Environment:** `.env.example` documents database, test database, CSRF, frontend origin, email, S3 and upload settings. Production config requires secure secrets and S3/email configuration as applicable. Environment values were not copied into the report.
- **Migrations:** 17 forward Prisma migrations are present. The test-only helper validates `TEST_DATABASE_URL` names `hiringloop_test`; it supports status/deploy but was run only in status mode. No production migration/rollback runbook was found.
- **Storage:** AWS S3 adapter signs a conditional create; production still requires verified private-bucket policy, CORS allowance for `If-None-Match`, IAM least privilege, version/delete-marker policy, upload size cap and cleanup/reconciliation. No production bucket was accessed.
- **Logging/monitoring:** request correlation and basic console logs exist; unhandled request logs include error name/request ID and deliberately omit stack/error code. Health is a liveness JSON endpoint. No metrics, alert rules, centralized telemetry or readiness probe were found in this repository review.
- **Backups/recovery:** no backup/restore automation, recovery procedure, migration rollback guide, or practiced RPO/RTO evidence was found. No backup was created/restored.
- **Email recovery:** Phase 3D keeps ambiguous delivery `PENDING` and avoids blind same-key resend. There is no outbox/worker/reconciliation/webhook evidence to resolve ambiguous acceptance automatically.
- **Networking/security operations:** secure cookie and CSRF controls are implemented in app code, but production TLS termination, trusted-proxy policy, exact origin configuration, secret rotation and incident response are not verified.

## 13. Remaining defects and risks

| Risk | Severity | Status |
| --- | --- | --- |
| Concurrent offer send returned 500 for the loser | Resolved in Phase 4A | PostgreSQL P0001 / Prisma P2039 confirmed; tenant-scoped parent lock repairs the race. Controlled HTTP regressions and all 40 top-level API tests pass; see document 26. |
| Browser end-to-end workflow not exercised | P1 verification gap | No Playwright/browser harness or isolated app environment; blocked. |
| Resume PostgreSQL persistence error cause unknown | P1 verification gap | Current schema/client align, but historical raw SQL/error absent; focused persistence assertion not run. |
| Real S3 controls and malicious-file scanning | P1/P2 security/operations | AWS account/bucket not tested; shallow signature checks only. |
| Ambiguous email outcomes cannot be reconciled automatically | P1 operational | No outbox, worker or provider reconciliation. |
| CI/deploy, backups/restore, monitoring, production migrations | P1 operational | Not implemented/evidenced in repository; production readiness cannot be established. |
| Interview/membership concurrency outside tested schedules | P2 assurance | Finite tests pass; several lock orderings and load scenarios remain untested (document 24). |
| Frontend lint and bundle advisories | P3 maintainability/performance | One existing React-ref warning and >500 kB bundle advisory; checks otherwise pass. |

## 14. Recommended next steps

1. E18 COMPLETE in Phase 4A: tenant-scoped offer send lock and deterministic HTTP+PostgreSQL regression establish one `201`, one `409`, one communication and one fake provider call. See document 26 for verification and limits.
2. COMPLETE in Phase 4B: reproduce resume writes with PostgreSQL/Prisma metadata, repair the shared trigger record-field defect and verify 16 focused persistence tests. See document 27.
3. Define an isolated E2E environment with explicit test DB, injectable fake email/storage, and a supported browser runner; then run the complete lifecycle without real external services.
4. Add first-party CI gates that include top-level HTTP integration tests and serial DB setup/verification; preserve the database target guard.
5. Before production, verify S3 policy/CORS/IAM, implement and rehearse backups/restores and migration recovery, establish monitoring/readiness and email reconciliation, and obtain staging security/operational evidence.
6. Track the frontend React-ref warning and bundle advisory separately; neither blocked the completed checks.

## Final quality gates

| Gate | Status | Basis |
| --- | --- | --- |
| Frontend build | **PASS** | Production build completed; chunk-size advisory remains. |
| Frontend tests | **PASS** | 55 files / 285 tests with one worker; default parallel run was flaky under load. |
| Backend static checks | **PASS (Phase 4A)** | All 249 source/script/test/config JavaScript files passed syntax checks; lint, formatting and Prisma validation passed. |
| Backend unit tests | **PASS (Phase 4A)** | Complete run: 43 files / 274 tests. |
| Database integration | **PASS** | 23 files / 121 tests serially against verified `hiringloop_test`. |
| API integration | **PASS (Phase 4A)** | All 8 top-level HTTP files / 40 tests passed after E18 repair; the Phase 4 29/30 failure remains recorded above. |
| Browser E2E | **BLOCKED** | No installed browser harness or safe full-lifecycle environment. |
| Security regression | **PASS (automated scope only)** | Existing auth/CSRF/tenant/role/confidentiality tests passed; no live infrastructure attack testing. |
| Production readiness | **BLOCKED** | Browser and production infrastructure/recovery evidence remain absent; E18 is repaired in Phase 4A and focused resume persistence in Phase 4B. Live storage controls remain unverified. |

No Phase 18 Analytics & Audit implementation work was started. No staging, commit, push or deployment was performed.
