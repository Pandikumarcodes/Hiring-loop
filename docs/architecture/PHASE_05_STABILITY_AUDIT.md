# Phase 05 Post-Completion Stability Audit

## Result

Phase 05 remains COMPLETE after runtime hardening. The previously observed CORS
and `/auth/csrf` failures were wiring/configuration defects. Non-test backend
startup now requires `DATABASE_URL`, `FRONTEND_ORIGIN`, and a 32-character
`AUTH_CSRF_SECRET`; PostgreSQL is connected before the HTTP listener starts.
Development Vite startup requires `VITE_API_BASE_URL`.

## Deterministic local contract

Use one canonical pair: `http://localhost:5173` and `http://localhost:3000`.
`FRONTEND_ORIGIN` must exactly match the browser origin;
`http://127.0.0.1:5173` is not implicitly allowed. The development session
cookie is `hiringloop_session`, HttpOnly, Secure=false, SameSite=Lax, Path=/.

Start PostgreSQL, then the backend, then Vite. Restart the backend after
changing `.env`; its process-local rate-limit counters reset on restart. Clear
site data for both localhost ports only when intentionally removing stale
cookies/cache. Do not reset the database.

Registration commits User, PasswordCredential, and the verification token before
email delivery. Without SendGrid, `503 EMAIL_DELIVERY_FAILED` is expected; the
account still exists and can password-login. Verification/resend requires a
supported email-delivery configuration. Raw tokens are never exposed for local
convenience.

## Manual sequence

1. Register a new address. Expect `202` with delivery configured, or `503
   EMAIL_DELIVERY_FAILED` without SendGrid.
2. Log in with the same credentials. Expect `200` and an HttpOnly cookie;
   `emailVerified: false` does not prevent login.
3. Refresh `/app`; `/auth/me` must return `200`, not a login flash.
4. Fetch/use `/auth/csrf`, then log out. Expect `204`; `/auth/me` with the old
   cookie must return `401 UNAUTHENTICATED`.
5. Log in and log out repeatedly. Each login receives a fresh session.
6. Treat network/5xx bootstrap errors as retryable service failures, `403
   CSRF_INVALID` as a stale/missing token, and `429 RATE_LIMITED` as policy.

## Status guide and limits

`200` is successful login/me/CSRF or lifecycle work, `202` is an accepted
registration/recovery/resend acknowledgement, `204` is successful
logout/revoke-all, `400` is validation, `401 UNAUTHENTICATED` is absent or
invalid session, `401 AUTHENTICATION_FAILED` is invalid credentials, `403
CSRF_INVALID` is a bad session-bound token, `429 RATE_LIMITED` is an abuse
limit, `503 EMAIL_DELIVERY_FAILED` is a committed operation with external
delivery failure, and `500` is an unexpected defect.

Limits are process-local: login 10/15m, register/resend/forgot 5/60m, reset
10/15m, Google start 20/15m, callback 30/15m, and password change 10/15m.

## Verification evidence

Backend unit/auth suite: 106 tests pass. Frontend suite: 114 tests pass.
Backend lint, format, and Prisma validation plus frontend lint, format,
typecheck, and production build pass. The composed lifecycle test uses real
backend app/module composition and runs with `TEST_DATABASE_URL`. No dependency
was installed, no database was reset, no migration was added, and Phase 06 was
not started. SendGrid and Google remain intentional optional external-service
limitations; later organization/RBAC/product concerns remain deferred.
