# FE-05: Public landing and 404 recovery

Date: 22 October 2026. Scope: FE-05 only.

## Root cause and changes

The public landing, public layout and shared 404 retained early foundation copy.
Both router wildcard branches rendered the same 404 with a link to `/`, including
the branch nested under ProtectedRoute and AppLayout. The old recovery link also
used legacy button classes with no current CSS definitions.

The landing now introduces HiringLoop as an applicant tracking system, describing
existing jobs, candidates, application pipelines, interviews, scorecards, team
coordination and workspace analytics. It remains a compact card. No AI or external
integration claims were added. The public header/footer use product wording.

Confirmed unauthenticated visitors receive Login/Register links. Authenticated
visitors receive `/app` links. During session loading or failure, public content
remains available with a neutral Continue action to the existing guarded `/app`.
No session or organization details are rendered on these public pages; they do not
fetch organizations. The existing current-user query is shared by its query key.

Public unmatched URLs offer Return to home and the appropriate login/workspace
action. Protected unmatched `/app/*` URLs retain ProtectedRoute and AppLayout,
with a single Return to workspace action pointing to `/app`. Nested unmatched
organization and recruiting paths use that same branch. Similar public prefixes
such as `/app-like/*` remain public. Existing resource routes continue using their
original resource-unavailable handling rather than being replaced by redirects.

Recovery uses the existing organization landing flow: zero memberships opens
organization setup, one opens that workspace, multiple opens the chooser, and
organization-loading failures retain their existing retry experience. No tenant ID
is inferred from an invalid URL. Authentication, session expiry, RBAC, query cleanup,
organization selection logic, route declarations and all 25 lazy page imports are
unchanged. Only the protected wildcard's page prop changed in the router.

Shared button variants were extracted unchanged so links reuse the current button
tokens, minimum height, hover and focus styles while remaining semantic links.
The pages retain one h1 inside the layout's main region and responsive wrapping.
The existing static browser title remains HiringLoop; there is no existing route
title facility to extend. No full WCAG compliance claim is made.

## Files changed for FE-05

- `hiringloop-frontend/src/app/pages/FoundationPage.tsx`
- `hiringloop-frontend/src/app/pages/NotFoundPage.tsx`
- `hiringloop-frontend/src/layouts/PublicLayout.tsx`
- `hiringloop-frontend/src/app/router/routes.tsx`
- `hiringloop-frontend/src/shared/components/ui/Button.tsx`
- `hiringloop-frontend/src/shared/components/ui/button-variants.ts` (new)
- `hiringloop-frontend/src/app/App.test.tsx`
- `hiringloop-frontend/src/app/router/routes.test.tsx`
- `hiringloop-frontend/src/app/router/job-routes.test.tsx`
- This report.

Local ignored verification artifacts: `.verification-artifacts/fe05-browser.mjs`
and `.verification-artifacts/fe05-browser/` (results and screenshots).

Existing uncommitted work, including earlier frontend remediations and backend/demo
seed changes, was preserved. FE-05 changes no backend, database, API, dependencies
or recruiting workflow logic. No reset, stash, commit, push or deployment occurred.

## Tests and verification

Sixteen route tests were added for ATS copy and removal of placeholder copy,
public navigation, authenticated public entry without cached tenant/account
exposure, pending/error sessions, public invalid paths, authenticated public 404,
protected invalid paths, no memberships, multiple memberships and protected guards.
Existing App assertions were updated to product wording; their landmark and
recovery assertions were preserved. Route-matching tests receive a session mock
because the real public layout now reads the shared current-user hook.

- Focused page/route run: 31/31 tests across 2/2 files passed in 40.55 seconds.
- Existing lazy-boundary and route-matching run: 30/30 tests across 2/2 files passed.
  That initial combined attempt also had two worker startup timeouts for App/routes;
  those two files passed on the focused retry above.
- Final `npm run typecheck`, `npm run lint` (Oxlint) and `npm run format:check`:
  passed. No final lint warnings. An intermediate Fast Refresh export warning was
  resolved by extracting the shared button variants into their own module.
- Production build: passed, 2,255 modules; main entry 391.16 kB / 120.25 kB gzip,
  51 JavaScript chunks, no large-chunk warning. Lazy feature chunks remain emitted.
- Full Vitest using `npm run test -- --pool=threads` and configured single worker:
  passed **417/417 tests across 64/64 files**, no unhandled errors, in 621.68
  seconds. The configured `maxWorkers: 1` remains unchanged.
- `npm run test:e2e -- --list`: passed, 5 tests across 2 files; no servers or database
  fixtures started.
- `git diff --check`: passed.
- Browser: final rebuilt-page Chromium smoke passed 23 checks, zero page errors,
  zero unexpected API requests and zero API mutations. Primary button text
  contrast measured 5.47:1 with 44px minimum height. Mobile landing/404 and desktop
  landing plus mobile protected-404 screenshots were visually inspected; text and
  actions fit without clipping at the checked sizes.

## Browser scope, limitations and readiness

Browser smoke uses a local static production server with all API requests fulfilled
by browser fixtures. Non-GET API requests and external traffic are blocked. No
backend is started. Checks cover 320/375/768/1280px public landing and 404 layouts,
single main/h1, overflow, keyboard skip link and visible focus, public account
navigation, authenticated entry, protected misses, denied organization membership,
lazy onboarding, chooser and public tenant privacy. Screenshots are retained for
visual inspection. Primary action text contrast is measured against its computed
background; this is a focused check, not a full accessibility audit.

These checks do not validate live cookies, server-side tenant isolation or real
database workflows. Existing guards and permission tests remain the safety
coverage for unchanged behavior. FE-05 is complete and ready for separately scoped
final frontend release verification. No unresolved code failures or final build/lint
warnings remain. The initial worker startup errors were resolved by the focused
retry and complete passing single-worker thread-pool suite. Stop after FE-05;
deployment and final frontend release verification have not begun.
