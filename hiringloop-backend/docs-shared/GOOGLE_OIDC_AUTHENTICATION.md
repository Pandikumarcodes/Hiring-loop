# Google OIDC Backend Authentication

Phase 05I implements confidential-server Google OpenID Connect authentication.

## Configuration

Set `GOOGLE_OIDC_CLIENT_ID`, `GOOGLE_OIDC_CLIENT_SECRET`, and
`GOOGLE_OIDC_REDIRECT_URI` together to enable the integration. The redirect URI
must be registered with Google and must match the configured callback exactly.
`FRONTEND_ORIGIN` supplies the fixed success (`/app`) and failure (`/login`)
redirect destinations. No request parameter can select a redirect destination.

## Flow

`GET /api/v1/auth/google/start` performs discovery, creates a fresh state,
nonce, and S256 PKCE verifier/challenge, stores the signed transaction in a
10-minute HttpOnly SameSite cookie, and redirects to Google with only `openid`
and `email` scopes.

`GET /api/v1/auth/google/callback` validates the transaction before exchanging
the authorization code. `openid-client` performs authorization-response,
issuer, audience, signature, nonce, and PKCE validation. The application then
projects only Google `sub`, email, and the validated `email_verified` claim.

The first lookup is `(provider: GOOGLE, providerSubject: sub)`. Existing
provider identities authenticate their associated global User. For a new
provider identity, a unique normalized email is created atomically with its
`AuthProviderIdentity`; no password credential, organization, membership, role,
or permission is created. A true validated `email_verified` claim sets
`emailVerifiedAt` only for that newly created User.

An existing HiringLoop User with the same normalized email is never silently
linked. The callback clears the transaction and redirects to
`/login?oauth=account-linking-required`, without exposing email, subject, or
internal IDs and without issuing a session.

Successful authentication creates the normal seven-day opaque HiringLoop
`AuthSession` and session cookie. Google access tokens, refresh tokens, ID
tokens, authorization codes, state, nonce, and PKCE verifiers are not persisted.
Google Calendar/API access is outside this phase.

Organizations, memberships, tenant resolution, RBAC, resource authorization,
CSRF synchronizer middleware, CORS hardening, and rate limiting remain later
work.
