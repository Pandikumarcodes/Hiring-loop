# HiringLoop

Current phase: Phase 10 Public Career Site — COMPLETE. Next phase: Phase 11
Application Form Builder — NOT STARTED.

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
- Phase 11 — Application Form Builder — NOT STARTED.
- Redis/BullMQ, realtime, and AI remain outside the completed Phase 10 boundary.

References:

- [Phase 08 handoff](docs/architecture/PHASE_08_HANDOFF.md)
- [Phase 10 handoff](docs/architecture/PHASE_10_HANDOFF.md)
- [Phase 10 engineering audit](docs/architecture/PHASE_10_ENGINEERING_AUDIT.md)
