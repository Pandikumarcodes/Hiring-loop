# 11 - Integrations and AI

Analysis date: 2026-10-17. Static repository investigation; no application execution, dependency installation, migrations, services, or deployment. Source presence is not proof of runtime success.

## VERIFIED

### AI scope

No implemented LLM provider/SDK, prompt registry, structured-output agent, tool-calling pipeline, RAG, embeddings or vector store was found in inspected application dependencies/source. AI is explicitly deferred in [PROJECT_STATE.md:128](../../PROJECT_STATE.md#L128) and [PROJECT_INSTRUCTIONS.md:17](../../PROJECT_INSTRUCTIONS.md#L17). This is repository-scope evidence; an external/private AI service is unknown.

| Integration | Call sites / configuration | Data and behavior | Failure / privacy considerations |
| --- | --- | --- | --- |
| SendGrid | @sendgrid/mail 8.1.6; EMAIL_PROVIDER, SENDGRID_API_KEY, AUTH_EMAIL_FROM and FRONTEND_ORIGIN. [hiringloop-backend/src/modules/auth/email/email-delivery.js:1](../../hiringloop-backend/src/modules/auth/email/email-delivery.js#L1) | Verification/reset/invitation messages include recipient and short-lived link. Candidate email/offer includes candidate address and staff-authored content/terms. API awaits provider calls. A success response means provider acceptance, not inbox delivery; provider message ID is stored for candidate communication. | Phase 3D classifies explicit 4xx rejection except 408, known pre-transmission DNS/connect failures, and ambiguous timeout/reset/408/5xx/unknown errors. No automatic retry for PENDING; no timeout/backoff/outbox/reconciliation/webhook found. E08 synchronous classification repaired; S03 unescaped invitation name remains. Real delivery/bounce/domain configuration unknown. |
| Development/test email | [hiringloop-backend/src/modules/auth/auth-module.js:39](../../hiringloop-backend/src/modules/auth/auth-module.js#L39); [hiringloop-backend/src/modules/auth/email/email-delivery.js:252](../../hiringloop-backend/src/modules/auth/email/email-delivery.js#L252) | Tests use in-memory delivery; explicit development console provider logs complete links/messages; unavailable provider throws. Production forbids console. | No real mail is proven by in-memory tests. Development logs contain sensitive content by design; never printed in this audit. |
| AWS S3 | @aws-sdk/client-s3 and presigner 3.1127.0; bucket/region and upload TTL config. [hiringloop-backend/src/modules/applications/storage/aws-s3-application-storage.js:1](../../hiringloop-backend/src/modules/applications/storage/aws-s3-application-storage.js#L1) | Normal AWS credential-provider chain; lazy S3 client. Signed PUT accepts PDF/DOC/DOCX metadata, requires signed `If-None-Match: *`, and has a 300-600 second TTL. API reservation/HEAD enforces declared and actual size <=5MiB before application acceptance; a ranged GET checks a short format signature. Staff GET signed URL lasts 300 seconds. | Phase 3E closes same-key signed-URL replay overwrite for current objects using S3 conditional writes. No real AWS request or deployed policy was tested. Production CORS must allow `If-None-Match`; recommend bucket policy requiring conditional writes and restrict delete/write principals. Size is not bounded during PUT itself. S02 full parsing/malware scanning remains. No application-configured IAM, encryption, lifecycle/versioning/retention, explicit timeout/retry policy or object deletion found. |
| Google identity | openid-client 6.8.7; complete OIDC ID/secret/redirect URI required. [hiringloop-backend/src/modules/auth/google/google-oidc-provider.js:1](../../hiringloop-backend/src/modules/auth/google/google-oidc-provider.js#L1) | Discovery config promise reused; state/nonce/PKCE; scopes openid email; verified sub/email; local opaque session. Signed transaction cookie expires in 10 minutes. | No provider access/refresh token persistence found. Matching existing email requires explicit future linking. No configured application-level discovery retry/reset or timeout policy; rejected cached discovery promise can persist until process restart. |
| PostgreSQL | Prisma/adapter-pg 7.10, pg 8.23; DATABASE_URL and isolated TEST_DATABASE_URL. [hiringloop-backend/src/database/client.js:1](../../hiringloop-backend/src/database/client.js#L1) | Authoritative state, SQL integrity guards and analytics. Singleton adapter. | No explicit pool budget/TLS policy at construction. Connection-string/host/provider configuration not inspected. |

### Missing integration categories

No implemented Redis/BullMQ queue, cron scheduler, calendar sync, meeting-provider provisioning, inbound email/webhook processing, payments or e-signing adapter was found. Stored meeting URLs are user-supplied links, not evidence of a Zoom/Meet integration. Offers are emailed and staff record decisions; no candidate portal signing endpoint was found. [hiringloop-backend/src/modules/interviews/schemas/interview-schemas.js:55](../../hiringloop-backend/src/modules/interviews/schemas/interview-schemas.js#L55); [hiringloop-backend/src/modules/offers/routes/offer-routes.js:1](../../hiringloop-backend/src/modules/offers/routes/offer-routes.js#L1); [PROJECT_STATE.md:94](../../PROJECT_STATE.md#L94).

## INFERRED

Candidate contact details, resumes and offer contents cross organizational/provider trust boundaries. Data handling, provider retention and residency require deployment policy; there is no implemented AI privacy or prompt-injection surface to assess. No token/cost/evaluation claims are applicable to absent AI implementation.

## NOT VERIFIED / UNKNOWN

Phase 3E verified local unit/HTTP and PostgreSQL suites; real AWS requests, bucket configuration, browser-to-S3 CORS behavior and production were not tested. Historical baseline statements above are superseded for the scoped resume upload behavior by [23-resume-storage-security-verification.md](23-resume-storage-security-verification.md).

Provider account configuration, webhook settings outside this repository, email delivery/bounce status, AWS credentials/IAM, bucket controls, cloud cost and third-party contracts were not accessed.
