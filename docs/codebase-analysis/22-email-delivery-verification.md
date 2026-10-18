# 22 - Email delivery reliability and recovery verification

Verification date: 2026-10-17. Phase 3D is scoped to provider error classification, synchronous communication/offer delivery recovery, idempotency, and the distinction between provider acceptance and delivery-state persistence. No real email was sent.

## 1. Root cause

`createCandidateCommunicationService().dispatchPersisted()` placed both `emailDelivery.sendCandidateEmail()` and the database update to `status: SENT` inside one `try/catch`. A database error after a successful provider acceptance therefore entered provider-failure handling, which tried to mark the communication `FAILED` and issue a failure notification. For offer communications, a later retry of that `FAILED` record can dispatch the same message again.

Separately, `createSendGridEmailDelivery()` converted every SDK error—including timeouts and connection resets—into `category: sendgrid-error`. The communication service only preserved `PENDING` for `category: ambiguous`; transport failures thus became definitive failures and retryable offer rows.

## 2. Original behavior and reproduction evidence

The prior E08 runtime fault-injection entry in document 19 exercised a synthetic provider acceptance followed by a failing SENT-state update. The original service attempted the FAILED-state path and returned FAILED. The SendGrid adapter mapped synthetic `ETIMEDOUT` to `sendgrid-error`, rather than `ambiguous`. Source inspection confirms both behaviors.

Phase 3D's real PostgreSQL regression uses a fake provider that returns a provider message ID, then injects a database write failure for the SENT-state update. The route returns a server error; the persisted communication remains `PENDING`. Replaying the same idempotency key returns the existing pending record and does not invoke the fake provider again. This verifies the repaired recovery boundary against `hiringloop_test` without a live provider.

## 3. Delivery-state semantics

| Persisted state | Meaning | Retry behavior |
| --- | --- | --- |
| `PENDING` | No conclusive provider acceptance/rejection, including timeout/reset/HTTP 408 or 5xx, unknown transport errors, process interruption, or post-acceptance DB persistence failure. | Same-key API replay does not dispatch again. There is no automatic retry or reconciliation worker. |
| `SENT` | Provider returned a success/acceptance response and the state update succeeded. This is not proof that the recipient received or read the message. | Idempotent replay returns the existing result without dispatch. |
| `FAILED` | Provider explicitly rejected the request (4xx except 408, including rate limiting 429) or a known DNS/connect failure established that transmission did not occur. | Offer flow can claim/retry a known FAILED record once; candidate communication endpoint preserves its existing replay behavior. |

HTTP 5xx is conservatively ambiguous because acceptance cannot be excluded. Unknown errors default to ambiguous. `EmailDeliveryError` carries only a fixed safe message, category, and numeric status; provider response bodies and raw error messages are not passed to the API or logged.

## 4. Changes implemented

- `hiringloop-backend/src/modules/auth/email/email-delivery.js` classifies SendGrid 4xx rejection (except 408), known pre-transmission DNS/connect errors, and ambiguous timeout/reset/408/5xx/unknown outcomes. The non-delivering test adapter explicitly reports `not-sent`.
- `hiringloop-backend/src/modules/communications/candidate-communication-service.js` scopes lookup and status updates by communication, organization, and application. The provider call is isolated from status persistence; a failed SENT database write propagates and cannot fall into FAILED handling. Only `provider-rejected` and `not-sent` transition to FAILED. Ambiguous outcomes remain PENDING. Failure notifications remain best-effort and do not include provider details or email content in logs.
- `hiringloop-backend/tests/modules/auth/email-delivery.test.js` tests acceptance adapter and rejection/rate-limit/DNS/connect/timeout/reset/408/5xx classification with fake clients.
- `hiringloop-backend/tests/integration/database/phase16-http.test.js` tests persisted state after provider and DB failures, same-key replay, fake provider calls, concurrent duplicate requests, authorization, and tenant isolation.
- `hiringloop-backend/tests/integration/phase17-offers-http.test.js` continues to verify offer issue/retry immutability, explicit FAILED retry, ambiguous pending replay, and concurrent issuance.

No API request/response shape, template contract, permission, tenant scope, offer transition, or database schema changed. Frontend template selection continues to prefill the compose form; the final composed subject/body are persisted as sent. Offer emails continue to use the immutable issued offer version.

## 5. Failure and recovery matrix

| Event | Result | Durable state | Same-key replay |
| --- | --- | --- | --- |
| Provider accepts and SENT update succeeds | Success | `SENT`, provider message ID stored | No second provider call |
| Explicit provider 4xx rejection / 429 | Delivery error response | `FAILED`, safe category and timestamp; failure notice attempted | Candidate communication returns existing row; offer may claim known FAILED state once |
| DNS resolution/connect refusal before transmission | Delivery error response | `FAILED`, `not-sent`; failure notice attempted | Same as confirmed rejection |
| Timeout, connection reset, HTTP 408/5xx, unknown provider error | Unconfirmed response | `PENDING`, no failure notice | Existing row is returned; no resend |
| Provider accepts, SENT update fails | Server error | `PENDING` (or `SENT` if the DB committed before the error surfaced) | Existing row is returned; no resend |
| Database update for known provider rejection fails | Server error | Remains `PENDING` | No resend because PENDING is not claimed for dispatch |
| Concurrent same-key communication request | One request dispatches | One communication record | Other request reads/replays same record |
| Concurrent offer send attempts | Existing offer revision/transaction guard allows one issue/dispatch | One issued offer communication | Loser conflicts or sees existing communication |

The success state represents provider acceptance only. Inbox placement, bounce, spam rejection, and recipient delivery are not observable in this API.

## 6. Idempotency guarantees and limits

- Candidate communications retain the unique `(organizationId, applicationId, createdByUserId, idempotencyKey)` scope and payload hash conflict check. Reuse with different content returns the existing 409 conflict.
- Offer sending retains the transactional send preparation and conditional FAILED-to-PENDING claim. Only a known FAILED row can be claimed for retry; PENDING rows are not resent. Immutable offer version issuance behavior is unchanged.
- The synchronized concurrent same-key request test observes exactly one fake provider call and one persisted communication.
- Exactly-once external delivery cannot be guaranteed. If the provider accepts and the process/database fails before SENT is durable, the durable state stays PENDING and delivery remains unknown. This phase intentionally does not auto-resend that message; it can remain unresolved without future manual/provider reconciliation. No Redis, queue, worker, webhook, or outbox was introduced.
- Direct out-of-band concurrent calls to the internal dispatch service are not independently claimed/locked. Normal API paths provide idempotency/transaction guards; a future worker design must add a durable atomic claim before dispatch.

## 7. Tests and verification results

All integration tests used fake providers. Before the final suite, the guarded helper verified and reset only local `hiringloop_test`; all 17 migrations were reapplied.

| Check | Result |
| --- | --- |
| Email adapter classification tests | PASS — 15 tests in the email delivery test file |
| Candidate communication reliability integration cases | PASS — accepted-then-DB-failure replay and synchronized duplicate dispatch; 2 selected tests |
| Complete PostgreSQL database integration suite (`npm.cmd run test:db -- --maxWorkers=1`) | PASS — 23 files, 119 tests |
| Focused offer HTTP integration (`phase17-offers-http.test.js`) | PASS — 1 file, 9 tests |
| Backend non-database suite (`npm.cmd run test`) | PASS — 42 files, 270 tests |
| Backend lint (`npm.cmd run lint`) | PASS |
| Backend formatting (`npm.cmd run format:check`) | PASS |
| Prisma validation (`npm.cmd run prisma:validate`) | PASS |
| Changed backend syntax checks | PASS — email adapter and communication service |
| Frontend communications tests | PASS — 2 files, 4 tests |
| Frontend typecheck/build | Not run — no frontend code changed |

The 15 email adapter tests include the added provider classification cases. The focused integration cases are included in the complete DB suite's totals. No test contacted a live email provider.

## 8. Remaining operational risks

- No exactly-once or guaranteed eventual delivery; PENDING can require manual resolution after an ambiguous provider/DB/crash outcome.
- No provider delivery/bounce webhook, outbox, background retry, or reconciliation task exists.
- Live SendGrid behavior, network transmission boundaries, rate-limit response details, and inbox delivery were not exercised.
- Provider accepted message followed by a DB outage is safe from automatic duplicate send but may remain PENDING indefinitely.
- Failure notification creation remains best-effort after the FAILED status update; a notification insert failure is logged without provider/recipient content.
- No production load/deadlock test or direct internal dispatch-service concurrency claim test was added.

No stage, commit, push, or deployment was performed.
