# ADR-007 — Opaque PostgreSQL Sessions and Browser Security

## Status

Accepted

## Context

HiringLoop has separate Vercel frontend and Render backend applications, with
PostgreSQL as the authoritative store. Browser authentication needs immediate
revocation and compatibility with the existing `apiRequest()` cookie-credentials
seam. Redis is not session storage.

## Decision

Use server-stored opaque sessions for browser authentication. Each successful
password or Google authentication creates a cryptographically random session
secret. The browser sends it in a host-only HttpOnly cookie; the backend stores
only a hash of the secret in PostgreSQL and checks expiry and revocation before
establishing authenticated User identity.

Do not use browser JWT access/refresh tokens. Sessions have a seven-day absolute
lifetime, no sliding expiration, and no remember-me option initially. Password
reset and password change revoke all existing sessions. Logout revokes the
current session. Password change creates a fresh session for the current browser.

The intended production cookie policy is HttpOnly, Secure, SameSite=None,
Path=/, no explicit Domain, and preferably a `__Host-` prefix where runtime
configuration permits. Development may explicitly use Secure=false when local
HTTP is unavoidable. Cookie settings are centralized in configuration.

Credentialed CORS uses an exact allowlist of approved frontend origins. A
wildcard origin is never combined with credentials.

For every unsafe method (POST, PUT, PATCH, DELETE), browser-originated requests
must pass strict allowed-Origin validation. Authenticated unsafe requests must
also provide a per-session synchronizer CSRF token in a custom header. JSON
request bodies remain the supported authentication API input. SameSite is
defense-in-depth, not the sole CSRF control. Fetch Metadata checks may be added
as optional defense-in-depth where supported.

## Consequences

- PostgreSQL is authoritative for session validity and revocation.
- Protected requests normally perform one bounded session lookup and do not
  load all sessions.
- Horizontal backend instances share session truth through PostgreSQL.
- Cookie authentication requires deliberate CORS and CSRF configuration.
- Authentication middleware establishes User identity only; it does not resolve
  organization membership, RBAC, or resource policy.
- Session cleanup and distributed abuse controls remain separate concerns.

## Alternatives Considered

JWT access/refresh tokens were rejected for browser authentication because
revocation, rotation, replay detection, stale claims, and browser storage would
add complexity before a demonstrated need exists. In-memory sessions were
rejected because they do not survive process replacement or coordinate across
instances.

## Revisit Conditions

Revisit only with evidence of independent API consumers, measured database
session-lookup pressure, or a deployment/security requirement that cannot be
met by PostgreSQL-backed opaque sessions.
