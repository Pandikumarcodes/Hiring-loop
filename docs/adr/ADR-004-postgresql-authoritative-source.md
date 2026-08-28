# ADR-004 — PostgreSQL as Authoritative Source of Truth

## Status

Accepted

## Context

HiringLoop has tenant-owned recruiting state across candidates, jobs, applications, pipelines, interviews, feedback, communications, offers, notifications, activity, audit, and integration references. Redis, queues, object storage, and external providers are useful supporting systems but have different durability, consistency, and ownership characteristics.

## Decision

Use PostgreSQL as the authoritative source of truth for HiringLoop application state, metadata, workflow status, business history, tenant relationships, and business-relevant asynchronous intent/status. Prisma will later mediate application data access. Object storage owns document bytes, and external providers own only their external operational records; their references and application meaning are persisted in PostgreSQL.

Redis may hold disposable derived cache data and queue/coordination state, but never permanent business truth.

## Consequences

- Domain workflows have one durable application authority and can use PostgreSQL transaction boundaries where appropriate.
- Provider synchronization must use explicit pending, failed, retry, and reconciliation states rather than assuming atomic cross-system updates.
- Cache loss, queue redelivery, provider outage, or provider replacement must not erase required business state.
- Database availability, backups, migrations, pooling, tenant constraints, and recovery become critical operational responsibilities.
- Physical schema, indexes, pool sizing, and migration policy remain later implementation decisions.

## Revisit Conditions

Revisit only if evidence demonstrates that a different durable system is required for a specific bounded workload. Any exception must preserve a clear HiringLoop authority, tenant isolation, recovery path, and documented synchronization contract.
