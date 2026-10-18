# 26 - Offer send concurrency and HTTP error integrity

Verification date: 2026-10-18. Phase 4A addresses E18 only. Existing remediation changes in the dirty worktree were preserved. Tests use the verified disposable local `hiringloop_test` database and fake email delivery. No real provider request, migration, reset, staging, commit, push or deployment was performed.

## 1. Confirmed root cause

`prepareSend` performed a check-then-write transaction without locking the parent offer. Under PostgreSQL `READ COMMITTED`, two requests with distinct idempotency keys could both read `DRAFT`, revision 1 and `issuedAt = NULL`. Each created a different communication. Both then updated the same version's `issuedAt`. Once the winner committed, the losing UPDATE encountered the committed issued version and the `OfferVersion_immutable` trigger raised `P0001: issued offer versions are immutable`.

The installed Prisma 7.10 adapter reported **`PrismaClientKnownRequestError`, code `P2039`**, with `meta.driverAdapterError.cause.code = P0001`. This is a trigger exception, not a unique collision (`P2002`) or Prisma write conflict (`P2034`). The use case recovered only unique collisions; the raw trigger exception reached the general error handler, correctly serialized there as `500 INTERNAL_ERROR`. The defect was the missing send serialization before reading/checking state. Converting every trigger/database failure to 409 would conceal other failures.

The losing transaction rolled back its communication. It never reached post-commit dispatch. The captured failure retained one communication, one issued version, offer `SENT` revision 2 and one fake provider call. There is no evidence of duplicate delivery in this reproduction.

## 2. Complete request and transaction trace

1. `POST /api/v1/organizations/:organizationId/offers/:offerId/send` is mounted through the v1 organization routes. Request correlation assigns a server-owned request ID.
2. `authenticateSession` hashes the session cookie, loads the session identity, rejects revoked/expired sessions, and establishes `request.auth`. Cookie secrets are never included in test evidence.
3. Global origin validation runs before route handling; route CSRF middleware checks the session-bound mutation token. Tenant middleware resolves membership for the authenticated user and route organization; absent membership is concealed as 404.
4. `requirePermission(OFFER_SEND)` permits Admin and Recruiter and denies Hiring Manager/Interviewer. Zod validates UUID route identifiers and a strict body containing a positive `expectedRevision` and UUID `idempotencyKey`.
5. `offer-controller.js` derives organization, offer, actor and request identity from validated/authenticated context. `send` first reads the tenant-scoped offer and computes the existing version/revision/key payload hash.
6. The repaired repository starts an interactive Prisma transaction and acquires `SELECT ... FROM "Offer" WHERE id = ... AND organizationId = ... FOR UPDATE`. Missing locked rows return `missing`, translated to `404 OFFER_NOT_FOUND`.
7. After acquiring the lock, the transaction rereads the offer/current version/candidate and checks the existing tenant/application/actor/key communication first. A matching existing row is returned for replay; mismatched hashes become `409 COMMUNICATION_IDEMPOTENCY_CONFLICT` in the use case.
8. New sends require the expected **parent Offer revision**, status `DRAFT` or `SENT`, an existing unissued current version, and candidate email. An invalid lifecycle/revision returns `409 OFFER_INVALID_TRANSITION`; absent email returns `409 OFFER_RECIPIENT_UNAVAILABLE`. No send writes precede these checks.
9. The transaction inserts one `PENDING` communication linked to the current offer version, sets that version's `issuedAt`, changes the offer to `SENT`, sets `sentAt`, increments its revision once and appends `OFFER_SENT` audit metadata. Any database/audit error rolls back all these writes.
10. Only after the transaction resolves/commits does the use case call `dispatchPersisted`. The fake provider test independently reads the committed offer, pending communication and audit inside the provider callback, proving visibility outside the preparation transaction.
11. Dispatch loads a tenant/application-scoped pending communication. Provider acceptance is followed by a separate scoped `SENT` update. Explicit rejection/known non-transmission records `FAILED` and attempts a failure notification; ambiguity remains `PENDING`. A database failure after acceptance propagates and leaves `PENDING`.
12. A replay of `SENT`/`PENDING` never dispatches. A `FAILED` replay must win an atomic `FAILED -> PENDING` update before dispatch. Send responses are `201` for accepted new/claimed delivery, `200` for confirmed replay, `202` for pending/unconfirmed delivery, or `502 EMAIL_DELIVERY_FAILED` for definitive provider failure. Application errors preserve status/code/request ID through the controller and error handler; unexpected errors stay generic 500.

`createRevision` already uses the same tenant-scoped parent row lock. Conditional lifecycle transitions update that parent and recheck expected revision/status at the database write. Draft terms use the separate OfferVersion revision and an `issuedAt: null` predicate. The repair preserves these lifecycle checks and the database immutability trigger. No provider call occurs inside a database transaction.

The send unique-collision fallback now recognizes only `Communication_idempotency_key` (named target, adapter constraint index, or the exact four-field target). Other uniqueness/transaction/trigger errors propagate. This preserves recovery if another communication path races for the shared key without hiding an unrelated unique failure merely because a same-key row exists.

## 3. Deterministic reproduction and ordering

The new `phase4a-offer-send-http.test.js` uses authenticated Supertest requests, real PostgreSQL transactions, generated synthetic identities/keys and a spy that replaces `sendCandidateEmail` completely. Its fixture verifies database/schema identity; the guarded migration status command separately confirms localhost and all 17 applied migrations.

An independent transaction holds `FOR NO KEY UPDATE` locks on the offer and version. Two HTTP requests are started. The harness polls `pg_stat_activity` and the recursive `pg_blocking_pids` dependency chain until both send transactions are demonstrably blocked. It then releases the blocker and awaits both requests. `setImmediate` yields between catalog observations; no sleep or timeout increase determines ordering. The same blocker works before and after repair:

| Boundary | Before repair | After repair |
| --- | --- | --- |
| Waiting requests | Both passed the unissued-state read and attempt version UPDATE | Both queue before the parent offer state read |
| First commit | One communication, issue version, `SENT`, revision 2, audit | Same |
| Distinct-key loser | Version UPDATE triggers P0001; transaction rollback; HTTP 500 | Acquires parent lock, reads committed revision/issued state, returns invalid; HTTP 409 |
| Same-key loser | Unique-index fallback may recover | Reads existing communication under parent lock; returns 200/202 without dispatch |
| Provider ordering | Winner dispatches after commit | Winner dispatches after commit; loser can finish while provider is pending |

Captured pre-fix identities (synthetic and disposable):

- Offer: `01a14d8f-c613-707a-86f6-9e83820cae6a`; actor: `01a14d8f-c0a8-745a-b029-f32790edbb18`.
- Keys: `01a14d8f-c643-7319-8904-f0febb85002b` and `01a14d8f-c643-7319-8904-f4c4e6e517e2`.
- Winner request: `d74ac196-23cb-4fe2-87d7-1c249c297767`, HTTP 201.
- Loser request: `c6c781de-4d1e-4a42-aca4-3743954e26c8`, HTTP 500 `INTERNAL_ERROR`, Prisma P2039 / PostgreSQL P0001.
- Final state: `SENT`, revision 2, one communication, one fake provider call.

The test emits only synthetic IDs, keys, statuses, database error classification and counts; no session/CSRF token, recipient address, message contents or credentials are logged.

## 4. Regression evidence

The focused HTTP suite contains ten tests:

| Case | HTTP assertions | Persisted/provider assertions |
| --- | --- | --- |
| Single valid send | 201 | Commit visible before provider; one issued version/communication/audit/call, revision 2 |
| Competing distinct keys | One 201, one 409 with `OFFER_INVALID_TRANSITION` and request ID | Controlled lock contention, no transaction exception, one issuance/communication/audit/call |
| Competing duplicate key plus replay/collision | One 201, replay 200/202; subsequent 200; changed-revision reuse 409 | Same communication ID; no redispatch |
| Stale parent revision after revision creation | 409 | Entire persisted snapshot unchanged; no communication/audit/provider call |
| Database failure at audit boundary | Generic 500, then same-key valid retry 201 | Real PostgreSQL division-by-zero injected after intermediate writes; full snapshot rollback; zero provider calls before retry |
| Provider rejection and concurrent failed retries | Initial 502; one successful retry and one replay | Initially FAILED with safe rejection category; retry uses same row/version, one extra provider attempt, offer/audit unchanged |
| Ambiguous provider outcome | 202; same-key 202; distinct-key 409 | Remains PENDING; unchanged snapshot and one provider call |
| Provider held after commit | Same-key 202 and distinct-key 409 complete before release; winner 201 afterward | Pending row and committed offer/audit visible while provider is held; one provider call |
| Provider accepts, SENT persistence fails | 500; same-key replay 202 | PENDING remains; no resend and no FAILED reclassification |
| Tenant and permission denials | Foreign route/resource 404; denied roles 403 | Full snapshot unchanged; no provider calls |

Use-case regression also tests all three supported communication uniqueness metadata shapes, unexpected `P2002`/`P2034`/`P2039` propagation, and missing locked-row translation. Existing offer HTTP tests retain terminal transitions, revised sends, draft/version immutability, compensation confidentiality and retry coverage. Existing PostgreSQL offer/talent and communication suites remain in complete verification.

## 5. Files changed in Phase 4A

- `hiringloop-backend/src/modules/offers/repositories/offer-repository.js`: parent-row lock before send preparation reads.
- `hiringloop-backend/src/modules/offers/use-cases/offer-use-cases.js`: missing-row translation and constraint-specific idempotency recovery.
- `hiringloop-backend/tests/integration/phase4a-offer-send-http.test.js`: deterministic HTTP/PostgreSQL and delivery regressions.
- `hiringloop-backend/tests/modules/phase17-offer-outcome-use-cases.test.js`: precise collision recovery/error propagation tests.
- This report, technical debt register (15), improvement roadmap (16), consolidated verification (25), and `MASTER_ROADMAP.md`: E18 resolution and current evidence.

## 6. Verification results

Final commands and outcomes are recorded below. All commands ran from `hiringloop-backend` except `git diff --check` at repository root. The original Phase 4 failed API run remains historical evidence in document 25.

| Check | Result |
| --- | --- |
| Pre-fix controlled reproduction | CONFIRMED: 1 passed / 1 failed; distinct-key responses 201/500, P2039/P0001, one communication/call |
| Guarded `npm.cmd run prisma:migrate:test -- status` | PASS: localhost `hiringloop_test`, 17 migrations current; no reset/migration |
| First repaired complete focused run | PASS: 1 file / 10 tests after barrier correction |
| Focused offer HTTP tests: `node --env-file=.env ./node_modules/vitest/vitest.mjs run tests/integration/phase17-offers-http.test.js tests/integration/phase4a-offer-send-http.test.js --maxWorkers=1` | PASS: 2 files / 19 tests, no skips |
| All top-level API integration tests: `node --env-file=.env ./node_modules/vitest/vitest.mjs run tests/integration --exclude 'tests/integration/database/**' --maxWorkers=1` | PASS: 8 files / 40 tests, no skips; includes both offer HTTP suites |
| Repeated targeted contention tests: ten serial invocations of `node --env-file=.env ./node_modules/vitest/vitest.mjs run tests/integration/phase4a-offer-send-http.test.js --maxWorkers=1 -t 'controlled contention\|competing duplicate\|concurrent failed retry'` | PASS: 10/10 rounds; each ran 3 tests and intentionally skipped the other 7 by name filter (30 passed / 70 filtered skips total); no retries or timeout increases |
| Full backend non-database suite: `npm.cmd run test -- --maxWorkers=1` | PASS: 43 files / 274 tests, no skips |
| Complete serial PostgreSQL suite: `npm.cmd run test:db -- --maxWorkers=1` | PASS: 23 files / 121 tests, no skips; `pg` overlapping-query deprecation warnings observed |
| Backend lint: `npm.cmd run lint` | PASS |
| Backend formatting: `npm.cmd run format:check` | PASS: all matched source/script/test/config files |
| Backend syntax: PowerShell enumerates `rg --files src scripts tests -g '*.js'` plus `prisma.config.js` and `vitest.config.js`, invokes `node --check` for each, and exits on failure | PASS: all 249 JavaScript files |
| Prisma validation: `npm.cmd run prisma:validate` | PASS: schema valid |
| `git diff --check` | PASS after source/test/documentation edits; final check repeated after report completion |

Development-run failures retained: the first repaired run timed out in fixture setup at the existing 10-second hook limit (all ten tests skipped); unchanged rerun passed seven tests and failed three because the initial barrier counted direct blockers only. Following the recursive blocking chain corrected that harness defect; the subsequent complete focused run passed all ten. Neither timeout nor test limits were increased. These runs are not reported as passing verification.

## 7. Remaining risks and boundaries

- Exactly-once external delivery is not guaranteed. Provider acceptance followed by process interruption or database failure leaves PENDING with unknown external outcome. Same-key API replay deliberately does not resend it, so it may remain unresolved indefinitely. This change adds no queue, outbox, worker, webhook or reconciliation service.
- A known FAILED delivery can be retried through the existing atomic claim. Separate explicit attempts after definitive rejection are permitted; provider-call counts include those intentional retries.
- The internal dispatch service is not independently protected against arbitrary concurrent direct callers. The tested HTTP paths own the send/retry claims. Future background dispatch requires its own durable claim design.
- Tests cover controlled finite schedules, not production load, every lock ordering or process-crash fault. Unrelated database failures remain 500; no broad automatic transaction retries or trigger-error-to-409 conversion was added.
- Existing top-level HTTP fixture helpers retain uniquely keyed disposable test rows; no global cleanup/reset was performed. No real-provider acceptance, inbox delivery or live operational recovery was tested.
- Other technical-debt, browser E2E, resume persistence and production readiness findings remain outside Phase 4A.

Work stops after Phase 4A.
