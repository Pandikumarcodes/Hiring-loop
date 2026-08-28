# ADR-006 — Background Workers for Slow or Unreliable Work

## Status

Accepted

## Context

Email delivery, calendar synchronization, notifications, bulk imports, document generation, cleanup, and later approved AI workloads may be slow, provider-dependent, retryable, or operationally independent of an HTTP response. Performing these operations synchronously can increase request latency and couple user actions to provider availability.

## Decision

Use a future BullMQ/Redis worker boundary for justified slow, unreliable, retryable, or batch work. The API first persists authoritative business intent and required user-visible status, enqueues a minimal tenant-scoped job reference, and returns an appropriate response. A worker loads authoritative state, validates the job, calls external services through adapters, and persists results/status/history in PostgreSQL.

Workers must support bounded timeouts, classified retries with exponential backoff and jitter, deterministic job identity or idempotency, minimal payloads, safe redelivery, explicit exhausted-failure state, monitoring, and later poison/dead-letter recovery policy.

## Consequences

- User-facing requests are less coupled to provider latency and outages.
- Work becomes eventually consistent and needs pending/failed/retry UX where relevant.
- At-least-once delivery and ambiguous provider outcomes make idempotency and reconciliation mandatory.
- Redis/BullMQ become operational dependencies for selected workflows, but not domain authority.
- Exact queue catalog, outbox strategy, retry limits, concurrency, and worker hosting remain implementation decisions.

## Revisit Conditions

Revisit per workload if measured latency, volume, provider contract, or consistency requirements show synchronous execution is safer. Do not introduce workers solely for architectural fashion; retain them where evidence demonstrates the reliability or UX benefit.
