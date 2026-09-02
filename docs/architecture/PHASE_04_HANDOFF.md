# Phase 04 - Frontend Foundation Handoff

## Status

COMPLETE

## Objective

Establish an accessible, testable React application shell with stable routing,
minimal composition, reusable product-agnostic UI, one safe API transport
boundary, and an explicit server-state convention. Phase 04 intentionally
does not implement product workflows, authentication, authorization/RBAC,
organization switching, Jobs, Candidates, Applications, backend functionality,
database changes, or AI.

## Completed Work

- Established React 19, TypeScript, and Vite foundation with StrictMode.
- Added React Router route composition, neutral public/application layout seams,
  accessible not-found recovery, and an unexpected-render error boundary.
- Added accessible shared UI primitives and distinct feedback states.
- Added semantic CSS tokens, responsive shell rules, visible focus styling, and
  reduced-motion behavior.
- Added one native-fetch API client for the `/api/v1` boundary, safe backend
  error normalization, request-ID preservation, and cancellation support.
- Added TanStack Query as the in-memory server-state foundation with bounded,
  error-aware retry behavior.
- Documented local, URL, server, global, form, submission, and async UX
  ownership conventions.
- Added behavior-first routing, boundary, UI, form, API, configuration, query,
  retry, cancellation, isolation, and accessibility-smoke coverage.

## Frontend Architecture

Approved dependency flow:

```text
App
  -> Feature Modules
  -> Shared UI / API / infrastructure
```

Shared code remains product-agnostic. Future request/data flow is:

```text
Route/Page
  -> Feature UI
  -> Feature Query/Mutation Hook
  -> Feature API function
  -> Shared apiRequest<T>()
  -> Backend /api/v1
```

Feature modules own endpoint paths, DTOs, query keys, hooks, and
feature-specific interpretation. Shared infrastructure must not import a
feature.

## Application Composition

Current composition is:

```text
main.tsx
  -> React StrictMode
  -> App
  -> AppProviders
  -> AppErrorBoundary
  -> AppRoutes
```

`AppProviders` supplies `QueryClientProvider` and `BrowserRouter`. The provider
set is intentionally minimal: one application QueryClient and no unnecessary
theme, auth, tenant, or global-state providers.

## Routing Foundation

The neutral route foundation contains `/` (public foundation landing), `/app`
(application-shell seam with a neutral foundation page), and a wildcard
not-found route with accessible recovery navigation. Public and application
layout seams are present. There are no product routes, auth guards, role
guards, tenant guards, or authorization decisions. Lazy route splitting remains
deferred until real feature size justifies it.

## Layout Architecture

`PublicLayout` and `AppLayout` own feature-agnostic framing, navigation seams,
the route-level main landmark, skip-to-main-content link where applicable, and
responsive shell behavior. They do not own product navigation, permissions,
authentication, organization context, or business state.

## Shared UI Foundation

Product-agnostic primitives include `Button`, `Input`, `Textarea`, `Select`,
`Field`, `Badge`, and `PageHeader`. Feedback primitives include
`LoadingIndicator`, `LoadingState`, `EmptyState`, `NoResultsState`, and
`ErrorState`.

Ownership is `product-agnostic + reusable -> shared`; feature-specific behavior
belongs in a feature module. Shared UI has explicit props, native semantics, no
API calls, no business statuses, no authentication/authorization logic, and no
feature imports.

## Design Tokens / Styling

The foundation uses a deliberately minimal plain-CSS token layer, not a large
or complete design system. It covers semantic colors, typography, spacing,
radii, borders, focus styling, control states, flexible sizing, responsive
wrapping, and reduced-motion support. Long messages and request IDs wrap
safely, and the shell is mobile-first/flexible without an unsafe fixed width.

## Error Boundary Strategy

`AppErrorBoundary` handles unexpected React/render failures and exposes a safe
retry fallback. `ErrorState` handles recoverable UI/API failures and retry
actions. `ApiError` holds normalized backend/transport error information.
TanStack Query owns the server-state error lifecycle, retries, and fetching
state. Raw backend errors and render implementation details are not rendered
directly.

## API Architecture

`src/api/client.ts` is the only shared transport boundary. It owns the backend
origin from `VITE_API_BASE_URL`, the `/api/v1` prefix, native `fetch`, JSON
serialization and `Content-Type` behavior, successful JSON parsing and empty
responses, structured backend errors and safe malformed-error fallback, network
failure normalization, `AbortSignal` support, the explicit
`credentials: include` cookie seam, and body/header request-ID preservation.

Application pages and shared components must not call `fetch` directly. Feature
modules own endpoint paths, request DTOs, response DTOs, and feature-specific
error interpretation.

## ApiError Contract

`ApiError` exposes `kind`, `status` where available, `code`, a safe `message`,
`details`, and `requestId`. Arbitrary response data is narrowed before use and
the backend error envelope is normalized once. A valid request ID is captured
from the structured body or `X-Request-Id` header; it is informational support
metadata only and is not authentication, authorization, or tenant authority.

## State Management Strategy

- Local UI state -> React local state.
- Shareable navigation state -> React Router URL/search parameters.
- Backend/server state -> TanStack Query.
- Global client state -> only after a proven cross-app client concern appears.

No global store is currently required. Redux and Zustand were not added. Backend
data must not be duplicated into a global client store or Context.

## TanStack Query Foundation

The foundation uses `@tanstack/react-query` 5.102.8, one QueryClient per
application, 30-second stale time, five-minute garbage collection,
`refetchOnWindowFocus: false`, and bounded retries. Deterministic 4xx,
configuration, and cancellation errors do not retry; transient network and
5xx failures may retry twice. The cache is in memory only, with no persistence.
Tests use isolated QueryClients. Future query keys and hooks remain
feature-owned.

TanStack Query owns server-state lifecycle, cache, deduplication, invalidation,
and refetch behavior. The shared API client owns HTTP transport.

## Form Architecture

Small forms use local React state: user input -> local form state -> frontend UX
validation -> request DTO mapping -> feature API -> backend authoritative
validation. No React Hook Form, Formik, or frontend Zod dependency was added.
Complex-form tooling is deferred until a real form demonstrates the need.
Types and DTOs remain feature-owned and backend implementation types are not
imported across applications.

## Async UX Model

Loading, Refreshing, Empty, No Results, Error, Offline/network failure, and
Retrying remain distinct. Initial loading may replace the content region;
background refetch preserves existing content; mutation pending is action-level
submission state. There is no global loading overlay.

Form submission follows idle -> submitting -> success/error. Loading buttons
preserve their accessible names, expose `aria-busy`, and prevent duplicate
activation while pending. Feature code owns backend validation mapping and
retry actions.

## Accessibility Foundation

The baseline includes semantic landmarks, one main landmark per route, skip
navigation, heading structure, native keyboard-operable controls, visible
focus, label/control association, accessible field errors, `aria-invalid` where
appropriate, status/alert semantics, reduced motion, long-text wrapping, and
accessible recovery/retry actions.

This is a baseline, not a complete WCAG certification. jsdom tests do not prove
real browser layout, zoom, reflow, contrast, or assistive-technology behavior;
manual/browser validation and automated axe coverage remain deferred.

## Responsive Foundation

Layouts are mobile-first and flexible. Page headers/actions wrap, controls
remain usable at narrow widths, and long errors/request IDs wrap safely. Future
tables must choose intentional horizontal scrolling, a responsive
representation, or column prioritization. Future dialogs must provide focus
trap, initial focus, Escape, focus restoration, labeling, and
background-interaction prevention.

## TypeScript Standards

TypeScript is strict with no unjustified `any`, explicit component props and
DTOs, safe narrowing of external/runtime input, feature-owned types, no giant
global types file, and no backend implementation type imports across apps.

## Security Decisions

`VITE_API_BASE_URL` is public frontend configuration and contains only a backend
origin; it contains no secrets. The frontend contains no DB credentials, session
secrets, or private API keys, and uses no token storage or sensitive browser
persistence. There is no `dangerouslySetInnerHTML` or raw external HTML
boundary. Query cache persistence is disabled and raw backend errors are not
rendered. Frontend authorization is UX-only; the backend remains authoritative
for tenant, RBAC, resource authorization, and data exposure. Request IDs are
informational support metadata, not authentication.

## Performance Decisions

The shell uses minimal providers, one QueryClient, native fetch, bounded
retries, no duplicate server cache, lightweight CSS/components, and AbortSignal
support. There is no premature memoization, route splitting, virtualization, or
global rerender architecture. Future large lists should prefer server-side
pagination/filtering and bounded results; virtualization is only justified by
measurement.

## Testing Architecture

Vitest and React Testing Library cover routing, layouts, not-found recovery,
Error Boundary behavior, shared UI, form semantics, async states, API client
contracts, environment configuration, TanStack Query behavior, retry policy,
cache isolation, request cancellation, request-ID handling, and accessibility
regressions. The latest verified state is 6 test files and 32 passing tests. No
backend services are contacted by frontend verification. Fetch-boundary spies
are used; MSW and automated axe tooling remain deferred.

## Files Created

- `docs/architecture/PHASE_04_HANDOFF.md`

## Files Modified

- `PROJECT_STATE.md`
- `MASTER_ROADMAP.md`
- `docs/architecture/FRONTEND_FOUNDATION.md`
- synchronized status/roadmap copies under frontend and backend `docs-shared/`

## Verification Results

- Lint: PASS
- Format check: PASS
- Typecheck: PASS
- Tests: PASS (6 files, 32 tests)
- Production build: PASS
- Normal `npm.cmd run verify`: PASS twice consecutively; no timeout override
- `git diff --check`: PASS

The repository script is `npm run verify`; `npm.cmd` was used only because the
PowerShell `npm.ps1` wrapper is blocked by workstation execution policy. The
underlying npm script and its commands were unchanged.

## Verify Stability Review

The earlier isolated timeout was transient environment scheduling or worker
startup behavior. The normal verify command passed twice consecutively,
including lint, format check, typecheck, all tests, and build. No timeout
override or repository timeout configuration change is justified.

## Deferred Work

Authentication; authorization/RBAC; organization context/switching; real
product modules and feature queries/mutations; complex form tooling; frontend
Zod; Table, Dialog, Combobox, Tabs, Pagination, and Toast; automated axe
tooling; browser-level reflow/accessibility QA; route splitting until feature
size justifies it; virtualization until measured; Query cache persistence; a
global client store; MSW until API-test complexity justifies it; and AI are all
intentional non-blocking deferrals.

## Known Issues / Technical Debt

Browser/manual accessibility, contrast, zoom, reflow, and performance
measurement remain future hardening work. The repository-local PRD remains
unavailable. The frontend has no real feature API/query modules until approved
product phases begin. Authentication/session and tenant authority have
deliberately not been decided in the frontend foundation.

## Architecture Decisions Reinforced

This handoff reinforces the separate frontend/backend applications, modular
monolith boundaries, app -> feature -> shared dependency direction, a single
`/api/v1` transport boundary, safe backend error normalization, backend
authorization authority, query-owned server state, local-first client state,
minimal providers, and evidence-driven performance and dependency decisions.

## Definition of Done Review

PASS. The routed frontend shell, minimal providers/layouts, Error Boundary,
accessible primitives, standard async states, tested API boundary, backend
error normalization, request-ID preservation, state ownership model, TanStack
Query foundation, form conventions, accessibility baseline, responsive
baseline, security and performance reviews, strict TypeScript, tests, lint,
format, typecheck, production build, stable normal verify, and documentation
are evidenced. No product workflow scope creep, global store, backend change,
database change, authentication, authorization, or AI was introduced.

## Phase 04 Final Status

COMPLETE. Phase 04 implementation verification and verify-stability review
passed, this formal handoff is recorded, and the project status is synchronized.

## Next Phase

Phase 05 - Authentication

Phase 05 remains NOT STARTED. Do not begin Phase 05 implementation as part of
this handoff.
