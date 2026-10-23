# FE-03: Route lazy loading and bundle measurements

Date: 22 October 2026. Scope: frontend route boundaries only. FE-05 has not started.

## Cause and investigation

`src/app/router/routes.tsx` eagerly imported every route component, mostly through
feature barrels. The single entry therefore contained the dashboard, all recruiting
screens, public application forms and their validation dependencies before any route
was visited. Shell imports from the organizations and notifications barrels also
referenced modules exporting pages; these now use direct component imports.

Baseline `npm run build` reproduced the supplied 843.45 kB / 236.92 kB gzip entry
and the unchanged 500 kB Vite warning. A temporary Vite `generateBundle` inspection
used existing dependencies, without installing an analyzer or changing Vite config.
Largest module contributions included React DOM, React Router, React Hook Form,
Tailwind Merge, Zod, AnalyticsPage, ApplicationFormBuilderPage and TeamPage.
Module rendered lengths are before final chunk minification and are not additive
estimates of download sizes. There are no third-party chart or rich-text editor
dependencies: analytics and builders use local components. The form stack is used
by public application forms and can be deferred completely.

The evidence-based target was at least a 30% reduction in the main entry. Both the
entry and its complete static dependency graph exceed that target.

## Production measurements

Decimal kB, Vite 8.3.5 production build, same dependencies and warning threshold.
Gzip figures below come from Vite's reporter. Total JS counts all emitted `.js`
files, excluding CSS, HTML and source maps.

| Metric | Before | After |
| --- | ---: | ---: |
| Main entry, minified | 843.45 kB | 390.14 kB |
| Main entry, gzip | 236.92 kB | 120.09 kB |
| Complete initial static JS, minified | 843.45 kB | 463.37 kB |
| Complete initial static JS, gzip (sum) | 236.92 kB | 145.29 kB |
| All JavaScript, minified | 843,451 bytes | 863,291 bytes |
| JavaScript chunk count | 1 | 51 |
| Largest chunk | Entry: 843.45 kB | Entry: 390.14 kB |
| Largest deferred chunk | None | PublicApplyPage: 135.33 kB / 40.43 kB gzip |
| Large-chunk warnings | One | None |

Main entry reduction: 53.7% minified and 49.3% gzip. Full initial static JS
reduction: 45.1% minified and 38.7% gzip. Initial static JS includes the 73.22 kB /
25.20 kB gzip shared `apiClient` chunk; its generated name also contains shared
router/query runtime, not merely the API utility. That chunk has no further static
imports. Total JS increased 19,840 bytes (2.35%) because of splitting overhead,
cross-chunk imports and preload metadata. More chunks alone are not the benefit.

Selected deferred chunks (minified / gzip kB):

| Route component | Size |
| --- | ---: |
| PublicApplyPage (includes React Hook Form/Zod) | 135.33 / 40.43 |
| ApplicationDetailPage (includes offer/outcome UI) | 39.97 / 10.00 |
| InterviewDetailPage | 22.48 / 5.82 |
| ApplicationFormBuilderPage | 17.75 / 5.43 |
| AnalyticsPage | 15.52 / 4.39 |
| TeamPage | 13.51 / 3.69 |
| OrganizationWorkspacePage (dashboard) | 12.06 / 3.65 |
| AuditPage | 10.68 / 3.76 |
| PipelineConfigurationPage | 10.09 / 3.48 |
| NotificationsPage | 9.58 / 3.22 |
| JobsPage | 8.93 / 3.28 |
| ScorecardTemplatePage | 8.87 / 2.96 |

The remaining small shared chunks are Vite's automatic extraction. No manual
chunk rules, utility dynamic imports, warning suppression or extra dependencies
were introduced. All CSS remains in the same 52.45 kB stylesheet, with no new
route CSS waterfall. Vite retains its dependency module-preload behavior.

## Implementation and route coverage

25 page components now use direct file imports declared at module scope:

- Organization onboarding and workspace/dashboard.
- Invitation acceptance and team management.
- Jobs list, create, detail and edit.
- Pipeline configuration and application form builder.
- Public careers, public job detail and public apply.
- Candidates list, candidate detail and application detail.
- Interviews list and interview detail.
- Scorecard template and personal scorecard.
- Notifications, talent pools list/detail, analytics and audit.

Offers have no standalone route: their existing application-detail sections are
deferred with that page. URL declarations, nesting and route elements retain their
original behavior; no route was invented or removed.

Eager components: AppProviders, QueryClient/BrowserRouter, session and public route
guards, shared layouts/sidebar, notification bell, workspace switcher, auth pages,
organization landing/redirect page, foundation and 404 pages. Keeping these eager
preserves session bootstrap, shell availability and lightweight entry experiences.

`lazyRoute` wraps each deferred page in a Suspense boundary and a local error
boundary. The existing LoadingState provides `aria-busy`, one accessible loading
status and existing reserved feedback space. The boundary lives inside the shell's
outlet, so navigation and providers remain mounted. There is no added delay,
second spinner or full-screen route transition. React caches each module-scope
lazy declaration; revisits do not import it again or show the chunk fallback.
Existing page data-loading states still apply after a module loads.

Import rejection renders a safe page-level error with a manual **Reload page**
button. It never changes authentication, redirects to login, exposes the import
URL, automatically retries or reloads. Navigation to another route remains usable.
The local error boundary resets when pathname changes; a failed lazy import stays
cached until explicit reload. The global AppErrorBoundary remains in place.

## Authentication and tenant safety

ProtectedRoute remains above AppLayout and every protected lazy page. Pending or
unauthenticated sessions cannot render or start importing those pages. Expiry
removes the pending boundary, and late import completion cannot reveal content.
Current-user bootstrap, authenticated mutation/session-expiry handling, CSRF,
query cleanup, logout and permission logic were not changed.

Organization and permission checks remain in the original page modules. Queries
retain their organization-scoped keys, permission-dependent enabled conditions,
cache and providers. Tests cover real Jobs permission denial, workspace params,
workspace switching, pending-load session expiry and shell/cache preservation.

## Changed files

- `hiringloop-frontend/src/app/router/routes.tsx`: direct lazy feature imports.
- `hiringloop-frontend/src/app/router/LazyRoute.tsx`: loading/error boundary helper.
- `hiringloop-frontend/src/app/router/LazyRoute.test.tsx`: five controlled-import tests.
- `hiringloop-frontend/src/app/router/job-routes.test.tsx`: direct module mocks and
  matching tests for all 25 lazy page routes.
- `hiringloop-frontend/src/app/router/routes.test.tsx`: real lazy Jobs RBAC check.
- `hiringloop-frontend/src/app/App.test.tsx`: await lazy onboarding after redirect.
- `hiringloop-frontend/src/features/auth/auth-pages.test.tsx`: await login's deferred
  destination with an appropriate async assertion.
- `hiringloop-frontend/src/features/team/pages/InvitationAcceptancePage.test.tsx`:
  await the lazy invitation route before asserting its existing pending state.
- `hiringloop-frontend/src/layouts/AppLayout.tsx`: direct notification bell import.
- `hiringloop-frontend/src/layouts/AppSidebar.tsx`: direct workspace switcher import.
- This report.

Existing uncommitted FE-01/FE-02/FE-04 and other work was preserved. No backend,
database, demo seed, dependency, API contract or workflow logic changes were made
for FE-03. No commit, push, stash or reset was performed.

## Verification

- Focused routing/auth/workspace: 132 tests passed across 12 files.
- App and test TypeScript: `npm run typecheck` passed. `tsconfig.app.json` includes
  all `src` tests; there is no separate test tsconfig. Build also checks node config.
- Oxlint and full frontend Prettier check passed.
- Production `npm run build` passed; 2,254 modules transformed, 51 JS chunks,
  no large-chunk warning. Threshold unchanged.
- Playwright discovery: 5 tests across 2 files, unchanged. Discovery starts no server.
- Production-build Chromium smoke: 37 checks passed, zero unexpected page errors,
  zero unmatched API fixtures and zero mutations. Covered 21 protected deep links,
  nine SPA recruiting navigation edges, shell/current-user query preservation,
  Back/Forward, workspace switching, public careers to job to apply, public 404,
  unauthenticated deep-link rejection and an aborted Jobs chunk with navigation
  away to the dashboard. API traffic was intercepted; no backend was started.
- `git diff --check` passed.
- Default fork-pool attempts encountered worker-start timeouts and a long stall
  in the existing mobile-drawer test. The first complete attempt reported 394
  passing tests, the invitation assertion subsequently corrected above, and two
  worker-start errors. Final verification uses `npm run test -- --pool=threads`,
  retaining the configured single worker without changing repository settings.
- Full Vitest: `npm run test -- --pool=threads` passed **401/401 tests across
  64/64 files**, with no unhandled errors, in 409.89 seconds. The original
  `maxWorkers: 1` configuration remains unchanged.

## Limits and readiness

First feature visits necessarily request a chunk before the existing page queries
start. Shared static imports are preloaded by Vite; no custom speculative fetching
or artificial navigation delay was added. Deployment should retain hashed assets
for existing clients and serve SPA deep links. A missing asset offers explicit
reload rather than an automatic recovery loop.

Browser checks use a temporary static server and intercepted API fixtures, with
all non-GET API requests and external traffic blocked. They do not exercise real
database workflows, live login cookies or server-side tenant authorization. Those
limitations must not be represented as live end-to-end verification.

FE-03 is complete and ready for a separately scoped FE-05. No unresolved code
failures remain. Default fork-pool verification was limited by worker startup
timeouts and host stalls; the complete single-worker thread-pool run passed.
FE-05 has not started and must be separately requested.
