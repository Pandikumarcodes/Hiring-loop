# Phase 09 Pipeline Configuration Database Foundation

Status: Prompt 1 implemented; Phase 09 remains in progress.

## Ownership and relationships

```text
Organization 1:N Job 1:1 Pipeline 1:N PipelineStage
```

`Pipeline` has no `organizationId`. Tenant ownership is derived through
`Pipeline -> Job -> Organization`; future tenant-scoped repositories must use
that trusted chain and request tenant context.

Each Job has one Pipeline through required, unique `Pipeline.jobId`. Each
PipelineStage belongs to one Pipeline. Both foreign keys use `ON DELETE
RESTRICT ON UPDATE RESTRICT`, consistent with the existing restrictive Job
business semantics and safe for future Application history references.

## Models and default

`Pipeline`: UUIDv7 `id`, `jobId`, aggregate `version`, and timestamps. Version
defaults to 1 and is database-constrained to `>= 1`. PipelineStage has no
version.

`PipelineStage`: UUIDv7 `id`, `pipelineId`, display `name`, internal
`normalizedName`, `kind`, sequential `position`, and timestamps.
`PipelineStageKind` contains exactly `ENTRY` and `STANDARD`.

Job creation uses one Prisma interactive transaction to insert the Job, one
Pipeline, and these exact ordered stages without changing Job API responses:

1. `Applied` / `applied` / `ENTRY` / 1
2. `Screening` / `screening` / `STANDARD` / 2
3. `Interview` / `interview` / `STANDARD` / 3
4. `Offer` / `offer` / `STANDARD` / 4

Names are normalized by trim plus `en-US` lowercasing in the Pipeline domain
helper and remain internal.

## Constraints and indexes

- Pipeline PK, unique Job FK, and `version >= 1`.
- PipelineStage PK, required Pipeline FK, `position >= 1`, and 1--80 trimmed
  display-name length.
- unique `(pipelineId, position)` for position integrity and ordered loading.
- unique `(pipelineId, normalizedName)` for case-insensitive name integrity.
- PostgreSQL partial unique index on `pipelineId WHERE kind = 'ENTRY'` for
  maximum one ENTRY. Prisma cannot express this partial index; migration SQL
  owns it.

No standalone position, global stage-name, duplicated tenant, pagination,
search, or speculative index exists.

Database enforcement covers identity, FKs, max Job-to-Pipeline cardinality,
lower bounds, name length, position/name uniqueness, and maximum one ENTRY.
Prompt 2 service enforcement covers ENTRY existence and position 1, 1--20
stages, contiguous positions, mutation-time normalization, and preventing
ENTRY deletion/movement. These aggregate rules are not clean row checks.

## Migration backfill

After table creation, every existing Job receives one Pipeline through a
Job-to-Pipeline anti-join and each Pipeline receives the four default stages
through position anti-joins. This is safe for existing Phase 08 data and a
clean migration sequence.

Application UUIDv7 generation is unavailable inside SQL migrations. A temporary
extension-free deterministic SQL UUIDv7 mapper uses the Job creation timestamp
for UUIDv7 timestamp bits and a Job-ID/row-role MD5 seed for stable RFC
version/variant random bits. It is dropped after backfill. Runtime IDs still
use `generateEntityId()`.

Future Applications may reference PipelineStage. This prompt adds no
Application, transition, template, history, HTTP API, or frontend artifact.
