# Phase 09 frontend handoff

Phase 09 frontend adds exactly one screen: **Pipeline Configuration**, at
`/app/organizations/:organizationId/jobs/:jobId/pipeline`. It is reached from
the existing Job Detail page through its small Pipeline action; the application
shell and global navigation are unchanged.

The `pipelines` feature owns the typed API client, Pipeline DTOs, TanStack
Query query/mutation hooks, and the page. `pipelineKeys.detail(organizationId,
jobId)` scopes cache state to both tenant and Job. The screen uses the Pipeline
GET aggregate only; there are no separate stage queries, polling, persistence,
or global Pipeline store.

`pipeline:view` shows the page and `pipeline:configure` enables configuration.
The backend remains authoritative. The screen additionally makes closed and
archived Jobs read-only. ENTRY stages can be renamed but are neither movable nor
deletable. STANDARD stages can be added, renamed, moved with keyboard-accessible
Move Up/Move Down controls, and deleted after confirmation.

All mutations carry the current Pipeline version. Successful responses replace
only the exact Pipeline cache entry. A `PIPELINE_VERSION_CONFLICT` invalidates
and refetches that entry and informs the user to review the latest stages; stale
changes are never retried. The screen has structural skeleton loading, safe load
error recovery, integrity handling for an invalid zero-stage response, responsive
wrapping stage controls, Radix dialogs, labels, associated validation errors, and
accessible button names.

Phase 09 remains in progress: frontend is complete pending engineering audit and
manual QA. No Candidate, Application, or other later-phase UI is included.
