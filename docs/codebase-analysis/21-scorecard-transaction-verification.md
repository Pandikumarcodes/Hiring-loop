# 21 - Scorecard transaction integrity verification

Verification date: 2026-10-17. Phase 3C is limited to scorecard transaction ordering, rollback, concurrency, tenant scoping, and notification transaction boundaries.

## 1. Original defect and root cause

E06 was identified in the static/runtime analysis. `scorecard-repository.js` updated a draft's recommendation/comment and revision, deleted omitted responses, and upserted submitted responses inside a Prisma transaction. Criterion/type validation could then return `{ outcome: 'invalid_response' }` normally. The transaction therefore committed; `scorecard-use-cases.js` translated the result into `VALIDATION_ERROR` only after commit. The submission path also returned `incomplete` normally after the draft save, so invalid submissions could silently persist partial drafts.

## 2. Reproduction evidence

The pre-fix regression test used the verified local disposable PostgreSQL database `hiringloop_test`, with all 17 migrations applied. It created a valid draft (revision 1, valid response and original overall fields), then saved a text value against a rating criterion. The API-facing call rejected with `VALIDATION_ERROR`, but the first persisted-state assertion showed revision 2 rather than 1. The subsequent assertions in that failed pre-fix test did not execute; source ordering confirms that overall fields had been updated and the old response deleted before the invalid response type was detected. Together with the normally resolved transaction and observed committed revision change, this established durable partial commit, not merely an adapter ordering risk.

The regression initially failed exactly on `after.revision === before.revision` (received 2, expected 1). After the repair it passes, and the card fields and response rows match the pre-operation snapshot.

## 3. Transaction boundary before and after

| Operation | Before | After |
| --- | --- | --- |
| Draft save with invalid criterion/type | Writes completed; normal outcome committed; use case threw afterward | Rejection raises an internal rollback signal; transaction aborts; repository translates to the same outcome after rollback; use case returns the same validation error |
| Incomplete submission | Draft save committed, then `incomplete` returned normally | Incomplete outcome aborts the full submission transaction; no new or changed draft remains |
| Successful submission | Draft responses, status, timestamp, audit were transactional | Same atomic transaction; submitted immutability and revision guard preserved |
| Notification | Attempted after repository transaction; failures logged/swallowed | Still post-commit and outside the transaction; no network/provider work moved into the transaction |

`outcomeTransaction` catches only the repository's private rollback marker; database and audit exceptions still propagate and cause Prisma rollback. Successful template version history is unchanged. Existing tenant-scoped queries and database relationship guards remain in place.

## 4. Files changed

- `hiringloop-backend/src/modules/scorecards/repositories/scorecard-repository.js` — rollback business rejection outcomes rather than returning them from a mutating transaction; translate after rollback.
- `hiringloop-backend/tests/integration/database/phase18-scorecard-audit.test.js` — real PostgreSQL regression, incomplete submission rollback, expected-revision race, duplicate submission rejection, and cross-tenant access rejection.
- `docs/codebase-analysis/10-end-to-end-feature-flows.md` — current scorecard error and transaction behavior.
- `docs/codebase-analysis/15-technical-debt.md` — E06 resolution, reproduction and residual risk.
- `docs/codebase-analysis/16-improvement-roadmap.md` — E06 complete; E09/E13 remain.
- `docs/codebase-analysis/19-runtime-verification.md` — Phase 3C runtime results.
- `docs/codebase-analysis/21-scorecard-transaction-verification.md` — this report.

## 5. Lifecycle and concurrency findings

- Template creation/versioning and publication stay in transactional repository operations. Published versions/criteria are protected by database immutability guards. New scorecards pin the published version for the interview job.
- Interview assignment is required for own-card reads and mutations. Repository reads scope by organization, interview, and participant user. Manager feedback routes retain their existing role checks; own-scorecard HTTP authorization remains route/middleware-controlled.
- Existing scorecards use conditional `updateMany` on organization, `DRAFT` status, and expected revision. A deterministic `Promise.all` race with the same expected revision produced one success and one `CONFLICT`; the final revision advanced once.
- Duplicate submission is rejected as a conflict because submitted scorecards are immutable. The database integration verifies no duplicate mutation.
- An incomplete first submission leaves no scorecard row. A forced audit exception after intermediate scorecard writes leaves neither the scorecard nor audit event committed.
- Cross-tenant submission using a foreign organization/user against another tenant's interview returns `NOT_FOUND` and cannot mutate the resource. Existing HTTP authorization tests retain denial behavior for unauthorized roles.
- Interview participant removal is guarded by Phase 3B replacement logic. Phase 3F added a deterministic row-lock interleaving: when roster replacement acquires the interview lock first, the scorecard transaction waits and then returns `NOT_FOUND` for the removed interviewer without persisting a scorecard. Scorecard save/submit now takes a tenant-scoped `FOR SHARE` lock on the interview before reading the assigned participant, serializing those writes with roster replacement's `FOR UPDATE` lock. The reverse ordering (scorecard commits first, then removal) remains protected by the replacement's scorecard-history check.
- `SCORECARD_SUBMITTED` notification creation remains best-effort post-commit. Notification failure does not roll back a successful submission; there is no durable outbox/retry guarantee.

## 6. Regression tests

Added to `phase18-scorecard-audit.test.js`:

- Wrong-type response against a persisted draft returns validation error and preserves recommendation, comment, revision, and prior responses.
- Incomplete first submission returns validation error and leaves no scorecard row.
- Concurrent updates with the same expected revision permit one winner and return a conflict for the other.
- Duplicate submission is rejected after a successful submit.
- Cross-tenant submission is rejected as not found.
- Existing forced audit failure verifies transaction rollback after scorecard writes; existing authorization/audit checks continue to cover rejected access and absence of audit side effects.
- Existing successful submission test verifies audit metadata remains safe; the backend non-database notification tests continue to cover submission notifications.

## 7. Verification command results

All database checks used local `hiringloop_test`. The first full-suite attempt on a contaminated test DB failed with a fixed-slug collision and timeout errors. The explicitly guarded reset script confirmed and reset only `hiringloop_test`; all 17 migrations were reapplied before the final complete run.

| Check | Result |
| --- | --- |
| Pre-fix PostgreSQL reproduction | CONFIRMED defect: invalid response changed revision/fields and deleted prior response before returning validation error |
| Focused scorecard PostgreSQL integration | PASS — 1 file, 7 tests |
| Complete database integration suite (`npm.cmd run test:db -- --maxWorkers=1`) | PASS — 23 files, 117 tests |
| Backend non-database suite (`npm.cmd run test`) | PASS — 42 files, 262 tests |
| Backend lint (`npm.cmd run lint`) | PASS |
| Backend formatting (`npm.cmd run format:check`) | PASS |
| Prisma validation (`npm.cmd run prisma:validate`) | PASS |
| Changed repository syntax (`node.exe --check ...scorecard-repository.js`) | PASS |
| Focused frontend scorecard tests | PASS — 4 files, 16 tests |
| Frontend typecheck/build | Not run — no frontend files changed |

The first contaminated full-suite run is superseded by the clean, fully migrated run above. Non-database tests reported no skips; the final database run reported no skips. No requested backend verification remained blocked.

## 8. Remaining limitations

- The interview-row lock serializes scorecard writes with roster replacement; the deterministic removal-wins ordering is covered. A dedicated barrier test for scorecard-wins ordering, membership deletion racing scheduling, and cross-organization lock independence remains outside the focused tests. Notification creation is still post-commit best effort.
- See [24-interview-concurrency-verification.md](24-interview-concurrency-verification.md) for Phase 3F lock ordering and full-suite results.
- Notification delivery is best-effort after commit, not durable or retried through an outbox.
- Concurrency was validated with a same-revision PostgreSQL race, not production load/deadlock testing.
- Frontend verification was unnecessary because no frontend source changed. No staging, commit, push, or deployment was performed.
