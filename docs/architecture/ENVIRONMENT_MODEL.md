# HiringLoop Environment Model

## Purpose

HiringLoop separates Development, Staging, and Production as distinct operational environments. Environment separation protects tenant data, prevents accidental provider activity, and makes release verification representative without reusing production resources casually.

This is a conceptual model only. It creates no secrets, `.env` values, credentials, infrastructure, or deployment configuration.

## Environment Responsibilities

| Environment | Purpose | Data and access posture |
|---|---|---|
| Development | Local design, implementation, and safe experimentation | Use a separate database, Redis, storage isolation, provider applications/credentials, and non-production data or approved fixtures. Accidental real email/calendar activity must be prevented by configuration and provider controls later. |
| Staging | Integration, acceptance, and release-candidate verification | Use resources and credentials separate from Production. Use representative but controlled data and provider sandbox/test modes where available. Validate migrations, workers, callbacks, failure paths, and deployment behavior here before production. |
| Production | Real users, tenant data, and business operations | Use dedicated resources, managed secrets, least-privilege access, backups/recovery, monitoring, audited operational access, and production provider credentials. |

## Required Separation

Each environment must separately define and protect:

- PostgreSQL database/project, connection credentials, and migration access;
- Redis instance/database, cache namespace, and queue namespace;
- S3 bucket or approved isolated bucket/prefix topology and lifecycle policy;
- Google OAuth client ID, redirect URIs, scopes, and connected-account data;
- SendGrid API key, sender identity, templates/configuration, and webhook endpoint;
- Google Calendar OAuth credentials, tokens, scopes, and synchronization references;
- worker deployment identity, queue access, and runtime configuration;
- encryption keys, session secrets, signing material, and other environment secrets;
- observability destinations, access permissions, retention, and alerting configuration.

An environment's identifier must not be the only isolation mechanism for sensitive resources. Credentials and provider-side configuration must also enforce the intended boundary.

## Application and Deployment Separation

The frontend and backend are separate applications in one Git repository and remain independently deployable. Each environment may have separate frontend and backend deployments, configuration, release health, and rollback concerns. A future worker deployment may be separate from the API while using the same environment's approved database, queue, storage, and provider boundaries.

The approved deployment direction is:

```text
Frontend     -> Vercel
Backend API  -> Render
Database     -> Supabase PostgreSQL
Files        -> AWS S3
```

These are deployment directions, not configured resources. The future Redis provider and worker hosting strategy remain unresolved.

## Credential and Data Rules

- Production credentials must not be copied into Development or Staging.
- Development and Staging must not write to production buckets, queues, databases, email sender identities, or calendars.
- Production secrets belong in managed secret storage with access control, rotation, and audit; they must not be committed or placed in client bundles.
- Provider credentials remain server-side and must not appear in DTOs, logs, URLs, queue payloads, or browser storage.
- Test and seed data must not contain unnecessary real candidate PII, resumes, feedback, offer terms, or credentials.
- Logs and telemetry must be separated or access-controlled by environment and must follow the existing sensitive-logging rules.
- Backup, restore, retention, and disaster-recovery policies must identify which environment they protect and where restored data may be used.

## Environment Promotion Principle

Code and approved configuration may move from Development through Staging to Production, but data, secrets, provider tokens, and environment-specific resource identities do not move casually with it. Production promotion requires later implementation evidence for tests, migration compatibility, health checks, rollback, security review, and operational readiness.

## Open Decisions

The following are **Proposed / Requires Implementation Evidence** unless otherwise noted:

- exact PostgreSQL and Redis isolation topology;
- exact S3 bucket-per-environment and tenant-prefix strategy;
- provider sandbox availability and webhook isolation;
- secret-management product, rotation cadence, and break-glass access;
- backup/restore targets and whether Staging may receive sanitized production-like data (**Requires Security/Product Decision**);
- deployment regions, network policy, and environment-specific observability retention;
- worker hosting and per-environment concurrency limits.

See [INFRASTRUCTURE_ARCHITECTURE.md](INFRASTRUCTURE_ARCHITECTURE.md) for the broader infrastructure ownership, failure, and deployment boundaries.
