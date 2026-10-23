# HiringLoop — Final Frontend Release Verification

Assessment completed: **23 October 2026, Asia/Calcutta**. Static checks began on 22 October and browser investigation continued on 23 October. Scope: release assessment only; no application source fixes, backend changes, dependency changes, database writes, migrations, fixture resets, Git staging, commits or deployment.

## 1. Executive summary

**Verdict: NOT READY for production release.** The frontend passes its requested static, unit-test, build, dependency-audit and test-discovery checks. That does not establish release readiness: current database-backed browser workflows remain unexecuted, two talent-pool defects reproduce, and a job confirmation loses keyboard focus when dismissed. The locally generated production build also embeds a development API origin and cannot be deployed as supplied.

Revalidated baseline:

| Claim | Current evidence |
| --- | --- |
| 35 terminal route patterns | Confirmed in `hiringloop-frontend/src/app/router/routes.tsx`; wrappers are not counted as extra pages. All 35 have fresh mocked-browser structural measurements. |
| 25 lazy pages | Confirmed by route imports and production module inspection; none enters the initial static module graph. |
| React 19 / TypeScript / Vite / Tailwind / TanStack Query | Confirmed in the current frontend manifest and successful compilation/build. |
| 417 tests in 64 files | Fresh full run: **417 passed, 0 failed, 0 skipped; 64 files passed**. |
| Build passes without size warnings | Confirmed; 2,255 modules transformed, 51 JS chunks. |
| npm audit has zero vulnerabilities | Confirmed by a network-enabled full audit after the initial sandbox network failure. |
| FE-01 through FE-05 implemented | Source contains the session-expiry/cache work, tenant/error-state changes, lazy boundaries, form/notification/shared UI remediations and public/404 recovery. Implementation presence is not acceptance of every behavior; defects below remain. No separate FE-01/02/04 acceptance report was found, so milestone labels alone were not used as evidence. |
| Browser fixture checks passed | Fresh public/recovery smoke: 23 checks passed. Fresh focused keyboard checks: 5 passed, 2 failed. A broad supplemental smoke did not finish cleanly. Historical fixture results are distinguished below. |
| Live workflows verified | **No current release-run database-backed browser verification.** Discovery is not execution. |

Primary evidence directory: [`.verification-artifacts/release-gate`](../.verification-artifacts/release-gate/). It is ignored by Git and contains command logs, JSON results, browser scripts, sanitized environment details and preservation hashes.

## 2. Git integrity status

Baseline and final application state:

- Branch: `main`.
- HEAD: `30ea33ba48209f33c0e84abbb1d54b3f90d4c4a0` (`feat(hiringloop): modernize ATS frontend and verify UI workflows`).
- **102 staged paths**, comprising 92 frontend paths, four backend paths and six documentation paths. There were no unstaged changes or non-ignored untracked files at entry.
- All 102 original modified/added files retain their SHA-256 hashes. HEAD and the actual Git index file hash remain unchanged. This assessment adds only this untracked report outside the ignored evidence directory.
- Both unstaged and staged whitespace checks pass. The unstaged check alone would have been insufficient because the existing work is staged.
- No generated bundle, browser report, screenshots, recordings, coverage, node_modules or verification artifact is staged. Existing generated evidence remains ignored.
- Targeted secret-pattern scanning of the 102 changed files found no real credential. The sole credential-URL match is the synthetic `demo`/`secret` fixture at `hiringloop-backend/tests/scripts/seed-demo.test.js:13`. Real `.env` files are ignored and not tracked. This was a targeted working-change scan, not a forensic scan of all Git history or a guarantee that every secret format is detectable.

Unrelated staged backend/demo work is exactly:

1. `hiringloop-backend/package.json` — adds `db:seed:demo`.
2. `hiringloop-backend/scripts/demo-seed-data.js`.
3. `hiringloop-backend/scripts/seed-demo.js`.
4. `hiringloop-backend/tests/scripts/seed-demo.test.js`.
5. `docs/demo-seed-workflow.md`.

Existing frontend manifest changes include Testing Library DOM and Vite/Vitest/jsdom version updates. Those changes predate this assessment; neither manifest nor lockfile was modified here. They should remain together in the frontend checkpoint.

Evidence: [inspection](../.verification-artifacts/release-gate/inspection.json), [original hashes](../.verification-artifacts/release-gate/preservation-before.json), [final preservation](../.verification-artifacts/release-gate/preservation-after.json), [exact checkpoint allowlists](../.verification-artifacts/release-gate/checkpoint-manifest.json).

## 3. Current test results

Commands below ran from `hiringloop-frontend` except the two Git checks, which ran from the repository root. No test assertions, repository runner configuration or timeouts were changed.

| Check | Result / exit | Observed wall time |
| --- | --- | ---: |
| `npm.cmd run typecheck` | PASS / 0 | 54.837 s |
| `npm.cmd run lint` — Oxlint | PASS / 0; no reported warnings | 2.398 s |
| `npm.cmd run format:check` | PASS / 0; all matched files formatted | 19.450 s |
| `npm.cmd run test -- --pool=threads --reporter=default --reporter=json --outputFile=../.verification-artifacts/release-gate/vitest.json` | PASS / 0; **417/417, 64/64 files**, no skipped tests | 542.565 s; Vitest reports 538.28 s |
| `npm.cmd run build` | PASS / 0; no size warnings | 46.130 s; Vite build phase 5.71 s |
| `npm.cmd audit --json`, sandbox attempt | INFRASTRUCTURE FAILURE / 1: npm advisory endpoint unavailable; npm-cache log write denied | 20.272 s |
| Same full audit, network-enabled retry | PASS / 0; zero info/low/moderate/high/critical vulnerabilities; audit reports 281 dependencies | [Tool-result receipt](../.verification-artifacts/release-gate/audit-network-receipt.json); original failed logs retained |
| `npm.cmd run test:e2e -- --list` | PASS / 0; **5 Chromium tests in 2 files** | 3.261 s |
| `git diff --check` | PASS / 0 | 0.321 s |
| `git diff --cached --check` | PASS / 0 | 0.778 s |

Vitest used the previously verified **thread pool** with the existing `maxWorkers: 1` and 15,000 ms test timeout in `vite.config.ts`. Checks ran serially. No fallback to a larger timeout or disabled test was used.

Non-failing test diagnostics remain: three notification tests report unmatched synthetic application URLs, and React emits an `act(...)` environment warning. These are retained in [Vitest stderr](../.verification-artifacts/release-gate/vitest.stderr.log); they are test-harness limitations, not evidence that navigation was integration-tested by those assertions.

Supplemental browser results, kept separate from the existing Vitest/Playwright gates:

- Public/recovery production smoke: **23 passed**, no page errors, unmatched API fixtures or API mutations.
- Focused production keyboard checks: **5 passed / 2 failed**, process exit 1. Both failures are actual job-dialog focus restoration failures, from mouse and keyboard opening paths.
- Talent-pool/session diagnostic: both pool defects reproduced; synthetic protected GET 401 redirected to login and removed protected navigation. No API mutations or page errors.
- Broad production-smoke attempts: first stopped because the audit selected `Open` for an already OPEN fixture job (audit locator error, corrected to `Close`); next completed 35-route inspection but failed dialog focus restoration; a subsequent attempt failed the unchanged 5-second lazy-fallback assertion during protected deep links. **No clean full supplemental smoke pass is claimed.** The later focused keyboard run independently reproduced the focus defect without relying on that broad harness.

Evidence: [command manifest](../.verification-artifacts/release-gate/checks.json), [Vitest JSON](../.verification-artifacts/release-gate/vitest.json), [build log](../.verification-artifacts/release-gate/build.stdout.log), [public smoke](../.verification-artifacts/release-gate/public-browser/results.json), [keyboard results](../.verification-artifacts/release-gate/keyboard-browser/results.json), [diagnostics](../.verification-artifacts/release-gate/diagnostic-browser/results.json), [broad-attempt failure record](../.verification-artifacts/release-gate/supplemental-attempts.json).

## 4. E2E environment isolation assessment

**The inspected local target and scoped cleanup design pass the non-mutating isolation review. This is not authorization to execute the suite.** Launch-time state must be revalidated because the harness accepts some inherited variables.

| Safety property | Evidence / qualification |
| --- | --- |
| Exactly `hiringloop_test` | `hiringloop-backend/scripts/e2e-server.js:11-13` validates URL pathname; lines 38-39 verify connected database and public schema. Prisma selects `TEST_DATABASE_URL` under forced `NODE_ENV=test` in `src/database/client.js`. |
| Local database; no development/staging/production target | Sanitized `.env` inspection identifies `localhost:7498/hiringloop_test`, no URL query parameters. A separately constructed read-only client confirmed database `hiringloop_test`, schema `public`, address `::1/128`, port 7498 and `transaction_read_only=on`. The dev URL was inspected as text only; no connection to `hiringloop_dev` was made. |
| Known URL source | No inherited `TEST_DATABASE_URL`, `DATABASE_URL`, `PGHOST`, `PGPORT`, `PGDATABASE`, `PGSERVICE` or `PGOPTIONS` was present. The test URL came from the backend `.env`. `process.loadEnvFile()` preserves pre-existing variables, so this provenance check must be repeated for a future authorized launch. |
| Fresh run ownership | Playwright generates UUID run/control identifiers unless inherited values already exist. Users use `@<runId>.e2e.test`; organizations use `E2E <runId> ...`. A future run must explicitly generate fresh identifiers rather than inherit an old run ID. |
| Scoped cleanup | Cleanup selects only users with the exact run suffix and organizations with the run name prefix, rejects memberships crossing those sets, then deletes rows by those IDs. Every deletion has a `WHERE` clause or a scoped parent subquery. No reset, truncate or unscoped deletion was found. |
| Immutable history cleanup | Cleanup uses transaction-local `session_replication_role='replica'` to delete this run's immutable history. This is privileged cleanup; it is not used while fixtures/workflows execute. The launcher probes the capability before fixtures. That write-capable launcher/probe was not executed during this assessment. |
| Provider isolation | Launcher removes database/provider credential variables before app imports, sets console email and uses in-memory fake upload storage. API/storage bind to `127.0.0.1:4700/4701`. No real email or cloud upload was invoked. |
| Browser/server ownership | Playwright uses loopback frontend 4173, strict port selection, `reuseExistingServer:false`, one worker and zero retries. Read-only process/port inspection found no running Node E2E/Vite test process or listener on the inspected test ports at that snapshot. |
| Browser availability | Existing project-local Playwright 1.64.1 / Chromium **156.0.8078.4** launched successfully. No browser download or dependency installation was needed. |

The current-user readiness check in `e2e/support.ts` validates `{database, runId, fakeProviders}` before each page fixture. Global teardown posts only to the run-token-protected cleanup endpoint. The auxiliary interviewer context uses direct browser APIs and does not inherit the extended page fixture's external-request block; its tested URLs are local and providers are fake, but the block is not universal across contexts.

Evidence: [sanitized environment inspection](../.verification-artifacts/release-gate/inspection.json), [read-only identity](../.verification-artifacts/release-gate/database-identity.json), `hiringloop-frontend/playwright.config.ts`, `hiringloop-frontend/e2e/support.ts`, `hiringloop-frontend/e2e/teardown.ts`, `hiringloop-backend/scripts/e2e-server.js`.

## 5. E2E execution authorization status

**NOT AUTHORIZED for this release-verification run; no database-mutating E2E test was executed.** The user's gate explicitly requires separate approval even after isolation review. The only database access here was a read-only identity SELECT. The backend launcher, fixture registration, session-expiry endpoint and cleanup endpoint were not started or called.

Proposed command for a separately approved run, from the repository root after repeating environment/port checks:

```powershell
node .verification-artifacts/release-gate/identity.mjs
if ($LASTEXITCODE -ne 0) { throw 'Stop: test database identity not verified' }
$env:E2E_RUN_ID = [guid]::NewGuid().ToString()
$env:E2E_CONTROL_TOKEN = [guid]::NewGuid().ToString()
npm.cmd --prefix hiringloop-frontend run test:e2e -- --workers=1
```

The preflight refuses an inherited test URL or PostgreSQL override; it does not migrate or clean anything. If it fails, stop and inspect the variable source. Run all five tests together: `responsive-ui.spec.ts` intentionally reuses the lifecycle admin created earlier, and is not independently seeded.

Expected records for a successful complete run, based on the current specs (dependent history/session counts vary):

- Five registered synthetic users: lifecycle admin, auth-only user, roles owner, invited interviewer and conflict user. Candidate email does not create an additional User.
- Five run-named organizations and approximately six memberships, one invitation, authentication credentials/tokens/sessions. The auth scenario expires only its own run user's sessions.
- Three jobs: lifecycle, stale-revision conflict and responsive verification; their default pipeline/stage/application-form records.
- One candidate, application and persisted resume-upload metadata; the file itself is held by fake in-memory storage.
- One interview, participant/assignment/history records, scorecard templates/versions/criteria and one submitted evaluator scorecard. Conflict attempts are expected to be rejected.
- One communication template, candidate email history and two offer-send communications; one offer with two versions and an accepted/hired outcome, plus corresponding audit/notification records.
- One talent pool and a membership that the test creates and removes before teardown.

Teardown deletes that run's organization-owned rows (including immutable audit/history, notifications and all dependent recruiting records), Pipeline/PipelineStage/InterviewParticipant dependents, then those five users' auth rows and users. Exact dependent row totals are not fixed assertions; cleanup scope is the run-owned ID sets, not a table-wide count. No other run's records, development records or remote records are authorized.

## 6. Previous navigation-timeout investigation

The retained failed run is `hiringloop-frontend/test-results/bdc61bfb-b67d-4a5b-afc4-ed36a8eabffc/results.json`, dated 21 October UTC. It reported **1 expected / 4 unexpected**. Its lifecycle test timed out at `/register` waiting for `load` at the configured **15,000 ms** navigation limit.

Trace evidence narrows the immediate cause:

- Browser launch and page creation completed before navigation. The fake-provider/backend readiness GET returned **200 in 96.62 ms** before `/register`; the registration POST had not begun.
- The `/register` document returned **200**, taking about **6,084 ms**. This was not a document 404 or a failure to launch Chromium.
- Dev resource loading was slow: `routes.tsx` about **7,031 ms**, providers about **7,079 ms**, CSS about **8,116/8,460 ms**, and `@vite/client` about **12,986 ms**. Numerous dependent module requests had no completed response before the navigation failed.
- That trace still requested eager feature barrels/pages from before FE-03. It is evidence for the earlier runtime graph, not proof of a current eager-import regression.
- Later in the same run, the auth test passed, a worker exited with code `4294967295`, and subsequent fixture-readiness calls failed with `ECONNREFUSED 127.0.0.1:4700`. The artifact does not establish why the worker/backend terminated.

Fresh non-mutating reproduction used the same Vite host/port/strict-port command and 15-second navigation timeout, with every API request mocked and no backend process:

| Step | Measurement |
| --- | ---: |
| Frontend root HTTP readiness | 2,284.51 ms |
| Chromium launch | 945.58 ms |
| First `/register` navigation plus visible heading assertion | **13,509.22 ms**, HTTP 200 |
| First page `load` event | 12,897.5 ms after navigation start |
| Warm revisit plus heading | **1,182.66 ms**, HTTP 200 |

No page JavaScript errors occurred. Two console resource errors corresponded to deliberately mocked guest `/auth/me` 401s. No API mutation was attempted. The owned Vite process and browser were stopped after measurement. No port conflict occurred in this reproduction.

**Conclusion:** the earlier navigation exhausted its load deadline during the Vite development resource/module waterfall after HTML readiness. Root HTTP readiness does not prove the route/module graph is loaded. Current first navigation also approaches the unchanged limit, while revisit is much faster. Cold transforms/filesystem/host contention are plausible contributors, but the underlying cause of the historical slowdown and later worker/server exit remains unresolved. One worker and disabled file parallelism exclude configured concurrent E2E workers as the direct explanation; historical system-wide load was not captured. Do not mask this with a larger timeout. An approved instrumented full run is still required.

The responsive spec additionally catches a 500 ms `networkidle` timeout and can measure `#root`/bounds while content is still loading. Its width assertions are not proof that every real workflow rendered successfully. Its lifecycle-account dependency can cascade failures from an earlier test.

Evidence: [sanitized trace analysis](../.verification-artifacts/release-gate/prior-timeout-trace.json), [fresh reproduction](../.verification-artifacts/release-gate/navigation.json), [Vite log](../.verification-artifacts/release-gate/navigation-vite.stdout.log), original trace ZIP beside the failed lifecycle artifact, `hiringloop-frontend/e2e/responsive-ui.spec.ts:24-38,91-94`.

## 7. Authentication and tenant-safety verification

| Protection | Static/unit evidence, passing in the full suite | Browser evidence / limit |
| --- | --- | --- |
| Protected GET session expiry | `src/app/providers/query-client.ts` uses QueryCache errors only for session-scoped queries and authoritative `401/UNAUTHENTICATED`; corresponding test at `query-client.test.tsx:208`. | Fresh intercepted jobs GET 401 redirects to `/login`; protected navigation count becomes zero. This is a real production frontend with a synthetic response, not live cookie expiry. |
| Cache and CSRF cleanup | `session-expiry.ts` sets current user to null before cancellation; removes CSRF; cancels/removes `clearOnAuthChange` queries. Tests cover scope and late responses. Protected feature query options inspected carry the cleanup metadata. | No direct production-cache introspection or live identity transition was attempted. |
| Concurrent 401s | Per-QueryClient WeakMap promise coalesces cleanup; `query-client.test.tsx:238` passes. | Unit evidence only this run. |
| Protected-route redirect | `ProtectedRoute.test.tsx` covers removal/redirect after expiry; route tests distinguish pending/error from confirmed unauthenticated. | Fresh production public/protected-miss and synthetic-expiry checks pass. |
| Login recovery and old identity cleanup | `features/auth/hooks/mutations.test.tsx:58,249`; successful login clears old session data and CSRF, then installs returned user. Logout/reset/revoke behavior also covered. | Valid live login/logout/reset/revoke was not executed. |
| Workspace switching | Query keys include organization IDs; switcher builds explicit organization routes. Shell tests cover new scoped links, permission hiding, inaccessible membership context and keyboard switching. Route boundaries remount page content by pathname. | Fresh account/workspace menu keyboard tests pass. Historical FE-03 fixture smoke covered actual workspace switching; current DB-backed switching remains unverified. |
| Cross-tenant denial / RBAC | Real lazy Jobs permission-denial route test passes; organization, candidate, analytics/audit, team and job permission tests pass. Backend job routes statically compose authentication, tenant resolution and `requirePermission`; these were read without modification. | No current live server-side tenant-isolation test. Existing E2E code expects forbidden job create 403 and inaccessible foreign organization 404; discovery does not execute those assertions. |
| Inaccessible pool detail | Source puts `pools.isPending` before the permission/error branch. | **Fails:** a fresh user with no `talent-pool:view` sees perpetual loading, although zero pool API requests are sent. This is a recovery defect, not demonstrated unauthorized access. |

Paths in this table are under `hiringloop-frontend` unless explicitly marked backend. API requests include browser credentials; no frontend localStorage/sessionStorage token persistence or `dangerouslySetInnerHTML` use was found in application source. That limited static search does not establish complete application security.

Historical result files contain some successful database-backed tests on earlier code: two four-test suites on 18 October and isolated lifecycle/auth/responsive passes on 21 October. None is a fresh five-test pass for this staged frontend. No server-side authorization guarantee is inferred from mocked fixtures or frontend hiding.

## 8. Route/workflow coverage matrix

`O = /app/organizations/:organizationId`. All rows received static declaration review and generic router coverage. **M** means fresh mocked production rendering/DOM inspection, with no successful backend writes. **None** in the DB column means not executed for this release run. Unit labels identify the additional feature tests; they use RTL/jsdom, mocks or API stubs and are not live backend integrations. The complete test-file results are in `vitest.json`.

| # | Declared terminal route | Unit/RTL area beyond route matching | Mocked browser scope | DB browser this run |
| ---: | --- | --- | --- | --- |
| 1 | `/` | App/public-route tests | M + public navigation/recovery | None |
| 2 | `/login` | auth pages, hooks, API | M + protected redirects | None |
| 3 | `/register` | auth pages, validation, API | M + dev first/warm navigation; no submission | None |
| 4 | `/forgot-password` | auth pages/mutations | M; no recovery email delivery | None |
| 5 | `/verify-email` | auth pages/mutations | M missing-token state; no token consumption | None |
| 6 | `/reset-password` | auth pages/mutations | M synthetic-token form; no password reset | None |
| 7 | `/invitations/accept` | InvitationAcceptancePage, team mutations | M missing-token state; no acceptance | None |
| 8 | `/careers/:organizationSlug` | public-careers tests/API | M + historical FE-03 navigation chain | None |
| 9 | `/careers/:organizationSlug/jobs/:jobId` | public-careers tests/API | M job detail | None |
| 10 | `/careers/:organizationSlug/jobs/:jobId/apply` | PublicApplyPage, upload/API utilities | M populated form; no file PUT/submission | None |
| 11 | public `*` | App/route recovery tests | M + home/account recovery | None |
| 12 | `/app` | organization landing/chooser tests | M + chooser/zero-membership recovery | None |
| 13 | `/app/organizations/new` | organization onboarding tests | M form; no create | None |
| 14 | `O` | OrganizationWorkspacePage / WorkspaceDashboard | M populated dashboard | None |
| 15 | `O/team` | TeamPage, team hooks/API | M members/invitations; no invite/role/removal | None |
| 16 | `O/jobs` | JobsPage, permissions, JobForm | M + synthetic GET expiry and confirmation focus | None |
| 17 | `O/jobs/new` | CreateJobPage, JobForm validation | M form; no create | None |
| 18 | `O/jobs/:jobId` | JobDetailPage, permissions | M detail | None |
| 19 | `O/jobs/:jobId/edit` | EditJobPage, JobForm | M form; no save/conflict transaction | None |
| 20 | `O/jobs/:jobId/pipeline` | PipelineConfigurationPage / mutations | M stages; prior fixture overlay coverage | None |
| 21 | `O/jobs/:jobId/application-form` | ApplicationFormBuilderPage / mutations | M builder; no publish | None |
| 22 | `O/jobs/:jobId/scorecard` | ScorecardTemplatePage / API | M template; no publish | None |
| 23 | `O/candidates` | candidate-management / API | M list/filter controls | None |
| 24 | `O/candidates/:candidateId` | candidate-management | M profile | None |
| 25 | `O/applications/:applicationId` | candidate-management, offers, outcomes, communications, feedback | M detail/embedded sections; no recruiting writes | None |
| 26 | `O/interviews` | interviews / utility tests | M calendar/list | None |
| 27 | `O/interviews/:interviewId` | interviews, feedback | M detail; no scheduling/change | None |
| 28 | `O/interviews/:interviewId/scorecard` | MyScorecardPage, ScorecardForm | M evaluation form; no draft/submit | None |
| 29 | `O/notifications` | notifications component/hook behavior | M inbox/preferences; no persisted mark-read | None |
| 30 | `O/talent-pools` | talent-pools pages/API | M list; no create/edit | None |
| 31 | `O/talent-pools/:talentPoolId` | talent-pools detail/member tests | M populated detail + two defect reproductions | None |
| 32 | `O/analytics` | analytics/utils tests | M filters/KPIs/tables + mobile keyboard scroll | None |
| 33 | `O/audit` | audit tests | M events/table | None |
| 34 | `/app/organizations` | organization landing/chooser | M chooser | None |
| 35 | protected `/app/*` fallback | route guard/recovery tests | M + protected return-to-workspace recovery | None |

Offers and outcomes have no standalone routes; their unit evidence lives in `features/offers/components/OfferSection.test.tsx` and `ApplicationOutcomeSection.test.tsx`, and their UI is inside application detail. Communications and scorecard feedback are also embedded workflows. No additional routes were invented to inflate coverage.

The existing five E2E tests would exercise registration/verification/login, job lifecycle, public upload/application replay, candidate/resume persistence, scorecards/interviews, communications/offers/hiring/pools, session expiry/logout, switching/invitation/RBAC/cross-tenant denial, stale revision/retry and responsive routes. They do not independently complete all password recovery, team removal/last-admin, builder publish/edit and notification preference workflows. Those remain additional live verification items even after a future five-test pass.

## 9. Accessibility findings

Used existing Chromium/Playwright and the browser accessibility tree; no new accessibility dependency was installed. No axe/pa11y engine was present in the frontend dependency inventory. These are focused structural and interaction checks, not WCAG certification.

- Fresh measurements cover 35 terminal routes at 1280 px: zero unnamed AX-tree buttons/links/textboxes/comboboxes/checkboxes/radios, zero duplicate IDs, one visible main per route, no measured horizontal document overflow and no heading-level jumps. The missing-token invitation view has an h2 and no h1: a low-severity heading consistency issue, not alone proof of a WCAG failure.
- All seven visible tables in those sampled states have captions and named, focusable scroll regions. A fresh 320 px analytics test confirms keyboard horizontal scrolling.
- Workspace and account menus open by keyboard, close with Escape and restore focus. Mobile navigation at 320/768 px contains 20 successive Tab presses and restores the trigger on Escape.
- **Job lifecycle confirmation fails focus restoration** after both mouse and keyboard menu selection. Focus ends on `BODY`, rather than the surviving job-actions button. The dialog itself contained focus. `ConfirmDialog` captures `document.activeElement` while the menu item is about to unmount and unconditionally prevents default close focus; existing unit tests only open it from a persistent button.
- Public skip navigation and a visible focus outline passed. The shared primary action measured **5.47:1** text contrast and **44 px** minimum height. This does not cover all tokens, hover/disabled/error states, overlays or text over mixed backgrounds.
- Form `Field` connects labels, descriptions and error IDs; errors use alerts. Loading components provide status/aria-busy. Notification links are semantic links with keyboard unit coverage. Actual announcement timing and reading order were not tested with a screen reader.
- The bounds scan flags 90 controls/links with an individual box dimension below 24 px. Many are inline links or native controls inside larger labels; spacing, label hit area and applicable exceptions were not fully assessed. This count is **not 90 confirmed accessibility violations**. Responsive touch-target review remains manual.

Source references: `src/features/team/components/ConfirmDialog.tsx:28,46-48`; `src/features/jobs/components/JobActions.tsx:75`; `src/features/jobs/pages/JobsPage.tsx:411`; `src/features/team/pages/InvitationAcceptancePage.tsx:55-61`; `src/shared/components/ui/{Dialog,Field,DataTableShell,button-variants}.tsx` (button variants is `.ts`).

Evidence: [35-route summary](../.verification-artifacts/release-gate/accessibility-summary.json), [raw structural results](../.verification-artifacts/release-gate/route-browser/accessibility.json), [keyboard pass/failure details](../.verification-artifacts/release-gate/keyboard-browser/results.json), [public contrast/focus checks](../.verification-artifacts/release-gate/public-browser/results.json). The 35-route data was saved before the broad harness failed; it is not a complete smoke-pass receipt.

## 10. Bundle-performance results

Exact emitted bytes below are measured from `dist`; gzip uses the same Node `gzipSync` method as the retained FE-03 JSON, so comparisons are consistent. Vite's own display figures are provided separately because its gzip estimates differ.

| Metric | FE-03 after, retained JSON | Current | Change |
| --- | ---: | ---: | ---: |
| Entry JS | 390,145 B | **391,162 B** | +1,017 B / 0.26% |
| Entry gzip, Node measurement | 118,842 B | 118,984 B | +142 B |
| Complete initial static JS | 463,373 B | **464,390 B** | +1,017 B / 0.22% |
| Initial static gzip sum, Node measurement | 143,791 B | 143,933 B | +142 B |
| Largest chunk | Entry | Entry | Same boundary |
| Largest deferred chunk | PublicApplyPage 135,339 B | PublicApplyPage **135,339 B** | Unchanged bytes |
| All JS | 863,291 B | **864,308 B** | +1,017 B / 0.12% |
| JS chunks | 51 | **51** | Unchanged |
| Lazy pages | 25 | **25** | Unchanged |
| Large-chunk warning | None | **None** | Threshold/config unchanged |

Vite reports the current entry as **391.16 kB / 120.25 kB gzip**, shared initial `apiClient` as **73.22 / 25.20 kB**, largest deferred PublicApplyPage as **135.33 / 40.43 kB**, and CSS as **52.45 / 10.62 kB**. Complete initial static JS includes the shared chunk; quoting the entry alone understates startup cost. Initial static JS excludes the additional lazy chunk fetched for the selected page.

Compared with the retained pre-FE-03 843,451-byte entry, current entry JS is about 53.6% smaller and complete initial JS about 44.9% smaller. Historical baseline sizes were read from retained evidence rather than rebuilding old source or altering the checkout.

Production module inspection confirms no one of the 25 deferred page modules is in the entry's transitive static graph. Expected eager pages are auth, foundation, 404 and organization landing. Suspense uses the existing accessible LoadingState inside the shell; the local boundary provides manual Reload page recovery and resets on pathname changes. Existing lazy-boundary tests pass for rejected imports, navigation away, pending expiry and shell/cache preservation. Historical FE-03 browser artifacts cover aborted-chunk recovery; the current extended smoke failed before a new complete receipt for that final scenario. The transient lazy-fallback timeout remains a browser stability finding.

**Deployment artifact issue:** `dist/assets/apiClient-BoTNErE5.js` contains `http://localhost:3000`, from the ignored frontend `.env` and `src/app/config/env.ts`. In a remote browser this points to that user's computer; an HTTPS deployment can also encounter mixed-content restrictions. The measurement build is useful for size review, but it must be rebuilt with the intended API origin and verified for cookie/CORS/CSRF behavior before deployment. No build setting or environment file was changed here.

These are bundle/startup observations, not measured production Core Web Vitals, API latency, large-dataset performance or mobile CPU benchmarks. Evidence: [bundle measurements/module inspection](../.verification-artifacts/release-gate/bundle.json), [FE-03 baseline](../.verification-artifacts/fe03-after.json), [production build log](../.verification-artifacts/release-gate/build.stdout.log).

## 11. Remaining issue register

| ID / classification | Finding and evidence | Release disposition |
| --- | --- | --- |
| R1 — **HIGH**, deployment artifact defect | Current `dist/assets/apiClient-BoTNErE5.js` embeds `http://localhost:3000`; `src/app/config/env.ts:43-44` reads Vite's build-time origin. Exact occurrence recorded in bundle JSON. | Do not deploy this local `dist`. Produce and verify an environment-specific build. No source redesign is required to resolve configuration. |
| R2 — **MEDIUM**, confirmed functional defect | `src/features/talent-pools/pages/TalentPoolDetailPage.tsx:26-27,77` finds a pool only in page one of `usePools`. A requested pool outside that page renders “Talent pool not found.” Source/API pagination review and fresh synthetic browser reproduction agree. | Correct in separately authorized work and add meaningful page-beyond-one coverage, or explicitly accept the product limitation before release. |
| R3 — **MEDIUM**, confirmed recovery defect | Same file, line 39 precedes error/permission branches at 41/61. Disabled no-data pool query stays pending; a denied user sees perpetual loading and no recovery. Fresh production browser: zero pool requests, visible “Loading talent pool.” | Correct guard ordering/disabled-query handling in separate work and verify denied/failed organization states. No data access bypass was demonstrated. |
| R4 — **MEDIUM**, confirmed accessibility defect | `src/features/team/components/ConfirmDialog.tsx:28,46-48` with JobsPage/JobActions menu integration. Escape leaves focus on BODY; both mouse and keyboard cases fail. | Restore focus to a surviving logical control and verify the menu-to-dialog integration, not only a standalone button harness. |
| R5 — **LOW**, heading consistency | `src/features/team/pages/InvitationAcceptancePage.tsx:55-61` uses ErrorState h2 without an h1 for a missing token. Fresh AX/DOM evidence. | Address or document as a heading convention follow-up; no certification claim. |
| R6 — **LOW**, test diagnostics | Three notification unmatched-route warnings plus React act-environment warning in current Vitest stderr. | Improve the relevant harness in separate work; do not count those unit assertions as full router integration. |
| V1 — **VERIFICATION GAP**, release-blocking gate | No authorized current database-backed run. `playwright.config.ts`, `e2e/hiring-lifecycle.spec.ts`, `e2e/responsive-ui.spec.ts`; discovery only. | Obtain separate authorization, recheck isolation, execute and retain a complete result. Current frontend security/live persistence cannot be signed off. |
| V2 — **VERIFICATION GAP**, runtime/test stability | Previous `/register` resource waterfall, later worker/backend exit; current first load 13.51 s; supplemental lazy-fallback assertion also timed out. `navigation.json`, prior trace JSON, `src/app/router/LazyRoute.tsx`. | Capture server/process/resource evidence in an approved full run and resolve reproducible instability without raising timeouts to hide it. |
| V3 — **VERIFICATION GAP**, accessibility breadth | 90 small-target candidates require context; screen readers, full contrast/state matrix, zoom/reflow, forced colors and native mobile are untested. | Perform prioritized manual checks and resolve material failures. |
| V4 — **VERIFICATION GAP**, deployment/runtime | SPA deep-link serving, hashed-asset retention, real cookies/CORS/CSRF, deployed API, browser breadth, Web Vitals and large datasets not measured. `src/app/router/LazyRoute.tsx`, `src/shared/lib/apiClient.ts`, `src/app/config/env.ts`. | Verify against the intended deployment artifact/environment. |

No confirmed authentication bypass, cross-tenant data disclosure, real secret leak or critical data-loss defect was demonstrated. That is a bounded assessment, not a finding that unexecuted scenarios are secure. V1 is a **verification gap with blocking release impact**, not a fabricated application defect. No issue is labeled BLOCKER solely to turn lack of permission into a code failure.

## 12. Safe Git checkpoint plan — not executed

Leave this checkout and its existing index intact. Do not run broad `git add`, reset, stash or a normal commit here: all frontend and backend work is already staged together.

The [checkpoint manifest](../.verification-artifacts/release-gate/checkpoint-manifest.json) lists exact paths:

- **Frontend group: 97 existing paths** — all 92 staged `hiringloop-frontend/...` paths plus `docs/frontend-fe03-route-lazy-loading-2026-10-22.md`, `docs/frontend-fe05-public-recovery-2026-10-22.md`, `docs/frontend-global-ui-repair-2026-10-21.md`, `docs/frontend-shell-responsive-repair-2026-10-21.md`, and `docs/frontend-ui-audit-2026-10-21.md`.
- **Backend demo group: five existing paths** — the four backend files and demo workflow document enumerated in section 2.
- **Assessment report: one new path** — this report, to review separately or include with frontend evidence later. Ignored machine-specific artifacts must not be force-added.

For a later authorized checkpoint, export two binary diffs against the captured HEAD/index, restricted to those explicit allowlists; verify patch path names and scan for credentials. Prepare two clean worktrees at the captured HEAD, apply the respective patches with index application there, and review each resulting staged diff. This keeps the source worktree's staged state unchanged. Only after separate authorization should those worktrees be committed or any branch integrated.

Keep frontend `package.json` and `package-lock.json` together; keep the switcher E2E locator update with the frontend shell changes. Several milestone changes share `routes.tsx`, auth tests and shared components. A single consolidated frontend checkpoint is safer than pretending each file belongs to only one milestone; a five-commit split would need hunk-level reconstruction and retesting in the clean worktree.

No export/apply/worktree/commit/stash/reset/push action was executed as part of this plan.

## 13. Outstanding manual and live verification

Before production approval:

1. Resolve R1 and address or explicitly accept R2-R4; retain focused regression evidence. Low-severity observations should be tracked with clear disposition.
2. Separately authorize the isolated database-backed run in section 5. Verify a complete five-test result and cleanup receipt; do not infer success from discovery or historical results.
3. Exercise live email/password recovery, invite token variants, team role/removal/last-admin boundaries, builder changes, notification preferences/read state and relevant viewer/interviewer/recruiter/admin combinations beyond the existing five-test coverage.
4. Verify session expiry/relogin in a long-lived browser, concurrent failures, identity changes and two distinct tenant users against real backend authorization and cookies.
5. Manually test a screen reader (labels, errors, status announcements and reading order), 200%/400% zoom and reflow, focus visibility/forced colors, all dialog variants and the flagged touch targets with label/spacing context. Review full contrast states, including errors and overlays.
6. Check Safari/Firefox and real mobile upload/file-picker/keyboard behavior. Current automated browser evidence is Chromium on this Windows host.
7. Validate the intended deployed API origin, cookies/CORS/CSRF, SPA direct links and refreshes, stale-client asset retention/chunk recovery, realistic data volumes and production performance.

## 14. Final frontend readiness verdict

**NOT READY.** The requested frontend command gates are green, including the exact 417-test baseline and a fresh zero-vulnerability audit. Bundle splitting remains effective. Those positives support implementation quality, but they do not close the release gate: a production artifact is not configured for deployment, confirmed functional/accessibility defects remain, current complete browser smoke is not green, and live auth/tenant/recruiting workflows have not been authorized or independently verified for this staged release.

No production deployment, Git checkpoint or database-mutating test was performed. All existing uncommitted application work and staging were preserved. This report ends the assessment; remediation and E2E execution require their separately scoped authorization.
