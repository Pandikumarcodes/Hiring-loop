# HiringLoop frontend architecture

The frontend is a React + TypeScript + Vite application. TanStack Query is the single source of truth for server state, including authentication.

## Directory responsibilities

- `src/app/`: application infrastructure: configuration, providers, routing, and the app error boundary.
- `src/features/`: domain-owned behavior. `auth` owns auth API calls, hooks, components, pages, DTO types, and auth utilities.
- `src/layouts/`: reusable page shells, without feature business logic.
- `src/shared/`: product-agnostic UI, feedback, transport/error helpers, types, and generic utilities.
- `src/styles/`: global tokens and application-wide CSS imports; feature-specific CSS stays with its feature.
- `src/tests/`: global Vitest setup and test-only QueryClient helpers.
- `src/assets/`: static images, icons, and fonts when introduced.

## Ownership rules

Feature endpoint functions live under `features/<feature>/api` and call the generic `shared/lib/apiClient`. Shared code does not import feature code. `app/router` owns route definitions, guards, session bootstrap presentation, and safe route helpers. `app/providers` owns the one application-wide QueryClient and provider composition.

Auth state is server state: `/auth/me` and the in-memory TanStack Query cache are authoritative in the browser. No Redux, Zustand, auth store, duplicate AuthContext, localStorage/sessionStorage auth, JWT handling, or direct cookie inspection is used.

Shared components remain feature-agnostic. Future domains follow `features/<domain>/{api,components,hooks,pages,schemas,types,utils}`, creating only directories that contain real files. Tests are colocated with their owning module when useful; global setup and helpers belong under `src/tests`.

## Public careers

`features/public-careers` owns the anonymous discovery-only career site: exactly two screens at `/careers/:organizationSlug` and `/careers/:organizationSlug/jobs/:jobId`. It uses the existing `PublicLayout`, with no authenticated guard or recruiter shell. Its API layer uses the two public endpoints and its query keys are isolated under `['public-careers', organizationSlug, 'jobs', …]`; list keys include `{ page, pageSize }` (default `pageSize` is 20) and detail keys include `jobId`.

The pages distinguish loading, empty, unavailable (safe 404), and retryable errors; use accessible responsive links and controls; set basic document title/description metadata; and render descriptions only as plain text. Public careers remains discovery-only: search/filter and every application/candidate flow are deferred. Authenticated Job Detail links to the persisted-slug public posting only for OPEN jobs.
