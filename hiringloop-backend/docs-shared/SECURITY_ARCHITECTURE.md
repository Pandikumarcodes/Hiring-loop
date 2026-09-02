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

Architectural requirements only:

- password credentials must use an approved slow password-hashing algorithm; plaintext or reversible password storage is prohibited;
- sessions must be secure, revocable, expire, and rotate where appropriate;
- browser session cookies should be `HttpOnly`; `Secure` is required in production; `SameSite` must be selected deliberately for the deployment and CSRF model;
- session expiration, idle behavior, refresh, revocation, and concurrent-session policy require explicit implementation decisions;
- Google OAuth should use state protection and PKCE where appropriate, with redirect URI validation and server-side token protection;
- email verification and password-reset tokens must be short-lived, single-use, protected in storage, and resistant to account enumeration;
- authentication errors should be generic enough to avoid revealing whether an account exists;
- login, logout, reset, verification, provider-link, and suspicious-session events should be auditable according to the audit policy.

The backend now implements password login, required opaque-session
authentication, a seven-day PostgreSQL session cookie, current-session logout,
and revoke-all session lifecycle behavior. CSRF enforcement and authorization
remain later-phase work. Required authentication hashes the cookie secret before
a minimal one-query session/User lookup and rejects missing, unknown, expired,
or revoked sessions with generic 401 semantics. `POST /api/v1/auth/logout`
revokes the current session by its trusted session and user IDs, retains the
row, then clears the cookie. `POST /api/v1/auth/sessions/revoke-all` revokes all
active sessions for the authenticated User, including the current session.
Cookie clearing uses the issuance attributes, including the production
`__Host-`/Secure policy. Database revocation must succeed before either route
reports success. Requests authenticated before revocation may finish, while
later authentication attempts fail. The resulting request context represents
global User identity only; it carries no tenant or RBAC information.

Phase 05H adds enumeration-resistant forgot-password handling, single-use
SHA-256-hashed 30-minute password-reset tokens, and authenticated password
change. Forgot-password eligibility is limited to global Users with a
PasswordCredential; unknown and provider-only accounts receive the same `202`
acknowledgement and cause no token or email. Forgot-token replacement commits
before email delivery, so a provider failure does not roll back the committed
token. A successful reset atomically consumes the token, updates the Argon2id
credential, invalidates competing reset tokens, and revokes all sessions
without creating a replacement. Password change verifies the current
credential, then atomically updates the credential, revokes all sessions, and
creates one fresh session for the current browser. Raw passwords, reset
secrets, hashes, cookies, and reset URLs are not logged or returned. These
flows do not resolve organization or membership context.

Phase 05I adds backend-only Google OpenID Connect authentication at
`GET /api/v1/auth/google/start` and `/callback`. The adapter uses discovery,
authorization-code exchange, state, S256 PKCE, and nonce validation through
`openid-client` 6.x. A signed, short-lived, HttpOnly transaction cookie binds
the browser transaction; OAuth tokens, ID tokens, codes, state, nonce, and the
PKCE verifier are never persisted. Google `sub` is the durable
`GOOGLE`/`providerSubject` key. A validated `email_verified: true` claim may
set `User.emailVerifiedAt` for a newly created User; established verification
state is never overwritten. A matching HiringLoop email without a matching
provider identity produces `ACCOUNT_LINKING_REQUIRED`; Google is never
silently linked by email. Successful provider authentication creates the same
seven-day opaque PostgreSQL AuthSession and cookie used by password login.
No organization, membership, RBAC, or Google API access is involved.

### Phase 05K authentication rate limiting

Authentication abuse-sensitive endpoints use named, endpoint-specific
`express-rate-limit` v8.7.0 MemoryStore policies. Counters are process-local,
reset on restart/deploy, and not coordinated across instances; Redis or another
distributed store remains deferred until horizontal scaling requires it. The
full policy table, privacy-preserving key strategy, standardized `RateLimit`
headers, structured `429 RATE_LIMITED` response, and safe `trust proxy = false`
deployment requirement are recorded in
[`AUTHENTICATION_RATE_LIMITING.md`](AUTHENTICATION_RATE_LIMITING.md).

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

If browser credentials are cookie-based, state-changing requests need a deliberate CSRF defense appropriate to the chosen session and SameSite model. SameSite alone must not be assumed sufficient without deployment review.

### CORS

Allow only approved frontend origins and methods/headers required by the product. Avoid wildcard credentialed CORS. Public and authenticated API CORS policies may differ.

### Security headers

Adopt security headers appropriate to the deployment, including a considered Content Security Policy, frame protections, content-type sniffing protection, referrer policy, and transport security. Exact header policy is deferred to implementation and deployment review.

### Cookies

Use HttpOnly for session cookies, Secure in production, deliberate SameSite behavior, narrow domain/path scope, expiration, and rotation/revocation controls. Do not store sensitive session material in browser-accessible storage without an approved threat-model decision.

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

### Phase 05J browser request hardening

Credentialed CORS is restricted to the exact configured `FRONTEND_ORIGIN`; no
wildcard or arbitrary Origin reflection is used. Unsafe methods are Origin
validated before route authentication. Pre-authentication mutations use Origin
validation only, while authenticated mutations require Origin, a valid opaque
session, and a session-bound HMAC synchronizer token from `X-CSRF-Token`.
`GET /api/v1/auth/csrf` returns the token after authentication. Production
requires the independent `AUTH_CSRF_SECRET`; no CSRF persistence, Redis, or
extra database query is used. Missing Origin is explicitly accepted only in
development/test for non-browser callers. Safe methods, including Google OIDC
start/callback, do not require synchronizer tokens because the OAuth flow uses
state, PKCE, and nonce. See [CORS_CSRF_HARDENING.md](CORS_CSRF_HARDENING.md).

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

## Deferred and Proposed Decisions

The following require later product/security/implementation decisions:

- CSRF enforcement and additional session lifecycle operations such as listing
  or session-management UI;
- fixed versus custom roles and the final permission matrix;
- private-feedback visibility and candidate self-service;
- audit-log audience, retention, export, and redaction;
- file retention, malware scanning provider, and deletion behavior;
- public anti-spam controls and accessibility tradeoffs;
- organization owner behavior and organization switching;
- exact CORS, CSP, rate-limit, and monitoring thresholds;
- provider webhook verification and reconciliation policy.
