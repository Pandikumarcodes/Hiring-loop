# HiringLoop global UI repair — 21 October 2026

## 1. Defect inventory and evidence

The five reference images described in the brief were not attached as image files. I inspected the named screens in the running frontend and captured a browser baseline before editing. The [baseline screenshots](../.verification-artifacts/global-ui/baseline/screenshots) and [baseline measurements](../.verification-artifacts/global-ui/baseline/results.json) document the visible defects.

| Screen | Before | After |
| --- | --- | --- |
| Main titles | Unscoped `h1` CSS produced 48 px titles at 1280 px and about 30 px at 320 px | 30 px desktop / 24 px mobile |
| Job form | Job title and department labels shared a row, but the department control sat 14 px lower because grid items stretched around helper text | Both controls start at y=311.5 px at 1280 px; labels start at y=285.5 px |
| Jobs table | Table required 1024 px inside a 958 px region at 1280 px; Archived wrapped to 42 px tall | Table and region are both 974 px; Archived stays one line at 26 px |
| Candidates and Analytics | Large headings and extra header/filter separation; Analytics used a separate stretched filter grid | Compact headings and shared toolbar spacing; Analytics From, To, and Job labels and 44 px controls align |
| Sidebar | Navigation occupied the scroll edge | Symmetric reserved scrollbar gutters separate links from the scrollbar |

## 2. Root causes

- `App.css` styled every `h1` after Tailwind utilities, overriding route heading sizes. The rule is now limited to foundation and status pages, and those pages use the same responsive title scale.
- Shared `Field` used grid layout that stretched controls in rows containing helper text. A top-aligned flex field keeps the label, control, and helper together.
- The Jobs table assigned a 64 rem minimum width and rigid widths to every column. Its status badge inherited wrapping and the action column was too narrow.
- Candidates and Jobs filter grids changed columns at unsuitable widths. Analytics had a separate filter layout. The shared toolbar now supplies consistent padding and result alignment.
- Dense sections mixed 24 px and 20 px card padding. Navigation lacked a reserved scroll gutter.

## 3. Shared conventions

`PageContainer` uses 24 px mobile and 32 px desktop vertical padding with narrower desktop side padding. `PageHeader` uses 24/30 px titles, 14 px descriptions, and a 24 px content gap. Body text defaults to 14 px. Shared fields use a 6 px label/control gap, 14 px medium labels, 12 px helper/error text, and 44 px controls. Dense cards use 16 px mobile / 20 px desktop padding. Data table headers use 12 px text and compact vertical padding. These conventions are scoped to application components and data tables; public rich text is unaffected.

## 4. Job Create/Edit forms

The basic, employment, and description sections use the same padding, section heading gap, and row spacing. Grid items align at their top edge and can shrink within their column. Title and department controls now share a baseline; employment and workplace selects retain matching 44 px heights. Field names, validation, defaults, submission payloads, dirty state, and save lifecycle remain as before. `JobForm.test.tsx` checks the submitted field values and pending/error associations.

## 5. Dropdowns and selects

The shared native `Select` has one caret, consistent inset and focus treatment, and a full selected-option `title` for controlled string values. Its options, values, native keyboard behavior, and change events are unchanged. The two remaining raw selects in candidate talent pools and communication templates now use the shared control with their original values and handlers. Radix workspace, account, and job action menus retain their existing interaction model. The browser menu pass checked open, Escape, focus return, short viewport placement, and long workspace names.

## 6. Candidates filters

The search field and three selects share 44 px height. The desktop grid gives search more room; tablet uses two columns; mobile stacks controls. Result count and Clear filters share the toolbar footer. Debounce, URL parameters, pagination, and tenant query behavior were left intact.

## 7. Analytics toolbar

From, To, and Job use shared `Field` inside `FilterToolbar`. Their labels and control tops align at 1280 px, and the applied-range indicator aligns with the control row. The inclusive-range explanation now sits in the toolbar footer. Existing date values, exclusive serialized query bound for the inclusive end date, timezone logic, and analytics calculations are unchanged. An analytics test checks those bounds and date field updates.

## 8. Jobs table and cards

The title column absorbs remaining width; status, metadata, date, and action columns have measured widths. At 1280 px the table fits its 974 px region without horizontal scrolling, the Archived badge remains one line, the complete formatted date is visible, and “View only” fits the action column. Very long title and department text occupies at most two visible lines in the desktop table; the full text remains in the link/cell and a native title tooltip. Existing mobile/tablet cards continue to show full values and authorized actions.

## 9. Other tables

Candidates and both Team tables fit their desktop containers; their responsive cards remain active below 1280 px. Audit and dense Analytics tables retain local, keyboard-focusable scrolling where their columns genuinely need it. Table typography and padding were tightened without assigning global column widths or forcing every cell to one line. Talent Pools uses record cards, so no table rule was applied. Pagination remains within page width.

## 10. Sidebar

`scrollbar-gutter: stable both-edges` reserves equal space around the independently scrolling navigation. Branding and workspace selection remain above it; the account control remains in the fixed footer. Scrollbars remain visible. The 256 px desktop sidebar and mobile drawer behavior are preserved.

## 11. Files changed for this repair

Forty frontend files changed since the task baseline: shared styling and controls (`styles`, `PageContainer`, `PageHeader`, `Field`, `Label`, `Input`, `Select`, `Textarea`, `FilterToolbar`, `DataTableShell`, `Dialog`, feedback styles), application/sidebar layout, named job/candidate/analytics/team/audit pages, related public/auth pages, and dense detail cards for interviews, communications, offers, scorecards, and talent pools. Two existing test files and the new `JobForm.test.tsx` cover the changed behavior. The exact list is in [changed-files.json](../.verification-artifacts/global-ui/changed-files.json). No backend, database, schema, seed, or recruiting logic file was edited for this repair.

## 12. Before/after screenshots

- Jobs: [before](../.verification-artifacts/global-ui/baseline/screenshots/jobs-1280x800.png) · [after](../.verification-artifacts/global-ui/G/screenshots/jobs-1280x800.png)
- Create Job: [before](../.verification-artifacts/global-ui/baseline/screenshots/create-job-1280x800.png) · [after](../.verification-artifacts/global-ui/G/screenshots/create-job-1280x800.png)
- Candidates: [before](../.verification-artifacts/global-ui/baseline/screenshots/candidates-1280x800.png) · [after](../.verification-artifacts/global-ui/G/screenshots/candidates-1280x800.png)
- Analytics: [before](../.verification-artifacts/global-ui/baseline/screenshots/analytics-1280x800.png) · [after](../.verification-artifacts/global-ui/G/screenshots/analytics-1280x800.png)
- [Twelve contact sheets](../.verification-artifacts/global-ui/G/contact-sheets) cover all 35 routes at 320 and 1280 px. Individual screenshots are available for each route at 1920 px and the 1280×600 short-height case.

## 13. Responsive and accessibility review

Browser fixtures cover all 35 route patterns at 320×700, 375×812, 390×844, 768×1024, 1024×768, 1280×800, 1440×900, 1920×1080, and 1280×600: **315 route/viewport measurements**, with zero document overflow, browser errors, or unknown API responses. A second shell regression pass covered **176 normal/long-value cases and 12 menu/keyboard checks**, with zero failures. It used long job titles, department names, emails, and notification content. Named scroll regions are focusable; form labels, helper/error references, table headers, badge text, and focus states were reviewed. This is a targeted accessibility review, not a full WCAG audit.

## 14. Test and build results

Focused shared/form/filter tests passed at checkpoints A–D. The later affected-page run passed **51 tests in 6 files**. The complete single-worker Vitest suite passed **372 tests in 62 files**. TypeScript typecheck, Oxlint, Prettier check, and `git diff --check` passed after the final formatting pass. The production build passed: JavaScript 844.74 kB minified / 237.34 kB gzip and CSS 52.45 kB / 10.62 kB gzip. Vite retains its existing large-chunk advisory. An earlier full run stalled after two slow auth test failures; the isolated auth file then passed all 26 tests, and the clean full rerun passed all 372.

## 15. Remaining limits

The supplied brief mentions five screenshots, but the actual image files were unavailable, so comparison uses captured running UI before edits. Browser checks use read-only mocked API fixtures and do not exercise live server mutations or database flows. Dense reporting tables intentionally scroll within their labeled regions on narrow screens. The verification artifacts are ignored local files; no commit or push was made.
