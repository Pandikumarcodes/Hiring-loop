# 09 - Authentication, authorization and security

Analysis date: 2026-10-17. Static repository investigation; no application execution, dependency installation, migrations, services, or deployment. Source presence is not proof of runtime success.

## VERIFIED

### Identity lifecycle

Registration normalizes email, hashes a 12-128 character password with Argon2id (19,456 KiB, time cost 2, parallelism 1), and transactionally creates User/credential/verification token. Random secrets have 32 bytes of entropy and are SHA-256 hashed before DB storage. Verification token TTL is 24h; reset is 30m; sessions are seven days. Token consumption and password/session changes use DB transactions and conditional updates. [hiringloop-backend/src/modules/auth/password/argon2-password-hasher.js:7](../../hiringloop-backend/src/modules/auth/password/argon2-password-hasher.js#L7); [hiringloop-backend/src/modules/auth/secrets/auth-secret.js:1](../../hiringloop-backend/src/modules/auth/secrets/auth-secret.js#L1); [hiringloop-backend/src/modules/auth/repositories/auth-repository.js:1](../../hiringloop-backend/src/modules/auth/repositories/auth-repository.js#L1).

Login verifies stored or dummy hash and creates a fresh opaque session; it does not require email verification. Cookies are HttpOnly, Path=/, Secure with __Host- name in production; production SameSite=None and development Lax. Every authenticated request hashes the cookie and validates expiry/revocation against DB. No JWT/refresh-token flow: expiry requires another login. Logout revokes current session; revoke-all/reset revoke all; change-password rotates session. [hiringloop-backend/src/modules/auth/use-cases/login-user.js:1](../../hiringloop-backend/src/modules/auth/use-cases/login-user.js#L1); [hiringloop-backend/src/modules/auth/http/session-cookie.js:1](../../hiringloop-backend/src/modules/auth/http/session-cookie.js#L1); [hiringloop-backend/src/config/env.js:300](../../hiringloop-backend/src/config/env.js#L300); [hiringloop-backend/src/middleware/authenticate-session.js:1](../../hiringloop-backend/src/middleware/authenticate-session.js#L1).

Google is optional OIDC with state, nonce, PKCE S256, signed HttpOnly short-lived transaction cookie and verified email claim. Existing provider subject logs into local session; matching email without provider identity is refused pending explicit linking. No provider access token is used as a HiringLoop API session. [hiringloop-backend/src/modules/auth/google/google-oidc-provider.js:1](../../hiringloop-backend/src/modules/auth/google/google-oidc-provider.js#L1); [hiringloop-backend/src/modules/auth/use-cases/login-with-google.js:1](../../hiringloop-backend/src/modules/auth/use-cases/login-with-google.js#L1).

### Authorization and browser defenses

Organization membership is loaded from trusted DB, not client role input. Permission matrix defaults deny; nonmember tenant lookup returns 404. Interviewer reads are participant-filtered; own scorecard requires assignment; notes allow author/Admin mutation; notifications filter organization and recipient. Candidate/resume APIs require Admin/Recruiter permissions. Resource queries include tenant IDs and SQL guards enforce additional ownership. No confirmed cross-tenant access bypass was found in the inspected paths; this is not proof of exhaustive isolation. [hiringloop-backend/src/authorization/permissions.js:160](../../hiringloop-backend/src/authorization/permissions.js#L160); [hiringloop-backend/src/modules/organizations/use-cases/resolve-tenant-context.js:1](../../hiringloop-backend/src/modules/organizations/use-cases/resolve-tenant-context.js#L1); [hiringloop-backend/src/modules/interviews/use-cases/interview-use-cases.js:1](../../hiringloop-backend/src/modules/interviews/use-cases/interview-use-cases.js#L1); [hiringloop-backend/src/modules/scorecards/repositories/scorecard-repository.js:376](../../hiringloop-backend/src/modules/scorecards/repositories/scorecard-repository.js#L376); [hiringloop-backend/src/modules/notifications/notifications-module.js:1](../../hiringloop-backend/src/modules/notifications/notifications-module.js#L1).

Credentialed CORS permits the configured exact origin. Unsafe Origin checks require origin in production; authenticated mutation routes require HMAC CSRF bound to DB session ID and constant-time digest comparison. Password/login/public/upload/email limiters exist and use process-local stores. Request JSON is limited to 100kb. Zod owns validation; raw SQL uses Prisma parameter binding and allowlisted ordering. Error handler removes unexpected details and generates server-owned request IDs. Ordinary frontend text is React-escaped; no raw-HTML renderer found. [hiringloop-backend/src/app.js:1](../../hiringloop-backend/src/app.js#L1); [hiringloop-backend/src/middleware/csrf.js:1](../../hiringloop-backend/src/middleware/csrf.js#L1); [hiringloop-backend/src/middleware/rate-limit.js:1](../../hiringloop-backend/src/middleware/rate-limit.js#L1); [hiringloop-backend/src/middleware/error-handler.js:1](../../hiringloop-backend/src/middleware/error-handler.js#L1).

Secrets are backend environment inputs and ignored env files; frontend Vite values are public. No actual secret/env/private data values were read or printed. Console delivery logs full message content and token links only in explicit development mode; production rejects console provider. Repo ignore rules are not a complete git-history secret audit. [hiringloop-backend/src/config/env.js:1](../../hiringloop-backend/src/config/env.js#L1); [hiringloop-backend/src/modules/auth/email/email-delivery.js:170](../../hiringloop-backend/src/modules/auth/email/email-delivery.js#L170); [.gitignore:1](../../.gitignore#L1).

### Security risk register

**0 Critical, 0 open High, 5 Medium, 0 Low identified risks.** S01 was a high-severity source-derived risk and is marked resolved after Phase 3E; provider-side enforcement is based on the signed S3 conditional write and still requires production configuration verification.

#### S01 - RESOLVED (Phase 3E): Accepted resume remains writable through a still-valid signed PUT

**INFERRED**; engineering priority P1.

Evidence: [hiringloop-backend/src/modules/applications/storage/aws-s3-application-storage.js:37](../../hiringloop-backend/src/modules/applications/storage/aws-s3-application-storage.js#L37); [hiringloop-backend/src/modules/applications/repositories/application-repository.js:154](../../hiringloop-backend/src/modules/applications/repositories/application-repository.js#L154); [hiringloop-backend/src/modules/applications/use-cases/public-application-use-cases.js:348](../../hiringloop-backend/src/modules/applications/use-cases/public-application-use-cases.js#L348).

Original root cause: Document retained the same object key authorized for PUT. Consumption was database-only; the original signed request had no storage-side create-only precondition.

Repair: AWS S3 PUT signing now includes `If-None-Match: *` as a signed required header; the browser forwards it. S3 rejects the PUT when the current key already exists, so replay cannot replace accepted bytes. Generated keys remain per-upload and unpredictable. The API still verifies tenant/job-scoped reservation state and validates object metadata and a byte signature before atomic submission.

Verification boundary: A fake object-storage replay preserved original bytes; offline AWS SDK presigning confirmed `if-none-match` is included in `X-Amz-SignedHeaders`. No real AWS request, bucket policy or deployed storage configuration was exercised. Require production CORS to allow `If-None-Match`; consider a bucket policy that requires conditional writes and restricts delete permissions.

Residual: Conditional S3 write applies to the current object version. This phase did not verify bucket versioning, delete-marker behavior, IAM principals, or object retention. The implementation does not claim protection from other principals with delete/write permissions.

#### S02 - Medium: Resume validation uses metadata and shallow signatures without content scanning

**VERIFIED**; engineering priority P2.

Evidence: [hiringloop-backend/src/modules/applications/use-cases/public-application-use-cases.js:234](../../hiringloop-backend/src/modules/applications/use-cases/public-application-use-cases.js#L234); [hiringloop-backend/src/modules/applications/storage/aws-s3-application-storage.js:72](../../hiringloop-backend/src/modules/applications/storage/aws-s3-application-storage.js#L72).

Root cause: Submission now compares metadata/declared size and checks a short format signature (PDF, OLE DOC, ZIP DOCX). It does not parse document structure, inspect the full archive, scan for malware, or quarantine. Size is enforced before reservation and again against S3 HEAD before acceptance, but the presigned PUT itself is not capped at the storage boundary.

Impact: Malicious or mislabeled files can reach staff downloads; actual malware acceptance not tested.

Recommended fix: If threat model requires it, add safe document parsing and malware scanning/quarantine, plus a storage-supported upload size policy (e.g. presigned POST policy) without granting public object-store credentials.

Validation: MIME mismatch, malformed document and harmless malware-test fixtures; enforce access gate.

#### S03 - Medium: Invitation HTML interpolates tenant-controlled organization name

**VERIFIED**; engineering priority P2.

Evidence: [hiringloop-backend/src/modules/auth/email/email-delivery.js:141](../../hiringloop-backend/src/modules/auth/email/email-delivery.js#L141); [hiringloop-backend/src/modules/organizations/schemas/organization-schemas.js:19](../../hiringloop-backend/src/modules/organizations/schemas/organization-schemas.js#L19).

Root cause: Organization name is bounded text but is inserted unescaped into HTML email.

Impact: Tenant Admin can inject markup into invitation email; phishing/layout effects depend on mail-client sanitization. Script execution not claimed.

Recommended fix: HTML-escape untrusted strings with a tested template renderer.

Validation: Invite with tag, quote, ampersand and link payloads; confirm rendered text.

#### S04 - Medium: Anonymous applications can overwrite an existing candidate profile by email

**VERIFIED**; engineering priority P2.

Evidence: [hiringloop-backend/src/modules/applications/repositories/application-repository.js:91](../../hiringloop-backend/src/modules/applications/repositories/application-repository.js#L91); [hiringloop-backend/src/modules/candidates/domain/candidate-management-dto.js:1](../../hiringloop-backend/src/modules/candidates/domain/candidate-management-dto.js#L1).

Root cause: Public submission upserts by organization and normalized email, updating firstName, lastName and phone without proof of mailbox ownership. Application submitted snapshots exist but candidate views use current profile.

Impact: A successful application to another job can alter shared candidate identity/contact presentation. Duplicate same-job applications roll back; cross-job case remains.

Recommended fix: Treat submitted identity as untrusted per-application data or require verified ownership before canonical profile replacement.

Validation: Submit two jobs using same normalized email and different names/phones; verify approved identity policy.

#### S05 - Medium: Email-provider failures can weaken enumeration-safe acknowledgements

**INFERRED**; engineering priority P2.

Evidence: [hiringloop-backend/src/modules/auth/use-cases/forgot-password.js:24](../../hiringloop-backend/src/modules/auth/use-cases/forgot-password.js#L24); [hiringloop-backend/src/modules/auth/use-cases/resend-verification.js:21](../../hiringloop-backend/src/modules/auth/use-cases/resend-verification.js#L21); [hiringloop-backend/src/modules/auth/use-cases/register-user.js:26](../../hiringloop-backend/src/modules/auth/use-cases/register-user.js#L26).

Root cause: Ineligible identities immediately receive accepted; eligible identities call provider and expose 503 on failure. Registration also has different hash/provider timing.

Impact: During provider outage or through timing, account eligibility may be inferred. Not measured; rate limiting reduces throughput.

Recommended fix: Return a uniform public acknowledgement after durable delivery request and monitor failures internally.

Validation: Compare existent/inexistent responses under injected provider failures and timing samples.

#### S06 - Medium: Abuse limits depend on process count and reverse proxy setup

**INFERRED**; engineering priority P2.

Evidence: [hiringloop-backend/src/middleware/rate-limit.js:153](../../hiringloop-backend/src/middleware/rate-limit.js#L153); [hiringloop-backend/src/app.js:15](../../hiringloop-backend/src/app.js#L15).

Root cause: Limiters use in-memory stores; all forwarded IPs are deliberately untrusted.

Impact: Multiple API replicas have independent budgets; a reverse proxy can collapse users into one apparent IP. Deployed topology is unknown.

Recommended fix: Define trusted proxy boundary and use a shared limiter store when replicas/proxies require it.

Validation: Multi-instance and proxy tests for spoof resistance, fair per-client limits and outage behavior.

## INFERRED

Production browser session behavior depends on TLS/site topology and third-party cookie policy because SameSite=None is used. Provider failure/timing may weaken enumeration safety despite generic successful acknowledgements. Database grants, bucket policy and hosting headers could mitigate or worsen risks but are not in this repository.

## NOT VERIFIED / UNKNOWN

Phase 3E reproduced scoped local test and PostgreSQL results for resume storage; see [23-resume-storage-security-verification.md](23-resume-storage-security-verification.md). Real S3, deployed IAM/bucket policy, CORS, versioning and production behavior remain unverified. Historical baseline test results outside that scope are not current verification.

No penetration testing, CVE/advisory lookup, credential scanning of history, CSP/HTTP-header inspection on a live host, IAM review or provider audit was performed. Security severity is scoped to source behavior. No claim of compliance or secure production operation is made.
