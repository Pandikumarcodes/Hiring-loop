# Phase 04 — Frontend Foundation

## Status and scope

**Status:** COMPLETE - implementation verification, verify stability, and formal handoff complete

This document records the implemented frontend foundation and its architecture
boundaries. The formal completion record is maintained in the Phase 04 handoff
document.
It does not implement product workflows, authentication,
organization switching, authorization/RBAC, Jobs, Candidates, Applications,
AI, or any later-phase behavior. React, TypeScript, and Vite remain the
required frontend stack.

### Authoritative objective

Establish an accessible, testable React application shell consuming server state
safely. The approved Phase 04 scope is routing, layout, design primitives,
query/cache foundation, form primitives, and loading/error/empty states. The
frontend work is the shell, neutral navigation placeholders, a future route
protection seam, one API client boundary, and query conventions. Backend work is
limited to consuming the existing health and structured-error contracts.

### Definition of Done

Phase 04 is complete only when the frontend shell builds, routes, composes its
minimal providers/layouts, exposes reusable accessible primitives, handles
loading/empty/no-results/error states, and has a single tested API boundary with
request-ID awareness. Baseline component, routing, accessibility-smoke, and
API-client tests pass; quality scripts pass; no product workflow is included;
and security/performance review findings are addressed or explicitly deferred.
Phase 03 remains COMPLETE. The formal Phase 04 handoff is recorded in
`docs/architecture/PHASE_04_HANDOFF.md`.

## Repository evidence

### Files inspected

Authoritative sources inspected: root `PROJECT_STATE.md`,
`MASTER_ROADMAP.md`, `PROJECT_INSTRUCTIONS.md`, `README.md`, the architecture
documents, security documents, infrastructure-related architecture documents,
all ADRs, and `docs/architecture/PHASE_03_HANDOFF.md`. The requested
`docs/infrastructure/` directory does not exist; its relevant material is in
`docs/architecture/INFRASTRUCTURE_ARCHITECTURE.md` and
`INFRASTRUCTURE_BOUNDARIES.md`.

Frontend sources inspected: `package.json`, `package-lock.json`,
`vite.config.ts`, all `tsconfig` files, `.oxlintrc.json`, Prettier config,
`.env.example`, `README.md`, and all current files under `src/` and `public/`.
The synchronized `docs-shared/` files were compared with root status files.

### Current implementation inventory (verified)

| Concern | Current state |
|---|---|
| Bootstrap | `src/main.tsx` mounts `App` in `StrictMode`, imports global CSS and env validation. |
| Routing | React Router composes `/`, `/app`, public/app layouts, and accessible not-found handling; no product routes or auth guards. |
| Layout/shell | `PublicLayout` and `AppLayout` own neutral frame, navigation seam, skip link, one main landmark, and outlet composition. |
| Pages/features/components/hooks/state | Neutral foundation pages and product-agnostic shared UI/feedback primitives exist; no product feature modules or global store. |
| API/data fetching | One `apiRequest<T>()` transport boundary owns fetch, `/api/v1`, JSON/empty responses, cancellation, and normalized failures. |
| Base URL/headers/errors/request IDs | Public origin validation, JSON headers/body behavior, safe `ApiError`, and server request-ID preservation are implemented. |
| Server/client state | TanStack Query provides one in-memory app client; local/URL/server/global ownership conventions are documented. |
| Validation/forms | Native form primitives, field associations, local errors/submission state, and DTO mapping conventions exist; no product forms. |
| UX states/toasts | Loading, empty, no-results, and error/retry primitives exist; refreshing/offline/retrying semantics are documented. Toasts remain deferred. |
| Tables/dialogs | Not implemented; larger primitives remain intentionally deferred. |
| Styling/design system | Semantic tokens, typography, focus styling, component states, reduced motion, and responsive wrapping rules are implemented. |
| Accessibility/responsive behavior | Landmarks, skip link, labels, field associations, keyboard/focus semantics, status/alert semantics, reduced motion, and flexible narrow layouts are covered. |
| Testing | Behavior/API/config/query tests cover routing, boundary safety, shared UI, forms, async states, request IDs, retries, and isolation. Automated axe/browser reflow tooling remains deferred. |
| Quality/configuration | Strict TypeScript, no unused locals/parameters, no unchecked side-effect imports, Oxlint, Prettier, and build/typecheck/test/verify scripts exist. |
| Code splitting/performance | No routes or split points; no query cache, list strategy, render budget, or measurement convention. |
| Security | No HTML injection or token handling exists. Env README correctly treats `VITE_*` values as public and forbids secrets. |

## Scope classification

### A. Must implement in Phase 04

- Routing composition with neutral public/app layout seams, not auth guards.
- Minimal app-root providers and an unexpected-render Error Boundary.
- Product-agnostic shell/layout composition and responsive behavior.
- A deliberately small accessible UI foundation and state primitives.
- One API client for `/api/v1`, including safe JSON/empty response handling,
  credentials policy placeholder, AbortSignal support, network failures,
  structured backend-error parsing, and request-ID capture.
- State ownership rules and the initial server-state/query-cache foundation.
- Form primitives and a validation/DTO mapping convention without product forms.
- Distinct loading, empty, no-results, error, retry, and slow/offline UX states.
- Baseline accessibility, responsive, security, performance, and testing seams.

### B. Implemented during Phase 04

- React 19, TypeScript 6, Vite 8 application bootstrap.
- Separate frontend application and package/config boundary.
- Strict TypeScript and baseline lint/format/test/build scripts.
- Vitest/jsdom/Testing Library setup and one smoke test.
- React Router, route composition, public/app layouts, AppProviders, and AppErrorBoundary.
- Shared UI, feedback states, form semantics, semantic CSS tokens, and responsive/accessibility foundations.
- Public environment-value convention and absolute HTTP(S) URL validation.
- API client, ApiError normalization, request-ID preservation, AbortSignal support, and TanStack Query defaults.
- Local/URL/server/global state ownership conventions and isolated test QueryClients.
- Phase 03 backend health endpoint, `/api/v1` namespace, safe error envelope,
  bounded payloads, and server-owned `X-Request-Id` contract.

### C. Deferred to later phases (non-blocking)

Authentication implementation, organization switching,
tenant context, RBAC and resource authorization, Jobs, Candidates,
Applications, Interviews, Offers, analytics, notifications, file/resume
flows, realtime, AI, product navigation, product-specific forms/tables,
permission-driven product behavior, and production observability/SLOs.

## Target architecture

Use the smallest structure that gives ownership and stable boundaries. Do not
create empty feature folders or generic abstractions before repeated need.

```text
src/
  app/                  # bootstrap composition, routes, providers, shell, boundary
  components/           # product-agnostic UI primitives only
  api/                  # shared transport client, API error, response contracts
  hooks/                # truly cross-cutting hooks, not feature data hooks
  state/                # only app-wide client state if evidence requires it
  config/               # environment and runtime configuration
  constants/            # stable cross-cutting constants, not domain catalogs
  types/                # small shared structural types only
  styles/               # tokens, globals, responsive primitives
  utils/                # focused pure utilities with tests, no business dumping ground
```

Feature code is added only when the roadmap authorizes a feature:

```text
src/features/<feature>/
  api/ components/ hooks/ pages/ schemas/ types/ utils/ tests/
```

`app` may compose features and shared code. Feature modules may consume shared
code and their own internals. Shared infrastructure must not import a feature.
Feature-to-feature imports are prohibited by default; if a real workflow needs
collaboration, use an explicit public contract and record the decision. Avoid
barrel-file mazes; a public `index.ts` is allowed only where it improves a
stable boundary without hiding ownership.

### Folder ownership rules

| Folder | Owns | Must not contain |
|---|---|---|
| `app` | route tree, providers, shell composition, global boundary | feature business rules or raw API calls |
| `features` | feature pages, API adapters/hooks, domain UI, schemas, types | unrelated shared primitives or cross-feature internals |
| `components` | reusable product-agnostic primitives | hiring terminology, permissions, API calls, domain state |
| `api` | transport, error normalization, headers, cancellation, response decoding | feature decisions or UI rendering |
| `hooks` | repeated cross-cutting React behavior | premature one-use wrappers or server data duplicated into stores |
| `state` | proven app-wide client state | API records, cache replicas, feature state by default |
| `config` | validated runtime configuration | secrets or business configuration |
| `styles` | tokens, global CSS, responsive conventions | feature-specific business behavior |
| `utils` | focused pure reusable helpers | generic grab-bags and business rules |

## Pages, features, and shared UI

Pages compose route-level UI, connect feature components, and coordinate
layout-level concerns. A page should not own raw fetch calls, all form/table
logic, business rules, modal internals, duplicated state handling, or large
global-state logic. When a page accumulates multiple responsibilities, extract
the behavior into an owned feature hook/component or shared primitive. Review
page size by responsibility and change impact, not an arbitrary line limit.

Feature-owned components remain inside their feature when used by one feature.
Move a component to shared only after repeated use and only if it remains
product-agnostic. Phase 04 should establish only the primitives needed for the
shell and foundation: Button, form field/Input, status/Spinner, EmptyState,
NoResultsState, ErrorState/retry, and a Dialog primitive if the neutral shell
requires it. Table, Select, Textarea, Checkbox, Radio, Badge, and PageHeader
should be added when a foundation or approved feature actually needs them.

## API architecture and backend errors

The implemented and intended flow is:

```text
feature UI → feature API function/data hook → shared api client → /api/v1
```

Only `src/api/` owns transport behavior. It resolves the validated public base
URL, joins paths safely, sets `Accept` and JSON content headers when relevant,
applies the explicitly chosen credentials policy, parses JSON or empty success
responses, supports `AbortSignal`, and captures `X-Request-Id`. It must not
invent auth yet or treat a client-supplied request ID as authoritative.

Normalize the Phase 03 envelope once into a frontend `ApiError` containing
`status`, `code`, `message`, `details`, and `requestId`, with an optional
network/cancellation classification. Preserve the body request ID and prefer
the response header when available for correlation. Bound or safely display
messages/details; never expose stacks, SQL, credentials, raw internal errors,
or sensitive response payloads. Components consume `ApiError` and do not parse
raw backend JSON. API/business failures render normal state UI; unexpected
React render failures go to an Error Boundary.

## State boundaries

Use the narrowest owner:

- Local React state: open/closed UI, drafts, temporary selection, pending
  interaction state.
- URL state: shareable/searchable search, filters, sort, and pagination. Parse
  and validate query parameters; URLs must not carry secrets or sensitive PII.
- Server state: jobs, candidates, applications, interviews, and analytics
  responses. A query/cache layer owns fetching, freshness, retries, invalidation,
  cancellation, and request deduplication.
- Global client state: only genuinely app-wide client concerns such as shell
  UI state. Session/auth state may later require a reviewed boundary; it is not
  implemented here.

Local first → URL when navigational → server-state tool for backend data →
global store only for true cross-app client state. Backend data is never copied
into a global store merely because it is used by multiple screens; the
server-state cache is its single source of truth. Do not use Context as a
general data store or add Redux/Zustand without demonstrated cross-app client
state.

## Server state, forms, and validation

TanStack Query is now the implemented server-state foundation for the first
server-backed features. It supplies caching, deduplication, invalidation,
retries, stale state, and mutation coordination without creating a global
client-state store.

Forms should keep field state and submission state local to the form, validate
for UX, map form values explicitly to a request DTO, call a feature API
function, and surface normalized backend validation errors. Backend validation
remains authoritative. The current frontend has no form or schema dependency;
native controlled inputs and small pure validators are sufficient for the
foundation. A validation library such as Zod is **OPTIONAL**, only if repeated
client schemas justify it; backend schemas must not be imported directly unless
a deliberate independently-deployable shared-contract package is later
approved.

## Routing, providers, and shell

The router composes a public layout and an app layout, provides a not-found
route, and exposes a future protection seam without implementing
authentication or role checks. Route-level lazy loading is appropriate once
real routes create meaningful bundle boundaries; do not split a tiny shell
prematurely.

Minimal provider order should be the router, then any server-state provider
when the chosen library is introduced, followed by a narrowly scoped UI/theme
provider only if needed, with the Error Boundary around the rendered app.
Features must not add global providers at the root for feature-local concerns.

The neutral public and app layouts compose header/main regions, but must not
own product navigation or business permissions. The authenticated shell and
public shell are separate layout seams. Mobile behavior should
collapse navigation accessibly, preserve a visible skip-to-content path, and
keep main content usable without horizontal page scrolling.

## Design system, states, accessibility, and responsive behavior

Keep the existing CSS approach until product evidence justifies a UI library.
Define a small token layer for spacing, type scale, control sizing, radii,
breakpoints, focus ring, semantic success/warning/error/info colors, and
disabled/loading states. Prefer mobile-first CSS and the repository's existing
plain CSS conventions. Use consistent breakpoints, constrained dialogs/forms,
and an intentional small-screen table pattern (responsive rows/cards or
documented horizontal overflow, never accidental clipping).

State meanings are distinct: loading means fetching; empty means a successful
response has no items; no-results means filters/search matched nothing; error
means the request failed and may offer retry. Slow/offline/reconnecting states
should be visible without claiming false success. Establish shared status
primitives rather than repeating ad hoc strings.

All reusable UI uses semantic HTML, associated labels/descriptions, keyboard
operation, visible focus, correct button types, accessible form errors, and
screen-reader-friendly status/live feedback. Dialogs manage focus, trap it
only while open, restore it on close, and support Escape where appropriate.
Use ARIA only to fill a semantic gap; verify contrast and zoom/reflow. Never
communicate permission or status by color alone.

## Security and performance foundation

Do not render untrusted HTML or introduce `dangerouslySetInnerHTML` without a
reviewed sanitization boundary. Vite `VITE_*` values are public; no secrets,
tokens, or credentials belong in them. The approved authentication architecture
uses an HttpOnly backend session cookie and server-bound CSRF protection; the
frontend must not persist session secrets or invent a client-side auth store.
Frontend authorization is UX only;
the backend remains authoritative for identity, organization scope, RBAC,
resource policy, and data exposure. Avoid sensitive PII in URLs, logs,
notifications, error details, or client caches beyond the approved need. Treat
external URLs and future files as untrusted and keep file delivery behind
backend authorization/signed capabilities.

Avoid waterfalls and duplicate requests through route-aware loading and the
server-state cache. Use bounded/paginated data and virtualization only when
representative list sizes justify it. Do not add `memo`, `useMemo`, or global
context everywhere; measure rerenders, bundle size, Core Web Vitals (LCP, INP,
CLS), and routine interaction feedback before optimizing. Use route splitting
where bundles/routes justify it and keep heavy dependencies out of the shell.

## Testing architecture

Use Vitest and React Testing Library behavior-first. Add pure utility tests,
shared primitive tests, hook tests, routing/layout tests, feature/page behavior
tests when features exist, API-boundary tests, and accessibility-oriented
keyboard/label/focus/state tests. Test state transitions and public contracts,
not implementation details. API tests should mock `globalThis.fetch` at the
transport boundary or inject a transport function; no backend server is needed
for unit tests. MSW is **OPTIONAL / not installed** and should be considered
when multi-feature API scenarios or realistic request handlers make fetch mocks
hard to maintain. No new testing package is required for the foundation.

## TypeScript and maintainability rules

Keep strict TypeScript. API request/response types belong near API functions or
their feature; domain-facing frontend types are not blind copies of backend
implementation types. Component props should be explicit; use discriminated
unions for state variants where they clarify rendering; avoid `any`, giant
global type files, premature generic hooks, and implicit DTO shapes. Keep pure
helpers tested and feature-owned unless truly shared.

Rules for every Phase 04 implementation:

- no giant pages or scattered fetch calls;
- no giant global store or duplicated server data;
- no repeated raw-error parsing;
- no business logic in shared UI;
- no shared UI importing product features;
- no circular dependencies or accidental cross-app imports;
- no generic utils dump or unnecessary barrel maze;
- no abstraction without repeated need;
- explicit ownership and stable public boundaries;
- tests target user-visible behavior and transport contracts.

## Implementation matrix

| Concern | Existing? | Current implementation | Target foundation | Gap | Phase |
|---|---|---|---|---|---|
| Bootstrap | Yes | React/Vite `main.tsx`, StrictMode | Keep thin bootstrap | None | Already |
| Routing | Yes | React Router, layouts, 404, future guard seam | Keep product-neutral | None | 04 |
| Providers/boundary | Yes | QueryClientProvider, BrowserRouter, Error Boundary | Keep minimal | None | 04 |
| Shell/layout | Yes | Public/app neutral seams | Add product shell later | None | 04 |
| Shared UI | Yes | Accessible primitives and feedback states | Add only evidence-backed primitives | None | 04 |
| API client | Yes | One `/api/v1` transport boundary | Add feature APIs later | None | 04 |
| API errors/request IDs | Yes | ApiError and header/body correlation | Keep safe display | None | 04 |
| Server state | Yes | TanStack Query, one memory-only client | Add feature queries later | None | 04 |
| Global client state | No | No store; local-first rule documented | Add only if a cross-app need is proven | Non-blocking deferral | 04 |
| URL state | No | None | Validated shareable query state | Full when routes need it | 04 |
| Forms/validation | Yes | Native form primitives and DTO convention | Add complex tooling only if justified | None | 04 |
| Loading/error/empty | Yes | Distinct reusable states/retry | Add feature-specific states later | None | 04 |
| Feature architecture | No product features | Future module convention documented | Add only when roadmap authorizes | Non-blocking deferral | 04 |
| Accessibility | Yes | Semantics, labels, focus, keyboard, live states | Manual/browser limits remain | None | 04 |
| Responsive | Yes | Flexible mobile-first shell/control rules | Table/dialog policies later | None | 04 |
| Testing | Yes | Layered behavior/API/config/query tests | axe/browser tests deferred | None | 04 |
| API test mocking | Yes | Fetch-boundary spies, no backend dependency | MSW only if evidence | None | 04 |
| Security | Partial | Public env validation/docs | XSS/token/URL/error/cache rules | Partial | 04 foundation; auth later |
| Performance | Yes | Minimal providers/cache, bounded retries, AbortSignal | Measure before optimization | None | 04 foundation; hardening later |
| TypeScript | Yes | Strict config | Ownership and DTO conventions | Partial | 04 |
| Dependency direction | No enforcement | No feature code | App → features → shared; explicit APIs | Full | 04 |

## Implementation sequence completed

### 04B — App composition, routing, providers, and neutral shell

Objective: established the route tree, minimal providers, public/app layout seams,
not-found route, and render Error Boundary. Likely files: `src/app/` and
minimal `src/styles/` updates. Security: no auth/role claims. Performance:
avoid premature splitting. Tests: route rendering, 404, shell landmarks,
boundary fallback. DoD: shell is accessible, responsive, and feature-neutral.

### 04C — Shared UI and styling foundation

Objective: added only the needed product-agnostic primitives and tokens. Likely
files: `src/components/`, `src/styles/`, and focused component tests. Security:
safe text/props and correct semantics. Performance: small CSS/component surface.
Tests: keyboard, labels, focus, disabled/loading, responsive smoke. DoD:
primitives have stable props and no feature imports.

### 04D — API client and backend-error integration

Objective: implemented one transport boundary and normalized `ApiError`. Likely
files: `src/api/`, `src/config/`, and API tests. Security: public config only,
safe errors, explicit credentials policy, no client authority. Performance:
abort/dedupe seam and bounded payload assumptions. Tests: JSON/empty success,
HTTP errors, malformed/unexpected bodies, network, cancellation, header/body
request IDs. DoD: future UI cannot need raw `fetch` or raw envelope parsing.

### 04E — State-management boundaries and server-state convention

Objective: documented and implemented the narrowest query/cache seam required by
the selected approach. Likely files: `src/app/providers/`, `src/hooks/`,
`src/state/` only if proven. Security: no auth/tenant data assumptions.
Performance: no duplicate requests or cache replicas. Tests: ownership/query
behavior as applicable. DoD: server data and client state have one owner each.

### 04F — Forms and standard async states

Objective: established form field/submission conventions and distinct loading,
empty, no-results, error/retry primitives without product forms. Likely files:
`src/components/`, `src/hooks/`, and tests. Security: backend remains
authoritative; accessible errors. Performance: immediate acknowledgement and
no unnecessary rerenders. DoD: states are composable and distinguish causes.

### 04G — Accessibility, responsive, maintainability review

Objective: reviewed keyboard/focus/contrast/zoom/reflow, import direction, page
responsibility, and public boundaries. Likely files: targeted source/docs.
Tests: accessibility-oriented behavior and responsive smoke. DoD: findings are
fixed or explicitly recorded; no product behavior is added.

### 04H — Tests, security, and performance verification

Objective: ran layered tests and inspected XSS, secrets, error exposure, bundle,
render, request, and route behavior. Likely files: tests/config/docs only.
DoD: frontend quality gate passes, API boundary is covered, and evidence—not
premature optimization—drives any performance change.

### 04I — Handoff

Objective: record implementation evidence, remaining deferrals, dependency
decisions, and next-phase boundary. DoD: handoff accepted and Phase 04 status
changed to COMPLETE only after all prior criteria pass. The formal handoff is
recorded in `docs/architecture/PHASE_04_HANDOFF.md`.

## Dependency review

Runtime dependencies include React, React DOM, React Router, and TanStack Query.
Developer dependencies provide TypeScript, Vite, Vitest, jsdom, React Testing
Library, jest-dom, user-event, Oxlint, Prettier, and V8 coverage. There is no
global state library, form library, schema library, MSW, or accessibility audit
package.

| Package | Required/Optional | Why | Task needing it |
|---|---|---|---|
| TanStack Query | Implemented | Cache, dedupe, invalidation, retries, stale/error state for real server data | 04E |
| React Router | Implemented | Route composition, nesting, 404, and future route boundaries | 04B |
| Zod | Optional | Repeated client-side runtime validation at form/query boundaries | 04F, only after repetition |
| MSW | Optional | Maintainable realistic multi-request API scenarios | 04H or first complex feature |
| axe-based test tooling | Optional | Automated accessibility regression checks | 04G/04H if existing QA policy requires |

No package was installed or upgraded during this verification. The dependency
surface remains intentionally small; React Router and TanStack Query are the
only manually installed Phase 04 runtime foundations beyond React.

## Contradictions, blockers, and explicit decisions

- `PROJECT_STATE.md` and the roadmap identify Phase 04 as COMPLETE while Phase
  03 remains COMPLETE; Phase 05 is the next phase and remains NOT STARTED.
- The roadmap's historical Phase 00 section still says IN PROGRESS, but its
  current-status section and project state record Phase 00 COMPLETE. This is a
  historical-label inconsistency, not a Phase 04 blocker.
- The repository-local PRD is still missing, so product-specific acceptance,
  privacy, retention, and capacity details cannot be invented. This blocks
  feature expansion, not foundation design.
- `docs/infrastructure/` is absent; infrastructure authority is represented by
  the architecture infrastructure documents.
- No package installation or upgrade, auth, authorization,
  organization switching, database, migration, or AI work belongs to this task.

## Exact recommended next task

**Phase 05 - Authentication.** Begin only in the separately approved Phase 05
implementation task; do not add authentication or product functionality to the
Phase 04 foundation handoff.
