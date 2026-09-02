# Phase 05J CORS and CSRF hardening

The API uses credentialed CORS with one exact allowlisted `FRONTEND_ORIGIN`.
The server never returns `*` with credentials and never reflects arbitrary
Origin values. Preflight allows only declared API methods and
`Content-Type`, `X-Request-ID`, and `X-CSRF-Token` headers.

`POST`, `PUT`, `PATCH`, and `DELETE` requests with an Origin must exactly match
the configured frontend origin. In production, unsafe requests must include an
Origin. Development and test explicitly allow missing Origin for CLI and
server-to-server callers; a supplied Origin is still exact-match validated.

Pre-authentication mutations (registration, login, verification, resend,
forgot, and reset) require the Origin policy but do not require a CSRF token.
Authenticated mutations (`logout`, `sessions/revoke-all`, and
`password/change`) run in this order: Origin validation, session
authentication, then CSRF validation.

After authentication, clients call `GET /api/v1/auth/csrf` and keep the opaque
response token in memory/server state. Authenticated mutations use
`credentials: include` and `X-CSRF-Token`. The token is `v1.` followed by a
base64url HMAC-SHA-256 digest of `v1:<session-id>` using the separate
`AUTH_CSRF_SECRET` (at least 32 characters in production). No raw session
secret, password, token, or HMAC material is stored or logged. Revoked and
rotated sessions automatically invalidate old tokens. No Redis or database
CSRF persistence is required.

`401 UNAUTHENTICATED` means the session is absent or invalid. `403
CSRF_INVALID` means the session authenticated but the required CSRF proof did
not validate. Browser CORS rejection may occur before JavaScript receives an
application response. Google start and callback remain safe GET navigations and
use OAuth state, PKCE, nonce, and the transaction cookie instead.
