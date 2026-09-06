# Phase 10 Public Career Site Database

Status: Prompt 1 database work complete; Phase 10 remains in progress.

The public career-site namespace is a read projection of `Organization` and
Jobs whose existing `status` is `OPEN`. No `CareerSite`, settings, theme, or
page persistence is introduced.

## Organization public slug

`Organization.slug` is a required globally unique `VARCHAR(63)`. The database
enforces its canonical lowercase ASCII form (`a-z`, `0-9`, and single internal
hyphens), 3--63 character length, and uniqueness. It is generated from the
organization name at creation; it is not accepted from client input and is not
changed when the organization name changes.

Runtime normalization trims, Unicode-normalizes/deaccents, lowercases, turns
separator/punctuation runs into one hyphen, and trims hyphens. Inputs with an
unusable or fewer-than-three-character result use the deterministic
`organization` fallback. Collisions use `-2`, `-3`, and so on, preserving the
63-character limit. The unique database index is authoritative; creation uses
bounded transaction retries so concurrent same-name requests remain atomic
with their creator `ADMIN` membership.

The migration adds the nullable column first, backfills existing organizations
in stable `createdAt, id` order, probes globally for the first available
numeric suffix, then applies the non-null, format-check, and unique
constraints. It does not alter existing UUIDs, timestamps, or foreign keys.

## Jobs and public-query index

No Job slug or publication field exists. Future public visibility remains
`Job.status = OPEN`, with the immutable Job ID as the detail identifier.

Phase 08's `(organizationId, status, updatedAt)` index supports internal
management ordering but not the approved public `openedAt DESC` list ordering.
This prompt therefore adds only
`(organizationId, status, openedAt)` for the tenant-scoped OPEN list query.
The detail query remains adequately served by the Job primary key plus its
organization/status predicates; no separate detail index was added.
