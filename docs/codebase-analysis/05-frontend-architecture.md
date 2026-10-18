# 05 - Frontend architecture

Analysis date: 2026-10-17. Static repository investigation; no application execution, dependency installation, migrations, services, or deployment. Source presence is not proof of runtime success.

## VERIFIED

Bootstrap: index.html -> main.tsx config assertion/StrictMode -> App -> QueryClientProvider/BrowserRouter -> render boundary -> AppRoutes. ProtectedRoute checks /auth/me, renders loading/error/retry and redirects only confirmed unauthenticated users. PublicRoute redirects authenticated users away from login/register/forgot-password; verification/reset/invitation/public careers are separate. [hiringloop-frontend/src/main.tsx:1](../../hiringloop-frontend/src/main.tsx#L1); [hiringloop-frontend/src/App.tsx:1](../../hiringloop-frontend/src/App.tsx#L1); [hiringloop-frontend/src/app/router/ProtectedRoute.tsx:1](../../hiringloop-frontend/src/app/router/ProtectedRoute.tsx#L1).

### Complete route inventory

**33 page routes, 32 distinct page entry components, two fallbacks.** OrganizationOnboardingRoute wraps OrganizationOnboardingPage. /app and /app/organizations share a landing page. The parent /app/* layout mount is not an additional page.

| Full route | Component | Kind |
| --- | --- | --- |
| /login | LoginPage | page |
| /register | RegisterPage | page |
| /forgot-password | ForgotPasswordPage | page |
| /verify-email | VerifyEmailPage | page |
| /reset-password | ResetPasswordPage | page |
| /invitations/accept | InvitationAcceptancePage | page |
| / | FoundationPage | page |
| /careers/:organizationSlug | PublicCareerPage | page |
| /careers/:organizationSlug/jobs/:jobId | PublicJobDetailPage | page |
| /careers/:organizationSlug/jobs/:jobId/apply | PublicApplyPage | page |
| /* | NotFoundPage | fallback |
| /app | OrganizationLandingPage | page |
| /app/organizations/new | OrganizationOnboardingRoute | page |
| /app/organizations/:organizationId | OrganizationWorkspacePage | page |
| /app/organizations/:organizationId/team | TeamPage | page |
| /app/organizations/:organizationId/jobs | JobsPage | page |
| /app/organizations/:organizationId/jobs/new | CreateJobPage | page |
| /app/organizations/:organizationId/jobs/:jobId | JobDetailPage | page |
| /app/organizations/:organizationId/jobs/:jobId/edit | EditJobPage | page |
| /app/organizations/:organizationId/jobs/:jobId/pipeline | PipelineConfigurationPage | page |
| /app/organizations/:organizationId/jobs/:jobId/application-form | ApplicationFormBuilderPage | page |
| /app/organizations/:organizationId/jobs/:jobId/scorecard | ScorecardTemplatePage | page |
| /app/organizations/:organizationId/candidates | CandidatesPage | page |
| /app/organizations/:organizationId/candidates/:candidateId | CandidateDetailPage | page |
| /app/organizations/:organizationId/applications/:applicationId | ApplicationDetailPage | page |
| /app/organizations/:organizationId/interviews | InterviewsPage | page |
| /app/organizations/:organizationId/interviews/:interviewId | InterviewDetailPage | page |
| /app/organizations/:organizationId/interviews/:interviewId/scorecard | MyScorecardPage | page |
| /app/organizations/:organizationId/notifications | NotificationsPage | page |
| /app/organizations/:organizationId/talent-pools | TalentPoolsPage | page |
| /app/organizations/:organizationId/talent-pools/:talentPoolId | TalentPoolDetailPage | page |
| /app/organizations/:organizationId/analytics | AnalyticsPage | page |
| /app/organizations/:organizationId/audit | AuditPage | page |
| /app/organizations | OrganizationLandingPage | page |
| /app/* | NotFoundPage | fallback |
[hiringloop-frontend/src/app/router/routes.tsx:1](../../hiringloop-frontend/src/app/router/routes.tsx#L1).

### Implemented frontend capabilities

| Capability | Feature directory | Action / UI behavior |
| --- | --- | --- |
| Identity and account lifecycle | hiringloop-frontend/src/features/auth | Register, verify, password login, Google OIDC when configured, password reset/change, logout and revoke all sessions |
| Organization onboarding and switching | hiringloop-frontend/src/features/organizations | Create organization and Admin membership atomically; list memberships; resolve selected workspace |
| Team invitations and membership | hiringloop-frontend/src/features/team | Admin invites, rotates/revokes invitations, changes/removes roles; verified recipient accepts; preserve final Admin |
| Job lifecycle | hiringloop-frontend/src/features/jobs | Draft creation, editing, open/close/reopen/archive with expectedVersion and readiness checks |
| Pipeline configuration | hiringloop-frontend/src/features/pipelines | Create/rename/reorder/delete stages; preserve entry at position 1; max 20 stages; version conflicts |
| Application form publishing | hiringloop-frontend/src/features/application-form | Draft questions and options, eight question types, reorder, publish immutable versions, discard |
| Public career browsing | hiringloop-frontend/src/features/public-careers | Paginated open jobs and tenant-scoped public detail with limited DTO |
| Public candidate applications | hiringloop-frontend/src/features/candidate-application | Dynamic form, S3 direct upload, HEAD validation, atomic candidate/application/answer/document/history creation and idempotency |
| Candidate and application review | hiringloop-frontend/src/features/candidate-management | Search/filter/sort/page candidates; submitted answers/history/outcomes; authorized signed resume access |
| Interview scheduling | hiringloop-frontend/src/features/interviews | Schedule, list calendar/assigned, detail, update participants, reschedule, cancel and conflict checks |
| Scorecard templates and feedback | hiringloop-frontend/src/features/scorecards | Publish versioned rating/text templates; assigned participant saves/submits; restricted feedback review |
| Application collaboration notes | hiringloop-frontend/src/features/scorecards | List/create notes; author or Admin edit/delete; expectedRevision on edits |
| Candidate email and templates | hiringloop-frontend/src/features/communications | Recipient-locked email; idempotency and persisted delivery lifecycle; template CRUD |
| Personal notifications and preferences | hiringloop-frontend/src/features/notifications | Own list/unread/read/read-all; preferences; mandatory delivery-failure notices |
| Offers and revisions | hiringloop-frontend/src/features/offers | Create/edit/revise/send offer; staff record acceptance/decline/withdrawal; immutable issued terms |
| Hire, reject and reopen outcomes | hiringloop-frontend/src/features/offers | Accepted offer required to hire; active to hired/rejected; terminal to active; rejection can add to talent pool |
| Talent pools | hiringloop-frontend/src/features/talent-pools | Create/update/search pools and candidate memberships with optional source application |
| Hiring analytics | hiringloop-frontend/src/features/analytics | Overview, funnel, pipeline, interviews, communications, outcomes and jobs aggregates; date/job filters |
| Audit history | hiringloop-frontend/src/features/audit | Restricted filterable audit list and detail; transactional domain events and SQL immutability guard |

### State and request lifecycle

Page/component -> feature hook -> feature API -> shared apiRequest -> fetch with credentials include -> backend envelope -> assertions -> query cache invalidation/update -> success/error rendering. CSRF is fetched on demand and applied through runAuthenticatedAuthMutation. Local state owns forms/dialogs and URL params own shareable filters. No Redux, Zustand or persistent auth-token store found. Public uploads use a direct signed S3 PUT with credentials omit before submitting upload ID and answers. [hiringloop-frontend/src/shared/lib/apiClient.ts:105](../../hiringloop-frontend/src/shared/lib/apiClient.ts#L105); [hiringloop-frontend/src/features/auth/hooks/authenticated-mutation.ts:1](../../hiringloop-frontend/src/features/auth/hooks/authenticated-mutation.ts#L1); [hiringloop-frontend/src/features/candidate-application/pages/PublicApplyPage.tsx:99](../../hiringloop-frontend/src/features/candidate-application/pages/PublicApplyPage.tsx#L99).

Query defaults: 30s stale time, five-minute GC, no focus refetch, at most two retries for network/5xx, no mutation retries. Auth identity uses 60s stale time and focus refetch. CSRF remains fresh until explicitly evicted. Feature query keys include tenant/resource/filter input and session-scoped metadata; auth mutations remove relevant cached data. Cancellation signals propagate through query APIs; no transport timeout is configured. [hiringloop-frontend/src/app/providers/query-client.ts:1](../../hiringloop-frontend/src/app/providers/query-client.ts#L1); [hiringloop-frontend/src/features/auth/hooks/queries.ts:1](../../hiringloop-frontend/src/features/auth/hooks/queries.ts#L1); [hiringloop-frontend/src/features/auth/hooks/mutations.ts:1](../../hiringloop-frontend/src/features/auth/hooks/mutations.ts#L1).

Forms mix manual local validation with React Hook Form/Zod for public dynamic applications. PublicApplyPage memoizes the schema, separates upload/submission states, retains idempotency on ambiguous retries, resets sensitive mutation results and focuses success. Most API wrappers assert outer envelopes then cast nested DTOs; TypeScript is not runtime response validation. [hiringloop-frontend/src/features/candidate-application/pages/PublicApplyPage.tsx:50](../../hiringloop-frontend/src/features/candidate-application/pages/PublicApplyPage.tsx#L50); [hiringloop-frontend/src/features/offers/api/offers.api.ts:9](../../hiringloop-frontend/src/features/offers/api/offers.api.ts#L9).

### UI quality, accessibility and rendering

Shared LoadingState/ErrorState/EmptyState/NoResultsState provide distinct request states. Field associates label/hint/error IDs and exposes alert text. Radix Dialog supplies focus/keyboard primitives. AppLayout supplies main landmark, responsive grids, account controls and notification bell. Responsive Tailwind breakpoints, overflow handling and reduced-motion CSS are structural evidence; no browser/zoom/contrast audit was performed. [hiringloop-frontend/src/shared/components/ui/Field.tsx:1](../../hiringloop-frontend/src/shared/components/ui/Field.tsx#L1); [hiringloop-frontend/src/shared/components/ui/Dialog.tsx:1](../../hiringloop-frontend/src/shared/components/ui/Dialog.tsx#L1); [hiringloop-frontend/src/layouts/AppLayout.tsx:1](../../hiringloop-frontend/src/layouts/AppLayout.tsx#L1); [hiringloop-frontend/src/styles/index.css:1](../../hiringloop-frontend/src/styles/index.css#L1).

All route imports are eager; no lazy/Suspense route splitting found. No dangerouslySetInnerHTML or persistent browser auth-token storage found in searched source. No proven unused component list is available: barrel exports and indirect imports need dependency-graph validation. Repeated envelope assertions, display permission checks and authenticated mutation wrapping are duplication candidates. E03-E05 are concrete UI/API boundary failures. [hiringloop-frontend/src/app/router/routes.tsx:1](../../hiringloop-frontend/src/app/router/routes.tsx#L1); [hiringloop-frontend/src/features/offers/hooks/mutations.ts:1](../../hiringloop-frontend/src/features/offers/hooks/mutations.ts#L1); [hiringloop-frontend/src/features/communications/hooks/mutations.ts:1](../../hiringloop-frontend/src/features/communications/hooks/mutations.ts#L1).

## INFERRED

Eager imports may increase initial JS; large pages may benefit from extraction after profiling. Cached permissions can briefly display stale controls after role changes; server authorization remains authoritative.

## NOT VERIFIED / UNKNOWN

No current runtime, database, browser, load, provider, or production verification was performed. Historical test results are documentation claims, not results reproduced by this investigation.
