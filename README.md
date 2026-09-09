# HiringLoop

Current phase: Phase 17 Offers, Hire/Reject & Talent Pool — COMPLETE. Next
phase: Phase 18 Analytics & Audit — NOT STARTED.

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
- Phase 14 — Interview Scheduling & Calendar — COMPLETE: 2 database models,
  7 authenticated APIs, 2 primary routes, organization agenda, My Interviews,
  timezone-safe scheduling, conflict detection, rescheduling, and cancellation.
- Phase 15 — Scorecards & Collaboration — COMPLETE: 6 database models, 14
  authenticated APIs, 2 primary routes, versioned Job scorecard templates,
  independent interviewer feedback, submitted-feedback review, and internal
  Application Notes.
- Phase 16 — Candidate Communication & Notifications — COMPLETE: 4 database
  models, 12 APIs, provider-safe delivery states, notifications, and preferences.
- Phase 17 — Offers, Hire/Reject & Talent Pool — COMPLETE: 5 new database
  models, 2 altered models, 18 APIs, 2 dedicated routes, versioned offers,
  explicit outcomes, and tenant-scoped talent pools.
- Redis/BullMQ, realtime, Google Calendar synchronization, Phase 18 analytics/
  audit, and AI remain deferred.

References:

- [Phase 08 handoff](docs/architecture/PHASE_08_HANDOFF.md)
- [Phase 10 handoff](docs/architecture/PHASE_10_HANDOFF.md)
- [Phase 10 engineering audit](docs/architecture/PHASE_10_ENGINEERING_AUDIT.md)
- [Phase 11 handoff](docs/architecture/PHASE_11_HANDOFF.md)
- [Phase 12 handoff](docs/architecture/PHASE_12_HANDOFF.md)
- [Phase 13 handoff](docs/architecture/PHASE_13_HANDOFF.md)
- [Phase 14 handoff](docs/architecture/PHASE_14_HANDOFF.md)
- [Phase 15 handoff](docs/architecture/PHASE_15_HANDOFF.md)
- [Phase 16 handoff](docs/architecture/PHASE_16_HANDOFF.md)
- [Phase 17 handoff](docs/architecture/PHASE_17_HANDOFF.md)
