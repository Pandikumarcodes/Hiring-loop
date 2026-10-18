# 28 - Browser E2E verification

Verification date: 2026-10-18. Phase 4C only. The existing uncommitted Phase 3A–4B worktree was preserved. No production, staging, development database, real email service, real object storage, deployment, commit, push, or migration/reset was used.

## Test architecture

Playwright `1.64.1` is installed as a frontend development dependency. [playwright.config.ts](../../hiringloop-frontend/playwright.config.ts) starts the Vite UI on loopback `127.0.0.1:4173` and the purpose-built [E2E launcher](../../hiringloop-backend/scripts/e2e-server.js) on `127.0.0.1:4700`; fake direct-upload storage listens only on `127.0.0.1:4701`.

The launcher asserts `HIRINGLOOP_E2E=1`, a UUID run ID, a high-entropy control token, the loopback `hiringloop_test` URL, `public` schema, and the Phase 4B migration before creating data. It removes real email/storage/OIDC configuration before importing the application. It composes the real Express routes, Prisma repositories, validation, authorization, sessions, CSRF and rate limits with an in-memory mailbox and capability-based in-memory object storage. The browser fixture blocks all non-loopback requests.

Each run owns UUID-suffixed synthetic email accounts and `E2E <run-id>` organizations. The protected cleanup endpoint refuses a fixture crossing its run namespace, then deletes only its owned rows. It uses transaction-local `session_replication_role = replica` solely for cleanup of immutable history/audit rows; no business-flow write bypasses database controls. Failed tests retain trace, screenshot and video under ignored `hiringloop-frontend/test-results/<run-id>/`.

Run locally from `hiringloop-frontend` with `npm.cmd run test:e2e`. The Windows script sets `PLAYWRIGHT_BROWSERS_PATH=0`, using the workspace-local Chromium installation rather than a mutable user cache. `npm.cmd run test:e2e:headed` is available for diagnosis.

## Dependencies and configuration changes

- Added pinned `@playwright/test@1.64.1` and Chromium.
- Added Playwright config, serial Chromium project, automatic local web servers, retained failure artifacts, JSON/HTML reporting, global cleanup, and Vitest exclusion for `e2e/**`.
- Added `createApp({ apiRouter })` to inject the E2E route composition without changing normal production routing.
- Added ignored Playwright report/result output.

## Browser scenarios and execution

Final execution: `npm.cmd run test:e2e` from `hiringloop-frontend`.

| Scenario | Result | Evidence |
| --- | --- | --- |
| Hiring lifecycle | PASS, 85.5 s | Registration/verification/login, organization, invalid and valid job draft, edit/open/public job, actual browser direct resume PUT, idempotent application replay, resume review, scorecard template/draft/submission, interview scheduling/conflict/edit/reschedule, communication template/send/history, offer draft/edit/revision/send/accept/hire, talent-pool add/remove |
| Authentication | PASS, 21.3 s | Protected route/API rejection, invalid login, logout, real session expiry and redirect |
| Organization and tenant authorization | PASS, 25.9 s | Workspace switch, invitation acceptance, interviewer job-create denial, cross-tenant 404 |
| Failure feedback | PASS, 23.6 s | Real stale job revision 409 and UI recovery; intercepted 503 and retry feedback |
| Total | PASS: 4 tests, 0 failed, 0 skipped; 168.0 s | Final result JSON in ignored test output |

All browser requests used the local frontend and actual backend endpoints. The public application performed an actual browser PUT to fake isolated storage; the persisted application and resume were then read through the recruiter UI. The fake mailbox verified verification, invitation, communication and offer messages without provider calls. E2E control readiness reports `database: hiringloop_test`, `fakeProviders: true`; cleanup completed at run end.

## Defects found and corrected

1. Scorecard draft/save APIs sent nullable read-model text values as JSON `null`, while the strict backend write schema accepts clearable strings. A real browser save returned `400 VALIDATION_ERROR`. The scorecard client now serializes optional text as `''`, preserving explicit nullable ratings/recommendations; the editor now renders save/publish failure feedback. Focused API regression tests pass.
2. Talent-pool membership mutation forwarded UI-only `poolId` in its strict request body. Trace evidence captured `400 VALIDATION_ERROR`, `Unrecognized key: "poolId"`. The client now separates the path parameter from the membership body; a focused API test and final lifecycle browser run pass.

Early exploratory browser runs also recorded selector timing/name errors (account menu logout, nested communication dialogs, dialog button casing, and form render timing). Those were harness corrections, not application defects. The first resumed run was blocked before test execution because a user-cache Chromium executable had been removed; workspace-local browser installation resolves that environmental failure. Failure artifacts remain ignored for diagnosis; the final run has no failure artifacts.

## Verification completed

| Check | Result |
| --- | --- |
| Focused scorecard/talent-pool API tests | PASS: 2 files / 4 tests |
| Frontend typecheck | PASS |
| Frontend lint | PASS with existing `PublicApplyPage.tsx` ref-during-render warning |
| Frontend formatting | PASS |
| Frontend build | PASS; existing >500 kB chunk advisory |
| Prisma validation | PASS |
| Playwright Chromium suite | PASS: 4 / 4, no skipped |

Phase 4B previously completed the database and backend regression gates against the same verified `hiringloop_test`: serial PostgreSQL suite 24 files / 137 tests, backend non-database 43 files / 274 tests, API integration 8 files / 40 tests, syntax 251 files, lint, formatting and `git diff --check`. This phase did not rerun those long backend/DB suites after the two frontend-only serialization fixes; that remains the next full repository gate.

## Limitations and next steps

The local fake storage covers signed upload/head/prefix behavior but not a real provider's signed download semantics. Browser tests are serial to preserve deterministic shared local database state; they do not measure load, accessibility beyond role-based selectors, production proxy/CSP, Google OIDC, real email delivery, S3 compatibility, or cross-browser rendering. The test database is reusable rather than created per worker, so the strict launcher/namespace/cleanup guard is material and must remain intact.

Recommended next steps are to add the E2E command to CI with a disposable PostgreSQL service, run the complete backend and DB gates after this frontend correction, and add provider-contract tests in a separately authorized environment.
