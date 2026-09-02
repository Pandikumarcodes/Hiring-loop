# Phase 05K authentication rate limiting

HiringLoop uses endpoint-specific `express-rate-limit` v8.7.0 middleware as an
abuse-control layer around authentication workflows. It does not authenticate,
authorize, establish tenant context, replace CSRF/CORS/Origin checks, or create
account lockout state.

## Initial policies

| Endpoint category | Limit | Window |
|---|---:|---:|
| Login | 10 | 15 minutes |
| Registration | 5 | 60 minutes |
| Verification resend | 5 | 60 minutes |
| Forgot password | 5 | 60 minutes |
| Reset password | 10 | 15 minutes |
| Google OIDC start | 20 | 15 minutes |
| Google OIDC callback | 30 | 15 minutes |
| Authenticated password change | 10 | 15 minutes |

Login has two independent limits: per-IP and per-IP plus a SHA-256 fingerprint
of the normalized email. Registration and Google use IP-only limits. Resend
and forgot-password use IP plus the normalized-email fingerprint. Reset uses
IP-only and never uses the submitted reset token. Password change uses the
trusted authenticated user ID plus IP. No limiter queries PostgreSQL merely to
construct a key.

Email fingerprints are derived after `normalizeEmail()` and are internal,
one-way keys only. Passwords, reset/verification tokens, OAuth code/state/nonce,
and PKCE values are never keys, logged, persisted, or returned to clients.
Malformed or unavailable email input safely falls back to the IP key.

## Middleware and responses

Request correlation, credentialed CORS, and Origin validation remain global
middleware. Public auth request validation runs before its limiter, followed by
the controller/use case. Login therefore reaches its limiter before Argon2
verification. Google start/callback are rate-limited before provider/OIDC work.
Authenticated password change runs Origin validation, session authentication,
CSRF validation, request validation, then its limiter; `/auth/me` and
`/auth/csrf` are intentionally not restricted by these abuse limits.

Every rejection is HTTP `429` with the normal HiringLoop envelope:

```json
{
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests. Please try again later.",
    "requestId": "..."
  }
}
```

The installed library is configured with standardized `RateLimit` headers
(`standardHeaders: 'draft-8'`) and no legacy `X-RateLimit-*` headers. It emits
`Retry-After` when rejecting a request. Keys are not exposed.

## IP and storage boundary

Express is explicitly configured with `trust proxy = false`. Arbitrary client
`X-Forwarded-For` values therefore do not select the limiter identity. If the
Render/reverse-proxy deployment later needs the real client IP, its exact
trusted-hop or trusted-proxy contract must be established and tested before
changing this setting; broad `trust proxy = true` is not acceptable.

The default `express-rate-limit` MemoryStore is process-local. Counters reset on
restart/deploy and are not coordinated across horizontally scaled instances.
This is suitable for the current single-instance direction, but it is not
globally distributed protection. Redis or another distributed store is
deliberately deferred until horizontal scaling makes it necessary.

Rate limiting counts all login requests, including successful requests. This
keeps the initial policy predictable and prevents expensive password work from
being flooded without implementing permanent account lockout.
