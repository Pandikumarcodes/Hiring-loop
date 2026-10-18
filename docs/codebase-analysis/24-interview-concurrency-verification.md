# 24 - Interview concurrency verification

Verification date: 2026-10-17. Scope is Phase 3F interview scheduling, participant replacement, scorecard relationship races and PostgreSQL lock behavior. All database checks used the local disposable `hiringloop_test` database; its target was confirmed with the guarded migration-status command before testing. No schema migration or reset was run for this phase.

## 1. Existing concurrency architecture

Primary implementation:

- `hiringloop-backend/src/modules/interviews/repositories/interview-repository.js` — schedule, participant replacement, reschedule, overlap detection and locks.
- `hiringloop-backend/src/modules/interviews/use-cases/interview-use-cases.js` — authorization, request validation and repository outcomes.
- `hiringloop-backend/src/modules/scorecards/repositories/scorecard-repository.js` — assignment-scoped draft save and submission transactions.
- `hiringloop-backend/prisma/schema.prisma` and `hiringloop-backend/prisma/migrations/20260910120000_interview_scheduling_foundation/migration.sql` — participant uniqueness, foreign keys and interview data model.
- `hiringloop-backend/prisma/migrations/20260911120000_scorecard_foundation/migration.sql` — scorecard-participant uniqueness and referential constraints.

The Prisma transaction calls do not specify an isolation level, so PostgreSQL's configured default (`READ COMMITTED` in the verified test database) applies. The overlap check treats scheduled intervals as overlapping when `start < otherEnd && end > otherStart`, scopes by organization, and considers only `SCHEDULED` interviews.

Observed lock order:

1. Create: organization membership rows `FOR KEY SHARE` (input user order), then tenant/user advisory transaction locks in sorted user-ID order, then overlap query, inserts and audit write.
2. Participant replacement: tenant-scoped interview row `FOR UPDATE`; requested membership rows `FOR KEY SHARE`; sorted advisory locks for old and new participants; overlap check; scorecard-history removal check; participant delete/create and interview update; audit write.
3. Reschedule: tenant-scoped interview `FOR UPDATE`; read current roster; sorted participant advisory locks; overlap check; time update and audit write.
4. Scorecard save/submit (Phase 3F change): tenant-scoped interview row `FOR SHARE`; assignment-scoped participant/card read; scorecard and response writes; submission audit in the same transaction. The notification remains best-effort after commit, outside the transaction.

Sorted participant lock acquisition prevents opposing roster changes from taking the same advisory-lock set in reverse order. Advisory lock keys are `hashtextextended("<organizationId>:<userId>", 0)`, preserving tenant scoping. The database enforces unique `(interviewId,userId)` participants and unique scorecard per participant. No exclusion constraint enforces schedule overlap independently of repository locking.

## 2. Established race window and repair

Participant replacement already serialized against schedule/reschedule and refused to remove participants with existing scorecards. But scorecard creation/submission did not take a lock conflicting with replacement. The source trace therefore established a race window at the assignment-read/participant-delete boundary. Database foreign keys protect referential integrity, but do not provide a stable application-level outcome when a concurrent write and removal meet. The test suite did not establish a pre-fix partial commit or orphan, and this report does not claim one.

The deterministic integration interleaving holds the interview row, queues a roster replacement (`FOR UPDATE`), then queues scorecard submission (`FOR SHARE`) for the departing interviewer. After releasing the holder, replacement commits first. Submission then re-reads the assignment and returns `NOT_FOUND`; no scorecard is persisted. This verifies the post-repair outcome. A pre-repair run of this exact barrier with the authenticated user ID was not retained as conclusive evidence, so the original race outcome is established by lock-path analysis rather than claimed as a reproduced data-corruption defect.

Minimal repair: scorecard repository `saveMy` now takes a tenant-scoped `FOR SHARE` lock on the interview before reading the participant. It is compatible with simultaneous scorecard writes, but conflicts with participant replacement's `FOR UPDATE`. This gives both operations a common lock order without changing schema, adding infrastructure, or placing external work in the transaction. If a scorecard commits first, replacement's existing scorecard-history check prevents removal.

One test-harness false alarm was traced to omitting `userId` in a direct use-case invocation; the Prisma participant filter was then omitted and the scorecard was attributed to the replacement recruiter. The test now supplies the authenticated user ID as the HTTP controller does. The scorecard lock itself was retained only after the corrected barrier test passed.

## 3. Tested invariants and outcomes

| Scenario / invariant | Test evidence | Outcome |
| --- | --- | --- |
| Two overlapping interviews for one interviewer cannot both commit | Existing PostgreSQL concurrent booking test; participant advisory-lock implementation | One success, one `INTERVIEW_SCHEDULE_CONFLICT` |
| Two reschedules cannot enter the same overlapping slot | New barrier holds participant advisory lock until both reschedules are queued | One success, one conflict |
| Concurrent participant replacements are atomic and leave one complete roster | Existing concurrent replacement test; interview row lock serializes writes | Final roster is one complete requested set; no mixed/duplicate state |
| Removed participant cannot submit a new scorecard after replacement wins | New interview-row barrier interleaving in `phase18-scorecard-audit.test.js` | Replacement succeeds; submission returns `NOT_FOUND`; no scorecard row |
| Invalid participant replacement leaves prior state unchanged | Existing integration test | Roster/title remain unchanged |
| Failed scorecard audit write rolls back scorecard submission | Existing forced-audit-failure PostgreSQL test | No scorecard or audit write remains |
| Stale membership replacement rejected | Existing stale-member integration test | Invalid participant outcome; no replacement write |
| Different-organization contention, membership deletion exactly concurrent with schedule, scorecard-wins ordering, and opposing adversarial lock cycles | Not covered by a dedicated barrier in this phase | Untested; no claim of exhaustive race elimination |

No deadlock reproduced in the deterministic schedule/reschedule lock contention tests. The reversed participant lock set behavior is supported by the stable sort in code but has not been stress-tested under arbitrary multi-session load. Transaction retries are not implemented.

## 4. Files changed

- `hiringloop-backend/src/modules/scorecards/repositories/scorecard-repository.js` — shared interview lock before scorecard assignment read.
- `hiringloop-backend/tests/integration/database/phase18-scorecard-audit.test.js` — deterministic participant-removal/scorecard-submission interleaving, authenticated user fixture.
- `hiringloop-backend/tests/integration/database/interview-scheduling-foundation.test.js` — deterministic simultaneous reschedule barrier case.
- `docs/codebase-analysis/21-scorecard-transaction-verification.md` — superseded residual gap updated.
- `docs/codebase-analysis/15-technical-debt.md`, `docs/codebase-analysis/19-runtime-verification.md` — Phase 3F status and residuals.
- `docs/codebase-analysis/24-interview-concurrency-verification.md` — this report.

## 5. Verification results

| Check | Result |
| --- | --- |
| Focused DB tests: interview scheduling + scorecard audit | PASS — 2 files, 13 tests |
| Complete serial DB suite (`npm.cmd run test:db -- --maxWorkers=1`) | INCOMPLETE — 22 files passed, 1 file failed; 120 passed tests, 1 failed test. The failure was the existing unrelated concurrent member remove/demote assertion in `member-management.test.js`. |
| Isolated rerun of the failing member remove/demote case | PASS — 1 passed, 7 skipped |
| Backend non-database suite (`npm.cmd test`) | PASS — 43 files, 273 tests |
| Backend lint (`npm.cmd run lint`) | PASS |
| Backend formatting (`npm.cmd run format:check`) | PASS |
| Prisma validation (`npm.cmd run prisma:validate`) | PASS |
| `node.exe --check` for changed repository and integration test files | PASS |
| Frontend tests/typecheck/build | Not run — no frontend source changed |

The full DB suite was not rerun after the isolated flaky-case pass; therefore a fully green complete integration-suite result is not claimed. During test development, an initial barrier implementation selected PostgreSQL's `void` advisory-lock result through Prisma and timed out with a deserialization error. The helper was corrected to return an integer; subsequent focused tests passed. This harness error was not an application-code failure.

## 6. Untested scenarios and residual risks

- A dedicated interleaving for membership deletion versus an in-flight schedule was not added. Membership is revalidated under `FOR KEY SHARE`, while member removal takes an organization lock and deletes the membership; ordering behavior should receive an explicit barrier test if that workflow changes.
- The reverse scorecard-wins ordering is reasoned from the existing replacement history check but not separately forced by a barrier test.
- The Phase 3F focused suite does not deterministically test two simultaneous participant replacements under a held interview-row lock; the existing Promise-all integration case verifies serialized final-state integrity.
- Explicit operations in two different organizations, pathological lock cycles, database failover, and sustained load were not tested. Advisory lock hashes have the ordinary theoretical hash-collision possibility.
- No database constraint independently excludes overlapping schedule ranges; correctness depends on all schedule-affecting writes retaining the same tenant/participant advisory-lock protocol.
- Finite tests cannot prove every race absent. Production PostgreSQL version/settings, query cancellation, lock timeouts, retry policy and operational observability were not evaluated.

No staging, commit, push or deployment was performed.
