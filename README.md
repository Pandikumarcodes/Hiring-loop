# HiringLoop

HiringLoop is a production-style multi-tenant recruitment SaaS platform.

Repository structure:

- `hiringloop-frontend` — React frontend
- `hiringloop-backend` — Node.js backend
- `docs` — architecture and engineering documentation

Current development strategy:

Shared Codex context is kept in synchronized reference copies under each
application's `docs-shared/` directory. The authoritative documentation lives
at the repository root and in root `docs/` directories.

Synchronize the approved shared files with:

```text
node scripts/sync-shared-docs.js
```

Software Engineering
→ Production stabilization
→ AI Engineering later

Current status:

- Phase 07 — Team Management & Authorization — COMPLETE
- Next implementation phase: Phase 08 — Job Management (not started)
- Authentication uses PostgreSQL-backed opaque sessions, HttpOnly cookies, and
  backend-enforced security controls. Phase 07 adds ADMIN-only team
  authorization, tenant-scoped member/invitation operations, and final-Admin
  protection; recruiting product data, Redis/BullMQ, realtime, and AI remain
  outside the current boundary.
- See [the Phase 06 handoff](docs/architecture/PHASE_06_HANDOFF.md) for the
  verified architecture, APIs, security, testing, and manual QA checklist.
- See [the Phase 07G authorization audit](docs/architecture/PHASE_07G_FINAL_AUTHORIZATION_AUDIT.md)
  for Team-management completion evidence and security decisions.
