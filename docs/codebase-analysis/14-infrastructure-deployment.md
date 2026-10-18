# 14 - Infrastructure and deployment

Analysis date: 2026-10-17. Static repository investigation; no application execution, dependency installation, migrations, services, or deployment. Source presence is not proof of runtime success.

## VERIFIED

Production readiness is **not established**. Repository scripts support development and validation, and architecture documents describe future infrastructure, but concrete hosting/CI/recovery configuration is absent from the enumerated repository. The infrastructure document explicitly calls itself planning, not provisioned services. [docs/architecture/INFRASTRUCTURE_ARCHITECTURE.md:7](../../docs/architecture/INFRASTRUCTURE_ARCHITECTURE.md#L7).

| Area | Evidence / current behavior | Readiness implication |
| --- | --- | --- |
| Frontend build | [hiringloop-frontend/package.json:8](../../hiringloop-frontend/package.json#L8) runs tsc -b && vite build; preview is Vite preview. | Static production output supported by scripts; no verified host, CDN cache, SPA fallback or TLS configuration. Vite preview is not evidence of production hosting. |
| API start | [hiringloop-backend/package.json:6](../../hiringloop-backend/package.json#L6) runs node src/server.js; dev uses node --watch. | No backend compilation step required for JS. dotenv is transitively present but not direct (E15); no Node engines pin. |
| Environment | [hiringloop-backend/src/config/env.js:1](../../hiringloop-backend/src/config/env.js#L1) validates NODE_ENV/port/URLs/provider settings; outside test DB/origin/32-character CSRF required. | Production requires S3 config, complete SendGrid settings and forbids console email. Schema does not prove TLS, secret rotation or valid provider accounts. |
| Frontend config | [hiringloop-frontend/src/app/config/env.ts:1](../../hiringloop-frontend/src/app/config/env.ts#L1) normalizes VITE_API_BASE_URL to an absolute HTTP(S) origin. | Public build-time value. Development fails early if absent; production API requests also fail when missing. No deployment injection configured. |
| Migration | [hiringloop-backend/prisma.config.js:1](../../hiringloop-backend/prisma.config.js#L1) reads DATABASE_URL; SQL migrations retain custom constraints/triggers. [hiringloop-backend/scripts/migrate-test-database.js:1](../../hiringloop-backend/scripts/migrate-test-database.js#L1) wraps test deploy/status only. | No executed migration or production migration-job/locking/approval/rollback strategy. Never replace migrations with schema-only setup. |
| Environment isolation | [hiringloop-backend/src/database/client.js:13](../../hiringloop-backend/src/database/client.js#L13) requires database name hiringloop_test for DB tests. | Name check protects accidental wrong database names, not host/account separation. Actual staging/prod/test resources unknown. |
| Health/readiness | [hiringloop-backend/src/app.js:40](../../hiringloop-backend/src/app.js#L40) returns ok; startup awaits DB connection. | Liveness only; post-start DB outages invisible to readiness checks (E12). |
| Proxy/browser | [hiringloop-backend/src/app.js:15](../../hiringloop-backend/src/app.js#L15); [hiringloop-backend/src/config/env.js:310](../../hiringloop-backend/src/config/env.js#L310) | Trusted ingress contract missing; proxy may collapse IP limits. SameSite=None requires correct Secure/TLS/site/cookie deployment behavior. |
| Logging/monitoring | [hiringloop-backend/src/middleware/request-correlation.js:1](../../hiringloop-backend/src/middleware/request-correlation.js#L1) and console/error handlers. | No repository log sink, metrics/trace/alerting provisioning or redaction lifecycle found. |
| Shutdown | [hiringloop-backend/src/server.js:21](../../hiringloop-backend/src/server.js#L21) | SIGINT/SIGTERM close HTTP then Prisma; no forced deadline or documented drain budget. |
| Containers/IaC/CI | No Dockerfile/compose, Terraform/Helm/Kubernetes, platform hosting config or CI workflow found in enumerated paths. | Cannot establish reproducible image, CI gate, deployment boundary or release process. |
| Storage/security policy | [hiringloop-backend/src/modules/applications/storage/aws-s3-application-storage.js:1](../../hiringloop-backend/src/modules/applications/storage/aws-s3-application-storage.js#L1) uses AWS credential chain. | Bucket IAM/CORS/encryption/versioning/lifecycle/malware controls and signed capability protections unknown. |
| Backup/recovery | [docs/architecture/OPEN_DECISIONS_AND_RISKS.md:44](../../docs/architecture/OPEN_DECISIONS_AND_RISKS.md#L44) | Backup/restore/RPO/RTO marked open or deferred in design; no concrete backup/restore/rollback configuration found. |
| Seeds/resets | [hiringloop-backend/scripts/seed-phase14-qa.js:1](../../hiringloop-backend/scripts/seed-phase14-qa.js#L1); [hiringloop-backend/scripts/reset-phase17-test-database.js:1](../../hiringloop-backend/scripts/reset-phase17-test-database.js#L1) | Phase-specific operational helpers exist and may mutate/reset test data. Not invoked during review. |

### Suggested release gates (recommendations, not completed actions)

1. Fix high-priority functional/integrity issues and verify real UI/API contracts.
2. Pin supported Node/DB versions and production dependencies; run clean-checkout verification including all integration suites.
3. Define ingress/TLS/origin/cookie policy and production environment/secret ownership; validate safe logs and storage capabilities.
4. Apply all forward migrations in isolated staging, verify custom SQL guards and migration status.
5. Establish readiness/drain behavior, monitoring and durable provider recovery.
6. Exercise backup restore and rollback against stated recovery objectives, then assess release readiness with observed evidence.

## INFERRED

The code is a substantial development-stage product with production-minded controls. Phase completion in PROJECT_STATE.md is a feature milestone, not deployment certification. Separate frontend/API hosting is intended but provider/topology choices are not enforced by source.

## NOT VERIFIED / UNKNOWN

No current runtime, database, browser, load, provider, or production verification was performed. Historical test results are documentation claims, not results reproduced by this investigation.

No deployment, service start, migration, container build, CI execution, provider configuration, backup access or production-host inspection occurred.
