# HiringLoop Threat Model

This practical threat model records important assets, attack paths, impact, architectural controls, and future implementation requirements. It is a planning artifact, not a penetration test or implementation checklist.

| Threat | Asset | Attack path | Impact | Existing architectural control | Future implementation requirement |
|---|---|---|---|---|---|
| Cross-tenant data leakage | Candidates, applications, jobs, documents, offers | Organization B supplies an Organization A ID or abuses a nested lookup | Confidential recruiting data exposure | Membership-derived tenant context; tenant-scoped ownership | Scope every query/use case; test direct, nested, search, bulk, worker, and file paths |
| IDOR / broken object-level authorization | Any resource addressed by ID | Authenticated user guesses or receives another resource ID | Unauthorized read/change/delete | Resource-level policy in addition to RBAC | Authorize every object after tenant check; avoid existence leakage |
| Privilege escalation | Membership, roles, permissions, offers, audit | User changes own role, invites elevated user, or exploits role assignment | Expanded tenant control or confidential access | Membership-context authorization; least privilege; auditability | Server-side permission matrix, protected role changes, negative tests |
| Session theft/fixation | Sessions and authenticated account | Token/cookie theft, fixation, unsafe browser storage | Account takeover | Secure session direction, HttpOnly/Secure/SameSite, rotation | Regeneration, revocation, expiry, CSRF defense, incident response |
| Brute force/login abuse | Accounts and auth service | Repeated login/reset/provider attempts | Account takeover, service exhaustion, enumeration | Generic auth errors and planned rate limits | Per-account/IP/device controls, monitoring, recovery protection |
| CSRF | State-changing authenticated actions | Cross-site request causes cookie-authenticated mutation | Unauthorized changes, sends, invitations | Deliberate cookie/CSRF architecture | CSRF tokens/origin checks and tests for state changes |
| XSS | Browser sessions, candidate/employee data | Malicious form answer, note, comment, template, filename, or provider content | Session theft, data manipulation, phishing | Untrusted input and explicit output DTO/rendering direction | Encoding/sanitization, CSP, safe rich-text policy, tests |
| Public application spam/abuse | Public submission endpoint, email, storage, candidate database | Bot submits applications/files or floods requests | Cost, noise, PII pollution, provider reputation | Public boundary, rate limits, size limits, duplicate/replay concern | Abuse controls, quotas, CAPTCHA/alternatives, moderation and monitoring |
| Malicious file upload | S3 objects, users, scanners, browsers | Polyglot/malware/oversized file or path manipulation | Malware distribution, compromise, storage abuse | Private bucket, validation, random keys, scanning extension point | Content validation, malware scan/quarantine, safe download headers, cleanup |
| Unauthorized resume access | Resume/document contents | Guessed path, leaked URL, weak candidate policy | Sensitive PII exposure | Backend authorization and short-lived signed URLs | Authorize issuance, narrow scope/expiry, access logs, revoke/retention policy |
| Leaked signed URLs | Private file bytes | URL appears in logs, history, referrer, screenshots, or chat | Temporary or extended document exposure | Treat URLs as bearer capabilities | Short expiry, no logging, safe frontend handling, response policy |
| OAuth manipulation | Google OAuth identity/link flow | Forged state, redirect abuse, account-link confusion | Account takeover or wrong identity linkage | State/PKCE direction; backend provider boundary | Exact redirect allowlist, state binding, token validation, unlink/recovery tests |
| Insecure provider credentials | OAuth, email, calendar, storage credentials | Committed secret, overbroad key, leaked log/queue | Provider takeover, data exfiltration, cost | Server-side secrets and least privilege | Managed secrets, rotation, scopes, redaction, access audit |
| Sensitive log exposure | Passwords, tokens, resumes, PII, feedback, offers | Debug logging, exception capture, telemetry export | Secondary data breach | Sensitive logging prohibitions and DTO/error filtering | Redaction tests, retention/access policy, log review |
| Duplicate/replayed sensitive operations | Invitations, offers, sends, submissions, callbacks | Retry, double-click, replayed webhook, worker redelivery | Duplicate invite/send/decision or inconsistent state | Reliability guidance; transaction/consistency boundaries | Idempotency keys/records, guarded transitions, replay tests |
| External integration compromise/failure | Calendar/email/provider synchronization | Provider outage, stale/malicious response, webhook spoofing | Wrong schedule/status, data loss, secret disclosure | Provider fallibility; adapter boundary; PostgreSQL authority | Signature verification, retries/backoff, reconciliation, safe errors, audit |

## Priority Risk Themes

### Tenant isolation

Tenant isolation is the highest-order application security invariant. All resource authorization begins with authenticated membership and active Organization context. A role or resource relationship can never override a tenant mismatch.

### Confidential recruiting data

Candidate PII, resumes, private feedback, offer terms, and audit records require least-privilege access and explicit DTO filtering. “Internal” does not mean every employee can see every record.

### Public/private separation

Public career and application endpoints must expose only intentional public data. Public submissions are untrusted and may create storage, email, and workflow pressure.

### Replay and provider risk

Invitations, offers, communications, and provider callbacks need repeat-safe workflows. External provider success or failure must not bypass domain invariants or leak internal details.

## Security Review Questions

Before implementation expands, confirm:

- Which roles may access which jobs, candidates, applications, interviews, feedback, documents, offers, analytics, and audit records?
- Is access organization-wide, job-assignment-based, interview-assignment-based, or a combination?
- What information is public, candidate-facing, recruiter-facing, manager-facing, interviewer-facing, and admin-only?
- What are the retention, deletion, anonymization, and audit requirements for PII and documents?
- Which public abuse controls are acceptable and accessible?
- What is the approved session, CSRF, OAuth, provider-webhook, and signed-URL policy?

All unanswered items are **Proposed / Requires Product Decision**.
