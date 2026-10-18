# 02 - Technology stack

Analysis date: 2026-10-17. Static repository investigation; no application execution, dependency installation, migrations, services, or deployment. Source presence is not proof of runtime success.

## VERIFIED

Versions below come from package-lock.json, with declared ranges. They do not prove production installation.

### hiringloop-backend/ dependencies

| Package | Declared | Resolved |
| --- | --- | --- |
| @aws-sdk/client-s3 | ^3.1127.0 | 3.1127.0 |
| @aws-sdk/s3-request-presigner | ^3.1127.0 | 3.1127.0 |
| @prisma/adapter-pg | 7.10.0 | 7.10.0 |
| @prisma/client | 7.10.0 | 7.10.0 |
| @sendgrid/mail | ^8.1.6 | 8.1.6 |
| argon2 | ^0.45.1 | 0.45.1 |
| cookie | ^2.0.1 | 2.0.1 |
| cors | ^2.8.6 | 2.8.6 |
| express | ^5.2.1 | 5.2.1 |
| express-rate-limit | ^8.7.0 | 8.7.0 |
| openid-client | ^6.8.7 | 6.8.7 |
| pg | ^8.23.0 | 8.23.0 |
| uuid | ^14.0.2 | 14.0.2 |
| zod | ^4.5.1 | 4.5.1 |
### hiringloop-backend/ devDependencies

| Package | Declared | Resolved |
| --- | --- | --- |
| @vitest/coverage-v8 | ^4.1.11 | 4.1.11 |
| oxlint | ^1.79.0 | 1.79.0 |
| prettier | ^3.6.2 | 3.9.6 |
| prisma | 7.10.0 | 7.10.0 |
| supertest | ^7.2.2 | 7.2.2 |
| vitest | ^4.1.11 | 4.1.11 |
[hiringloop-backend/package.json:1](../../hiringloop-backend/package.json#L1); [hiringloop-backend/package-lock.json:1](../../hiringloop-backend/package-lock.json#L1).

### hiringloop-frontend/ dependencies

| Package | Declared | Resolved |
| --- | --- | --- |
| @hookform/resolvers | ^5.9.1 | 5.9.1 |
| @radix-ui/react-avatar | ^1.2.6 | 1.2.6 |
| @radix-ui/react-dialog | ^1.1.23 | 1.1.23 |
| @radix-ui/react-dropdown-menu | ^2.1.24 | 2.1.24 |
| @radix-ui/react-label | ^2.1.15 | 2.1.15 |
| @radix-ui/react-select | ^2.3.7 | 2.3.7 |
| @radix-ui/react-separator | ^1.1.15 | 1.1.15 |
| @tailwindcss/vite | ^4.3.3 | 4.3.3 |
| @tanstack/react-query | ^5.102.8 | 5.102.8 |
| class-variance-authority | ^0.7.1 | 0.7.1 |
| clsx | ^2.1.1 | 2.1.1 |
| lucide-react | ^1.41.0 | 1.41.0 |
| react | ^19.2.8 | 19.2.8 |
| react-dom | ^19.2.8 | 19.2.8 |
| react-hook-form | ^7.87.0 | 7.87.0 |
| react-router-dom | ^7.18.3 | 7.18.3 |
| tailwind-merge | ^3.6.0 | 3.6.0 |
| tailwindcss | ^4.3.3 | 4.3.3 |
| zod | ^4.5.4 | 4.5.4 |
### hiringloop-frontend/ devDependencies

| Package | Declared | Resolved |
| --- | --- | --- |
| @testing-library/jest-dom | ^7.0.1 | 7.0.1 |
| @testing-library/react | ^16.3.3 | 16.3.3 |
| @testing-library/user-event | ^14.6.6 | 14.6.6 |
| @types/node | ^24.13.3 | 24.13.3 |
| @types/react | ^19.2.18 | 19.2.18 |
| @types/react-dom | ^19.2.4 | 19.2.5 |
| @vitejs/plugin-react | ^6.1.0 | 6.1.1 |
| @vitest/coverage-v8 | ^4.1.11 | 4.1.11 |
| jsdom | ^30.0.1 | 30.0.1 |
| oxlint | ^1.79.0 | 1.80.0 |
| prettier | ^3.6.2 | 3.6.2 |
| typescript | ~6.0.2 | 6.0.3 |
| vite | ^8.2.2 | 8.2.2 |
| vitest | ^4.1.11 | 4.1.11 |
[hiringloop-frontend/package.json:1](../../hiringloop-frontend/package.json#L1); [hiringloop-frontend/package-lock.json:1](../../hiringloop-frontend/package-lock.json#L1).

### Responsibilities

| Concern | Implementation | Evidence |
| --- | --- | --- |
| Languages | Frontend TypeScript/TSX/CSS; backend ES module JavaScript; Prisma DSL and PostgreSQL SQL | [hiringloop-frontend/tsconfig.app.json:1](../../hiringloop-frontend/tsconfig.app.json#L1); [hiringloop-backend/package.json:1](../../hiringloop-backend/package.json#L1) |
| UI/build | React/React DOM, BrowserRouter, Vite, Tailwind, Radix UI, lucide | [hiringloop-frontend/vite.config.ts:1](../../hiringloop-frontend/vite.config.ts#L1); [hiringloop-frontend/src/app/providers/AppProviders.tsx:1](../../hiringloop-frontend/src/app/providers/AppProviders.tsx#L1) |
| Forms/state | Local state and URL filters; React Hook Form/Zod for dynamic applications; TanStack Query server cache | [hiringloop-frontend/src/features/candidate-application/pages/PublicApplyPage.tsx:3](../../hiringloop-frontend/src/features/candidate-application/pages/PublicApplyPage.tsx#L3); [hiringloop-frontend/src/app/providers/query-client.ts:1](../../hiringloop-frontend/src/app/providers/query-client.ts#L1) |
| HTTP | Native fetch with credentials include; Express JSON API | [hiringloop-frontend/src/shared/lib/apiClient.ts:131](../../hiringloop-frontend/src/shared/lib/apiClient.ts#L131) |
| Database | PostgreSQL through PrismaPg/pg; parameterized raw SQL reporting/search | [hiringloop-backend/src/database/client.js:1](../../hiringloop-backend/src/database/client.js#L1) |
| Authentication | Argon2id, opaque cookies, SHA-256 secret hashes, HMAC CSRF, optional Google OIDC PKCE | [hiringloop-backend/src/modules/auth/auth-module.js:1](../../hiringloop-backend/src/modules/auth/auth-module.js#L1) |
| Providers | SendGrid and AWS S3 signed URLs/HEAD | [hiringloop-backend/src/modules/auth/email/email-delivery.js:1](../../hiringloop-backend/src/modules/auth/email/email-delivery.js#L1); [hiringloop-backend/src/modules/applications/storage/aws-s3-application-storage.js:1](../../hiringloop-backend/src/modules/applications/storage/aws-s3-application-storage.js#L1) |
| Quality | Vitest, Supertest, Testing Library/jsdom, V8 coverage, Oxlint, Prettier and frontend tsc | [hiringloop-backend/vitest.config.js:1](../../hiringloop-backend/vitest.config.js#L1); [hiringloop-frontend/vite.config.ts:1](../../hiringloop-frontend/vite.config.ts#L1) |
| Caching/workers | QueryClient in browser; limiter MemoryStore; reused provider promises; no Redis/BullMQ/worker found | [hiringloop-backend/src/middleware/rate-limit.js:153](../../hiringloop-backend/src/middleware/rate-limit.js#L153) |

## INFERRED

This supports a separate static SPA and Node API. SQL/trigger use makes PostgreSQL an intentional architectural dependency.

## NOT VERIFIED / UNKNOWN

No current runtime, database, browser, load, provider, or production verification was performed. Historical test results are documentation claims, not results reproduced by this investigation.

Production Node and PostgreSQL versions are UNKNOWN; no engines pin or image found. Local inspection shell reports Node v24.18.0 only. No AI SDK/RAG/vector store, queue or scheduled worker found. dotenv 17.4.2 is currently transitive in the backend lockfile despite direct imports (E15).
