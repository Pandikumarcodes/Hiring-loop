# Application shell and responsive data repair — 21 October 2026

## Findings and evidence

No new screenshot files accompanied this brief. Source inspection and the preceding captured UI confirmed a large bordered workspace panel, a permanent creation button, duplicated header/sidebar account controls, a large sidebar footer, and truncated account identity. The existing sidebar width was 256px and remains 256px.

Seven semantic tables exist: Jobs, Candidates, Members, Invitations, Analytics pipeline counts, Analytics job comparison, and Audit. Record tables previously replaced their cards at 768px despite minimum widths of 768–1024px. Candidate identities and application titles relied on truncation and hover titles. Screenshot review additionally showed a long Audit actor squeezing other columns.

## Existing architecture and retained behavior

AppLayout owns the current organization, current user, notification bell, logout mutation, route navigation, and mobile Radix dialog. AppSidebar composes the brand, OrganizationSwitcher, permission-filtered navigation, and account footer. Both sidebar instances use the same cached organization queries; the mobile instance mounts only when opened.

OrganizationSwitcher continues using useOrganizations and useOrganization with their existing keys, enabled conditions, cancellation and session metadata. Selecting a workspace still navigates to its root, including from nested pages. Creation still uses `/app/organizations/new`.

Logout still runs useLogout → authenticated mutation → existing session cleanup. The cleanup cancels auth queries, clears the current user, removes CSRF state, and clears session-scoped queries. Success still replaces the route with `/login`; failure retains the shell and existing feedback. No hook, API, permission definition, navigation destination, database, or backend seed file was edited.

## Shell changes

- Workspace selection is a compact icon/name/chevron row. Its Radix menu contains existing organizations, the current selection indicator, full wrapping names, and Create workspace. No additional organization query was introduced.
- AccountMenu is the single visible account entry: sidebar footer on desktop and the same footer inside the mobile drawer. The header retains the notification bell. The expanded menu wraps the full email and contains only the existing Sign out action. Pending logout disables that action.
- Branding and workspace spacing, group spacing and navigation gaps are smaller. Navigation rows retain 44px minimum touch targets. Branding and account footer remain outside the single scrolling navigation area. Shared portal positioning retains viewport collision handling and bounded scrolling.
- Explicit accessible menu names override Radix's default trigger-based labeling. Keyboard opening, menu selection, Escape, outside dismissal, nested drawer dismissal and focus restoration were exercised.

## Table and list audit

| Presentation              | Verified issue or retained layout                                                                 | Result                                                                                                              |
| ------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Jobs                      | Eight columns needed 1024px; tablet table and long card heading competed with actions             | Cards below 1280px, table-specific columns, sticky actions, shrinkable card identity, wrapping metadata and filters |
| Candidates                | Tablet width and truncated identities/job/stage metadata                                          | Cards below 1280px, table-specific columns, full wrapping names/email/metadata, right-aligned application counts    |
| Applications              | Listed on candidate detail; no separate application table                                         | Full wrapping job links and wrapping stage/action row                                                               |
| Members                   | Existing semantic table and separate cards from one members query                                 | Cards below 1280px; existing role/remove/leave actions and distinct column sizing retained                          |
| Invitations               | Existing semantic table and separate cards from one invitations query                             | Cards below 1280px; existing status, expiration and revoke rules retained                                           |
| Analytics pipeline counts | Dense three-column report                                                                         | Retained named focusable horizontal scroll region, numeric alignment, scoped table styling and mobile scroll hint   |
| Analytics job comparison  | Dense seven-column report, pagination could crowd                                                 | Retained horizontal report, numeric alignment, mobile scroll hint and wrapping pagination                           |
| Audit Logs                | Long actor squeezed action/resource columns                                                       | Distinct fixed column sizing, full wrapping actor, named keyboard-scrollable region, mobile scroll hint             |
| Interviews                | Existing weekly cards and wrapping controls                                                       | Verified unchanged; assignment permission and seven-day URL semantics retained                                      |
| Talent pools              | Flexible row lacked a shrinkable primary block                                                    | Minimum-width safeguards, wrapping identity/description and pagination; edit rules unchanged                        |
| Talent pool members       | Existing wrapping cards                                                                           | Retained candidate links/removal rules; pagination can wrap                                                         |
| Notifications             | Existing inbox list and preferences from previous work                                            | Verified unchanged in this task                                                                                     |
| Other feature sections    | Scorecards, communications, notes and application sections use cards/lists, not additional tables | Existing workflows retained; full frontend regression suite covers related features                                 |

Search/filter state, sorting, server pagination, authoritative totals and tenant-scoped data were not rewritten. Desktop tables and cards still derive from the same query results; CSS selects the visible layout. PageContainer, FilterToolbar and ListPagination were inspected and retained because their existing shrink/wrap behavior passed browser checks. Table widths remain specific to each table rather than a universal column scheme.

## Files in this task

Created `src/layouts/AccountMenu.tsx` and this report.

Modified `src/layouts/AppLayout.tsx`, `src/layouts/AppSidebar.tsx`, `src/features/organizations/components/OrganizationSwitcher.tsx`, `src/shared/components/ui/DataTableShell.tsx`, `src/styles/App.css`, and the Jobs, Candidates, CandidateDetail, Team, Analytics, Audit, TalentPools and TalentPoolDetail pages.

Updated `src/layouts/AppLayout.test.tsx`, `src/app/App.test.tsx`, `src/features/organizations/organizations.test.tsx`, and `src/features/candidate-management/candidate-management.test.tsx`. Existing assertions were retained or adapted to the intentional menu semantics. Nine additional tests cover compact/single account placement, long identity access, pending and failed logout, nested workspace switching/creation, keyboard and outside dismissal, mobile drawer/menu interaction, and full candidate identity in both responsive views.

## Browser verification

All browser requests used representative mocked API fixtures, including long names, emails and record values. Non-GET requests were blocked except an intercepted logout fixture. No live user data, backend writes or database testing was performed.

Reviewed 320×700, 375×812, 390×844, 768×1024, 1024×768, 1280×800, 1440×900 and 1280×600. The initial route matrix included 176 normal/long-value checks across eleven routes. Supplementary record checks covered 32 more viewports; final table corrections received 64 further viewport checks. The final sticky Jobs action column received another 16 checks against the production build: 288 viewport checks in total. Results reported no document overflow, incorrect table/card switching, duplicate visible account controls, runtime errors or unknown API fixtures. Menus fit within the viewport at all eight sizes; opening menus issued no additional organization-list requests. Nineteen interaction/menu cases exercised long workspace names, permitted job menus, keyboard horizontal report scrolling, workspace switching/RBAC, creation navigation and mocked logout.

Screenshot artifacts and machine-readable results are under `.verification-artifacts/shell-repair/`. Desktop/mobile contact sheets and individual screenshots were visually reviewed; final Audit columns and long Candidate identities received individual review.

## Verification results and limitations

All final checks passed:

| Check                                                                                                      | Result                                                                                                               |
| ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `npm run typecheck`                                                                                        | Exit 0                                                                                                               |
| `npm run lint` (Oxlint)                                                                                    | Exit 0                                                                                                               |
| Focused shell, organization, auth, shared and affected list tests with `--maxWorkers=1 --reporter=verbose` | 13 files, 119 tests passed                                                                                           |
| `npm run test -- --maxWorkers=1 --reporter=verbose`                                                        | 61 files, 368 tests passed; 262.45 seconds                                                                           |
| `npm run build`                                                                                            | Exit 0; 2,267 modules transformed                                                                                    |
| `npm run format:check`                                                                                     | All matched frontend files use Prettier formatting                                                                   |
| `git diff --check`                                                                                         | Exit 0                                                                                                               |
| Preservation comparison against task-start snapshots                                                       | 38 previously modified files outside the focused edits remained byte-for-byte unchanged; no unexpected modifications |

The final Vitest run retained the existing single-worker configuration and default worker pool; no test timeout was increased. Existing notification-fixture route warnings and a team-test `act` warning remain non-failing console output. The earlier scorecard timeout from the preceding task did not recur in this full run.

The production build still reports its greater-than-500kB chunk warning: the main JavaScript asset is 844.10kB minified, 237.17kB gzip. Bundle splitting is outside this UI repair.

Dense reports deliberately retain horizontal scrolling. Extremely long values wrap and therefore increase row/card height. Verification uses mocked authenticated fixtures rather than a live database.
