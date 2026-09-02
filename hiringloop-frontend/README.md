# HiringLoop frontend

This directory contains the HiringLoop frontend application. It is a separate
Node.js application from `hiringloop-backend/` and currently provides the Phase
04 app-composition foundation and developer tooling.

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
optional until an API request is made. Backend credentials belong to the
separate backend application and are not configured here.

## Shared API client

Frontend API transport lives in `src/api/client.ts`. `VITE_API_BASE_URL` is a
backend origin without an API path; the shared client owns the `/api/v1`
prefix. Future feature API functions own endpoint paths and DTO types, then
call `apiRequest`; pages and components must not call `fetch` directly for
application APIs.

`ApiError` in `src/api/errors.ts` exposes a safe `kind`, HTTP `status` when
available, backend `code`, safe `message` and `details`, and preserved
`requestId`. Empty successful responses resolve to `undefined`. Cookie
credentials are included as a future authentication seam, but authentication,
tokens, and authorization are not implemented here. Abort signals remain
caller-owned and aborted requests are distinguishable from network failures.

The client is stateless transport only: caching, deduplication, invalidation,
background refetching, and global loading/error state are deliberately deferred
to server-state work. TanStack Query now provides that server-state foundation
through `src/app/AppProviders.tsx` and the reusable application client in
`src/app/query-client.ts`. The QueryClient is created once per app, remains
in-memory, and is never persisted to browser storage.

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
loading/error integration is provided by the product-agnostic feedback primitives in `src/components/feedback/`.

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

Query cache persistence, authentication/session state, organization context,
and tenant authority are deferred. Authentication and membership requirements
must be resolved before deciding ownership for those concerns; the client
cache is never an authorization boundary.

## Current frontend foundation

Routing is composed in `src/app/routes.tsx` and mounted through the minimal
provider composition in `src/app/AppProviders.tsx`. The current neutral routes
are `/` (foundation landing), `/app` (application-shell seam), and a catch-all
not-found route. `PublicLayout` and `AppLayout` own feature-agnostic frame,
navigation seam, main content, and responsive concerns.

`AppErrorBoundary` handles unexpected React render failures with a safe retry
fallback. API/business errors are intentionally not handled here; the API
client belongs to Phase 04D. Authentication, authorization, organization
state, server state, global client state, product navigation, and feature
modules remain deferred. See `docs-shared/` and the authoritative
`docs/architecture/FRONTEND_FOUNDATION.md` for the complete boundary design.

### Shared UI foundation

Reusable, product-agnostic primitives live in `src/components/ui/` and
`src/components/feedback/`. The current set includes Button, Input, Textarea,
Select, Field, Badge, PageHeader, LoadingIndicator, LoadingState, EmptyState,
NoResultsState, and ErrorState. The small-form error types live in
`src/components/forms/form-state.ts` without imposing a form framework.
They use the small semantic CSS token layer in `src/index.css` and shared
styles alongside the components. Shared UI is for patterns used by unrelated
features; domain-specific UI belongs in its feature module.

Components preserve native semantics, visible keyboard focus, label and error
relationships, and flexible narrow-screen sizing. Their APIs are explicit and
composable. They contain no business logic, API calls, authentication or
authorization decisions, feature state, or global state. Unexpected render
failures remain the responsibility of `AppErrorBoundary`; `ErrorState` is only
for recoverable UI states.
