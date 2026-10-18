# 03 - Repository structure

Analysis date: 2026-10-17. Static repository investigation; no application execution, dependency installation, migrations, services, or deployment. Source presence is not proof of runtime success.

## VERIFIED

Two independent npm applications share one repository and root documentation. Dependencies, build output and private tool state are excluded; document 18 records coverage. No workspace orchestrator, CI workflow, container or infrastructure-as-code file was found in the enumerated tree.

| Directory / file | Purpose |
| --- | --- |
| hiringloop-frontend/ | Independent React TypeScript package, lockfile and Vite/TypeScript/Oxlint/Prettier configuration. |
| frontend/src/main.tsx; App.tsx | Configuration assertion, StrictMode, providers, render boundary and router. |
| frontend/src/app/ | Configuration, QueryClient, routes, access bootstrap, fallback and error boundary. |
| frontend/src/layouts/ | Public/Auth/App frames, navigation, account controls, workspace switcher. |
| frontend/src/features/ | Domain pages/components/hooks/API/types/utilities and colocated tests. |
| frontend/src/shared/ | Fetch/error transport, UI/feedback primitives, helpers and types. |
| frontend/src/styles/; src/tests/ | Tailwind tokens/global CSS; jsdom setup and isolated query helper. |
| backend/src/server.js; app.js | Database/listener lifecycle; HTTP middleware, liveness and API mount. |
| backend/src/routes/; config/; database/ | Versioned API root, validated environment and singleton Prisma/pg lifecycle. |
| backend/src/middleware/ | Session, tenant, permissions, origin, CSRF, rate limits, validation, correlation and errors. |
| backend/src/authorization/; errors/; utils/ | Role matrix, ApplicationError factories and UUIDv7 IDs. |
| backend/src/modules/ | 18 domain directories; factories, routes, controllers, use cases, repositories, schemas and DTOs. |
| backend/prisma/ | 39 models, enums, 17 SQL migrations and migration lock. |
| backend/tests/ | Unit/workflow/HTTP suites, database integration and layered-request fixtures. |
| backend/scripts/ | Test migrations, phase QA seed and reset helpers; not executed. |
| docs/architecture/; docs/security/; docs/adr/ | Designs, phase handoffs/historical audits, security models and decisions. |
| */docs-shared/ | Mirrored root project and architecture context. |
| scripts/sync-shared-docs.js | Copies designated context into application mirrors. |
| PROJECT_STATE.md; MASTER_ROADMAP.md; PROJECT_INSTRUCTIONS.md | Current phase, future plan and partially stale setup rules. |

frontend/ and backend/ abbreviate hiringloop-frontend/ and hiringloop-backend/ above.

### Backend modules

| Module | Files | Frontend counterpart |
| --- | --- | --- |
| analytics | 6 | analytics |
| application-forms | 8 | application-form |
| applications | 14 | candidate-application, offers |
| audit | 8 | audit |
| auth | 23 | auth |
| candidates | 7 | candidate-management |
| communications | 3 | communications |
| interviews | 7 | interviews |
| invitations | 9 | team |
| jobs | 7 | jobs |
| members | 8 | team / embedded flow |
| notifications | 2 | notifications |
| offers | 7 | offers |
| organizations | 10 | organizations |
| pipelines | 8 | pipelines |
| public-careers | 6 | public-careers |
| scorecards | 7 | scorecards |
| talent-pools | 7 | talent-pools |

### Entry-point evidence

- [hiringloop-backend/src/server.js:1](../../hiringloop-backend/src/server.js#L1)
- [hiringloop-backend/src/app.js:1](../../hiringloop-backend/src/app.js#L1)
- [hiringloop-backend/src/routes/api-v1.js:1](../../hiringloop-backend/src/routes/api-v1.js#L1)
- [hiringloop-frontend/index.html:1](../../hiringloop-frontend/index.html#L1)
- [hiringloop-frontend/src/main.tsx:1](../../hiringloop-frontend/src/main.tsx#L1)
- [hiringloop-frontend/src/app/router/routes.tsx:1](../../hiringloop-frontend/src/app/router/routes.tsx#L1)
- [scripts/sync-shared-docs.js:1](../../scripts/sync-shared-docs.js#L1)

## INFERRED

Most domains have cohesive ownership. organizations/organization-module.js couples most domains as a broad composition root. Communications/notifications combine HTTP, schema, authorization, Prisma and serialization. Scorecard and form use cases execute persistence callbacks. Frontend envelope assertions and authenticated mutation wrappers repeat. Broad type assertions obscure request mistakes. [hiringloop-backend/src/modules/organizations/organization-module.js:1](../../hiringloop-backend/src/modules/organizations/organization-module.js#L1); [hiringloop-backend/src/modules/communications/communications-module.js:1](../../hiringloop-backend/src/modules/communications/communications-module.js#L1); [hiringloop-frontend/src/features/offers/hooks/mutations.ts:1](../../hiringloop-frontend/src/features/offers/hooks/mutations.ts#L1).

## NOT VERIFIED / UNKNOWN

No current runtime, database, browser, load, provider, or production verification was performed. Historical test results are documentation claims, not results reproduced by this investigation.
