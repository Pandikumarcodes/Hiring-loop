# Phase 05 Handoff — Authentication

## 1. Objective and status

Phase 05 delivers global HiringLoop identity authentication and is COMPLETE at
the implementation and automated-verification level. Manual browser QA remains
an explicit operator checklist.

## 2. Final architecture

The backend remains a Node.js + Express modular monolith in the flow
Route → Middleware → Controller → Use Case → Repository → Prisma → PostgreSQL.
Prisma access is confined to the auth repository. Provider SDK access is behind
the email and Google adapters. The frontend remains React + TypeScript + Vite,
feature-first, with auth code under `src/features/auth` and guards under
`src/app/router`.

## 3. Capabilities and endpoints

Implemented backend capabilities are registration, verification/resend, password
login, `/auth/me`, logout, revoke-all, forgot/reset password, password change,
Google OIDC, credentialed CORS, strict Origin validation, CSRF, and rate limits.

| Method | Endpoint | Result/security |
|---|---|---|
| POST | `/api/v1/auth/register` | Generic 202 acknowledgement |
| POST | `/api/v1/auth/verification/resend` | Generic 202 acknowledgement |
| POST | `/api/v1/auth/verify-email` | Single-use token verification |
| POST | `/api/v1/auth/login` | 200 + session cookie |
| GET | `/api/v1/auth/me` | Current user; 401 when absent/invalid |
| GET | `/api/v1/auth/csrf` | Session-bound CSRF token |
| POST | `/api/v1/auth/logout` | Auth + CSRF; 204 and revocation |
| POST | `/api/v1/auth/sessions/revoke-all` | Auth + CSRF; 204 and revocation |
| POST | `/api/v1/auth/password/forgot` | Generic 202 acknowledgement |
| POST | `/api/v1/auth/password/reset` | Single-use reset; revokes sessions |
| POST | `/api/v1/auth/password/change` | Auth + CSRF; rotates session |
| GET | `/api/v1/auth/google/start` | OIDC start; rate limited |
| GET | `/api/v1/auth/google/callback` | OIDC callback; rate limited |

## 4. Database models

`User`, `PasswordCredential`, `AuthSession`, `AuthToken`, and
`AuthProviderIdentity` are global identity models. Email, session/token hashes,
provider+subject, ownership, unique constraints, indexes, and cascade/restrict
relations are defined in Prisma and the authentication migration. Session rows
are retained after revocation. No auth session has organization or role data.

## 5. Session and password lifecycle

Sessions use 32 random-byte secrets; only SHA-256 hashes are stored. The browser
cookie is HttpOnly, `Path=/`, has no Domain, is Secure and SameSite=None in
production, and expires absolutely after seven days. There is no JWT, refresh
token, sliding expiry, Redis, or queue dependency. Passwords use Argon2id.
Registration/reset/change enforce 12–128 characters; login deliberately reaches
hash verification without imposing the registration minimum. Reset and password
change revoke old sessions; change creates a fresh session.

## 6. Email and token security

Verification and reset tokens are high-entropy, SHA-256-hashed at rest,
single-use, expiring, and replacement-invalidated. Email delivery runs after the
committed database state; provider failure returns a safe delivery error without
rolling back identity/token state. Generic responses preserve enumeration safety.

## 7. Google OIDC

`openid-client` is isolated behind an adapter using Authorization Code, state,
nonce, PKCE S256, and library validation. Google `sub` is the durable provider
key; email is not. Existing same-email password users produce
`ACCOUNT_LINKING_REQUIRED`; no silent linking occurs. No Google access, refresh,
or ID token is persisted, and only `openid email` scopes are requested. A
successful callback creates a normal HiringLoop session and redirects to `/app`.

## 8. CORS, Origin, CSRF, and rate limiting

Credentialed CORS allows exactly the configured frontend origin; wildcard
credentials are not used. Unsafe browser methods require the exact Origin in
production. Authenticated unsafe mutations require a session-bound HMAC CSRF
token verified with timing-safe comparison. Google GET callback is outside the
synchronizer-CSRF requirement. Login, registration, resend, forgot, reset,
Google start/callback, and password change have named process-local memory
limiters. Keys use IP, hashed normalized email, or user ID; raw secrets are not
keys. Proxy trust and process-local limitations are documented in backend docs.

## 9. Frontend state and routing

TanStack Query owns the single current-user server-state key. `/auth/me` is
authoritative; 401 is confirmed unauthenticated while network/5xx is retryable.
CSRF is memory-only and fetched only for authenticated mutations. There is no
Redux/Zustand auth store, localStorage/sessionStorage auth state, cookie
inspection, JWT, or provider-token storage.

Routes are `/login`, `/register`, `/verify-email`, `/forgot-password`, and
`/reset-password`. Protected routes show pending, authenticated content,
unauthenticated redirect, or retryable bootstrap error. Public login/register
redirect authenticated users to `/app`; verify/reset remain deliberate public
exceptions. Return destinations are restricted to internal `/app` paths.

## 10. Failure semantics and UI

Invalid credentials/tokens, rate limits, backend failure, delivery partial
failure, account-linking-required, and generic Google failure are mapped to safe
messages. Reset success clears frontend auth state; failed reset preserves it.
Logout clears state only on successful revocation. Forms validate, expose loading
states, use accessible labels/statuses, and are responsive. Approved colors are
the teal/slate palette: #14B8A6, #0D9488, #F0FDFA, #F8FAFC, #FFFFFF,
#0F172A, #64748B, #E2E8F0, #059669, #F59E0B, and #EF4444.

## 11. Environment contract

Backend-only secrets are `DATABASE_URL`, `TEST_DATABASE_URL`,
`AUTH_CSRF_SECRET`, SendGrid values, and Google client secret. The frontend
exposes only `VITE_API_BASE_URL`. `.env.example` files contain placeholders and
`.env` files are ignored. No credentials are included in this handoff.

## 12. Verification results

- Backend auth/non-database suite: 18 files, 96 tests PASS.
- Backend database integration: 2 files, 10 tests PASS against configured test DB.
- Frontend suite: 12 files, 114 tests PASS.
- Backend lint, format check, and Prisma validate: PASS.
- Frontend lint, format check, typecheck, and production build: PASS.
- `git diff --check`: PASS.
- Post-Phase-05 runtime hardening validates development/production CSRF
  configuration at startup, keeps SendGrid detection independent from
  `FRONTEND_ORIGIN`, and fixes the `/auth/csrf` dependency contract.
- Manual browser smoke was not run by Codex; use the checklist below.

## 13. Performance, limitations, and deferred work

Auth queries are bounded and indexed for user/session/token lookups. Rate
limiting is process-local and not distributed; deployment proxy trust must be
configured deliberately. Email delivery and Google are external failure
boundaries. Organization context, membership, RBAC/resource authorization,
tenant-scoped application data, Redis, BullMQ, realtime, and AI are explicitly
deferred. PostgreSQL + Prisma remain the source of truth.

## 14. Manual QA checklist

- Local backend `.env` must provide `FRONTEND_ORIGIN` and a 32+ character
  `AUTH_CSRF_SECRET`; SendGrid and Google values are optional unless tested.
- Restart the backend after changing `.env`, then restart the frontend if needed.
- Log in: expect `POST /api/v1/auth/login` 200 and a session cookie.
- Expect `GET /api/v1/auth/me` 200 while signed in.
- Expect `GET /api/v1/auth/csrf` 200 with `data.csrfToken`.
- Send logout with the cookie, exact Origin, and `X-CSRF-Token`; expect 204.
- After logout, expect `GET /api/v1/auth/me` 401 `UNAUTHENTICATED`.
- Register a new account; confirm generic response and delivery behavior.
- Verify email; test invalid and expired links, then resend.
- Log in, refresh `/app`, and log out; verify protected/public transitions.
- Request forgot password; reset with valid/invalid/expired token.
- Confirm reset clears auth; confirm password change rotates the session.
- Complete Google login and test same-email account-linking-required behavior.
- Test mobile auth layout, keyboard/focus flow, validation, and accessible errors.
- Stop the backend and confirm bootstrap shows retryable offline state.
- Trigger a rate limit and verify safe 429 UX and `Retry-After` handling.
- Check browser console and backend logs for secrets, tokens, or passwords.

## 15. Next phase prerequisites

Before Phase 06, preserve global identity/session boundaries and add organization
context only through approved tenant architecture. Do not couple auth sessions
to organization membership or introduce RBAC/product authorization in Phase 05.
