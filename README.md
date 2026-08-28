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
