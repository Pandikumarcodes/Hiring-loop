# HiringLoop frontend UI audit — 21 October 2026

## Scope and initial checkpoint

Incremental frontend audit against checkpoint `30ea33ba48209f33c0e84abbb1d54b3f90d4c4a0`. No commits, backend changes, database operations, or live recruiting mutations are authorized by this pass.

Initial working tree, recorded before edits:

- Modified backend `package.json`.
- Modified frontend: `AuthAlert.tsx`, `AuthPageHeader.tsx`, `ResendVerificationForm.tsx`, `ForgotPasswordPage.tsx`, `LoginPage.tsx`, `RegisterPage.tsx`, `ResetPasswordPage.tsx`, `VerifyEmailPage.tsx`, `AuthLayout.tsx`.
- Untracked: `docs/demo-seed-workflow.md`, backend `scripts/demo-seed-data.js`, `scripts/seed-demo.js`, and `tests/scripts/`.

These pre-existing changes must be preserved. The auth files will not be edited by this pass. Source hashes and structural inventory are retained in ignored `.verification-artifacts/ui-audit/`. Initial scan covers 99 non-test TSX/CSS files, 16,110 lines, including feature subcomponents, entry/provider/error boundaries, layouts, and shared primitives.

## A. Route coverage

`src/app/router/routes.tsx` defines **35 leaf route patterns**, including two wildcard fallbacks and the `/app/organizations` alias. The `/app/*` layout wrapper and pathless guards are not additional pages. Resend verification is an embedded form on the email-verification page, not a separate route. Paths below are relative to `hiringloop-frontend/src/`. `O` means `/app/organizations/:organizationId`. Tenant IDs remain in URLs and query keys; public careers use the organization slug.

Review notation: **S** = source/structural inspection; browser evidence and its limits are recorded separately in section J. A source review is not a claim that every data-dependent state has been visually verified.

| #   | Route                                          | Component file                                                                                     | Layout / auth / tenant                   | Visual patterns, risks and proposed result (S)                                                                                                                      |
| --- | ---------------------------------------------- | -------------------------------------------------------------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `/login`                                       | `features/auth/pages/LoginPage.tsx`                                                                | Auth; guest guard; none                  | Existing polished Field/Input/PasswordField; preserve spacing and errors; verify narrow view.                                                                       |
| 2   | `/register`                                    | `features/auth/pages/RegisterPage.tsx`                                                             | Auth; guest guard; none                  | Existing polished form; preserve password guidance and pending states.                                                                                              |
| 3   | `/forgot-password`                             | `features/auth/pages/ForgotPasswordPage.tsx`                                                       | Auth; guest guard; none                  | Existing polished recovery form and success message; preserve.                                                                                                      |
| 4   | `/verify-email`                                | `features/auth/pages/VerifyEmailPage.tsx`                                                          | Auth; mixed session states; none         | AuthAlert and embedded ResendVerificationForm; preserve local polish and behavior.                                                                                  |
| 5   | `/reset-password`                              | `features/auth/pages/ResetPasswordPage.tsx`                                                        | Auth; token-based; none                  | Existing polished token errors/password form; preserve.                                                                                                             |
| 6   | `/invitations/accept`                          | `features/team/pages/InvitationAcceptancePage.tsx`                                                 | Auth; session/verified email; invitation | Auto-accept is a mutation: browser only without token. Previously lacked a standalone main landmark; now supplied by AuthLayout.                                    |
| 7   | `/`                                            | `app/pages/FoundationPage.tsx`                                                                     | Public; none; none                       | PageContainer/Card/PageHeader; foundation copy retained within requested scope.                                                                                     |
| 8   | `/careers/:organizationSlug`                   | `features/public-careers/pages/PublicCareerPage.tsx`                                               | Public; none; slug                       | Career cards, metadata and pagination; long content/pagination wrapping risks.                                                                                      |
| 9   | `/careers/:organizationSlug/jobs/:jobId`       | `features/public-careers/pages/PublicJobDetailPage.tsx`                                            | Public; none; slug                       | Metadata grid and prose cards; white-on-bright-teal CTA contrast defect; fix with primary-dark.                                                                     |
| 10  | `/careers/:organizationSlug/jobs/:jobId/apply` | `features/candidate-application/pages/PublicApplyPage.tsx`                                         | Public; none; slug                       | RHF/Zod sections and upload; shared file input lacks styled file button/vertical spacing; success CTA contrast; fix presentation only.                              |
| 11  | `/*`                                           | `app/pages/NotFoundPage.tsx`                                                                       | Public; none; none                       | Card with recovery link; retain public padding variation.                                                                                                           |
| 12  | `/app`                                         | `features/organizations/pages/OrganizationLandingPage.tsx`                                         | App; verified session; workspace chooser | Shared header and workspace cards; preserve one/zero-workspace redirects.                                                                                           |
| 13  | `/app/organizations/new`                       | `features/organizations/pages/OrganizationOnboardingPage.tsx`                                      | App; verified session; new workspace     | Custom split onboarding; outer gutters diverge from shell at sm/lg; align with PageContainer spacing scale.                                                         |
| 14  | `O`                                            | `features/organizations/pages/OrganizationWorkspacePage.tsx` → `components/WorkspaceDashboard.tsx` | App; verified session; ID                | Permission-gated KPI/widget grid; cards have uneven label/value/footer placement; align metrics, preserve queries. Unavailable recovery CTA contrast.               |
| 15  | `O/team`                                       | `features/team/pages/TeamPage.tsx`                                                                 | App; member permissions; ID              | Tables/mobile cards/inline invite/ConfirmDialog; desktop th elements lack padding/background/text alignment; role/action columns too tight.                         |
| 16  | `O/jobs`                                       | `features/jobs/pages/JobsPage.tsx`                                                                 | App; job:list; ID                        | FilterToolbar, table/mobile cards, pagination; shared scroll region and wrapping improvements.                                                                      |
| 17  | `O/jobs/new`                                   | `features/jobs/pages/CreateJobPage.tsx`                                                            | App; job:create; ID                      | JobForm/Field sections; shared errors/wrapping; preserve draft/open flows.                                                                                          |
| 18  | `O/jobs/:jobId`                                | `features/jobs/pages/JobDetailPage.tsx`                                                            | App; job:view; ID                        | Many header actions in nonwrapping flex; long department/value and automatic grid minima; fix wrapping and minmax.                                                  |
| 19  | `O/jobs/:jobId/edit`                           | `features/jobs/pages/EditJobPage.tsx`                                                              | App; job:update; ID                      | JobForm and conflict feedback; breadcrumb wrapping via shared header; preserve expected-version semantics.                                                          |
| 20  | `O/jobs/:jobId/pipeline`                       | `features/pipelines/pages/PipelineConfigurationPage.tsx`                                           | App; pipeline permissions; ID            | Stage cards/dialog/confirm; title reserves only pr-8; share consistent dialog defaults.                                                                             |
| 21  | `O/jobs/:jobId/application-form`               | `features/application-form/pages/ApplicationFormBuilderPage.tsx`                                   | App; application-form permissions; ID    | Builder/preview custom grid; fractional tracks have automatic minima; constrain tracks; keep revision/draft behavior.                                               |
| 22  | `O/jobs/:jobId/scorecard`                      | `features/scorecards/pages/ScorecardTemplatePage.tsx`                                              | App; scorecard-template permissions; ID  | Published/draft editor and confirm; shared container/wrapping; preserve revision conflict reload.                                                                   |
| 23  | `O/candidates`                                 | `features/candidate-management/pages/CandidatesPage.tsx`                                           | App; candidate:list; ID                  | Filters/table/mobile cards; shared scroll focus, badge wrapping, numeric alignment.                                                                                 |
| 24  | `O/candidates/:candidateId`                    | `features/candidate-management/pages/CandidateDetailPage.tsx`                                      | App; candidate permissions; ID           | Profile/application list/talent-pool dialog; shared text/dialog fixes.                                                                                              |
| 25  | `O/applications/:applicationId`                | `features/candidate-management/pages/ApplicationDetailPage.tsx`                                    | App; application permissions; ID         | Persistent mounted section navigation; top-2 collides with sticky 64px header; scroll-mt-24 insufficient for two sticky bars. Fix offsets without unmounting forms. |
| 26  | `O/interviews`                                 | `features/interviews/pages/InterviewsPage.tsx`                                                     | App; interview permissions; ID           | Seven-day navigation, grouped cards; shared long-content wrapping; preserve UTC window/assignment handling.                                                         |
| 27  | `O/interviews/:interviewId`                    | `features/interviews/pages/InterviewDetailPage.tsx`                                                | App; interview permissions; ID           | Action-heavy header and participant/feedback cards; shared header/dialog fixes; preserve concurrency.                                                               |
| 28  | `O/interviews/:interviewId/scorecard`          | `features/scorecards/pages/MyScorecardPage.tsx`                                                    | App; assigned scorecard permissions; ID  | ScorecardForm/ReadOnly; selected radio labels lack surface feedback; comment fields lack label gap; improve presentation only.                                      |
| 29  | `O/notifications`                              | `features/notifications/pages/NotificationsPage.tsx`                                               | App; own notifications; ID               | Notifications/preferences; inconsistent top padding and unbounded text/menu height; preserve async preference hydration and bell names.                             |
| 30  | `O/talent-pools`                               | `features/talent-pools/pages/TalentPoolsPage.tsx`                                                  | App; talent-pool permissions; ID         | Search/pool cards/dialog/pagination; shared title/text fixes.                                                                                                       |
| 31  | `O/talent-pools/:talentPoolId`                 | `features/talent-pools/pages/TalentPoolDetailPage.tsx`                                             | App; talent-pool permissions; ID         | Member flex rows: email block has automatic min-width; constrain and wrap. Existing lookup only checks first pool page: functional issue deferred.                  |
| 32  | `O/analytics`                                  | `features/analytics/pages/AnalyticsPage.tsx`                                                       | App; analytics:view; ID                  | KPI/funnel/tables; fixed md filter minimum widths overflow tablet; top padding differs; numeric/scroll accessibility fixes.                                         |
| 33  | `O/audit`                                      | `features/audit/pages/AuditPage.tsx`                                                               | App; audit:view; ID                      | Filters/named focusable scroll table/detail dialog; align padding, dialog hierarchy; structured values need robust wrapping.                                        |
| 34  | `/app/organizations`                           | `features/organizations/pages/OrganizationLandingPage.tsx`                                         | App; verified session; chooser           | Alias of #12; review same chooser and redirects.                                                                                                                    |
| 35  | `/app/*` unmatched                             | `app/pages/NotFoundPage.tsx`                                                                       | App; verified session; path dependent    | Shared fallback inside shell; preserve recovery navigation.                                                                                                         |

## B. Prioritized issue list — recorded before implementation

| ID    | Severity | Exact source evidence                                                                                                                                                            | Smallest proposed fix                                                                 |
| ----- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| UI-01 | High     | `AnalyticsPage.tsx:209`: md grid minima 10rem + 10rem + 14rem + auto plus gaps exceed available tablet/small desktop workspace width.                                            | Two columns at sm, four flexible columns only at xl.                                  |
| UI-02 | High     | `JobDetailPage.tsx:81`: action container lacks flex-wrap; PageHeader sm:shrink-0 reserves full action width alongside title.                                                     | Wrap page header with minimum useful title basis; wrap detail actions.                |
| UI-03 | High     | `ApplicationDetailPage.tsx:187`: sticky top-2 under AppLayout sticky min-h-16 header; targets scroll-mt-24.                                                                      | Sticky top-18, scroll-mt-40 and 44px section links.                                   |
| UI-04 | High     | PublicJobDetail/PublicApply success/OrganizationWorkspace recovery use `bg-primary` (#14b8a6) with white text (~2.49:1). `App.css` eyebrow also bright teal on light background. | Use existing primary-dark (~5.47:1 against white). No brand token replacement.        |
| UI-05 | Medium   | `Dialog.tsx`: DialogTitle/Description exported raw. Interview/offer/audit/communication/pool dialogs have no heading typography/close clearance.                                 | Shared semantic styled wrappers; preserve Radix behavior and custom props.            |
| UI-06 | Medium   | Team table th has no class; no global table styles restore preflight reset. Tight fixed percentage columns and px-6 crowd badge/actions.                                         | Consistent table headers, text-sm and minimum scroll width, retain mobile cards.      |
| UI-07 | Medium   | Team/analytics/audit/notifications use py-10/lg:py-14 while normal protected pages use py-8/lg:py-10; onboarding gutters differ.                                                 | Reuse existing protected page rhythm, preserve public/auth layout needs.              |
| UI-08 | Medium   | `PageContainer`, `Field`, `Badge`, dialog and notification text lack overflow-wrap:anywhere. break-words does not lower flex/grid intrinsic minimum.                             | Target shared text boundaries and flexible member rows; avoid body overflow clipping. |
| UI-09 | Medium   | `DropdownMenuContent` overflow-hidden, no max-height; five multi-line notifications may exceed short mobile viewport.                                                            | Radix available-height limit and internal vertical scrolling.                         |
| UI-10 | Medium   | `DataTableShell` horizontal scroll region has no accessible name or tab stop. Focus CSS only targets tabindex=-1.                                                                | Named region/tabIndex=0 and shared focus-visible selector.                            |
| UI-11 | Low      | Dashboard labels/values/footer links have content-driven heights; analytics KPI values lack tabular numerals.                                                                    | Equal label/value slots and bottom-aligned metric links; numeric alignment.           |
| UI-12 | Low      | Only shared button/loading spinner respects reduced motion; animate-pulse skeletons remain animated.                                                                             | Disable existing pulse/spin utility animation under reduced-motion.                   |
| UI-13 | Low      | ScorecardForm optional comment label directly touches textarea; selected labels have no surface treatment. Shared Input type=file has only generic input styles.                 | Gap/block spacing, selected teal surface, reusable file button styling.               |

## Additional findings from implementation and browser review

| ID    | Severity | Evidence                                                                                                                                                                                                               | Resolution                                                                                                                                                                            |
| ----- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| UI-14 | Medium   | Team at 768×1024 and 1024×768 had 138px/146px document overflow even though its table region scrolled correctly. The absolute screen-reader role label escaped the scroll container's positioning context.             | Positioned the table wrappers with `relative`; reran all eight sizes with zero overflow. Shared DataTableShell uses the same containment.                                             |
| UI-15 | High     | Conditional dialogs returned focus to `body` after Escape. A new focused test reproduced the defect; browser checks also reproduced it. Pipeline's `autoFocus` input required capturing the opener before field mount. | Shared DialogContent restores a connected opener, preserves caller-provided autofocus handlers, and handles React autoFocus. Tests cover both field variants and Radix DialogTrigger. |
| UI-16 | Medium   | `CandidateTalentPools.tsx` header squeezed “Add to pool” into a narrow vertical label at 320px; visible in the first candidate-profile screenshot.                                                                     | Stack header/actions on mobile, retain a flexible description and nonshrinking button on wider screens. Rechecked all eight widths.                                                   |
| UI-17 | Medium   | Invitation errors occupied the viewport edge with no main landmark or normal auth-page gutter.                                                                                                                         | Reuse AuthLayout around the existing acceptance content; acceptance effect, token handling, redirects and mutation remain unchanged. Browser verified the no-token state only.        |
| UI-18 | Medium   | Global skip link had z-index 30 under the desktop sidebar's z-index 40.                                                                                                                                                | Raise the existing skip-link layer to 60.                                                                                                                                             |

## C. Design-system consistency

Reused the existing teal/slate palette and semantic tokens: `primary-dark`, `primary-hover`, `primary-soft`, `text-primary`, `text-secondary`, `surface`, `surface-raised`, `surface-muted`, `border`, `border-strong`, and existing success/warning/error/info variants. No tokens or dependencies were replaced.

Protected page rhythm remains `px-4 / sm:px-6 / lg:px-8` and `py-8 / lg:py-10`, with existing wide/standard width variants. Public careers keep their reading width and public vertical rhythm. AuthLayout retains its existing source and recent polish. Builder/detail/dashboard layouts keep their functional differences.

Shared Card, Badge, Button, PageContainer, PageHeader, DataTableShell, Field, Input, Dialog, DropdownMenu, FilterToolbar, ListPagination and feedback patterns remain in place. Dialog titles now have consistent text-lg/bold/leading-7 styling, descriptions text-sm/leading-6, and close-button clearance. Typography changes use the existing utility scale.

## D. Fixes implemented by checkpoint

| Checkpoint                   | Completed implementation                                                                                                                                                                                                                                            | Verification                                                                                                                                        |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 — Audit                    | Initial Git inventory; 35-route matrix; 99 UI-source structural inventory; prioritized findings before edits.                                                                                                                                                       | Router, tokens, entry/providers, layouts, feature JSX and test/config inspection.                                                                   |
| 2 — Foundations              | Wrapping headers/actions/breadcrumbs; intrinsic text wrapping; bounded badges/alerts/errors; keyboard-accessible table regions; consistent dialog text; opener restoration; viewport-limited dropdown scrolling; file-input presentation; reduced-motion skeletons. | Shared component/foundation/ConfirmDialog tests; real Chromium dialog checks.                                                                       |
| 3 — Shell                    | Sidebar fixed areas no longer flex-shrink; existing scrollable navigation retained; skip link clears fixed shell.                                                                                                                                                   | Existing AppLayout tests; drawer screenshots and keyboard checks at mobile/tablet widths. Navigation configuration and permissions were not edited. |
| 4 — Recruiting               | Dashboard metric alignment; job actions wrap; job/builder grid tracks can shrink; persistent application bar clears shell; section targets clear both bars; scorecard selection surfaces and comment spacing; note spacing.                                         | 53 shell/recruiting tests; route screenshots; sticky/unsaved-note and rating checks.                                                                |
| 5 — Supporting               | Analytics filter grid and KPI rhythm; Team table headers/padding/scroll containment; Audit/Team/Notifications outer rhythm; notification surfaces; pool-member wrapping and candidate pool action layout.                                                           | 45 supporting/public tests; 280 initial route/viewport measurements plus targeted corrections.                                                      |
| 6 — Public                   | Darker teal CTA text contrast; public long-content/pagination wrapping; file upload input spacing; invitation states reuse AuthLayout. Existing auth files preserved.                                                                                               | Public/application/organization tests; all public route fixtures at eight sizes.                                                                    |
| 7 — Responsive/accessibility | Team/table escape corrected; dialog focus restored including autoFocus; target sizes, named scroll regions, focus-visible and reduced-motion rules improved.                                                                                                        | Browser interaction results and focused regression tests; limitations below.                                                                        |
| 8 — Regression               | Typecheck, configured Oxlint, formatting and production build run; complete Vitest suite and failure follow-up recorded in I.                                                                                                                                       | See exact results below.                                                                                                                            |

All UI-01 through UI-18 have implementation fixes. This is completion of the identified incremental UI fixes, not proof that every possible product state is defect-free.

## E. Responsive fixes and evidence

The viewport matrix is **320×700, 375×812, 390×844, 768×1024, 1024×768, 1280×800, 1440×900, 1920×1080**.

- Analytics: flexible date/job filters at tablet widths, including 768 and 1024; no document overflow in the fixture matrix. Funnel bars and wide reporting tables remain contained and readable using local scrolling.
- Team: tablet/small-desktop table minimum width stays within a named local scrolling region. The 138px/146px overflow found during the first browser pass is resolved at both affected sizes. Mobile cards remain the mobile presentation.
- Candidate profile: the 320px “Add to pool” action now has a normal horizontal label beneath the description. The corrected route was rechecked at all eight sizes.
- Job detail: title/action grouping wraps at narrow widths; long department/location/title fixtures at 320px produce zero document overflow.
- Application detail: at 390×844, the section bar top was **72px**, its bottom **134px**, and the linked section top **160px**. The 64px shell header and section bar no longer obscure targets.
- Dropdown: at 320×700, long notification content stayed within x=12…300 and y=62…688; content scroll height was 1424px within a 624px internal viewport.
- Dialogs: 59 dialog/drawer cases across 320, 375, 768 and 1280 widths fit within their viewport and trapped Tab navigation. Long question/offer/interview forms scroll internally. Escape and opener focus restoration were checked.
- Public careers and pool detail: long text fixtures at 320px have zero document overflow. The shared wrapping rules do not hide overflow at body level.

## F. Accessibility improvements and evidence limits

Implemented keyboard-focusable, named table scroll regions and a focus-visible rule for all tabindex targets; preserved table captions and native control semantics. Dialog names/descriptions remain Radix-managed. New tests cover Escape, DialogTrigger restoration, conditional openers and autoFocus fields. Existing confirmation custom focus behavior remains covered.

Section links are 44px high. Existing native checked radio state is retained and supplemented with a selected teal surface. Error/helper text can wrap without disconnecting aria-describedby. Sidebar skip-link layering, invitation main landmark, and reduced-motion handling for existing pulse/spin utilities were improved.

White text on `#14b8a6` was replaced with white text on existing `#0f766e` in the affected public/recovery CTAs (approximately 2.49:1 → 5.47:1). Status labels and native radio/checkbox semantics continue to accompany color treatments.

Evidence categories:

- **Static:** headings/landmarks, labels, semantic tokens, native controls, reduced-motion CSS, router/navigation configuration and all overlay sites.
- **Automated DOM:** existing RTL suites plus focused dialog and scroll-region assertions. No axe/Lighthouse dependency or configured accessibility scanner was found; none was installed.
- **Real browser:** viewport bounds, keyboard trapping, Escape/focus restoration, scroll containment, sticky positioning, rating surface and preservation of an unsaved note while following section links.
- **Not verified:** screen-reader announcements with actual assistive technology, high-contrast OS modes, complete contrast measurement of every possible state, Safari/Firefox, native mobile keyboards, 200–400% zoom, and exhaustive WCAG 2.2 AA conformance. Accessibility is **partially verified**, not certified.

## G. Files changed

This task modifies **33 existing UI source files and one existing test file**, creates **one report**, and deletes **zero files**. The exact task-only file list is appended below. It excludes the pre-existing authentication and backend/demo-seed changes recorded at the start. All 12 auth UI source files, including AuthLayout, were verified against their initial SHA-256 values and remain byte-for-byte unchanged.

Ignored local verification artifacts are under `.verification-artifacts/ui-audit/`: source inventory/hashes, structural JSX index, browser fixture script, raw route and interaction JSON, screenshots, contact sheets and task file list. These are review artifacts and are not application code or new dependencies.

## H. Functionality preserved

No API modules, query/mutation hooks, permission definitions, tenant URL generation, navigation configuration, backend services, schemas, migrations or database files were edited. No dependencies or scripts in either package.json were changed by this task. No commits, pushes, resets, stashes, migrations, database seeds or recruiting writes were performed.

Dashboard data and metric calculations, UTC interview serialization/seven-day navigation, recruiting conflict/revision checks, application section mounting, notification preference hydration, bell accessible names, job lifecycle actions, auth/session semantics, and public submission/upload logic remain in their existing implementations. Invitation changes only add the existing visual layout around the unchanged content/effect. Dialog event handlers retain caller cancellation/custom-focus behavior.

## I. Test results and exact commands

Commands run from `hiringloop-frontend` unless otherwise stated. Vitest retains the established `maxWorkers: 1`, 15-second test timeout and existing assertions. No timeout was increased.

| Command                              | Result                                                                                      |
| ------------------------------------ | ------------------------------------------------------------------------------------------- |
| `npm.cmd run typecheck`              | Passed (exit 0).                                                                            |
| `npm.cmd run lint`                   | Passed (Oxlint, exit 0). No separate ESLint script is configured.                           |
| `npm.cmd run format:check`           | Passed: all matched frontend files use Prettier style.                                      |
| `npm.cmd run build`                  | Passed: TypeScript build plus Vite production output. Existing large-chunk warning remains. |
| `git diff --check` (repository root) | Passed.                                                                                     |
| `npm.cmd run test -- --maxWorkers=1` | Passed: **61 files / 351 tests**, final run 161.77 seconds (exit 0).                        |

Checkpoint test commands/results:

```powershell
npm.cmd run test -- src/shared/components/components.test.tsx src/shared/components/foundation.test.tsx --maxWorkers=1
# 2 files / 12 tests passed after the first foundation additions.

npm.cmd run test -- src/layouts/AppLayout.test.tsx src/features/jobs/pages/JobDetailPage.test.tsx src/features/organizations/components/WorkspaceDashboard.test.tsx src/features/candidate-management/candidate-management.test.tsx src/features/application-form/pages/ApplicationFormBuilderPage.test.tsx --maxWorkers=1
# 5 files / 53 tests passed.

npm.cmd run test -- src/features/analytics/analytics.test.tsx src/features/audit/audit.test.tsx src/features/team/pages/TeamPage.test.tsx src/features/notifications/notifications.test.tsx src/features/talent-pools/talent-pools.test.tsx src/features/public-careers/public-careers.test.tsx src/features/candidate-application/pages/PublicApplyPage.test.tsx src/features/scorecards/components/ScorecardForm.test.tsx src/features/organizations/organizations.test.tsx --maxWorkers=1
# 9 files / 45 tests passed.

npm.cmd run test -- src/shared/components/components.test.tsx src/features/team/components/ConfirmDialog.test.tsx --maxWorkers=1
# 2 files / 14 tests passed before adding the second autoFocus parameter.

npm.cmd run test -- src/shared/components/components.test.tsx src/features/auth/auth-pages.test.tsx --maxWorkers=1
# Final targeted rerun: 2 files / 37 tests passed.
```

Failure history is retained rather than hidden: the first full run reported 349 passed / 2 failed across 61 files. One new parameterized dialog case lacked explicit DOM cleanup between cases; `afterEach(cleanup)` repaired test isolation, and the test waits for Radix's asynchronous close-focus lifecycle. The other failure was the existing login navigation assertion waiting for organization onboarding while the DOM still showed “Opening organization setup”; it passed in both isolated follow-ups without any auth implementation, assertion or timeout change. The initial concurrent browser/build load is a possible contributor, not a proven root cause. The final full run is recorded above.

The first sandboxed baseline full-suite attempt did not progress and was cancelled. Working test runs used the approved outside-sandbox execution. No database E2E suite was invoked.

## J. Browser verification

Used the already installed project-local **Chromium 156.0.8078.4** through Playwright against a dedicated loopback Vite port 4186. No browser download was needed. The supported local-browser install command, if needed on another machine, is `npx.cmd playwright install chromium`; the existing npm E2E scripts use `PLAYWRIGHT_BROWSERS_PATH=0`.

**35 routes × 8 viewports = 280 initial measurements.** All routes in A were visited. The initial Team overflow was fixed and corrected Team/candidate/invitation routes were remeasured (24 checks); latest per-route results have zero document overflow. Browser JavaScript errors: zero. Unhandled fixture endpoints: zero. API mutations attempted: zero.

**65 final interaction checks passed:** 59 dialog/drawer cases, one long notification menu, three long-content pages, one sticky/unsaved-note case and one selected rating surface. The final pass waits for Radix's actual close-focus lifecycle; initial failures led to the focus restoration repair and a corrected audit-button locator that uses its accessible name.

138 screenshots were retained in total. Seventy route screenshots (320px and 1280px for every route) were visually reviewed through 12 contact sheets. Additional individual reviews covered corrected candidate/invitation screens, analytics at tablet width, Team tablet containment, mobile navigation, question/interview/offer/audit dialogs, long notifications and application sticky navigation. Screenshots at the other six widths are **not** claimed: those widths have browser DOM/bounds measurements. Contact sheets provide overall layout review; detailed inspection focused on the affected layouts and long/scrolling states.

All API GET responses in this browser run are synthetic, based on existing frontend test fixtures and response envelopes. All non-GET API calls and external traffic are blocked. It does not invoke Playwright's E2E config, backend webServer, teardown, fixtures, PostgreSQL, login, invitation acceptance, application submission, interview scheduling, email, or any recruiting write.

Coverage limits: invalid/missing verification/invitation tokens, synthetic authenticated admin workspace, populated list/detail fixtures and some empty embedded feedback states were covered. Real authentication success, actual invitation acceptance, upload/submission success, role-specific production data, every loading/error transition, submitted-scorecard variants and all destructive confirmation variants remain outside this browser pass. Existing unit tests and static review cover many of those paths, but are not equivalent to live browser workflow verification.

Local evidence:

- [Browser script](../.verification-artifacts/ui-audit/browser-audit.mjs)
- [Consolidated final route measurements and preservation summary](../.verification-artifacts/ui-audit/browser-final-results.json)
- [Initial route measurements](../.verification-artifacts/ui-audit/browser-results.json)
- [Corrected route measurements](../.verification-artifacts/ui-audit/browser-results-partial.json)
- [Final interactions](../.verification-artifacts/ui-audit/interaction-results.json)
- [Sticky bar and unsaved note screenshot](../.verification-artifacts/ui-audit/screenshots/application-sticky-390.png)
- [Corrected mobile candidate profile](../.verification-artifacts/ui-audit/screenshots/candidate-detail-320.png)
- [Analytics tablet screenshot](../.verification-artifacts/ui-audit/screenshots/analytics-768.png)

### Dialog/drawer/overlay inventory

There are **18 direct DialogContent sites** (including the reusable confirmation implementation) and **12 ConfirmDialog consumer sites**. All use the existing Radix-based primitives; no parallel dialog system was added. No toast system or ad hoc HTML dialog/createPortal overlay was found; feedback uses existing inline states/alerts. Account, notification and job action dropdowns continue to use the shared Radix menu wrapper; Select remains native.

Paths below are relative to `hiringloop-frontend/src/`.

| Source                                                           | Existing variants                                                   | Evidence                                                                          |
| ---------------------------------------------------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `layouts/AppLayout.tsx`                                          | Mobile navigation drawer                                            | Browser at 320/375/768; bounds, Tab trap, Escape, restoration.                    |
| `features/team/components/ConfirmDialog.tsx`                     | Shared confirmation                                                 | RTL custom initial-focus/restoration/pending behavior; source.                    |
| `features/team/pages/TeamPage.tsx`                               | Role/remove/leave/revoke                                            | Source and existing Team tests; destructive variants not submitted in browser.    |
| `features/jobs/pages/JobsPage.tsx`                               | Job lifecycle confirmation                                          | Source and existing jobs tests.                                                   |
| `features/jobs/pages/JobDetailPage.tsx`                          | Job lifecycle confirmation                                          | Source and existing detail tests.                                                 |
| `features/pipelines/pages/PipelineConfigurationPage.tsx`         | Add/rename stage; delete confirmation                               | Add-stage browser at four widths; source/tests for remaining variants.            |
| `features/application-form/pages/ApplicationFormBuilderPage.tsx` | Add/edit question; publish/discard/delete confirmation sites        | Add-question browser at four widths; source/tests for other states.               |
| `features/interviews/components/InterviewFormDialog.tsx`         | Schedule/edit/reschedule                                            | All three browser variants at four widths; source/tests.                          |
| `features/interviews/pages/InterviewDetailPage.tsx`              | Cancellation form                                                   | Browser at four widths; source/tests.                                             |
| `features/scorecards/pages/MyScorecardPage.tsx`                  | Submit confirmation                                                 | Source and existing scorecard tests.                                              |
| `features/scorecards/pages/ScorecardTemplatePage.tsx`            | Publish confirmation                                                | Source and existing template tests.                                               |
| `features/scorecards/components/FeedbackSections.tsx`            | Submitted scorecard, edit/delete note confirmations                 | Source and existing feedback tests; submitted-data dialog not visually exercised. |
| `features/offers/components/OfferSection.tsx`                    | Create/edit/revise offer; send/accept/decline/withdraw confirmation | Create browser at four widths; remaining variants source/tests only.              |
| `features/offers/components/ApplicationOutcomeSection.tsx`       | Reject/reopen forms; hire confirmation                              | Reject browser at four widths; other outcomes source/tests only.                  |
| `features/communications/components/CommunicationSection.tsx`    | Send email, template manager, delete template, new/edit template    | Compose/manager browser at four widths; nested forms/deletion source/tests only.  |
| `features/talent-pools/pages/TalentPoolsPage.tsx`                | Create/edit pool                                                    | Both variants browser at four widths.                                             |
| `features/talent-pools/components/CandidateTalentPools.tsx`      | Add candidate to pool                                               | Browser at four widths.                                                           |
| `features/audit/pages/AuditPage.tsx`                             | Audit details with structured values                                | Browser at four widths including long metadata.                                   |

## K. Performance findings

Production output: JavaScript **837.46 kB minified / 235.60 kB gzip**, CSS **49.66 kB / 10.08 kB gzip**, index HTML **0.39 kB / 0.26 kB gzip**. Compared with the supplied previous 833.52 kB warning, the main JavaScript chunk is approximately 3.94 kB larger (0.47%). This is a comparison with the supplied historical figure, not a fresh baseline build under identical conditions.

The router still eagerly imports all route pages. Existing charts are lightweight native bar/table presentations; no new chart dependency was added. Broad route splitting, dependency changes, table virtualization, metric/query changes and speculative rerender work were intentionally deferred. A separate performance milestone should measure route loading and data volumes before changing boundaries. The build warning was not hidden by increasing its threshold.

## L. Remaining issues, ranked

1. **Medium — verification gap:** real auth/invitation/upload/recruiting transactions and production role/data combinations still need an explicitly permitted isolated integration/browser environment. No production readiness claim follows from mocked browser checks.
2. **Medium — existing performance:** eager route imports leave the main chunk above 500 kB; pursue a separately measured performance milestone.
3. **Medium — existing functional finding outside this pass:** TalentPoolDetailPage finds its pool only within the first result page from `usePools(organizationId, 1, '', allowed)`. A valid pool outside that page can be displayed as missing. Correcting lookup/query behavior is beyond this presentation-only change and is not silently included.
4. **Low — test stability:** the existing auth navigation test failed once during the first full run and passed both focused reruns. See final full-suite result and failure history in I; no timeout/behavior was changed to hide it.
5. **Low — content/product follow-up:** Foundation/public shell and a few explanatory messages still refer to a frontend foundation or internal implementation. They were preserved rather than inventing product copy or features during visual work.
6. **Verification limits — accessibility/browser breadth:** actual screen readers, OS modes, zoom, Safari/Firefox and native mobile/file-picker behavior remain unverified.

No unresolved high-severity layout defect was observed in the final synthetic fixture coverage. This does not exclude data/state combinations outside that coverage.

## M. Readiness assessment

| Claim                            | Assessment                                                                                                                                                               |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| UI implementation complete       | Identified incremental UI fixes implemented; every current route inventoried. Deferred functional/performance items are listed in L.                                     |
| Automated tests passing          | Yes: final full Vitest run 61/61 files and 351/351 tests; typecheck, Oxlint, formatting, build and diff checks passed. Initial failures and follow-up are retained in I. |
| Browser visually verified        | Representative synthetic state on all 35 routes at 320/1280, plus detailed affected screens; eight-size bounds coverage and 65 interaction checks.                       |
| Accessibility partially verified | Yes: source, DOM tests and Chromium keyboard/bounds checks. No WCAG compliance certification.                                                                            |
| Full production readiness        | Not established: live workflows, broader accessibility and production data/browser coverage remain necessary.                                                            |

The task makes no deployment, commit or push.

## Task-only changed-file appendix

- [hiringloop-frontend/src/features/analytics/pages/AnalyticsPage.tsx](../hiringloop-frontend/src/features/analytics/pages/AnalyticsPage.tsx)
- [hiringloop-frontend/src/features/application-form/pages/ApplicationFormBuilderPage.tsx](../hiringloop-frontend/src/features/application-form/pages/ApplicationFormBuilderPage.tsx)
- [hiringloop-frontend/src/features/audit/pages/AuditPage.tsx](../hiringloop-frontend/src/features/audit/pages/AuditPage.tsx)
- [hiringloop-frontend/src/features/candidate-application/pages/PublicApplyPage.tsx](../hiringloop-frontend/src/features/candidate-application/pages/PublicApplyPage.tsx)
- [hiringloop-frontend/src/features/candidate-management/pages/ApplicationDetailPage.tsx](../hiringloop-frontend/src/features/candidate-management/pages/ApplicationDetailPage.tsx)
- [hiringloop-frontend/src/features/jobs/pages/JobDetailPage.tsx](../hiringloop-frontend/src/features/jobs/pages/JobDetailPage.tsx)
- [hiringloop-frontend/src/features/notifications/components/NotificationBell.tsx](../hiringloop-frontend/src/features/notifications/components/NotificationBell.tsx)
- [hiringloop-frontend/src/features/notifications/pages/NotificationsPage.tsx](../hiringloop-frontend/src/features/notifications/pages/NotificationsPage.tsx)
- [hiringloop-frontend/src/features/organizations/components/WorkspaceDashboard.tsx](../hiringloop-frontend/src/features/organizations/components/WorkspaceDashboard.tsx)
- [hiringloop-frontend/src/features/organizations/pages/OrganizationOnboardingPage.tsx](../hiringloop-frontend/src/features/organizations/pages/OrganizationOnboardingPage.tsx)
- [hiringloop-frontend/src/features/organizations/pages/OrganizationWorkspacePage.tsx](../hiringloop-frontend/src/features/organizations/pages/OrganizationWorkspacePage.tsx)
- [hiringloop-frontend/src/features/pipelines/pages/PipelineConfigurationPage.tsx](../hiringloop-frontend/src/features/pipelines/pages/PipelineConfigurationPage.tsx)
- [hiringloop-frontend/src/features/public-careers/pages/PublicCareerPage.tsx](../hiringloop-frontend/src/features/public-careers/pages/PublicCareerPage.tsx)
- [hiringloop-frontend/src/features/public-careers/pages/PublicJobDetailPage.tsx](../hiringloop-frontend/src/features/public-careers/pages/PublicJobDetailPage.tsx)
- [hiringloop-frontend/src/features/scorecards/components/FeedbackSections.tsx](../hiringloop-frontend/src/features/scorecards/components/FeedbackSections.tsx)
- [hiringloop-frontend/src/features/scorecards/components/ScorecardForm.tsx](../hiringloop-frontend/src/features/scorecards/components/ScorecardForm.tsx)
- [hiringloop-frontend/src/features/talent-pools/components/CandidateTalentPools.tsx](../hiringloop-frontend/src/features/talent-pools/components/CandidateTalentPools.tsx)
- [hiringloop-frontend/src/features/talent-pools/pages/TalentPoolDetailPage.tsx](../hiringloop-frontend/src/features/talent-pools/pages/TalentPoolDetailPage.tsx)
- [hiringloop-frontend/src/features/team/components/ConfirmDialog.tsx](../hiringloop-frontend/src/features/team/components/ConfirmDialog.tsx)
- [hiringloop-frontend/src/features/team/pages/InvitationAcceptancePage.tsx](../hiringloop-frontend/src/features/team/pages/InvitationAcceptancePage.tsx)
- [hiringloop-frontend/src/features/team/pages/TeamPage.tsx](../hiringloop-frontend/src/features/team/pages/TeamPage.tsx)
- [hiringloop-frontend/src/layouts/AppSidebar.tsx](../hiringloop-frontend/src/layouts/AppSidebar.tsx)
- [hiringloop-frontend/src/shared/components/ui/Alert.tsx](../hiringloop-frontend/src/shared/components/ui/Alert.tsx)
- [hiringloop-frontend/src/shared/components/ui/Badge.tsx](../hiringloop-frontend/src/shared/components/ui/Badge.tsx)
- [hiringloop-frontend/src/shared/components/ui/DataTableShell.tsx](../hiringloop-frontend/src/shared/components/ui/DataTableShell.tsx)
- [hiringloop-frontend/src/shared/components/ui/Dialog.tsx](../hiringloop-frontend/src/shared/components/ui/Dialog.tsx)
- [hiringloop-frontend/src/shared/components/ui/DropdownMenu.tsx](../hiringloop-frontend/src/shared/components/ui/DropdownMenu.tsx)
- [hiringloop-frontend/src/shared/components/ui/Field.tsx](../hiringloop-frontend/src/shared/components/ui/Field.tsx)
- [hiringloop-frontend/src/shared/components/ui/Input.tsx](../hiringloop-frontend/src/shared/components/ui/Input.tsx)
- [hiringloop-frontend/src/shared/components/ui/PageContainer.tsx](../hiringloop-frontend/src/shared/components/ui/PageContainer.tsx)
- [hiringloop-frontend/src/shared/components/ui/PageHeader.tsx](../hiringloop-frontend/src/shared/components/ui/PageHeader.tsx)
- [hiringloop-frontend/src/styles/App.css](../hiringloop-frontend/src/styles/App.css)
- [hiringloop-frontend/src/styles/index.css](../hiringloop-frontend/src/styles/index.css)
- [hiringloop-frontend/src/shared/components/components.test.tsx](../hiringloop-frontend/src/shared/components/components.test.tsx)
- [docs/frontend-ui-audit-2026-10-21.md](../docs/frontend-ui-audit-2026-10-21.md)
