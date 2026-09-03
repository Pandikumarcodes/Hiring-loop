# HiringLoop frontend

This directory contains the HiringLoop frontend application. It is a separate
Node.js application from `hiringloop-backend/`. It provides the Phase 04
app-composition foundation, the Phase 05L authentication API/query foundation,
the Phase 05M user-facing authentication UI, and the Phase 05N protected-route
and session-bootstrap UX.

## Stack

- React
- TypeScript
- Vite
- React Router
- TanStack Query
- Oxlint and Prettier
- Vitest with Testing Library

## Prerequisites

Use a current Node.js release and npm. The repository has been verified with
Node.js 24.x and npm 11.x. No `.nvmrc` or other version-manager policy is
currently defined; introducing one should be deferred until the repository
establishes a shared runtime policy.

## Install and run

From this directory:

```sh
npm install
npm run dev
```

Vite uses its normal default port and may select another available port if
needed. The development server supports hot module replacement.

## Build and quality commands

```sh
npm run build
npm run lint
npm run format
npm run format:check
npm run typecheck
npm run verify
```

`verify` is the non-interactive frontend quality gate. It runs linting, format
checking, type checking, tests, and the production build in sequence, stopping
when a command fails. `format` writes formatting changes; use
`format:check` for a read-only check.

## Tests

```sh
npm run test            # one non-interactive test run
npm run test:watch      # watch tests during development
npm run test:coverage   # one test run with coverage output
```

## Environment

For local frontend configuration, a developer may create `.env.local` from
`.env.example`:

```sh
copy .env.example .env.local
```

Do not commit `.env.local` or add real secret values. Any `VITE_*` variable is
embedded into the browser bundle and is therefore publicly visible; it must
never contain backend credentials or other secrets. `VITE_API_BASE_URL` is
required when running the Vite development server; development startup fails
clearly when it is absent. Backend credentials belong to the
separate backend application and are not configured here.

## Shared API client

Frontend API transport lives in `src/shared/lib/apiClient.ts`. `VITE_API_BASE_URL` is a
backend origin without an API path; the shared client owns the `/api/v1`
prefix. Future feature API functions own endpoint paths and DTO types, then
call `apiRequest`; pages and components must not call `fetch` directly for
application APIs.

`ApiError` in `src/shared/lib/apiErrors.ts` exposes a safe `kind`, HTTP `status` when
available, backend `code`, safe `message` and `details`, and preserved
`requestId`. HTTP errors also preserve safe `Retry-After` and standardized
`RateLimit` header values when the backend supplies them. Empty successful
responses resolve to `undefined`. Cookie credentials are always included for
the backend-controlled HttpOnly session. Abort signals remain caller-owned and
aborted requests are distinguishable from network failures.

The client is stateless transport only. TanStack Query provides caching,
deduplication, invalidation, and background refetching through
`src/app/providers/AppProviders.tsx` and the reusable application client in
`src/app/providers/query-client.ts`. The QueryClient is created once per app, remains
in-memory, and is never persisted to browser storage.

## Authentication server-state foundation

Phase 05L authentication code is feature-owned under `src/features/auth/`:

- `types/auth.types.ts` defines only request/response DTOs from the backend contract,
  including the global `{ id, email, emailVerified }` user identity.
- `api/auth.api.ts` calls the shared `apiRequest()` transport for every HTTP auth API.
- `hooks/query-keys.ts` centralizes current-user and CSRF cache keys.
- `hooks/queries.ts` owns current-user and memory-only CSRF queries.
- `hooks/authenticated-mutation.ts` lazily obtains CSRF and supplies
  `X-CSRF-Token` to authenticated unsafe auth requests.
- `hooks/mutations.ts` owns auth mutations and their session-aware cache updates.
- `url-state.ts` safely recognizes the allowlisted `oauth` status values that
  the backend may place on the future login route.

The current user is backend server state. `useCurrentUser()` maps a successful
`/auth/me` response to `user` plus `isAuthenticated`. Only a `401` carrying
`UNAUTHENTICATED` becomes the successful unauthenticated value `null` and sets
`isUnauthenticated`; network and 5xx failures remain query errors. The query is
fresh for 60 seconds, can refetch on focus once stale, and follows the bounded
global transient-failure retry policy. There is no duplicated AuthContext,
Redux/Zustand store, JWT handling, or local/session-storage auth state.

CSRF is session-bound server state and remains in the in-memory QueryClient.
Normal application bootstrap fetches only `/auth/me`; `/auth/csrf` is disabled
by default and is fetched on demand immediately before logout, revoke-all, or
password change. A known unauthenticated cache state prevents that fetch.
`CSRF_INVALID` is surfaced without retrying the unsafe mutation and evicts the
rejected token so a later attempt can obtain a fresh one.

Login installs the backend-returned safe user in the current-user cache and
clears any token from a previous session. Registration, resend verification,
and forgot password do not invent auth state. Verification invalidates an
existing authenticated current-user query. Logout, revoke-all, and successful
password reset set the current-user query to confirmed unauthenticated and
remove CSRF state. Password change installs the returned user from the rotated
session and removes the old session's CSRF token. Browser refresh and later
stale refetches still make `/auth/me` authoritative.

Google sign-in begins with top-level browser navigation to the fixed URL from
`getGoogleAuthStartUrl()`. The helper uses the same configured backend origin
and `/api/v1` path builder as `apiRequest`; the frontend never calls the Google
callback, handles provider credentials, or accepts a caller-selected redirect.
The future login UI can read only `account-linking-required` or
`authentication-failed` through `readAuthOAuthStatus()` and React Router URL
state. No authentication API function redirects; navigation remains a UI/router
responsibility.

Authentication establishes global user identity only. It contains no
organization, membership, tenant, role, permission, resource-authorization, or
provider-token state. Frontend route visibility and cached identity are never
authorization boundaries; backend enforcement remains authoritative.

## Authentication UI

Phase 05M adds the user-facing routes `/login`, `/register`, `/verify-email`,
`/forgot-password`, and `/reset-password`. These routes use an auth-specific,
responsive split layout: desktop pairs a soft-teal HiringLoop brand panel with
a centered 440px form region, while tablet and mobile collapse the brand
content to a compact header so the form remains primary. The reusable geometric
H/connected-loop mark is component-owned SVG because the repository contained
no approved logo asset.

Forms reuse the Phase 04 product-agnostic `Button`, `Input`, and `Field`
primitives and typed local React state. React Hook Form and frontend Zod are not
installed, so no form dependency was added. Immediate validation covers
required fields, basic email shape, the 12–128 character new-password policy,
and matching password confirmation; the backend remains authoritative. Visible
labels, native form semantics, autocomplete hints, `aria-invalid`, associated
descriptions, live status/alert regions, disabled pending controls, focus
indicators, and keyboard-usable password visibility controls form the
accessibility baseline.

Registration, resend verification, and forgot-password results deliberately use
enumeration-resistant language and never infer account existence.
`EMAIL_DELIVERY_FAILED` explains the registration partial success and exposes a
resend form. Rate limits use calm safe copy and a bounded, human-readable
`Retry-After` hint when supplied. Network, malformed-response, and server
failures render generic service copy rather than backend details.

Verification is an explicit user action, avoiding duplicate requests from
StrictMode effects. Verification and reset tokens are read from the current URL
only for the mutation that needs them; they are never logged, cached, or copied
to local/session storage. Password-reset success directs the user to sign in
again because the backend revokes sessions and creates no new one. Google
authentication uses top-level browser navigation to the fixed backend URL from
`getGoogleAuthStartUrl()`; the frontend performs no client-side OAuth and stores
no provider credentials. Login renders only allowlisted OAuth/account-linking
URL states.

The auth UI is presentation and workflow coordination, not authorization.

## Phase 05O Google sign-in integration review

Phase 05O keeps Google OIDC backend-owned. Login and registration use the same
feature-owned `GoogleButton`, which performs one top-level navigation to
`getGoogleAuthStartUrl()` (`/api/v1/auth/google/start`) using the configured
backend origin. The frontend does not use a Google SDK, popup, fetch/XHR OAuth
flow, callback route, return URL, provider credential, authorization code,
state, nonce, or PKCE verifier.

The backend callback creates or resumes the normal HiringLoop session and
redirects success to `/app`. `ProtectedRoute` then performs the ordinary
`/auth/me` bootstrap, so existing Google users and newly created Google users
converge on the same `AuthUserDto` and `AppLayout` behavior as password users.
The frontend never reads the HttpOnly session cookie and makes no additional
Google request during bootstrap.

Only `account-linking-required` and `authentication-failed` are rendered from
the login URL. Their safe messages keep password login and Google retry usable;
unknown OAuth values and provider details are ignored. The allowlisted
`oauth` parameter is removed from the login URL with history replacement after
the status is captured locally, preventing stale messages on later navigation.
Account linking remains intentionally deferred. Logout uses the normal
HiringLoop CSRF/session-revocation lifecycle; no provider logout or token
revocation is attempted.

## Protected routes and session bootstrap

Phase 05N uses one TanStack Query entry, `authKeys.currentUser()`, through
`useCurrentUser()`. On browser entry, the router asks `/auth/me` to establish
one of four deliberate states: bootstrapping, authenticated, confirmed
unauthenticated (`401 UNAUTHENTICATED` only), or a recoverable bootstrap error.
Cookies are sent by the API transport, but the frontend does not inspect them.
`/auth/me` remains authoritative.

`ProtectedRoute` guards the `/app/*` boundary and renders the existing
`AppLayout` only after authentication is established. It redirects confirmed
unauthenticated users to `/login` with the original React Router location in
navigation state. `PublicRoute` protects `/login`, `/register`, and
`/forgot-password` from rendering for an already-authenticated user. Both
guards share the same loading and retryable error surfaces; bootstrap failures
never redirect to login. `/verify-email` and `/reset-password` remain
accessible regardless of session state. Successful login restores only safe
internal `/app` destinations and otherwise uses `/app`.

The bootstrap loading state is a lightweight, responsive, accessible full-page
surface, so valid sessions do not flash the login form or protected content.
The error state says “Unable to verify your session”, explains that HiringLoop
could not be reached, and refetches the current-user query from its Retry
button. Logout uses the existing backend mutation, clears server-state session
data, and replaces the current history entry with `/login`. Password change
installs the rotated authenticated user without a login flash; password reset
keeps its success message visible and requires an explicit sign-in action.

Google OIDC continues to use top-level backend navigation. A successful
backend callback lands at `/app`, where normal `/auth/me` bootstrap recognizes
the new session; no Google token is processed by the frontend. OAuth failure
status messaging on `/login` remains unchanged.

Frontend route gating is a UX/access boundary only, not backend authorization.
It does not enforce organization membership, tenant, role, permission, or
resource policies; the backend remains authoritative. Email verification is
not a global application-access gate.

## State ownership

HiringLoop uses an explicit ownership model:

- Local component state owns temporary form interaction, modal visibility,
  local selection, and transient UI toggles.
- URL state owns shareable navigation state such as search, filters, sorting,
  pagination, and tabs/views when navigation matters. Use React Router search
  params for these values; do not introduce product filters or a URL-state
  framework before repeated usage exists.
- Server state owns backend resources, lists, details, analytics, and remote
  mutations. TanStack Query is the single owner; server responses must not be
  copied into Context, Redux, Zustand, or another global store.
- Global client state is not currently needed. No global store or server-data
  Context exists in this phase.

Future feature query hooks and API functions belong together under their feature
module. Query keys are array-based, include all serializable query inputs, and
may use feature-owned key factories when repetition warrants one. Query hooks
sit above the shared `apiRequest()` transport: component → feature query hook →
feature API function → `apiRequest()` → backend.

Queries use a conservative 30-second stale window, five-minute garbage-
collection window, no focus refetch, and bounded retries. Network failures and
5xx responses may retry twice; 4xx, configuration, and cancellation errors do
not retry. `ApiError` objects are preserved so consumers can access status,
code, message, and request ID. Query and mutation lifecycle state (pending,
success, error, fetching/refetching) belongs to feature UI; final shared
loading/error integration is provided by the product-agnostic feedback primitives in `src/shared/components/feedback/`.

## Async and form conventions

Initial pending requests may replace their region with `LoadingState`. When
content already exists, background refetching preserves that content and may
show a subtle refreshing indication; it must not blank the screen. A
successful empty collection uses `EmptyState`, while zero matches from active
filters or search use `NoResultsState`. Request failures use `ErrorState` with
safe, feature-provided copy. Retry is owned by the feature/query layer and is
passed as `onRetry`; an optional backend request ID is shown only when useful,
labelled `Reference ID`. The state model keeps initial loading, refreshing,
empty, no results, error, identifiable offline/network failure, and retrying
distinct; offline and retrying presentation remains feature-owned until a
repeated cross-feature pattern justifies another shared primitive.

Small forms use local React state. Their flow is input → local validation →
feature-owned DTO mapping/API function → backend validation → response/error
handling. Frontend validation improves UX; backend validation remains
authoritative. Field errors use `Record<string, string>` plus an optional
form-level message. `Field` owns label and description relationships, not form
state. Feature code maps safe backend validation details to fields only when
paths are known; otherwise it presents a safe form-level error.

Submission follows idle → submitting → success/error. A loading `Button`
preserves its accessible name, exposes `aria-busy`, and prevents duplicate
activation. Future mutations follow form → feature mutation hook → feature API
→ `apiRequest`, with TanStack Query owning server lifecycle state. Success may
navigate, update inline state, or use a toast when appropriate; no toast
infrastructure is established yet. Unsaved-change protection remains
feature-specific.

No form or runtime-validation library is currently required: there are no real
product forms and small local state is sufficient. A future feature may justify
one for many fields, dynamic arrays, performance-sensitive rendering, or
complex touched/dirty and validation integration. Schemas remain
feature-owned; backend contracts are not imported across applications.

## Accessibility, responsive, and maintainability baseline

The shell provides one route-level `main` landmark, a skip link, semantic
links/buttons, visible keyboard focus, native form associations, announced
loading/error states, and reduced-motion handling for feedback indicators.
Layouts are mobile-first, flexible, and allow long messages and reference IDs
to wrap. jsdom tests cover structural behavior, but not real layout, zoom, or
reflow; browser/manual accessibility QA and automated WCAG contrast validation
remain later hardening work. Current token contrast has been reviewed but is
not presented as certified without automated measurement.

Future shared tables must choose an intentional narrow-screen strategy:
controlled horizontal scrolling, a semantic row/card representation, or
column prioritization. Generic CSS will not transform every table. Future
dialogs must provide focus trapping, initial focus, Escape handling, trigger
focus restoration, an accessible title/description, and background interaction
prevention. Dialogs are deferred.

`AppErrorBoundary` handles unexpected render failures, `ErrorState` handles
recoverable UI/API failures, `ApiError` holds normalized transport information,
and TanStack Query owns server-state lifecycle. Shared components remain
product-agnostic and API-free; state stays local, URL-owned, or query-owned by
concern. No global store, cache persistence, token storage, raw backend error
rendering, or HTML injection is used.

Future mutations call feature API functions and intentionally invalidate or
update the smallest relevant feature query scope. Invalidation is not global,
and optimistic updates are opt-in only when UX value and safe rollback
semantics are clear. Query cancellation should flow from
`QueryFunctionContext.signal` through the feature API function to
`apiRequest({ signal })`.

Query cache persistence, organization context, membership, and tenant authority
remain deferred. Authentication session identity is now Query-owned as
described above; the client cache is never an authorization boundary.

## Phase 05P authentication security and failure-path hardening

Phase 05P hardens the existing authentication flows without changing the
authentication architecture. `/auth/me` is authoritative: only a `401
UNAUTHENTICATED` response establishes unauthenticated state. Credential failure,
CSRF failure, token failure, rate limiting, and unexpected 401 responses remain
distinct errors. Backend 5xx/network failures preserve authenticated state and
show retryable service-error UI; protected bootstrap failures do not redirect to
login while the backend is unavailable.

Logout and revoke-all clear the current-user and memory-only CSRF query state
only after successful backend revocation. Password changes preserve the current
session on failure and evict the old CSRF token only after success. Reset and
verification pages distinguish invalid/expired tokens from rate limits,
delivery failures, and temporary service errors. Registration, forgot-password,
and resend flows retain enumeration-safe public copy, including partial account
creation when verification delivery fails.

Auth forms disable pending submissions, OAuth status is allowlisted and removed
from the URL after capture, and safe return destinations accept only internal
`/app` routes. No auth data is written to localStorage or sessionStorage; no
cookie inspection, JWT, provider-token, or global auth store is used. Response
validation is intentionally narrow and feature-owned; broader runtime schema
validation remains technical debt.

The frontend-owned progress marker is **Completed through: 05P Authentication
Security + Failure-Path Hardening**. **Next: 05Q Phase 05 Integration
Verification + Handoff**. Phase 05 remains **COMPLETE**, with deterministic
manual QA documented in `../docs/architecture/PHASE_05_STABILITY_AUDIT.md`.

## Current frontend foundation

Phase 05 — Authentication remains **COMPLETE**. Implementation is complete
through **05P Authentication Security + Failure-Path Hardening**. The next
sub-phase is **05Q Phase 05 Integration Verification + Handoff**. Phase 05
remains **COMPLETE**.

Routing is composed in `src/app/router/routes.tsx` and mounted through the minimal
provider composition in `src/app/providers/AppProviders.tsx`. The current neutral routes
are `/` (foundation landing), `/app` (application-shell seam), and a catch-all
not-found route. `PublicLayout` and `AppLayout` own feature-agnostic frame,
navigation seam, main content, and responsive concerns.

`AppErrorBoundary` handles unexpected React render failures with a safe retry
fallback. API/business errors are intentionally not handled here; expected
authentication query failures use normal route state. The API client belongs
to Phase 04D. Authorization, organization state, global client state, and
product navigation remain deferred. See `docs-shared/` and the authoritative
`docs/architecture/FRONTEND_FOUNDATION.md` for the complete boundary design.

### Shared UI foundation

Reusable, product-agnostic primitives live in `src/shared/components/ui/` and
`src/shared/components/feedback/`. The current set includes Button, Input, Textarea,
Select, Field, Badge, PageHeader, LoadingIndicator, LoadingState, EmptyState,
NoResultsState, and ErrorState. The small-form error types live in
`src/shared/utils/form-state.ts` without imposing a form framework.
They use the small semantic CSS token layer in `src/styles/index.css` and shared
styles alongside the components. Shared UI is for patterns used by unrelated
features; domain-specific UI belongs in its feature module.

Components preserve native semantics, visible keyboard focus, label and error
relationships, and flexible narrow-screen sizing. Their APIs are explicit and
composable. They contain no business logic, API calls, authentication or
authorization decisions, feature state, or global state. Unexpected render
failures remain the responsibility of `AppErrorBoundary`; `ErrorState` is only
for recoverable UI states.
