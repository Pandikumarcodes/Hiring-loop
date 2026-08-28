# HiringLoop Quality Attribute Scenarios

These scenarios make ARCH-05 quality attributes concrete and testable. They are planning scenarios, not evidence that the system currently meets the responses or measurements. Exact thresholds remain provisional unless explicitly identified as a hard invariant.

## Scenario Structure

Each scenario uses Source, Stimulus, Environment, Artifact, Response, and Measurement.

## 1. Large Candidate List Request

**Source:** Authenticated recruiter.

**Stimulus:** Requests a candidate list for an organization with a large candidate collection and filters.

**Environment:** Representative staging dataset and initial MVP concurrency.

**Artifact:** Candidate API, authorization policy, PostgreSQL query, and frontend list.

**Response:** Apply tenant/resource authorization, return a bounded page with intentional fields, avoid N+1 loading, and provide usable loading/empty/error/pagination states. Do not load an unbounded collection.

**Measurement:** API p95 initial target <= 800 ms and p99 <= 1,500 ms; query timing, plan, payload size, and frontend interaction measured in representative load testing.

## 2. Cross-Tenant Candidate Request

**Source:** Authenticated recruiter from Organization B.

**Stimulus:** Requests a Candidate belonging to Organization A by direct ID or nested relationship.

**Environment:** Normal authenticated API operation, including search/file-adjacent paths.

**Artifact:** Authentication context, tenant resolution, authorization policy, repository/use case, and DTO.

**Response:** Deny the request without candidate data exposure or unnecessary existence leakage. No downstream module, worker, cache, or provider path bypasses the tenant check.

**Measurement:** Tenant-isolation security tests pass for direct, nested, search, bulk, file, worker, and callback paths; zero unauthorized records returned or mutated.

## 3. Duplicate Application Submission

**Source:** Candidate/browser or a retried public client.

**Stimulus:** Submits the same application twice because of double-click, timeout, or network retry.

**Environment:** Public application flow with normal and ambiguous response timing.

**Artifact:** Public API, Application use case, PostgreSQL transaction, idempotency/duplicate policy, and side-effect triggers.

**Response:** Enforce the approved duplicate policy and one intended application effect, with no accidental duplicate history, message, or transition. Return a safe understandable result.

**Measurement:** Replay/idempotency and failure-path tests; duplicate records and side effects are zero where the approved policy requires uniqueness. Exact policy is **Requires Product Decision**.

## 4. Redis Outage

**Source:** Redis operator or infrastructure failure.

**Stimulus:** Redis becomes unavailable during a cache read or queue/coordination operation.

**Environment:** API and/or worker deployment under normal request load.

**Artifact:** Redis adapter, cache-aside logic, queue infrastructure, and dependency error handling.

**Response:** Cache-backed reads fall back to PostgreSQL where safe and remain authorized. Redis failure never deletes or changes authoritative business state. Queue-dependent operations expose only truthful pending/failure state according to workflow policy.

**Measurement:** Failure-injection test, API error/latency metrics, business-state comparison before/after outage, and queue recovery/reconciliation evidence. Fail-open/fail-closed decisions are **Requires Implementation Evidence**.

## 5. SendGrid Outage

**Source:** SendGrid or network dependency.

**Stimulus:** An email send request times out or the provider is unavailable.

**Environment:** Communication request has durable outbound intent/status.

**Artifact:** Communication use case, worker, EmailProvider adapter, retry state, and webhook/reconciliation path.

**Response:** Preserve intent in PostgreSQL, expose pending/failed state as appropriate, retry only when safe, and do not fail or mutate the source recruiting workflow merely because delivery failed.

**Measurement:** Provider outage simulation, retry/backoff/idempotency tests, delivery reconciliation, queue metrics, and absence of duplicate sends.

## 6. Calendar Outage

**Source:** Google Calendar, OAuth token, or network dependency.

**Stimulus:** Create/reschedule/cancel synchronization cannot complete.

**Environment:** Internal Interview operation has passed authorization and domain validation.

**Artifact:** Interview state, CalendarProvider adapter, worker, provider reference, and sync status.

**Response:** Internal Interview remains authoritative. Synchronization becomes visible as pending/failed, and retry/reconciliation recovers without duplicate external events. No PostgreSQL transaction is assumed to roll back a remote side effect.

**Measurement:** Provider outage and ambiguous-timeout tests, duplicate-event prevention, token/revocation handling, reconciliation results, and user-visible status review.

## 7. Concurrent Candidate Stage Movement

**Source:** Two authorized recruiters or a recruiter and worker.

**Stimulus:** Both attempt to move the same Application to different stages nearly simultaneously.

**Environment:** Normal multi-user API operation.

**Artifact:** Pipeline/Application use case, PostgreSQL transaction, current placement, and Activity history.

**Response:** Validate authorization and current state; apply an explicit concurrency policy. Do not silently lose a stage change or create history that does not match final state.

**Measurement:** Concurrent integration tests, transaction/locking or version-conflict evidence, invariant checks, and ordered Activity history review. Exact conflict UX is **Requires Product Decision**.

## 8. Resume Access Request

**Source:** Authenticated organization user, interviewer, candidate, or unauthorized tenant actor.

**Stimulus:** Requests access to a private resume/document.

**Environment:** Object bytes in private S3 and metadata in PostgreSQL.

**Artifact:** Backend authorization, document metadata, ObjectStorageProvider adapter, signed URL, and audit path.

**Response:** Verify tenant, relationship, visibility, and purpose before issuing a narrow signed capability. Do not expose credentials or unrestricted paths. Denied requests do not reveal bytes.

**Measurement:** Role/tenant/document authorization tests, signed URL scope/expiry tests, access logging review, leakage tests, and private-bucket review when implemented.

## 9. Worker Failure

**Source:** Worker process or host.

**Stimulus:** Worker crashes before, during, or after an external side effect.

**Environment:** At-least-once queue delivery with durable business intent/status.

**Artifact:** Queue, worker handler, adapter, idempotency identity, PostgreSQL status, and monitoring.

**Response:** Work is safely redelivered, retried, or marked failed. Reprocessing does not duplicate external effects; exhausted work is visible and recoverable under later policy.

**Measurement:** Crash/redelivery tests, idempotency tests, retry/backoff timing, queue depth/age/failure metrics, and operator recovery drill.

## 10. Public Application Abuse

**Source:** Automated or malicious internet client.

**Stimulus:** Floods public applications or uploads oversized/malicious content.

**Environment:** Public endpoint with unauthenticated access and provider/storage cost exposure.

**Artifact:** Public API, rate limits, validation, upload boundary, persistence, and observability.

**Response:** Apply bounded request/file limits and appropriate abuse controls; reject unsafe input without exposing tenant data; avoid uncontrolled email/storage pressure; preserve accessibility and generic safe errors.

**Measurement:** Abuse/load tests, rate-limit behavior, payload-size/type tests, malware/quarantine extension tests when available, provider-cost signals, and PII-safe telemetry review.

## 11. Slow Database Query

**Source:** Normal request or data growth.

**Stimulus:** Candidate, pipeline, activity, or analytics query exceeds the initial latency budget.

**Environment:** Representative dataset and measured concurrent workload.

**Artifact:** Repository/query, PostgreSQL plan, connection pool, API response, and observability.

**Response:** Detect and classify the slow query, inspect with safe query-plan tooling, and choose an evidence-based change such as pagination, field reduction, query correction, or justified index. Do not bypass tenant/security checks.

**Measurement:** Query timing, `EXPLAIN ANALYZE`, p95/p99 comparison, pool utilization, payload size, and regression test.

## 12. Frontend Network Failure

**Source:** Browser network or backend dependency.

**Stimulus:** A route load, mutation, upload, or realtime connection fails or becomes slow.

**Environment:** Development/staging and later production-like browser conditions.

**Artifact:** React route/component, API client/query cache, form, upload flow, and realtime fallback.

**Response:** Show accessible loading/error/retry/stale/reconnecting state, preserve user-entered data where safe, avoid claiming mutation success, and fall back from realtime to REST refresh/polling where applicable.

**Measurement:** Component/interaction and E2E tests under network throttling/failure, accessibility review, error-state correctness, and Core Web Vitals/interaction timing once routes exist.

## Cross-Scenario Review Checklist

- Is the response consistent with PostgreSQL as source of truth?
- Is tenant and resource authorization enforced before data or provider access?
- Is dependency failure visible without leaking secrets or sensitive PII?
- Is repeat/retry behavior idempotent or explicitly protected?
- Is the operation synchronous only when latency and consistency justify it?
- Is there a measurement that produces evidence rather than a subjective claim?
- Is the target provisional, an invariant, or a future operational decision?
- Does the scenario preserve the modular monolith and avoid an unproven microservice boundary?
- Does it keep AI deferred from the software-engineering milestone?
