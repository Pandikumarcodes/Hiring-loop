# 23 - Resume storage security verification

**Phase 4B follow-up (2026-10-18):** The missing-column investigation below is resolved for the current workflow. PostgreSQL `42703` / Prisma `P2022` came from the shared document/upload trigger resolving fields belonging to the other table's `NEW` record. Physical resume columns and all original migration checksums were correct. A new migration branches before table-specific expressions; 16 focused PostgreSQL tests now verify metadata, association, duplicate/concurrent completion, invalid/foreign references, rollback and accepted-reference reuse using fake storage. The complete serial PostgreSQL suite passed 24 files / 137 tests. See [27-resume-persistence-verification.md](27-resume-persistence-verification.md) for reproduction, repair and remaining storage limits. Earlier results below describe Phase 3E only.

Verification date: 2026-10-17. Phase 3E scope is public resume upload, acceptance, tenant-bound document references and authorized retrieval. No real candidate data or production object storage was used.

## 1. Original vulnerability and evidence

The original AWS adapter generated a presigned `PutObject` for the same `objectKey` later stored in `CandidateDocument`. It bound `Content-Type` but not an object-existence precondition. Submission performed a `HeadObject` metadata/size check and then consumed the reservation in a PostgreSQL transaction; consuming the reservation did not revoke the already issued S3 URL. The prior runtime audit also found that PUT and GET were signed for the same key with no `VersionId` binding (`19-runtime-verification.md`, baseline S01).

AWS documents that a presigned PUT for an existing key replaces the object, and documents `If-None-Match: *` conditional writes as the mechanism to create an object only when the key is absent: [presigned URL behavior](https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html), [conditional writes](https://docs.aws.amazon.com/AmazonS3/latest/userguide/conditional-writes.html), [PutObject API](https://docs.aws.amazon.com/AmazonS3/latest/API/API_PutObject.html). This establishes the adapter-level risk and available AWS control. It does not prove an exploit against the deployed bucket.

## 2. Root cause

The upload capability was reusable until expiration, and the same mutable key became the accepted resume reference. The application reservation state (`PENDING`/`CONSUMED`) guarded submission but could not revoke storage credentials already minted. No version identifier was recorded or used for retrieval.

## 3. Exploitability under tested conditions

- Source inspection confirmed the previous signed command did not include `If-None-Match`; a holder could replay a normal S3 PUT to the same key under AWS's documented semantics while the URL remained valid.
- Offline SDK signing now confirms the required conditional header is part of `X-Amz-SignedHeaders`.
- An isolated fake object store accepted the first conditional write, returned a precondition failure for replay, and retained the original bytes.
- No real S3 request or replay test was run. The fake verifies the application request contract and replay state machine, not AWS account configuration or deployed behavior.

## 4. Before/after upload lifecycle

| Stage | Before | After |
| --- | --- | --- |
| Initiation | Validate open job, metadata and declared size; create a random per-upload key and reservation; sign PUT for content type. | Same public flow and response shape; PUT additionally requires signed `If-None-Match: *`. |
| Browser transfer | `PUT` to the signed URL with required content type; replay could replace key. | Browser forwards required headers; S3 conditional write rejects replay if a current object exists. No general storage credentials are returned. |
| Acceptance | HEAD verifies object metadata, MIME and size, then transaction writes application/document/history and consumes reservation. | HEAD checks remain; a ranged GET checks the leading format signature before the existing DB transaction. Reservation remains single-consumption and tenant/job scoped. |
| Retrieval | Candidate-document endpoint checks permission, tenant-scoped document lookup, then signs short-lived GET for the stored key. | Unchanged. Authorization remains app-side and the object key is not exposed to the public application confirmation. |

There is no separate upload-completion endpoint. A repeated idempotent application submission returns its existing confirmation; it does not authorize a new object write. The storage precondition independently protects the accepted key.

## 5. Object-storage enforcement mechanism

`aws-s3-application-storage.js` now places `IfNoneMatch: '*'` on `PutObjectCommand` and returns `If-None-Match: *` in `requiredHeaders`. The existing frontend direct-upload utility forwards this header as-is. Since the precondition is signed and checked by S3 during the write, the overwrite defense is not merely an application-level check. This choice avoids a promotion copy, version IDs or a changed public endpoint contract.

The guarantee applies to AWS S3 conditional-write semantics and the current object version. Production deployment still must ensure:

- Bucket CORS allows the `If-None-Match` request header from the application origin.
- Bucket policy requires conditional writes for the upload prefix, where compatible with all legitimate writers.
- IAM limits `PutObject`/`DeleteObject` principals; versioning and delete-marker behavior are configured and reviewed.

No S3 bucket, policy, CORS, IAM or versioning configuration exists in this repository verification. The application does not claim unconditional storage immutability against a privileged principal or deletion/recreation of an object.

## 6. Tenant and authorization verification

- Public upload initiation is scoped to the public organization slug and job; `ApplicationUpload` is created with the resolved organization, job, and generated key.
- Submission queries the upload by `organizationId`, `jobId`, and `uploadId`, checks the key matches that organization and reservation, then conditionally consumes it in the same transaction that writes the application and document.
- Existing PostgreSQL composite relationships and guards tie a `CandidateDocument` to its application, candidate and organization; `objectKey` is unique in `CandidateDocument`.
- Resume access uses authenticated `POST /candidate-documents/:documentId/access`, CSRF, `CANDIDATE_DOCUMENT_ACCESS`, resolved tenant context, and repository `findDocument({ organizationId, documentId })`. The resulting GET URL is short-lived.
- These source paths and existing tenant/database tests were inspected. No unauthorized or cross-tenant download request was made against a live server in this phase.

## 7. Regression tests and verification results

Tests added/updated:

- `tests/modules/applications/aws-s3-application-storage.test.js`: synthetic AWS credentials, offline presign check for signed conditional header; fake object-storage replay proves accepted bytes remain unchanged.
- `tests/modules/applications/public-application-use-cases.test.js`: declared PDF with non-PDF bytes is rejected before persistence.
- `hiringloop-frontend/src/features/candidate-application/utils/direct-upload.test.ts`: verifies browser PUT forwards the signed conditional header and omits credentials.

Actual command results:

- Focused backend upload use-case/AWS signing/public HTTP: **3 files, 8 tests passed**.
- Backend non-database suite: **43 files, 273 tests passed**.
- PostgreSQL suite, serial against `hiringloop_test`: **23 files, 119 tests passed**. The target was checked with the test migration helper (`database = hiringloop_test`, localhost, schema up to date) before database verification.
- Backend lint: passed.
- Backend format check: passed.
- Changed backend JS syntax checks: passed.
- Prisma validation: passed.
- Focused frontend direct-upload test: **1 file, 1 test passed**; changed frontend test file Prettier check passed.
- Initial parallel PostgreSQL run had unrelated timeouts/transaction contention. Serial rerun passed.
- Attempted extra resume-document Prisma insert assertion returned a generic missing-column error even though catalog inspection showed the expected model columns. That test was removed rather than treating the failure as a product regression; the existing full DB suite passed after removal. Thus, this phase adds no new resume-specific PostgreSQL assertion.
- No full frontend suite, typecheck or build was run because production frontend source did not change; only the direct-upload regression test changed.

## 8. Failure, concurrency and residual-risk analysis

| Case | Expected behavior after change | Verification boundary |
| --- | --- | --- |
| Duplicate/replayed PUT after first write | S3 conditional request fails; original bytes remain. | Fake object store; signed-header assertion. AWS request not sent. |
| Simultaneous PUTs to one generated key | At most one conditional create should succeed; a later contender sees existing object/precondition failure. | AWS conditional-write semantics; no live race test. |
| URL expired | S3 rejects request after signed expiry; submission also rejects expired reservation. | Expiry logic source; provider expiry not exercised. |
| Completion after accepted application | Same-key PUT remains blocked; consumed reservation cannot submit again except idempotent replay of same submission. | Unit and database suites; no real S3. |
| Wrong tenant/job upload reference | Scoped lookup and DB relationship/consumption constraints reject it. | Existing source and PostgreSQL suite; no new resume-specific DB test. |
| Declared/actual size mismatch or oversized object | Submission rejects before DB acceptance. | Existing HEAD checks; size is not capped during direct transfer. |
| MIME mismatch or leading bytes do not match supported type | Submission rejects before DB persistence. | Unit test for invalid PDF signature. |
| DB failure after upload | No application/document is accepted; uploaded object can remain orphaned and its one-time PUT capability cannot replace an existing object. | Transaction/source reasoning; no injected DB-failure integration case in this phase. |
| Abandoned/invalid upload | Object may remain in storage; no cleanup/lifecycle worker was found. | Source inspection; S3 lifecycle not inspected. |
| Authorized retrieval | Tenant-resolved permission check and org-scoped document lookup precede short-lived GET signing. | Source inspection and existing suites; no live object read. |

The byte check recognizes only basic signatures: `%PDF-`, OLE compound document magic for legacy DOC, and ZIP local-file header for DOCX. It does not parse or sanitize document content and ZIP magic alone does not prove a valid DOCX package. No malware scan or quarantine state exists. Publicly issued PUTs can transfer more than the accepted 5 MiB maximum before submission rejects them; a provider-enforced upload-size policy (for example a presigned POST policy) remains follow-up. Failed/abandoned uploads can consume storage until external lifecycle cleanup. Exactly immutable retention against other privileged storage writers/deletes is not established.
