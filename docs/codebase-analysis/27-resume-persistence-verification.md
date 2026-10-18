# 27 - Resume persistence and Prisma verification

Verification date: 2026-10-18. Phase 4B only. All database connections used the verified disposable local `hiringloop_test`; object storage was fake. Existing uncommitted changes were preserved. No staging, commit, push or deployment.

## 1. Original error and controlled reproduction

Phase 3E recorded a generic Prisma missing-column error from an exploratory resume write without retaining its raw statement/error. Phase 4 inspected columns and projections but did not exercise inserts. The historical invocation cannot be reconstructed byte for byte. Phase 4B reproduces the same generic failure on the real upload initiation path and identifies a defect affecting both resume tables:

| Probe before repair | Actual result |
| --- | --- |
| Real `authorizeUpload` -> repository `applicationUpload.create` | Prisma `P2022`, model `ApplicationUpload`: `The column \`(not available)\` does not exist in the current database.` |
| Direct pg INSERT into `"ApplicationUpload"` | PostgreSQL `42703`: `record "new" has no field "applicationId"` |
| Same INSERT into `public."ApplicationUpload"` | Same `42703`, same trigger context |
| Direct pg INSERT into `public."CandidateDocument"` using a valid application/candidate/tenant | PostgreSQL `42703`: `record "new" has no field "consumedApplicationId"` |

Upload error context: `PL/pgSQL function assert_document_and_upload_relationships() line 3 at IF`; document error context: line 6 at IF. The Prisma adapter retains `originalCode: '42703'`, `kind: 'ColumnNotFound'`, and the PostgreSQL record-field message in `meta.driverAdapterError.cause`; its public error has no available column name. Raw SQL probes always rolled back, including successful probes after repair.

The focused regression failed before repair at `application-repository.js` upload reservation creation (1 failed, 15 tests total at that stage, 14 deliberately filtered). Regenerating Prisma did not fix this failure. After applying only the trigger-function migration, qualified/unqualified upload INSERT, valid document INSERT and Prisma upload INSERT all succeeded in rolled-back probes.

## 2. Root cause and alternatives

The original candidate-application migration created one `assert_document_and_upload_relationships()` function for two different row types. Its first SQL Boolean expression combined `TG_TABLE_NAME = 'CandidateDocument'` with references to `NEW.applicationId` and `NEW.candidateId`; its second combined `TG_TABLE_NAME = 'ApplicationUpload'` with `NEW.consumedApplicationId` and `NEW.jobId`.

Those fields do not exist on both records. PostgreSQL must resolve the SQL expression against the actual trigger record; a table-name comparison inside `AND` does not prevent invalid field resolution. This fails even on a valid upload reservation or document insert before an ownership violation could be evaluated. PostgreSQL documents that SQL subexpression evaluation is not ordered and recommends PL/pgSQL control flow to protect computations: [expression evaluation rules](https://www.postgresql.org/docs/18/sql-expressions.html#SYNTAX-EXPRESS-EVAL).

| Candidate explanation | Evidence / conclusion |
| --- | --- |
| Missing migration / resume columns | Rejected: all 17 original migrations applied with matching local SHA-256 checksums; every resume scalar column present. The applied trigger itself was defective. |
| Wrong database | Rejected for this reproduction: URL and live identity verified local `hiringloop_test`; no other database connected. Historical process identity was not retained. |
| Search path / schema qualification | Rejected for this reproduction: `public`, normal search path, same error from qualified and unqualified INSERTs; context points inside the trigger record. |
| Incorrect model mapping / casing / query construction | Rejected: quoted camel-case fields match physical columns, no `@map`/`@@map`, and plain parameterized SQL reproduces independently of Prisma. |
| Stale Prisma client | A separate local artifact mismatch was found and corrected by regeneration, but it is not the resume cause: identical failure reproduced after regeneration. |
| Test fixture | Valid existing disposable parents reproduce the record-field error. New real repository/use-case fixtures fail before repair and pass afterward. |
| Database trigger defect | Confirmed: live function matches defective migration source; errors name absent fields belonging to the other trigger table; branch-only replacement removes the failures while retaining rejection guards. |

## 3. Database, migrations and client evidence

- Target: `localhost:7498/hiringloop_test`; server address `::1/128`, server port `7498`, PostgreSQL `18.4` on Windows. `current_database()` = `hiringloop_test`, `current_schema()` = `public`, `search_path` = `"$user", public`.
- Guarded status initially reported 17 applied migrations and no pending migration. Catalog checksum comparison confirmed every original migration matches its local SQL, finished successfully, and has not been rolled back. The live function body matched the defective original SQL.
- Added and applied only `20261018120000_resume_relationship_trigger_record_fields` through `npm.cmd run prisma:migrate:test -- deploy`. Afterward: 18 local/applied migrations, all checksums match. No reset, destructive cleanup of unrelated fixtures, historical migration edit or Prisma model change.
- Initial generated Prisma DMMF contained 40 models, including stale `CommunicationDispatch` (all 14 fields absent in the database), whereas repository schema contains 39 models. `npm.cmd run prisma:generate` restored the 39-model client. All generated scalar/enum field names then matched physical `public` columns. Generated schema and source differ only in formatting (`git diff --no-index --ignore-all-space --ignore-blank-lines` exits 0). CLI/client/adapter versions are `7.10.0`.
- `CandidateDocument`: UUID identity/ownership fields, enum `CandidateDocumentType`, varchar object key 512 / filename 255 / MIME 127, integer size, timestamptz(6) timestamps. `ApplicationUpload`: UUID identity/tenant/job/nullable consumed-application fields, equivalent varchar metadata, integer declared size, enum status, timestamptz expiry/consumption/audit timestamps. Catalog types, casing, lengths and nullability agree with Prisma/migration definitions. Neither table needs extra columns.
- Tests set `NODE_ENV=test` before dynamically importing database/config modules. `getConfiguredDatabaseUrl()` then uses `TEST_DATABASE_URL`; both configured URLs exist but the development URL is never selected by these tests. The existing guard enforces the database name only; the new fixture/diagnostic additionally require a loopback hostname and verify live identity before writes.
- `tasklist` found three initial Node processes. Windows denied detailed CIM process inventory; no processes were killed. Initial `pg_stat_activity` showed only the diagnostic's own active connection to this database. Fresh CLI/Vitest processes reproduced the defect; stale application processes are not required to explain it. The creator of the stale generated client is unknown.
- Reusable diagnostic: `node --env-file=.env scripts/inspect-resume-database.js` from backend. It checks local target, catalogs, checksums, generated schema and versions; its INSERT probes always roll back and use existing disposable parent fixtures. It prints no connection credentials or candidate data. It is an investigative script, not a general drift certification or a production tool.

## 4. Complete resume persistence flow

1. Public router exposes `POST /api/v1/public/careers/:organizationSlug/jobs/:jobId/application-uploads` and `POST .../applications`. Public validation/rate-limit middleware precedes controllers; completion requires a UUID `Idempotency-Key`. There is no standalone upload-completion endpoint: application submission accepts the uploaded resume.
2. Upload schema validates filename length/path/null characters, MIME string and positive integral declared size. Use case resolves organization slug and open tenant-scoped job, permits PDF/DOC/DOCX, enforces configured maximum (5 MiB), generates a UUID and tenant/upload-owned object key.
3. `createUploadReservation` creates `ApplicationUpload` with original filename, MIME, declared size, expiry and default `PENDING`. This is a standalone write before signing, not part of the later submission transaction. The repaired trigger now validates the correct record type.
4. AWS adapter signs `PutObject` with content type and `IfNoneMatch: '*'`; response includes required `Content-Type` and `If-None-Match` headers. Browser transfers directly to storage. The API returns upload ID, signed URL, required headers and expiry, with no permanent storage credentials. Signing failure leaves a pending reservation; no distributed storage/database transaction exists.
5. Submission resolves organization and public job, normalizes candidate identity and fingerprints candidate/form/upload/answers. A matching tenant/job/idempotency-key application returns its prior confirmation before upload revalidation; changed request content returns `IDEMPOTENCY_CONFLICT`. New submissions require an open job, tenant/job-scoped published version and valid required answers/options.
6. Repository finds upload by ID, organization and job. Use case rejects consumed/expired/unknown uploads, checks exact generated key ownership, declared size and allowed MIME. Storage HEAD must report a positive matching integral size within limit and matching allowed MIME. A ranged GET checks PDF/OLE/ZIP prefix. Missing objects and invalid metadata fail before any submission writes; provider errors become storage-unavailable errors.
7. An initial ENTRY stage is resolved through the open tenant/job pipeline. `createAtomicSubmission` starts one Prisma interactive transaction (existing default isolation; no new retry/locking policy).
8. Transaction upserts candidate by `(organizationId, normalizedEmail)`, creates application linked to candidate/job/form version/current stage with submitted identity snapshot, key and request fingerprint, then inserts answers, `CandidateDocument` metadata (`RESUME`, object key, original filename, MIME, size) and initial `APPLICATION_SUBMITTED` history.
9. In that same transaction, conditional `applicationUpload.updateMany` requires upload ID, tenant, job, `PENDING` and expiry greater than submission time, and sets `CONSUMED`, `consumedAt`, `consumedApplicationId`. Count other than one throws `UploadUnavailableDuringCommitError`, rolling back all prior writes. Success commits before confirmation is returned. File bytes remain in object storage; PostgreSQL persists references/metadata only.
10. Composite FKs enforce tenant relationships; the document trigger additionally checks application/candidate/tenant identity, and upload trigger checks consumed application's tenant/job. Size/status checks and unique object keys, consumed application ID, candidate identity, application candidate/job and idempotency key remain intact.
11. Unique collisions are handled by reloading the scoped idempotent application: matching fingerprint returns prior confirmation, otherwise the existing duplicate-application conflict applies. Distinct claimants racing for the same object key yield one accepted submission and one conflict with full losing-transaction rollback. No object rewrite occurs during completion/replay.
12. Authenticated document access requires session/CSRF/permission and tenant-resolved `findDocument({organizationId, documentId})` before short-lived GET signing. Confirmation contains submission time and job, never the object key. Retrieval logic and APIs were unchanged.

Key implementation sources: [application repository](../../hiringloop-backend/src/modules/applications/repositories/application-repository.js), [public use cases](../../hiringloop-backend/src/modules/applications/use-cases/public-application-use-cases.js), [S3 adapter](../../hiringloop-backend/src/modules/applications/storage/aws-s3-application-storage.js), [Prisma schema](../../hiringloop-backend/prisma/schema.prisma), [original migration](../../hiringloop-backend/prisma/migrations/20260909120000_candidate_application_flow_foundation/migration.sql).

## 5. Changes and PostgreSQL regression coverage

The only product correction is the additive migration replacing the shared function with `IF TG_TABLE_NAME ... THEN ... ELSIF ...` control flow. Table-specific SQL is prepared only inside the matching branch. Trigger bindings, ownership predicates, exception messages, tables, constraints, APIs and storage security are preserved. Historical migration SQL is unchanged. Client regeneration changes ignored generated artifacts only.

`tests/integration/database/phase4b-resume-persistence.test.js` adds 16 real PostgreSQL tests with fake in-memory object storage and uniquely keyed fixtures. Cleanup deletes only the fixture's own organizations/rows in FK-safe order, using deferred constraints for the existing form/version cycle.

| Coverage | Persisted assertions |
| --- | --- |
| Real initiation and completion | Reservation and document metadata, candidate identity, correct application/form/stage association, initial history and consumption link |
| Duplicate completion / changed request | Stable confirmation and entire persisted snapshot; no repeat storage HEAD; changed content conflicts |
| Unknown, wrong-job and foreign-tenant references | No application accepted and original reservation unchanged |
| Six negative cases: missing object, size, MIME, signature, expiry, wrong key | No partial submission or consumption |
| Database division-by-zero after final consumption write | Existing candidate update, application, actual answer, document, history and consumption all roll back; bytes remain; valid retry succeeds with its answer |
| Expiry between preflight and commit | Conditional consumption loses; candidate/application/document/history writes roll back |
| Concurrent same-key requests | Both pass validation before a barrier releases real transactions; one application/document/history and identical confirmations |
| Concurrent distinct keys and candidate identities claiming one upload | One success/one duplicate conflict; losing candidate absent, one document/application and correct consumption link |
| Reuse of accepted reference | New key with same/different candidate rejected; persisted snapshot unchanged |
| Direct database ownership guards | Wrong same-tenant candidate, foreign tenant/application and wrong same-tenant job consumption rejected; accepted snapshot unchanged |
| Public HTTP router with real use case/repositories/PostgreSQL | Upload 201, completion/replay 201, one application, conditional upload header and no key disclosure |

The HTTP test uses the production router/controller/validation/error-handler chain with fake storage and pass-through rate limiters. It does not claim a full deployed-server/browser or authentication/download test. Existing isolated storage signing/replay and public HTTP unit tests remain in the standard backend suite; existing candidate-application foundation tests cover identity/answer constraints but had no successful resume writes, explaining why prior full suites passed despite the trigger defect.

## 6. Verification results

Final verification results are recorded below. Commands run from `hiringloop-backend` unless noted.

| Check | Result |
| --- | --- |
| Pre-fix focused real upload test | Confirmed failure: Prisma P2022; 1 failed / 14 filtered skips |
| Raw pg before/after probes and Prisma post-regeneration probe | Confirmed trigger failure before repair; all inserts succeed and roll back after repair |
| `npm.cmd run prisma:migrate:test -- status` / `deploy` | Initial 17 current; only additive trigger migration applied; final status current, all 18 checksums match |
| Focused `node --env-file=.env ./node_modules/vitest/vitest.mjs run tests/integration/database/phase4b-resume-persistence.test.js --maxWorkers=1` | PASS: 1 file / 16 tests, no skips |
| `npm.cmd run test:db -- --maxWorkers=1` | PASS: 24 files / 137 tests, no skips; existing pg overlapping-query deprecation warnings |
| `npm.cmd run test -- --maxWorkers=1` | PASS: 43 files / 274 tests, no skips |
| `node --env-file=.env ./node_modules/vitest/vitest.mjs run tests/integration --exclude 'tests/integration/database/**' --maxWorkers=1` | PASS: all 8 top-level API integration files / 40 tests, no skips; the new public resume HTTP case also passes within the focused/complete DB suites |
| `npm.cmd run prisma:validate` | PASS |
| Backend syntax (`node --check` for every source/script/test JS and both JS configs) | PASS: 251 files |
| `npm.cmd run lint`; explicit `oxlint` on new diagnostic/test files | PASS |
| `npm.cmd run format:check` | PASS: all matched backend files; rerun after final diagnostic edits |
| `git diff --check` at repository root | PASS; final check repeated after documentation completion |

Development-run failure retained: first post-repair focused run passed 14/15 tests; rollback test expected PostgreSQL code at the wrong Prisma metadata path. Actual failure was the intended division-by-zero, nested at `meta.driverAdapterError.cause.originalCode = 22012`. Corrected the assertion and added the commit-time expiry case; the final focused suite passed 16/16. No timeout increases or test retries were introduced.

The additional lint check on the new diagnostic initially rejected default `pg.Client` import style; switched to the named `Client` import and reran lint and all rolled-back diagnostic probes successfully. The first generated-schema byte comparison remained false after regeneration because Prisma formats schema text; a whitespace-insensitive diff confirmed no schema-content discrepancy. These investigation steps are not reported as product regressions or passing initial checks.

## 7. Remaining limitations

- Original Phase 3E statement/process identity was not retained. We establish an exact current defect and independently reproduce the generic error on both resume writes, rather than claim access to missing historical logs.
- No live S3, IAM/CORS/policy/versioning/delete-marker, malware scanner, full document parsing, size cap during direct transfer or lifecycle cleanup verification. Phase 3E storage limitations remain. Failed/abandoned uploads can leave objects; storage bytes are outside the database transaction.
- No production/shared database connected or migrated. Other environments require applying the new migration through their normal release process; nothing is deployed here.
- No full database drift certification, production load/crash schedule, exhaustive concurrency ordering, or browser E2E. Finite PostgreSQL races prove the tested invariants only. The commit-time expiry path retains the existing already-consumed error code even when expiry caused the lost predicate.
- The stale client's origin and detailed Windows process command lines could not be established. Fresh-process regeneration/reproduction separates that artifact from the trigger cause.
- No frontend source changed in Phase 4B, so frontend checks were not run. Prior unrelated dirty frontend files were preserved.

Work stops after Phase 4B.
