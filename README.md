# HiringLoop

Current phase: Phase 13 Candidate Management — COMPLETE. Next phase:
Phase 14 Interview Scheduling & Calendar — NOT STARTED.

HiringLoop is a production-style multi-tenant recruitment SaaS platform.

Repository structure:

- `hiringloop-frontend` — React frontend
- `hiringloop-backend` — Node.js backend
- `docs` — architecture and engineering documentation

Shared Codex context is synchronized from authoritative root documentation:

```text
node scripts/sync-shared-docs.js
```

Current status:

- Phase 08 — Job Management — COMPLETE
- Phase 10 — Public Career Site — COMPLETE: 2 public APIs, 2 public screens,
  and 2 public routes.
- Phase 11 — Application Form Builder — COMPLETE: database, backend, frontend,
  audit, and Manual QA complete; exactly 8 recruiter configuration APIs.
- Phase 12 — Candidate Application Flow — COMPLETE: 3 public APIs, 1 public
  Apply route, organization-scoped Candidate/Application persistence, dynamic
  published forms, private direct S3 resume upload, and idempotency.
- Phase 13 — Candidate Management — COMPLETE: 4 authenticated APIs, 3
  recruiter routes, tenant-scoped candidate/application review, and secure
  signed resume access for ADMIN and RECRUITER.
- Redis/BullMQ, realtime, and AI remain outside the completed Phase 13 scope.

References:

- [Phase 08 handoff](docs/architecture/PHASE_08_HANDOFF.md)
- [Phase 10 handoff](docs/architecture/PHASE_10_HANDOFF.md)
- [Phase 10 engineering audit](docs/architecture/PHASE_10_ENGINEERING_AUDIT.md)
- [Phase 11 handoff](docs/architecture/PHASE_11_HANDOFF.md)
- [Phase 12 handoff](docs/architecture/PHASE_12_HANDOFF.md)
- [Phase 13 handoff](docs/architecture/PHASE_13_HANDOFF.md)
