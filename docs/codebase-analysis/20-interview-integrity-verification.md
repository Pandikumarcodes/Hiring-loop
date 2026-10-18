# 20 - Interview scheduling integrity verification

Verification date: 2026-10-17. Phase 3B is limited to interview participant discovery, interview field projection, and participant replacement integrity.

## Verified root causes and repairs

| Finding | Root cause | Repair | Before / after |
| --- | --- | --- | --- |
| Recruiter participant picker denial | `InterviewFormDialog` called the team member-management endpoint. Recruiters can create interviews but correctly lack `member:read`. | Added `GET /organizations/:organizationId/interviews/participants`, guarded by new `interview:participant-read`, granted only to Admin and Recruiter. The form now calls the interview-specific endpoint. | Recruiter received 403 while opening the picker. Authorized recruiting users receive only memberships in their resolved organization; the team endpoint remains Admin-only. |
| Notification field omission | The internal interview projection omitted `organizationId` and `participants[].userId`, although notification creation consumed both. | Added both fields to the internal repository projection. The public DTO remains deliberately unchanged. | Notification writes could fail after an otherwise successful mutation. Notifications receive tenant and recipient IDs. |
| Participant replacement | Replacement deleted every participant then inserted records without required `interviewId`. It also discarded stable participant IDs and could collide with restrictive scorecard references. | Replacement now diffs by user ID, retains unchanged rows, inserts only additions with `interviewId`, and rejects removal of a participant with a scorecard before writes. | Any replacement insert could fail; scorecard-linked rows produced a database failure. Valid changes are atomic and preserve unchanged participant history. |
| Stale membership and concurrent edits | Membership was checked before the write transaction; concurrent edits could diff against the same stale participant roster. | The mutation transaction locks the interview row, rechecks and key-shares selected memberships, then takes deterministic tenant/participant advisory locks before conflict checks. | Removed memberships are rejected before writes. Concurrent replacements reread the committed roster after acquiring the interview lock, so the final roster matches one completed request. |

## Interview field trace

| Fields | Frontend | Request validation / persistence | Response / display |
| --- | --- | --- | --- |
| Title, format, start, duration, timezone, participants | Form collects these; create submits all through `scheduleInterview`; edit submits title, format and participant IDs; reschedule submits start, duration and timezone. | Strict schedule/update/reschedule schemas accept these shapes. Use cases derive end time and repository persists fields and participant relations. | Internal projection and DTO return the fields; detail displays title, format, time, duration and interviewer emails. |
| Meeting URL and location | Form submits URL for VIDEO and location for ONSITE; edit submits the selected format field and nullable value. | Nullable URL/location schemas accept null; repository create/update persists both. | Projection and DTO return both; detail displays safe HTTP(S) meeting links and location. |
| Notification tenant and recipient IDs | Not user-entered and not part of public DTO. | Internal repository projection now includes `organizationId` and participant `userId`, consumed by notification creation. | IDs remain excluded from the public interview DTO beyond the participant's user ID/email pair already required by the client. |

No form-collected scheduling field was found to be dropped on create/edit/reschedule. The confirmed omission was internal: repository projection fields required by post-commit notification creation.

## Changed implementation

- `hiringloop-backend/src/authorization/permissions.js`
- `hiringloop-backend/src/modules/interviews/{routes,controllers,use-cases,repositories,interview-module}.js`
- `hiringloop-frontend/src/features/interviews/{api,hooks,types,components}/...`
- `hiringloop-backend/tests/modules/interviews/{interview-use-cases.test.js,interview-http.test.js}`
- `hiringloop-backend/tests/integration/database/interview-scheduling-foundation.test.js`
- `docs/codebase-analysis/{07-api-inventory,10-end-to-end-feature-flows,15-technical-debt,16-improvement-roadmap,19-runtime-verification}.md`
- `docs/codebase-analysis/20-interview-integrity-verification.md`

The participant directory response intentionally returns only each tenant member's email, role, and user ID needed for selection. It does not change invitation, role-change, removal, or the existing `/members` access policy.

## Test evidence

| Check | Result |
| --- | --- |
| Focused backend interview/notification unit and HTTP tests | PASS — 3 files, 20 tests |
| Backend syntax checks, lint, formatting | PASS — changed interview modules parse; Oxlint and Prettier checks pass |
| Backend non-database suite | PASS — 42 files, 262 tests |
| Frontend typecheck | PASS |
| Frontend lint | PASS with one pre-existing `PublicApplyPage.tsx` ref warning |
| Focused frontend interview tests | PASS — 2 files, 6 tests |
| Frontend formatting and production build | PASS — build completed; Vite reported the existing >500 kB chunk-size advisory |
| Frontend full test suite | PASS — 55 files, 285 tests (`--maxWorkers=1`) |
| Database migration target safety | PASS — migration script verified `hiringloop_test` on localhost |
| Focused PostgreSQL interview scheduling tests | PASS — 1 file, 4 tests, including tenant discovery, create/edit persistence, stale and cross-tenant invalid replacement without partial changes, concurrent replacements, and concurrent identical bookings |
| Focused PostgreSQL interview audit tests | PASS — 1 file, 3 tests |
| Full PostgreSQL database integration suite | PASS — 23 files, 114 tests (`--maxWorkers=1`) against verified local `hiringloop_test` |

Blocked checks: none of the requested checks remained blocked after serial test execution. The earlier parallel database attempt was superseded by the complete serial suite result above.

## Residual risks

- Simultaneous booking and concurrent replacement tests passed against the verified disposable PostgreSQL database. Broader production load and deadlock behavior remain untested.
- Removing a scored participant is explicitly rejected to preserve scorecard history. A future product decision could define archival/reassignment behavior, but it is out of Phase 3B scope.
- The participant list is a point-in-time discovery response. The transactional membership recheck remains authoritative at schedule/update time.

## Status of prior analysis findings

E01, E02, E03, and E07 from `15-technical-debt.md` are repaired by this phase. E07's transaction-scoped advisory locks passed direct concurrent-booking and concurrent-replacement PostgreSQL tests. A dedicated scored-participant removal database test and broader contention/load checks remain residual risks.
