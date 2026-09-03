# HiringLoop

HiringLoop is a production-style multi-tenant recruitment SaaS platform.

Repository structure:

- hiringloop-frontend — React frontend
- hiringloop-backend — Node.js backend
- docs — architecture and engineering documentation

Current development strategy:

Shared Codex context is kept in synchronized reference copies under each application's `docs-shared/` directory. The authoritative documentation lives at the repository root and in root `docs/` directories.

Synchronize the approved shared files with:

```text
node scripts/sync-shared-docs.js
```

Software Engineering
→ Production stabilization
→ AI Engineering later

Current status

- Phase 05 — Authentication — COMPLETE
- Next authoritative roadmap phase: Phase 06 — Organization & Multi-Tenancy
- Authentication uses PostgreSQL-backed opaque sessions, HttpOnly cookies, and
  backend-enforced security controls. Organization, membership, RBAC, product
  data, Redis/BullMQ, realtime, and AI remain outside the current boundary.
- See [the Phase 05 handoff](docs/architecture/PHASE_05_HANDOFF.md) for the
  verified API, security, testing, and manual QA checklist.
