# HiringLoop Security Architecture

## Purpose

This document establishes the security direction for HiringLoop before authentication, tenant management, file access, public APIs, and integrations are implemented. It complements [AUTHORIZATION_ARCHITECTURE.md](AUTHORIZATION_ARCHITECTURE.md) and the existing system architecture.

Security is a layered responsibility. Backend authorization is authoritative, PostgreSQL is the future source of truth, external providers are fallible, and the frontend is not trusted to enforce access. AI is a future boundary only and has no implementation or security design here.

## Trust Boundaries

| Boundary | Trust position and required treatment |
|---|---|
| Browser | Untrusted client. User input, organization IDs, UI permission state, and local state may be manipulated. |
| Public unauthenticated APIs | Internet-facing and abuse-prone. Accept only strict public DTOs and eligible public data. |
| Authenticated APIs | Still untrusted at the input boundary. Authenticate, resolve membership, authorize, validate, and filter outputs. |
| Backend | Enforcement boundary for authentication context, tenant isolation, authorization, business rules, DTOs, and provider orchestration. |
| PostgreSQL | Future authoritative domain store. Protect credentials, constrain integrity, and never expose directly to clients. |
| Redis | Future cache/coordination/queue support only. Never domain truth; protect access and minimize sensitive payloads. |
| Background workers | Server-side execution boundary. Carry minimal tenant context, authorize work, make retries safe, and protect secrets. |
| S3/object storage | Future private file boundary. Use server-side credentials, unpredictable keys, authorization, short-lived signed URLs, and validation. |
| SendGrid/email provider | External delivery boundary. Keep credentials server-side, minimize payloads, validate recipients, and treat provider responses as untrusted/fallible. |
| Google OAuth | External identity boundary. Validate state/PKCE and token/provider responses; do not treat provider claims as complete application authorization. |
| Google Calendar | External scheduling boundary. Protect OAuth tokens, verify ownership/context, and reconcile provider state into HiringLoop. |
| Future AI provider | Deferred external boundary. No provider, prompt, data flow, or model behavior is defined during software-engineering phases. |

Data must cross each boundary through explicit contracts, validation, authorization, and minimal disclosure.

## Authentication Security Direction

The approved Phase 05 authentication architecture is recorded in ADR-007,
ADR-008, and ADR-009. Authentication remains a global identity boundary and is
not organization authorization.

- password credentials use Argon2id behind a password-hasher abstraction; plaintext or reversible password storage is prohibited;
- browser authentication uses server-stored opaque PostgreSQL sessions, with only a hash of the random session secret persisted;
- sessions have a seven-day absolute lifetime, no sliding expiration initially, and are revoked on logout, password reset, and password change;
- production session cookies are HttpOnly, Secure, SameSite=None, Path=/, host-only, and have no explicit Domain; development differences are centralized in configuration;
- Google OIDC uses state, PKCE where applicable, nonce where applicable, redirect validation, issuer/audience validation, code exchange, and server-side provider-token protection;
- email verification and password-reset tokens are short-lived, single-use, hashed at rest, and resistant to account enumeration;
- authentication errors should be generic enough to avoid revealing whether an account exists;
- login, logout, reset, verification, provider-link, and suspicious-session events should be auditable according to the audit policy.

No authentication flow or credential storage is implemented here.

## Authorization Security

Authorization follows [AUTHORIZATION_ARCHITECTURE.md](AUTHORIZATION_ARCHITECTURE.md): authenticate identity, resolve active organization from membership, resolve role/permissions, apply resource-level policy, then execute the owning module's business operation. Frontend checks are UX only. Backend checks must occur on every protected path, including nested resources, bulk operations, search, file access, worker work, and provider callbacks.

RBAC provides broad capability control; resource policies handle assignment, ownership, visibility, lifecycle, candidate-facing access, private feedback, and confidential offers. ID-based lookup without tenant and policy checks is not acceptable.

## Input Validation

- Validate all external input at trust boundaries: browser, public API, authenticated API, webhook/provider callback, file upload, and worker payload.
- Server-side validation is authoritative; client validation exists only for usability.
- Zod is planned at API boundaries, but no package or implementation is introduced by this document.
- Reject unexpected fields, invalid types, malformed identifiers, unsupported enum/state transitions, oversized payloads, and invalid relationship combinations.
- Validate tenant/resource relationships, not only individual field shapes.
- Enforce upload constraints separately: size, declared MIME, filename, extension, content signature where possible, and malware-scanning status.
- Validate provider callback authenticity and replay characteristics before applying synchronization.

## Output Security

- Use explicit DTOs for every externally visible response.
- Never expose raw database/domain models by default.
- Never return password hashes, session values, reset tokens, OAuth tokens, provider credentials, internal authorization metadata, or security diagnostics.
- Minimize candidate PII and document metadata according to actor, purpose, tenant, and resource policy.
- Keep candidate-facing responses separate from organization-facing responses.
- Redact sensitive fields from errors, logs, analytics, notifications, and activity where they are not necessary.
- Avoid leaking cross-tenant existence through errors, counts, search, autocomplete, or timing where practical.

## Browser Security

### XSS

Treat candidate-submitted application content, notes, comments, template content, filenames, and provider data as untrusted. Use safe rendering and output encoding. Do not allow rich content or HTML behavior without an explicit sanitization and product decision.

### CSRF

Cookie-authenticated browser requests use layered CSRF protection: strict
allowed-Origin validation for all unsafe methods and a per-session synchronizer
token in a custom header for authenticated unsafe methods. SameSite is
defense-in-depth, not the sole control. JSON request bodies remain the
authentication API contract; Fetch Metadata may be used as optional additional
defense-in-depth.

### CORS

Use an exact allowlist of approved frontend origins and credentialed requests.
Never combine `Access-Control-Allow-Origin: *` with credentials. The policy
must support the frontend `apiRequest()` default of `credentials: include`.

### Security headers

Adopt security headers appropriate to the deployment, including a considered Content Security Policy, frame protections, content-type sniffing protection, referrer policy, and transport security. Exact header policy is deferred to implementation and deployment review.

### Cookies

Use the ADR-007 cookie policy: HttpOnly, Secure in production, SameSite=None
for the cross-site deployment, Path=/, host-only/no explicit Domain, and a
preferred `__Host-` prefix where permitted. Do not store sensitive session
material in browser-accessible storage.

## Public API Security

Public career and application endpoints are untrusted internet surfaces. They require:

- rate limiting by appropriate signals and abuse controls;
- anti-automation/spam measures selected from product needs and accessibility constraints;
- enumeration resistance for jobs, applications, candidate identities, and account-related responses;
- strict public DTOs containing only intentionally public job/form data;
- request-size and field-length limits;
- server-side form and relationship validation;
- duplicate/replay handling for public submissions;
- upload validation if applications accept files;
- safe generic errors that do not expose internal tenant or candidate data;
- monitoring and audit/abuse signals without logging unnecessary PII.

## File Security

Future object storage should be private by default. The conceptual rules are:

- use a private S3 bucket and server-side credentials;
- issue short-lived, narrowly scoped signed URLs only after backend authorization;
- validate tenant ownership and Candidate/Application/Offer context before issuing access;
- validate MIME/type, file size, extension, content signature where possible, and filename handling;
- use random/unpredictable object keys that do not expose candidate identity or tenant names;
- do not allow user-controlled paths to select arbitrary objects;
- provide a malware-scanning extension point before sensitive files are treated as available;
- record metadata and ownership in PostgreSQL later, while file bytes remain in object storage;
- define expiry, replacement, deletion, orphan cleanup, retention, and access logging before implementation;
- do not expose storage credentials or raw bucket paths to browsers.

Signed URLs are bearer capabilities: leakage must be limited by short expiry, narrow scope, referer-independent authorization, and safe handling in the frontend.

## Secrets and Credentials

- Never commit credentials, tokens, private keys, session secrets, or provider configuration containing secrets.
- Use environment-specific secret management; local development conventions must not become production practice.
- Production secrets require managed storage, access control, rotation, and audit.
- Use least-privilege credentials for PostgreSQL, object storage, email, OAuth, calendar, workers, and observability.
- Rotate credentials and revoke compromised sessions/tokens/provider connections.
- Keep provider credentials server-side and out of DTOs, logs, queues, URLs, and client bundles.
- Do not put secrets in Redis payloads or background job metadata unless an approved design requires it.

## Sensitive Logging

Never log unnecessarily:

- passwords, password-reset values, sessions, access tokens, OAuth tokens, signed URLs, or provider credentials;
- full resume/document contents;
- full application answers or unnecessary candidate PII;
- private feedback or confidential offer terms;
- raw request headers/cookies or security metadata that enables replay.

Logs should support correlation, diagnosis, and audit without becoming a second uncontrolled copy of sensitive recruiting data. Redaction and retention policies require implementation and security review.

## Security Ownership

| Layer | Primary responsibilities |
|---|---|
| Frontend | UX permission visibility, safe rendering, client-side validation, secure error presentation, and accessible security states. |
| Backend | Authoritative authentication context, authorization, tenant resolution, policy enforcement, validation, DTO filtering, rate limits, and audit generation. |
| Database later | Integrity constraints, tenant relationships, restricted credentials, and durable authoritative state. |
| Infrastructure later | TLS, secret storage, private buckets, network/provider configuration, isolation, backups, and operational access. |
| External providers | Narrow provider capabilities only; their credentials and responses remain controlled by the backend. |

No single layer is sufficient. Defense in depth must not create contradictory authorities: the backend remains the final application authorization decision point.

## Authorization and Security Flow Examples

The canonical recruiter read path is:

```text
React
  ↓
GET /candidates/:id
  ↓
Authenticate
  ↓
Resolve organization membership
  ↓
Check candidate:view
  ↓
Check candidate.organization == active organization
  ↓
Candidate service
  ↓
Tenant-scoped repository
  ↓
Explicit DTO
  ↓
Response
```

An Interviewer path adds a resource policy: the User must be assigned to an Interview for the candidate/application or otherwise satisfy the approved access rule. An Organization B request for an Organization A candidate must fail before candidate data is returned.

## Auditability

Security and business-critical actions should later produce protected AuditRecords, including login/security events, membership changes, role/permission changes, job lifecycle changes, sensitive candidate/document changes, pipeline transitions, offer actions, and administrative operations. ActivityRecords remain the user-visible recruiting timeline; they are not a substitute for the security audit log.

## Security vs Reliability

Security and reliability interact:

- retrying invitations, offer actions, communication sends, or provider callbacks can duplicate sensitive operations;
- idempotency is required conceptually for invitations, offer state changes, public submissions, provider callbacks, and other repeatable commands;
- external providers may timeout, partially succeed, replay callbacks, or report stale state;
- provider errors must not leak secrets, internal stack traces, tenant identifiers, or sensitive payloads;
- durable HiringLoop state and workflow intent should be established before or alongside asynchronous work according to the relevant consistency boundary;
- failed external work must be visible and recoverable without weakening authorization.

## Phase 05 runtime operations

Local browser authentication uses the exact origin pair
`http://localhost:5173` → `http://localhost:3000`; credentialed CORS never uses
wildcards. Non-test startup requires `DATABASE_URL`, `FRONTEND_ORIGIN`, and a
32-character `AUTH_CSRF_SECRET`, and connects PostgreSQL before accepting HTTP
requests. CSRF tokens are session-bound and memory-only on the frontend.

SendGrid is an optional external boundary for local development. A delivery
failure after registration may return `503 EMAIL_DELIVERY_FAILED` after the
User, PasswordCredential, and verification token have committed; this is not a
login failure. See `docs/architecture/PHASE_05_STABILITY_AUDIT.md` for the
operator procedure and status interpretation.

## Deferred and Proposed Decisions

The following require later product/security/implementation decisions:

- exact configured rate-limit values and email-delivery operational behavior;
- account-linking UX and whether full Google linking is included in the initial implementation;
- fixed versus custom roles and the final permission matrix;
- private-feedback visibility and candidate self-service;
- audit-log audience, retention, export, and redaction;
- file retention, malware scanning provider, and deletion behavior;
- public anti-spam controls and accessibility tradeoffs;
- organization owner behavior and organization switching;
- exact CORS, CSP, rate-limit, and monitoring thresholds;
- provider webhook verification and reconciliation policy.
