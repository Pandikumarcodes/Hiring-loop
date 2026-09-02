# ADR-008 — Authentication Credentials and Single-Use Tokens

## Status

Accepted

## Context

Phase 05 requires self-registration, password authentication, email
verification, and password recovery. The existing User model is global identity
only and has no credential or token persistence.

## Decision

Self-registration accepts only normalized email and password. Normalization
trims surrounding whitespace and lowercases the complete email. Provider-specific
rewrites such as Gmail dot removal or plus-address removal are not performed.
Database uniqueness enforces one account per normalized email. Registration does
not create an Organization or OrganizationMembership.

Password credentials use Argon2id behind a password-hasher abstraction. Use cases
must not depend directly on the hashing library. Plaintext, reversible
encryption, SHA-256, and other fast general-purpose password hashes are not
permitted.

Use one purpose-scoped auth-token persistence concept with purposes
`EMAIL_VERIFICATION` and `PASSWORD_RESET`. Persist only a cryptographic hash of
each random token, together with user, purpose, expiry, consumption, and creation
metadata. Verification tokens expire after 24 hours; reset tokens expire after
30 minutes. Tokens are single-use. Replacements invalidate previous active
tokens for that user and purpose.

Email verification is separate from authentication. A User may authenticate
while unverified; future sensitive operations may apply a separate
`requireVerifiedEmail` policy.

Forgot-password requests have identical public semantics for known and unknown
emails. A valid reset atomically consumes the token, updates the password,
invalidates competing reset tokens, and revokes all sessions. Raw tokens never
appear in logs or API responses.

Email delivery is an authentication-owned port. The intended adapter is
SendGrid, but auth business logic must not depend directly on SendGrid APIs.
Provider failure must not corrupt identity or session state, and queues are not
introduced for this phase.

## Consequences

- Password and token material remain protected at rest and across DTO/log
  boundaries.
- Database uniqueness and transactional token consumption protect concurrent
  lifecycle operations.
- Registration, verification, reset, and resend endpoints require abuse
  controls and generic responses.
- A broad account-status state machine is intentionally not introduced.
