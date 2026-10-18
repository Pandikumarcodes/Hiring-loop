# 07 - Complete API inventory

Analysis date: 2026-10-17. Static repository investigation; no application execution, dependency installation, migrations, services, or deployment. Source presence is not proof of runtime success.

## VERIFIED

**115 explicit method/path endpoints: 114 under /api/v1 plus GET /health.** This includes two conditional Google endpoints; without Google OIDC configuration, 112 versioned endpoints plus health are mounted. Loop-expanded job actions (4), offer decisions (3) and analytics reports (6) each count individually. HEAD/OPTIONS supplied by Express/CORS and unknown-path handlers are not separate business endpoints. [hiringloop-backend/src/routes/api-v1.js:1](../../hiringloop-backend/src/routes/api-v1.js#L1); [hiringloop-backend/src/modules/organizations/routes/organization-routes.js:1](../../hiringloop-backend/src/modules/organizations/routes/organization-routes.js#L1); [hiringloop-backend/src/modules/jobs/routes/job-routes.js:1](../../hiringloop-backend/src/modules/jobs/routes/job-routes.js#L1); [hiringloop-backend/src/modules/auth/auth-module.js:111](../../hiringloop-backend/src/modules/auth/auth-module.js#L111).

GET /organizations/:organizationId/offers/:offerId has no dedicated by-ID frontend wrapper found; embedded offer UI reads by application. All versioned paths include /api/v1.

### Contract conventions

All routes are JSON except Google redirects, health and bodyless success responses. Unsafe requests pass global Origin validation (required in production). Authenticated writes also require session-bound X-CSRF-Token. Tenant APIs require a current membership; absent membership becomes 404. Every route reference below links to the exact middleware/validation/handler declaration. Query/body/params schema source and DTO/controller serialization catalog follow the endpoint inventory. These catalogs are part of each endpoint specification, avoiding paraphrased or invented fields.

Errors use {error:{code,message,requestId,details?}}. Shared failures: 400 invalid/malformed input; 401 missing/invalid session; 403 permission/Origin/CSRF; 404 tenant/resource/route; 409 business conflict where defined; 413 JSON too large; 429 on limited operations; 500 unexpected failures. Provider/storage flows additionally map 5xx service errors. Each module error vocabulary below is a possible union, not a claim every error is reachable from every endpoint. [hiringloop-backend/src/errors/application-error.js:1](../../hiringloop-backend/src/errors/application-error.js#L1); [hiringloop-backend/src/middleware/error-handler.js:1](../../hiringloop-backend/src/middleware/error-handler.js#L1).

| Module | Count |
| --- | --- |
| analytics | 7 |
| application-forms | 8 |
| applications | 3 |
| audit | 2 |
| auth | 13 |
| candidates | 4 |
| communications | 6 |
| interviews | 8 |
| invitations | 4 |
| jobs | 8 |
| members | 3 |
| notifications | 6 |
| offers | 9 |
| organizations | 3 |
| pipelines | 5 |
| public-careers | 5 |
| scorecards | 14 |
| talent-pools | 6 |
| health | 1 |

## analytics

**Use-case/service sources:** [hiringloop-backend/src/modules/analytics/use-cases/analytics-use-cases.js:1](../../hiringloop-backend/src/modules/analytics/use-cases/analytics-use-cases.js#L1)

**Persistence sources:** [hiringloop-backend/src/modules/analytics/repositories/analytics-repository.js:1](../../hiringloop-backend/src/modules/analytics/repositories/analytics-repository.js#L1)

**Frontend consumers:** [hiringloop-frontend/src/features/analytics/api/analytics.api.ts:1](../../hiringloop-frontend/src/features/analytics/api/analytics.api.ts#L1). This maps the owning feature; direct per-method call-site reachability is not fully verified.

**Existing related tests:** [hiringloop-frontend/src/features/analytics/utils/analytics-utils.test.ts:1](../../hiringloop-frontend/src/features/analytics/utils/analytics-utils.test.ts#L1); [hiringloop-frontend/src/features/analytics/analytics.test.tsx:1](../../hiringloop-frontend/src/features/analytics/analytics.test.tsx#L1). File association is verified; endpoint-specific assertion completeness and current pass status are UNKNOWN.

### GET /api/v1/organizations/:organizationId/analytics/overview

- **Handler:** [hiringloop-backend/src/modules/analytics/controllers/analytics-controller.js:15](../../hiringloop-backend/src/modules/analytics/controllers/analytics-controller.js#L15), method overview; declaration [hiringloop-backend/src/modules/analytics/routes/analytics-routes.js:31](../../hiringloop-backend/src/modules/analytics/routes/analytics-routes.js#L31). Exact declaration line: hiringloop-backend/src/modules/analytics/routes/analytics-routes.js:31.
- **Authentication:** Live opaque-cookie session required. **Authorization:** ANALYTICS_VIEW.
- **Request schema:** params: analyticsParamsSchema; query: analyticsQuerySchema. Headers: Content-Type application/json when sending a JSON body. Path UUID/slug validation is endpoint-owned.
- **Service / DB / response:** [hiringloop-backend/src/modules/analytics/controllers/analytics-controller.js:15](../../hiringloop-backend/src/modules/analytics/controllers/analytics-controller.js#L15) defines use-case invocation, success status and envelope; linked use-case/repository/DTO sources above define reads/writes and serialized fields.
- **Failure behavior / tests / consumers:** Shared failures above plus business errors in the linked service. Related tests and frontend API sources are listed for this module; current behavior is not runtime-verified.

```js
router.get(
      `/analytics/${name}`,
      ...access,
      validateRequest({
        params: analyticsParamsSchema,
        query: analyticsQuerySchema,
      }),
      controller[name],
    )
```

### GET /api/v1/organizations/:organizationId/analytics/funnel

- **Handler:** [hiringloop-backend/src/modules/analytics/controllers/analytics-controller.js:16](../../hiringloop-backend/src/modules/analytics/controllers/analytics-controller.js#L16), method funnel; declaration [hiringloop-backend/src/modules/analytics/routes/analytics-routes.js:31](../../hiringloop-backend/src/modules/analytics/routes/analytics-routes.js#L31). Exact declaration line: hiringloop-backend/src/modules/analytics/routes/analytics-routes.js:31.
- **Authentication:** Live opaque-cookie session required. **Authorization:** ANALYTICS_VIEW.
- **Request schema:** params: analyticsParamsSchema; query: analyticsQuerySchema. Headers: Content-Type application/json when sending a JSON body. Path UUID/slug validation is endpoint-owned.
- **Service / DB / response:** [hiringloop-backend/src/modules/analytics/controllers/analytics-controller.js:16](../../hiringloop-backend/src/modules/analytics/controllers/analytics-controller.js#L16) defines use-case invocation, success status and envelope; linked use-case/repository/DTO sources above define reads/writes and serialized fields.
- **Failure behavior / tests / consumers:** Shared failures above plus business errors in the linked service. Related tests and frontend API sources are listed for this module; current behavior is not runtime-verified.

```js
router.get(
      `/analytics/${name}`,
      ...access,
      validateRequest({
        params: analyticsParamsSchema,
        query: analyticsQuerySchema,
      }),
      controller[name],
    )
```

### GET /api/v1/organizations/:organizationId/analytics/pipeline

- **Handler:** [hiringloop-backend/src/modules/analytics/controllers/analytics-controller.js:17](../../hiringloop-backend/src/modules/analytics/controllers/analytics-controller.js#L17), method pipeline; declaration [hiringloop-backend/src/modules/analytics/routes/analytics-routes.js:31](../../hiringloop-backend/src/modules/analytics/routes/analytics-routes.js#L31). Exact declaration line: hiringloop-backend/src/modules/analytics/routes/analytics-routes.js:31.
- **Authentication:** Live opaque-cookie session required. **Authorization:** ANALYTICS_VIEW.
- **Request schema:** params: analyticsParamsSchema; query: analyticsQuerySchema. Headers: Content-Type application/json when sending a JSON body. Path UUID/slug validation is endpoint-owned.
- **Service / DB / response:** [hiringloop-backend/src/modules/analytics/controllers/analytics-controller.js:17](../../hiringloop-backend/src/modules/analytics/controllers/analytics-controller.js#L17) defines use-case invocation, success status and envelope; linked use-case/repository/DTO sources above define reads/writes and serialized fields.
- **Failure behavior / tests / consumers:** Shared failures above plus business errors in the linked service. Related tests and frontend API sources are listed for this module; current behavior is not runtime-verified.

```js
router.get(
      `/analytics/${name}`,
      ...access,
      validateRequest({
        params: analyticsParamsSchema,
        query: analyticsQuerySchema,
      }),
      controller[name],
    )
```

### GET /api/v1/organizations/:organizationId/analytics/interviews

- **Handler:** [hiringloop-backend/src/modules/analytics/controllers/analytics-controller.js:18](../../hiringloop-backend/src/modules/analytics/controllers/analytics-controller.js#L18), method interviews; declaration [hiringloop-backend/src/modules/analytics/routes/analytics-routes.js:31](../../hiringloop-backend/src/modules/analytics/routes/analytics-routes.js#L31). Exact declaration line: hiringloop-backend/src/modules/analytics/routes/analytics-routes.js:31.
- **Authentication:** Live opaque-cookie session required. **Authorization:** ANALYTICS_VIEW.
- **Request schema:** params: analyticsParamsSchema; query: analyticsQuerySchema. Headers: Content-Type application/json when sending a JSON body. Path UUID/slug validation is endpoint-owned.
- **Service / DB / response:** [hiringloop-backend/src/modules/analytics/controllers/analytics-controller.js:18](../../hiringloop-backend/src/modules/analytics/controllers/analytics-controller.js#L18) defines use-case invocation, success status and envelope; linked use-case/repository/DTO sources above define reads/writes and serialized fields.
- **Failure behavior / tests / consumers:** Shared failures above plus business errors in the linked service. Related tests and frontend API sources are listed for this module; current behavior is not runtime-verified.

```js
router.get(
      `/analytics/${name}`,
      ...access,
      validateRequest({
        params: analyticsParamsSchema,
        query: analyticsQuerySchema,
      }),
      controller[name],
    )
```

### GET /api/v1/organizations/:organizationId/analytics/communications

- **Handler:** [hiringloop-backend/src/modules/analytics/controllers/analytics-controller.js:19](../../hiringloop-backend/src/modules/analytics/controllers/analytics-controller.js#L19), method communications; declaration [hiringloop-backend/src/modules/analytics/routes/analytics-routes.js:31](../../hiringloop-backend/src/modules/analytics/routes/analytics-routes.js#L31). Exact declaration line: hiringloop-backend/src/modules/analytics/routes/analytics-routes.js:31.
- **Authentication:** Live opaque-cookie session required. **Authorization:** ANALYTICS_VIEW.
- **Request schema:** params: analyticsParamsSchema; query: analyticsQuerySchema. Headers: Content-Type application/json when sending a JSON body. Path UUID/slug validation is endpoint-owned.
- **Service / DB / response:** [hiringloop-backend/src/modules/analytics/controllers/analytics-controller.js:19](../../hiringloop-backend/src/modules/analytics/controllers/analytics-controller.js#L19) defines use-case invocation, success status and envelope; linked use-case/repository/DTO sources above define reads/writes and serialized fields.
- **Failure behavior / tests / consumers:** Shared failures above plus business errors in the linked service. Related tests and frontend API sources are listed for this module; current behavior is not runtime-verified.

```js
router.get(
      `/analytics/${name}`,
      ...access,
      validateRequest({
        params: analyticsParamsSchema,
        query: analyticsQuerySchema,
      }),
      controller[name],
    )
```

### GET /api/v1/organizations/:organizationId/analytics/outcomes

- **Handler:** [hiringloop-backend/src/modules/analytics/controllers/analytics-controller.js:20](../../hiringloop-backend/src/modules/analytics/controllers/analytics-controller.js#L20), method outcomes; declaration [hiringloop-backend/src/modules/analytics/routes/analytics-routes.js:31](../../hiringloop-backend/src/modules/analytics/routes/analytics-routes.js#L31). Exact declaration line: hiringloop-backend/src/modules/analytics/routes/analytics-routes.js:31.
- **Authentication:** Live opaque-cookie session required. **Authorization:** ANALYTICS_VIEW.
- **Request schema:** params: analyticsParamsSchema; query: analyticsQuerySchema. Headers: Content-Type application/json when sending a JSON body. Path UUID/slug validation is endpoint-owned.
- **Service / DB / response:** [hiringloop-backend/src/modules/analytics/controllers/analytics-controller.js:20](../../hiringloop-backend/src/modules/analytics/controllers/analytics-controller.js#L20) defines use-case invocation, success status and envelope; linked use-case/repository/DTO sources above define reads/writes and serialized fields.
- **Failure behavior / tests / consumers:** Shared failures above plus business errors in the linked service. Related tests and frontend API sources are listed for this module; current behavior is not runtime-verified.

```js
router.get(
      `/analytics/${name}`,
      ...access,
      validateRequest({
        params: analyticsParamsSchema,
        query: analyticsQuerySchema,
      }),
      controller[name],
    )
```

### GET /api/v1/organizations/:organizationId/analytics/jobs

- **Handler:** [hiringloop-backend/src/modules/analytics/controllers/analytics-controller.js:21](../../hiringloop-backend/src/modules/analytics/controllers/analytics-controller.js#L21), method jobs; declaration [hiringloop-backend/src/modules/analytics/routes/analytics-routes.js:31](../../hiringloop-backend/src/modules/analytics/routes/analytics-routes.js#L31). Exact declaration line: hiringloop-backend/src/modules/analytics/routes/analytics-routes.js:40.
- **Authentication:** Live opaque-cookie session required. **Authorization:** ANALYTICS_VIEW.
- **Request schema:** params: analyticsParamsSchema; query: analyticsJobsQuerySchema. Headers: Content-Type application/json when sending a JSON body. Path UUID/slug validation is endpoint-owned.
- **Service / DB / response:** [hiringloop-backend/src/modules/analytics/controllers/analytics-controller.js:21](../../hiringloop-backend/src/modules/analytics/controllers/analytics-controller.js#L21) defines use-case invocation, success status and envelope; linked use-case/repository/DTO sources above define reads/writes and serialized fields.
- **Failure behavior / tests / consumers:** Shared failures above plus business errors in the linked service. Related tests and frontend API sources are listed for this module; current behavior is not runtime-verified.

```js
router.get(
    '/analytics/jobs',
    ...access,
    validateRequest({
      params: analyticsParamsSchema,
      query: analyticsJobsQuerySchema,
    }),
    controller.jobs,
  )
```

**Module business/infrastructure error vocabulary:** ApplicationError, JOB_NOT_FOUND.

## application-forms

**Use-case/service sources:** [hiringloop-backend/src/modules/application-forms/use-cases/application-form-use-cases.js:1](../../hiringloop-backend/src/modules/application-forms/use-cases/application-form-use-cases.js#L1)

**Persistence sources:** [hiringloop-backend/src/modules/application-forms/repositories/application-form-repository.js:1](../../hiringloop-backend/src/modules/application-forms/repositories/application-form-repository.js#L1)

**Frontend consumers:** [hiringloop-frontend/src/features/application-form/api/application-form.api.ts:1](../../hiringloop-frontend/src/features/application-form/api/application-form.api.ts#L1). This maps the owning feature; direct per-method call-site reachability is not fully verified.

**Existing related tests:** [hiringloop-backend/tests/integration/database/application-form-http.test.js:1](../../hiringloop-backend/tests/integration/database/application-form-http.test.js#L1); [hiringloop-backend/tests/integration/database/application-form-foundation.test.js:1](../../hiringloop-backend/tests/integration/database/application-form-foundation.test.js#L1). File association is verified; endpoint-specific assertion completeness and current pass status are UNKNOWN.

### GET /api/v1/organizations/:organizationId/jobs/:jobId/application-form

- **Handler:** [hiringloop-backend/src/modules/application-forms/controllers/application-form-controller.js:22](../../hiringloop-backend/src/modules/application-forms/controllers/application-form-controller.js#L22), method get; declaration [hiringloop-backend/src/modules/application-forms/routes/application-form-routes.js:29](../../hiringloop-backend/src/modules/application-forms/routes/application-form-routes.js#L29). Exact declaration line: hiringloop-backend/src/modules/application-forms/routes/application-form-routes.js:29.
- **Authentication:** Live opaque-cookie session required. **Authorization:** APPLICATION_FORM_VIEW.
- **Request schema:** params: formParamsSchema. Headers: Content-Type application/json when sending a JSON body. Path UUID/slug validation is endpoint-owned.
- **Service / DB / response:** [hiringloop-backend/src/modules/application-forms/controllers/application-form-controller.js:22](../../hiringloop-backend/src/modules/application-forms/controllers/application-form-controller.js#L22) defines use-case invocation, success status and envelope; linked use-case/repository/DTO sources above define reads/writes and serialized fields. DTOs: [hiringloop-backend/src/modules/application-forms/domain/application-form-dto.js:1](../../hiringloop-backend/src/modules/application-forms/domain/application-form-dto.js#L1).
- **Failure behavior / tests / consumers:** Shared failures above plus business errors in the linked service. Related tests and frontend API sources are listed for this module; current behavior is not runtime-verified.

```js
router.get(
    '/',
    ...context(PERMISSIONS.APPLICATION_FORM_VIEW),
    validateRequest({ params: formParamsSchema }),
    controller.get,
  )
```

### POST /api/v1/organizations/:organizationId/jobs/:jobId/application-form/draft

- **Handler:** [hiringloop-backend/src/modules/application-forms/controllers/application-form-controller.js:23](../../hiringloop-backend/src/modules/application-forms/controllers/application-form-controller.js#L23), method createDraft; declaration [hiringloop-backend/src/modules/application-forms/routes/application-form-routes.js:35](../../hiringloop-backend/src/modules/application-forms/routes/application-form-routes.js#L35). Exact declaration line: hiringloop-backend/src/modules/application-forms/routes/application-form-routes.js:35.
- **Authentication:** Live opaque-cookie session required. **Authorization:** APPLICATION_FORM_CONFIGURE.
- **Request schema:** params: formParamsSchema; body: emptyBodySchema. Headers: X-CSRF-Token required; Content-Type application/json when sending a JSON body. Path UUID/slug validation is endpoint-owned.
- **Service / DB / response:** [hiringloop-backend/src/modules/application-forms/controllers/application-form-controller.js:23](../../hiringloop-backend/src/modules/application-forms/controllers/application-form-controller.js#L23) defines use-case invocation, success status and envelope; linked use-case/repository/DTO sources above define reads/writes and serialized fields. DTOs: [hiringloop-backend/src/modules/application-forms/domain/application-form-dto.js:1](../../hiringloop-backend/src/modules/application-forms/domain/application-form-dto.js#L1).
- **Failure behavior / tests / consumers:** Shared failures above plus business errors in the linked service. Related tests and frontend API sources are listed for this module; current behavior is not runtime-verified.

```js
router.post(
    '/draft',
    ...context(PERMISSIONS.APPLICATION_FORM_CONFIGURE, true),
    validateRequest({ params: formParamsSchema, body: emptyBodySchema }),
    controller.createDraft,
  )
```

### POST /api/v1/organizations/:organizationId/jobs/:jobId/application-form/draft/questions

- **Handler:** [hiringloop-backend/src/modules/application-forms/controllers/application-form-controller.js:24](../../hiringloop-backend/src/modules/application-forms/controllers/application-form-controller.js#L24), method addQuestion; declaration [hiringloop-backend/src/modules/application-forms/routes/application-form-routes.js:35](../../hiringloop-backend/src/modules/application-forms/routes/application-form-routes.js#L35). Exact declaration line: hiringloop-backend/src/modules/application-forms/routes/application-form-routes.js:41.
- **Authentication:** Live opaque-cookie session required. **Authorization:** APPLICATION_FORM_CONFIGURE.
- **Request schema:** params: formParamsSchema; body: createQuestionBodySchema. Headers: X-CSRF-Token required; Content-Type application/json when sending a JSON body. Path UUID/slug validation is endpoint-owned.
- **Service / DB / response:** [hiringloop-backend/src/modules/application-forms/controllers/application-form-controller.js:24](../../hiringloop-backend/src/modules/application-forms/controllers/application-form-controller.js#L24) defines use-case invocation, success status and envelope; linked use-case/repository/DTO sources above define reads/writes and serialized fields. DTOs: [hiringloop-backend/src/modules/application-forms/domain/application-form-dto.js:1](../../hiringloop-backend/src/modules/application-forms/domain/application-form-dto.js#L1).
- **Failure behavior / tests / consumers:** Shared failures above plus business errors in the linked service. Related tests and frontend API sources are listed for this module; current behavior is not runtime-verified.

```js
router.post(
    '/draft/questions',
    ...context(PERMISSIONS.APPLICATION_FORM_CONFIGURE, true),
    validateRequest({
      params: formParamsSchema,
      body: createQuestionBodySchema,
    }),
    controller.addQuestion,
  )
```

### PATCH /api/v1/organizations/:organizationId/jobs/:jobId/application-form/draft/questions/:questionId

- **Handler:** [hiringloop-backend/src/modules/application-forms/controllers/application-form-controller.js:25](../../hiringloop-backend/src/modules/application-forms/controllers/application-form-controller.js#L25), method updateQuestion; declaration [hiringloop-backend/src/modules/application-forms/routes/application-form-routes.js:50](../../hiringloop-backend/src/modules/application-forms/routes/application-form-routes.js#L50). Exact declaration line: hiringloop-backend/src/modules/application-forms/routes/application-form-routes.js:50.
- **Authentication:** Live opaque-cookie session required. **Authorization:** APPLICATION_FORM_CONFIGURE.
- **Request schema:** params: questionParamsSchema; body: updateQuestionBodySchema. Headers: X-CSRF-Token required; Content-Type application/json when sending a JSON body. Path UUID/slug validation is endpoint-owned.
- **Service / DB / response:** [hiringloop-backend/src/modules/application-forms/controllers/application-form-controller.js:25](../../hiringloop-backend/src/modules/application-forms/controllers/application-form-controller.js#L25) defines use-case invocation, success status and envelope; linked use-case/repository/DTO sources above define reads/writes and serialized fields. DTOs: [hiringloop-backend/src/modules/application-forms/domain/application-form-dto.js:1](../../hiringloop-backend/src/modules/application-forms/domain/application-form-dto.js#L1).
- **Failure behavior / tests / consumers:** Shared failures above plus business errors in the linked service. Related tests and frontend API sources are listed for this module; current behavior is not runtime-verified.

```js
router.patch(
    '/draft/questions/:questionId',
    ...context(PERMISSIONS.APPLICATION_FORM_CONFIGURE, true),
    validateRequest({
      params: questionParamsSchema,
      body: updateQuestionBodySchema,
    }),
    controller.updateQuestion,
  )
```

### DELETE /api/v1/organizations/:organizationId/jobs/:jobId/application-form/draft/questions/:questionId

- **Handler:** [hiringloop-backend/src/modules/application-forms/controllers/application-form-controller.js:26](../../hiringloop-backend/src/modules/application-forms/controllers/application-form-controller.js#L26), method deleteQuestion; declaration [hiringloop-backend/src/modules/application-forms/routes/application-form-routes.js:59](../../hiringloop-backend/src/modules/application-forms/routes/application-form-routes.js#L59). Exact declaration line: hiringloop-backend/src/modules/application-forms/routes/application-form-routes.js:59.
- **Authentication:** Live opaque-cookie session required. **Authorization:** APPLICATION_FORM_CONFIGURE.
- **Request schema:** params: questionParamsSchema; body: revisionBodySchema. Headers: X-CSRF-Token required; Content-Type application/json when sending a JSON body. Path UUID/slug validation is endpoint-owned.
- **Service / DB / response:** [hiringloop-backend/src/modules/application-forms/controllers/application-form-controller.js:26](../../hiringloop-backend/src/modules/application-forms/controllers/application-form-controller.js#L26) defines use-case invocation, success status and envelope; linked use-case/repository/DTO sources above define reads/writes and serialized fields. DTOs: [hiringloop-backend/src/modules/application-forms/domain/application-form-dto.js:1](../../hiringloop-backend/src/modules/application-forms/domain/application-form-dto.js#L1).
- **Failure behavior / tests / consumers:** Shared failures above plus business errors in the linked service. Related tests and frontend API sources are listed for this module; current behavior is not runtime-verified.

```js
router.delete(
    '/draft/questions/:questionId',
    ...context(PERMISSIONS.APPLICATION_FORM_CONFIGURE, true),
    validateRequest({ params: questionParamsSchema, body: revisionBodySchema }),
    controller.deleteQuestion,
  )
```

### PUT /api/v1/organizations/:organizationId/jobs/:jobId/application-form/draft/questions/order

- **Handler:** [hiringloop-backend/src/modules/application-forms/controllers/application-form-controller.js:27](../../hiringloop-backend/src/modules/application-forms/controllers/application-form-controller.js#L27), method reorderQuestions; declaration [hiringloop-backend/src/modules/application-forms/routes/application-form-routes.js:65](../../hiringloop-backend/src/modules/application-forms/routes/application-form-routes.js#L65). Exact declaration line: hiringloop-backend/src/modules/application-forms/routes/application-form-routes.js:65.
- **Authentication:** Live opaque-cookie session required. **Authorization:** APPLICATION_FORM_CONFIGURE.
- **Request schema:** params: formParamsSchema; body: reorderQuestionsBodySchema. Headers: X-CSRF-Token required; Content-Type application/json when sending a JSON body. Path UUID/slug validation is endpoint-owned.
- **Service / DB / response:** [hiringloop-backend/src/modules/application-forms/controllers/application-form-controller.js:27](../../hiringloop-backend/src/modules/application-forms/controllers/application-form-controller.js#L27) defines use-case invocation, success status and envelope; linked use-case/repository/DTO sources above define reads/writes and serialized fields. DTOs: [hiringloop-backend/src/modules/application-forms/domain/application-form-dto.js:1](../../hiringloop-backend/src/modules/application-forms/domain/application-form-dto.js#L1).
- **Failure behavior / tests / consumers:** Shared failures above plus business errors in the linked service. Related tests and frontend API sources are listed for this module; current behavior is not runtime-verified.

```js
router.put(
    '/draft/questions/order',
    ...context(PERMISSIONS.APPLICATION_FORM_CONFIGURE, true),
    validateRequest({
      params: formParamsSchema,
      body: reorderQuestionsBodySchema,
    }),
    controller.reorderQuestions,
  )
```

### POST /api/v1/organizations/:organizationId/jobs/:jobId/application-form/draft/publish

- **Handler:** [hiringloop-backend/src/modules/application-forms/controllers/application-form-controller.js:28](../../hiringloop-backend/src/modules/application-forms/controllers/application-form-controller.js#L28), method publish; declaration [hiringloop-backend/src/modules/application-forms/routes/application-form-routes.js:35](../../hiringloop-backend/src/modules/application-forms/routes/application-form-routes.js#L35). Exact declaration line: hiringloop-backend/src/modules/application-forms/routes/application-form-routes.js:74.
- **Authentication:** Live opaque-cookie session required. **Authorization:** APPLICATION_FORM_CONFIGURE.
- **Request schema:** params: formParamsSchema; body: revisionBodySchema. Headers: X-CSRF-Token required; Content-Type application/json when sending a JSON body. Path UUID/slug validation is endpoint-owned.
- **Service / DB / response:** [hiringloop-backend/src/modules/application-forms/controllers/application-form-controller.js:28](../../hiringloop-backend/src/modules/application-forms/controllers/application-form-controller.js#L28) defines use-case invocation, success status and envelope; linked use-case/repository/DTO sources above define reads/writes and serialized fields. DTOs: [hiringloop-backend/src/modules/application-forms/domain/application-form-dto.js:1](../../hiringloop-backend/src/modules/application-forms/domain/application-form-dto.js#L1).
- **Failure behavior / tests / consumers:** Shared failures above plus business errors in the linked service. Related tests and frontend API sources are listed for this module; current behavior is not runtime-verified.

```js
router.post(
    '/draft/publish',
    ...context(PERMISSIONS.APPLICATION_FORM_CONFIGURE, true),
    validateRequest({ params: formParamsSchema, body: revisionBodySchema }),
    controller.publish,
  )
```

### DELETE /api/v1/organizations/:organizationId/jobs/:jobId/application-form/draft

- **Handler:** [hiringloop-backend/src/modules/application-forms/controllers/application-form-controller.js:29](../../hiringloop-backend/src/modules/application-forms/controllers/application-form-controller.js#L29), method discard; declaration [hiringloop-backend/src/modules/application-forms/routes/application-form-routes.js:59](../../hiringloop-backend/src/modules/application-forms/routes/application-form-routes.js#L59). Exact declaration line: hiringloop-backend/src/modules/application-forms/routes/application-form-routes.js:80.
- **Authentication:** Live opaque-cookie session required. **Authorization:** APPLICATION_FORM_CONFIGURE.
- **Request schema:** params: formParamsSchema; body: revisionBodySchema. Headers: X-CSRF-Token required; Content-Type application/json when sending a JSON body. Path UUID/slug validation is endpoint-owned.
- **Service / DB / response:** [hiringloop-backend/src/modules/application-forms/controllers/application-form-controller.js:29](../../hiringloop-backend/src/modules/application-forms/controllers/application-form-controller.js#L29) defines use-case invocation, success status and envelope; linked use-case/repository/DTO sources above define reads/writes and serialized fields. DTOs: [hiringloop-backend/src/modules/application-forms/domain/application-form-dto.js:1](../../hiringloop-backend/src/modules/application-forms/domain/application-form-dto.js#L1).
- **Failure behavior / tests / consumers:** Shared failures above plus business errors in the linked service. Related tests and frontend API sources are listed for this module; current behavior is not runtime-verified.

```js
router.delete(
    '/draft',
    ...context(PERMISSIONS.APPLICATION_FORM_CONFIGURE, true),
    validateRequest({ params: formParamsSchema, body: revisionBodySchema }),
    controller.discard,
  )
```

**Module business/infrastructure error vocabulary:** applicationFormNotFoundError, applicationFormDraftNotFoundError, formVersionConflictError, applicationFormQuestionNotFoundError, applicationFormQuestionLimitError, applicationFormInvalidOrderError.

## applications

**Use-case/service sources:** [hiringloop-backend/src/modules/applications/use-cases/public-application-use-cases.js:1](../../hiringloop-backend/src/modules/applications/use-cases/public-application-use-cases.js#L1); [hiringloop-backend/src/modules/applications/use-cases/application-outcome-use-cases.js:1](../../hiringloop-backend/src/modules/applications/use-cases/application-outcome-use-cases.js#L1)

**Persistence sources:** [hiringloop-backend/src/modules/applications/repositories/application-repository.js:1](../../hiringloop-backend/src/modules/applications/repositories/application-repository.js#L1); [hiringloop-backend/src/modules/applications/repositories/application-outcome-repository.js:1](../../hiringloop-backend/src/modules/applications/repositories/application-outcome-repository.js#L1)

**Frontend consumers:** [hiringloop-frontend/src/features/offers/api/offers.api.ts:1](../../hiringloop-frontend/src/features/offers/api/offers.api.ts#L1). This maps the owning feature; direct per-method call-site reachability is not fully verified.

**Existing related tests:** [hiringloop-backend/tests/integration/phase17-tenant-isolation-http.test.js:1](../../hiringloop-backend/tests/integration/phase17-tenant-isolation-http.test.js#L1); [hiringloop-backend/tests/integration/phase17-talent-pools-http.test.js:1](../../hiringloop-backend/tests/integration/phase17-talent-pools-http.test.js#L1); [hiringloop-backend/tests/integration/phase17-outcomes-http.test.js:1](../../hiringloop-backend/tests/integration/phase17-outcomes-http.test.js#L1); [hiringloop-backend/tests/integration/phase17-offers-http.test.js:1](../../hiringloop-backend/tests/integration/phase17-offers-http.test.js#L1); [hiringloop-backend/tests/integration/phase17-access-http.test.js:1](../../hiringloop-backend/tests/integration/phase17-access-http.test.js#L1); [hiringloop-backend/tests/integration/database/phase17-offer-talent-integrity.test.js:1](../../hiringloop-backend/tests/integration/database/phase17-offer-talent-integrity.test.js#L1); [hiringloop-backend/tests/integration/database/candidate-application-foundation.test.js:1](../../hiringloop-backend/tests/integration/database/candidate-application-foundation.test.js#L1); [hiringloop-backend/tests/integration/database/application-form-http.test.js:1](../../hiringloop-backend/tests/integration/database/application-form-http.test.js#L1); [hiringloop-backend/tests/integration/database/application-form-foundation.test.js:1](../../hiringloop-backend/tests/integration/database/application-form-foundation.test.js#L1); [hiringloop-backend/tests/modules/phase17-offer-outcome-use-cases.test.js:1](../../hiringloop-backend/tests/modules/phase17-offer-outcome-use-cases.test.js#L1); [hiringloop-backend/tests/modules/applications/public-application-use-cases.test.js:1](../../hiringloop-backend/tests/modules/applications/public-application-use-cases.test.js#L1); [hiringloop-backend/tests/modules/applications/public-application-http.test.js:1](../../hiringloop-backend/tests/modules/applications/public-application-http.test.js#L1); [hiringloop-frontend/src/features/application-form/pages/ApplicationFormBuilderPage.test.tsx:1](../../hiringloop-frontend/src/features/application-form/pages/ApplicationFormBuilderPage.test.tsx#L1); [hiringloop-frontend/src/features/application-form/hooks/mutations.test.tsx:1](../../hiringloop-frontend/src/features/application-form/hooks/mutations.test.tsx#L1); [hiringloop-frontend/src/features/application-form/api/application-form.api.test.ts:1](../../hiringloop-frontend/src/features/application-form/api/application-form.api.test.ts#L1); [hiringloop-frontend/src/features/candidate-application/utils/application-utils.test.ts:1](../../hiringloop-frontend/src/features/candidate-application/utils/application-utils.test.ts#L1). File association is verified; endpoint-specific assertion completeness and current pass status are UNKNOWN.

### POST /api/v1/organizations/:organizationId/applications/:applicationId/hire

- **Handler:** [hiringloop-backend/src/modules/applications/controllers/public-application-controller.js:1](../../hiringloop-backend/src/modules/applications/controllers/public-application-controller.js#L1), method hire; declaration [hiringloop-backend/src/modules/applications/routes/application-outcome-routes.js:26](../../hiringloop-backend/src/modules/applications/routes/application-outcome-routes.js#L26). Exact declaration line: hiringloop-backend/src/modules/applications/routes/application-outcome-routes.js:26.
- **Authentication:** Live opaque-cookie session required. **Authorization:** APPLICATION_HIRE.
- **Request schema:** params: outcomeApplicationParamsSchema; body: outcomeRevisionSchema. Headers: X-CSRF-Token required; Content-Type application/json when sending a JSON body. Path UUID/slug validation is endpoint-owned.
- **Service / DB / response:** [hiringloop-backend/src/modules/applications/controllers/public-application-controller.js:1](../../hiringloop-backend/src/modules/applications/controllers/public-application-controller.js#L1) defines use-case invocation, success status and envelope; linked use-case/repository/DTO sources above define reads/writes and serialized fields. DTOs: [hiringloop-backend/src/modules/applications/domain/outcome-dto.js:1](../../hiringloop-backend/src/modules/applications/domain/outcome-dto.js#L1); [hiringloop-backend/src/modules/applications/domain/application-dto.js:1](../../hiringloop-backend/src/modules/applications/domain/application-dto.js#L1).
- **Failure behavior / tests / consumers:** Shared failures above plus business errors in the linked service. Related tests and frontend API sources are listed for this module; current behavior is not runtime-verified.

```js
router.post(
    '/applications/:applicationId/hire',
    ...write(PERMISSIONS.APPLICATION_HIRE),
    validateRequest({
      params: outcomeApplicationParamsSchema,
      body: outcomeRevisionSchema,
    }),
    controller.hire,
  )
```

### POST /api/v1/organizations/:organizationId/applications/:applicationId/reject

- **Handler:** [hiringloop-backend/src/modules/applications/controllers/public-application-controller.js:1](../../hiringloop-backend/src/modules/applications/controllers/public-application-controller.js#L1), method reject; declaration [hiringloop-backend/src/modules/applications/routes/application-outcome-routes.js:26](../../hiringloop-backend/src/modules/applications/routes/application-outcome-routes.js#L26). Exact declaration line: hiringloop-backend/src/modules/applications/routes/application-outcome-routes.js:35.
- **Authentication:** Live opaque-cookie session required. **Authorization:** APPLICATION_REJECT.
- **Request schema:** params: outcomeApplicationParamsSchema; body: rejectApplicationBodySchema. Headers: X-CSRF-Token required; Content-Type application/json when sending a JSON body. Path UUID/slug validation is endpoint-owned.
- **Service / DB / response:** [hiringloop-backend/src/modules/applications/controllers/public-application-controller.js:1](../../hiringloop-backend/src/modules/applications/controllers/public-application-controller.js#L1) defines use-case invocation, success status and envelope; linked use-case/repository/DTO sources above define reads/writes and serialized fields. DTOs: [hiringloop-backend/src/modules/applications/domain/outcome-dto.js:1](../../hiringloop-backend/src/modules/applications/domain/outcome-dto.js#L1); [hiringloop-backend/src/modules/applications/domain/application-dto.js:1](../../hiringloop-backend/src/modules/applications/domain/application-dto.js#L1).
- **Failure behavior / tests / consumers:** Shared failures above plus business errors in the linked service. Related tests and frontend API sources are listed for this module; current behavior is not runtime-verified.

```js
router.post(
    '/applications/:applicationId/reject',
    ...write(PERMISSIONS.APPLICATION_REJECT),
    validateRequest({
      params: outcomeApplicationParamsSchema,
      body: rejectApplicationBodySchema,
    }),
    controller.reject,
  )
```

### POST /api/v1/organizations/:organizationId/applications/:applicationId/reopen

- **Handler:** [hiringloop-backend/src/modules/applications/controllers/public-application-controller.js:1](../../hiringloop-backend/src/modules/applications/controllers/public-application-controller.js#L1), method reopen; declaration [hiringloop-backend/src/modules/applications/routes/application-outcome-routes.js:26](../../hiringloop-backend/src/modules/applications/routes/application-outcome-routes.js#L26). Exact declaration line: hiringloop-backend/src/modules/applications/routes/application-outcome-routes.js:44.
- **Authentication:** Live opaque-cookie session required. **Authorization:** APPLICATION_REOPEN.
- **Request schema:** params: outcomeApplicationParamsSchema; body: reopenApplicationBodySchema. Headers: X-CSRF-Token required; Content-Type application/json when sending a JSON body. Path UUID/slug validation is endpoint-owned.
- **Service / DB / response:** [hiringloop-backend/src/modules/applications/controllers/public-application-controller.js:1](../../hiringloop-backend/src/modules/applications/controllers/public-application-controller.js#L1) defines use-case invocation, success status and envelope; linked use-case/repository/DTO sources above define reads/writes and serialized fields. DTOs: [hiringloop-backend/src/modules/applications/domain/outcome-dto.js:1](../../hiringloop-backend/src/modules/applications/domain/outcome-dto.js#L1); [hiringloop-backend/src/modules/applications/domain/application-dto.js:1](../../hiringloop-backend/src/modules/applications/domain/application-dto.js#L1).
- **Failure behavior / tests / consumers:** Shared failures above plus business errors in the linked service. Related tests and frontend API sources are listed for this module; current behavior is not runtime-verified.

```js
router.post(
    '/applications/:applicationId/reopen',
    ...write(PERMISSIONS.APPLICATION_REOPEN),
    validateRequest({
      params: outcomeApplicationParamsSchema,
      body: reopenApplicationBodySchema,
    }),
    controller.reopen,
  )
```

**Module business/infrastructure error vocabulary:** fileTypeNotAllowedError, invalidApplicationAnswerError, requiredAnswerMissingError, notFoundError, invalidApplicationUploadError, applicationUploadAlreadyConsumedError, applicationUploadExpiredError, fileTooLargeError, applicationStorageUnavailableError, idempotencyConflictError, applicationFormUnavailableError, jobNotAcceptingApplicationsError, invalidFormVersionError, initialPipelineStageUnavailableError, duplicateApplicationError, ApplicationError, UploadUnavailableDuringCommitError, APPLICATION_NOT_FOUND, APPLICATION_HIRE_REQUIRES_ACCEPTED_OFFER, TALENT_POOL_NOT_FOUND, APPLICATION_OUTCOME_CONFLICT.

## audit

**Use-case/service sources:** [hiringloop-backend/src/modules/audit/use-cases/audit-use-cases.js:1](../../hiringloop-backend/src/modules/audit/use-cases/audit-use-cases.js#L1)

**Persistence sources:** [hiringloop-backend/src/modules/audit/repositories/audit-repository.js:1](../../hiringloop-backend/src/modules/audit/repositories/audit-repository.js#L1)

**Frontend consumers:** [hiringloop-frontend/src/features/audit/api/audit.api.ts:1](../../hiringloop-frontend/src/features/audit/api/audit.api.ts#L1). This maps the owning feature; direct per-method call-site reachability is not fully verified.

**Existing related tests:** [hiringloop-backend/tests/integration/phase18-analytics-audit-http.test.js:1](../../hiringloop-backend/tests/integration/phase18-analytics-audit-http.test.js#L1); [hiringloop-backend/tests/integration/database/phase18-audit-rollback.test.js:1](../../hiringloop-backend/tests/integration/database/phase18-audit-rollback.test.js#L1); [hiringloop-backend/tests/integration/database/phase18-audit-integrity.test.js:1](../../hiringloop-backend/tests/integration/database/phase18-audit-integrity.test.js#L1); [hiringloop-frontend/src/features/audit/audit.test.tsx:1](../../hiringloop-frontend/src/features/audit/audit.test.tsx#L1). File association is verified; endpoint-specific assertion completeness and current pass status are UNKNOWN.

### GET /api/v1/organizations/:organizationId/audit-events

- **Handler:** [hiringloop-backend/src/modules/audit/controllers/audit-controller.js:3](../../hiringloop-backend/src/modules/audit/controllers/audit-controller.js#L3), method list; declaration [hiringloop-backend/src/modules/audit/routes/audit-routes.js:23](../../hiringloop-backend/src/modules/audit/routes/audit-routes.js#L23). Exact declaration line: hiringloop-backend/src/modules/audit/routes/audit-routes.js:23.
- **Authentication:** Live opaque-cookie session required. **Authorization:** AUDIT_VIEW.
- **Request schema:** params: auditParamsSchema; query: auditListQuerySchema. Headers: Content-Type application/json when sending a JSON body. Path UUID/slug validation is endpoint-owned.
- **Service / DB / response:** [hiringloop-backend/src/modules/audit/controllers/audit-controller.js:3](../../hiringloop-backend/src/modules/audit/controllers/audit-controller.js#L3) defines use-case invocation, success status and envelope; linked use-case/repository/DTO sources above define reads/writes and serialized fields. DTOs: [hiringloop-backend/src/modules/audit/domain/audit-dto.js:1](../../hiringloop-backend/src/modules/audit/domain/audit-dto.js#L1).
- **Failure behavior / tests / consumers:** Shared failures above plus business errors in the linked service. Related tests and frontend API sources are listed for this module; current behavior is not runtime-verified.

```js
router.get(
    '/audit-events',
    ...access,
    validateRequest({ params: auditParamsSchema, query: auditListQuerySchema }),
    controller.list,
  )
```

### GET /api/v1/organizations/:organizationId/audit-events/:auditEventId

- **Handler:** [hiringloop-backend/src/modules/audit/controllers/audit-controller.js:15](../../hiringloop-backend/src/modules/audit/controllers/audit-controller.js#L15), method get; declaration [hiringloop-backend/src/modules/audit/routes/audit-routes.js:23](../../hiringloop-backend/src/modules/audit/routes/audit-routes.js#L23). Exact declaration line: hiringloop-backend/src/modules/audit/routes/audit-routes.js:29.
- **Authentication:** Live opaque-cookie session required. **Authorization:** AUDIT_VIEW.
- **Request schema:** params: auditDetailParamsSchema. Headers: Content-Type application/json when sending a JSON body. Path UUID/slug validation is endpoint-owned.
- **Service / DB / response:** [hiringloop-backend/src/modules/audit/controllers/audit-controller.js:15](../../hiringloop-backend/src/modules/audit/controllers/audit-controller.js#L15) defines use-case invocation, success status and envelope; linked use-case/repository/DTO sources above define reads/writes and serialized fields. DTOs: [hiringloop-backend/src/modules/audit/domain/audit-dto.js:1](../../hiringloop-backend/src/modules/audit/domain/audit-dto.js#L1).
- **Failure behavior / tests / consumers:** Shared failures above plus business errors in the linked service. Related tests and frontend API sources are listed for this module; current behavior is not runtime-verified.

```js
router.get(
    '/audit-events/:auditEventId',
    ...access,
    validateRequest({ params: auditDetailParamsSchema }),
    controller.get,
  )
```

**Module business/infrastructure error vocabulary:** ApplicationError, AUDIT_EVENT_NOT_FOUND.

## auth

**Use-case/service sources:** [hiringloop-backend/src/modules/auth/use-cases/verify-email.js:1](../../hiringloop-backend/src/modules/auth/use-cases/verify-email.js#L1); [hiringloop-backend/src/modules/auth/use-cases/reset-password.js:1](../../hiringloop-backend/src/modules/auth/use-cases/reset-password.js#L1); [hiringloop-backend/src/modules/auth/use-cases/resend-verification.js:1](../../hiringloop-backend/src/modules/auth/use-cases/resend-verification.js#L1); [hiringloop-backend/src/modules/auth/use-cases/register-user.js:1](../../hiringloop-backend/src/modules/auth/use-cases/register-user.js#L1); [hiringloop-backend/src/modules/auth/use-cases/logout-session.js:1](../../hiringloop-backend/src/modules/auth/use-cases/logout-session.js#L1); [hiringloop-backend/src/modules/auth/use-cases/login-with-google.js:1](../../hiringloop-backend/src/modules/auth/use-cases/login-with-google.js#L1); [hiringloop-backend/src/modules/auth/use-cases/login-user.js:1](../../hiringloop-backend/src/modules/auth/use-cases/login-user.js#L1); [hiringloop-backend/src/modules/auth/use-cases/forgot-password.js:1](../../hiringloop-backend/src/modules/auth/use-cases/forgot-password.js#L1); [hiringloop-backend/src/modules/auth/use-cases/create-hiringloop-session.js:1](../../hiringloop-backend/src/modules/auth/use-cases/create-hiringloop-session.js#L1); [hiringloop-backend/src/modules/auth/use-cases/change-password.js:1](../../hiringloop-backend/src/modules/auth/use-cases/change-password.js#L1)

**Persistence sources:** [hiringloop-backend/src/modules/auth/repositories/auth-repository.js:1](../../hiringloop-backend/src/modules/auth/repositories/auth-repository.js#L1)

**Frontend consumers:** [hiringloop-frontend/src/features/auth/api/auth.api.ts:1](../../hiringloop-frontend/src/features/auth/api/auth.api.ts#L1). This maps the owning feature; direct per-method call-site reachability is not fully verified.

**Existing related tests:** [hiringloop-backend/tests/integration/database/auth-session-lifecycle.test.js:1](../../hiringloop-backend/tests/integration/database/auth-session-lifecycle.test.js#L1); [hiringloop-backend/tests/integration/database/auth-browser-lifecycle.test.js:1](../../hiringloop-backend/tests/integration/database/auth-browser-lifecycle.test.js#L1); [hiringloop-backend/tests/modules/auth/resend-verification.test.js:1](../../hiringloop-backend/tests/modules/auth/resend-verification.test.js#L1); [hiringloop-backend/tests/modules/auth/password-recovery.test.js:1](../../hiringloop-backend/tests/modules/auth/password-recovery.test.js#L1); [hiringloop-backend/tests/modules/auth/logout.test.js:1](../../hiringloop-backend/tests/modules/auth/logout.test.js#L1); [hiringloop-backend/tests/modules/auth/login.test.js:1](../../hiringloop-backend/tests/modules/auth/login.test.js#L1); [hiringloop-backend/tests/modules/auth/google-oidc.test.js:1](../../hiringloop-backend/tests/modules/auth/google-oidc.test.js#L1); [hiringloop-backend/tests/modules/auth/email-delivery.test.js:1](../../hiringloop-backend/tests/modules/auth/email-delivery.test.js#L1); [hiringloop-backend/tests/modules/auth/cors-csrf.test.js:1](../../hiringloop-backend/tests/modules/auth/cors-csrf.test.js#L1); [hiringloop-backend/tests/modules/auth/authenticate-session.test.js:1](../../hiringloop-backend/tests/modules/auth/authenticate-session.test.js#L1); [hiringloop-backend/tests/modules/auth/auth-workflows.test.js:1](../../hiringloop-backend/tests/modules/auth/auth-workflows.test.js#L1); [hiringloop-backend/tests/modules/auth/auth-utilities.test.js:1](../../hiringloop-backend/tests/modules/auth/auth-utilities.test.js#L1); [hiringloop-backend/tests/modules/auth/app-cors.test.js:1](../../hiringloop-backend/tests/modules/auth/app-cors.test.js#L1); [hiringloop-frontend/src/features/auth/hooks/queries.test.tsx:1](../../hiringloop-frontend/src/features/auth/hooks/queries.test.tsx#L1); [hiringloop-frontend/src/features/auth/hooks/mutations.test.tsx:1](../../hiringloop-frontend/src/features/auth/hooks/mutations.test.tsx#L1); [hiringloop-frontend/src/features/auth/auth-pages.test.tsx:1](../../hiringloop-frontend/src/features/auth/auth-pages.test.tsx#L1); [hiringloop-frontend/src/features/auth/api/auth.api.test.ts:1](../../hiringloop-frontend/src/features/auth/api/auth.api.test.ts#L1). File association is verified; endpoint-specific assertion completeness and current pass status are UNKNOWN.

### GET /api/v1/auth/google/start

- **Handler:** [hiringloop-backend/src/modules/auth/controllers/auth-controller.js:28](../../hiringloop-backend/src/modules/auth/controllers/auth-controller.js#L28), method googleStart; declaration [hiringloop-backend/src/modules/auth/routes/auth-routes.js:66](../../hiringloop-backend/src/modules/auth/routes/auth-routes.js#L66). Exact declaration line: hiringloop-backend/src/modules/auth/routes/auth-routes.js:66.
- **Authentication:** Anonymous permitted; Google routes conditional on provider config. **Authorization:** No tenant membership required; public jobs are OPEN-only..
- **Request schema:** No body/query schema named; see middleware declaration below. Headers: Content-Type application/json when sending a JSON body. Path UUID/slug validation is endpoint-owned.
- **Service / DB / response:** [hiringloop-backend/src/modules/auth/controllers/auth-controller.js:28](../../hiringloop-backend/src/modules/auth/controllers/auth-controller.js#L28) defines use-case invocation, success status and envelope; linked use-case/repository/DTO sources above define reads/writes and serialized fields.
- **Failure behavior / tests / consumers:** Shared failures above plus business errors in the linked service. Related tests and frontend API sources are listed for this module; current behavior is not runtime-verified.

```js
router.get(
      '/google/start',
      rateLimit(rateLimiters.googleStartRateLimiter),
      controller.googleStart,
    )
```

### GET /api/v1/auth/google/callback

- **Handler:** [hiringloop-backend/src/modules/auth/controllers/auth-controller.js:42](../../hiringloop-backend/src/modules/auth/controllers/auth-controller.js#L42), method googleCallback; declaration [hiringloop-backend/src/modules/auth/routes/auth-routes.js:66](../../hiringloop-backend/src/modules/auth/routes/auth-routes.js#L66). Exact declaration line: hiringloop-backend/src/modules/auth/routes/auth-routes.js:71.
- **Authentication:** Anonymous permitted; Google routes conditional on provider config. **Authorization:** No tenant membership required; public jobs are OPEN-only..
- **Request schema:** No body/query schema named; see middleware declaration below. Headers: Content-Type application/json when sending a JSON body. Path UUID/slug validation is endpoint-owned.
- **Service / DB / response:** [hiringloop-backend/src/modules/auth/controllers/auth-controller.js:42](../../hiringloop-backend/src/modules/auth/controllers/auth-controller.js#L42) defines use-case invocation, success status and envelope; linked use-case/repository/DTO sources above define reads/writes and serialized fields.
- **Failure behavior / tests / consumers:** Shared failures above plus business errors in the linked service. Related tests and frontend API sources are listed for this module; current behavior is not runtime-verified.

```js
router.get(
      '/google/callback',
      rateLimit(rateLimiters.googleCallbackRateLimiter),
      controller.googleCallback,
    )
```

### POST /api/v1/auth/login

- **Handler:** [hiringloop-backend/src/modules/auth/controllers/auth-controller.js:7](../../hiringloop-backend/src/modules/auth/controllers/auth-controller.js#L7), method login; declaration [hiringloop-backend/src/modules/auth/routes/auth-routes.js:78](../../hiringloop-backend/src/modules/auth/routes/auth-routes.js#L78). Exact declaration line: hiringloop-backend/src/modules/auth/routes/auth-routes.js:78.
- **Authentication:** Anonymous permitted; Google routes conditional on provider config. **Authorization:** No tenant membership required; public jobs are OPEN-only..
- **Request schema:** body: loginRequestSchema. Headers: Content-Type application/json when sending a JSON body. Path UUID/slug validation is endpoint-owned.
- **Service / DB / response:** [hiringloop-backend/src/modules/auth/controllers/auth-controller.js:7](../../hiringloop-backend/src/modules/auth/controllers/auth-controller.js#L7) defines use-case invocation, success status and envelope; linked use-case/repository/DTO sources above define reads/writes and serialized fields.
- **Failure behavior / tests / consumers:** Shared failures above plus business errors in the linked service. Related tests and frontend API sources are listed for this module; current behavior is not runtime-verified.

```js
router.post(
    '/login',
    validateRequest({ body: loginRequestSchema }),
    rateLimit(rateLimiters.loginIpRateLimiter),
    rateLimit(rateLimiters.loginIdentityRateLimiter),
    controller.login,
  )
```

### POST /api/v1/auth/password/forgot

- **Handler:** [hiringloop-backend/src/modules/auth/controllers/auth-controller.js:13](../../hiringloop-backend/src/modules/auth/controllers/auth-controller.js#L13), method forgotPassword; declaration [hiringloop-backend/src/modules/auth/routes/auth-routes.js:78](../../hiringloop-backend/src/modules/auth/routes/auth-routes.js#L78). Exact declaration line: hiringloop-backend/src/modules/auth/routes/auth-routes.js:86.
- **Authentication:** Anonymous permitted; Google routes conditional on provider config. **Authorization:** No tenant membership required; public jobs are OPEN-only..
- **Request schema:** body: forgotPasswordRequestSchema. Headers: Content-Type application/json when sending a JSON body. Path UUID/slug validation is endpoint-owned.
- **Service / DB / response:** [hiringloop-backend/src/modules/auth/controllers/auth-controller.js:13](../../hiringloop-backend/src/modules/auth/controllers/auth-controller.js#L13) defines use-case invocation, success status and envelope; linked use-case/repository/DTO sources above define reads/writes and serialized fields.
- **Failure behavior / tests / consumers:** Shared failures above plus business errors in the linked service. Related tests and frontend API sources are listed for this module; current behavior is not runtime-verified.

```js
router.post(
      '/password/forgot',
      validateRequest({ body: forgotPasswordRequestSchema }),
      rateLimit(rateLimiters.forgotPasswordRateLimiter),
      controller.forgotPassword,
    )
```

### POST /api/v1/auth/password/reset

- **Handler:** [hiringloop-backend/src/modules/auth/controllers/auth-controller.js:14](../../hiringloop-backend/src/modules/auth/controllers/auth-controller.js#L14), method resetPassword; declaration [hiringloop-backend/src/modules/auth/routes/auth-routes.js:78](../../hiringloop-backend/src/modules/auth/routes/auth-routes.js#L78). Exact declaration line: hiringloop-backend/src/modules/auth/routes/auth-routes.js:94.
- **Authentication:** Anonymous permitted; Google routes conditional on provider config. **Authorization:** No tenant membership required; public jobs are OPEN-only..
- **Request schema:** body: resetPasswordRequestSchema. Headers: Content-Type application/json when sending a JSON body. Path UUID/slug validation is endpoint-owned.
- **Service / DB / response:** [hiringloop-backend/src/modules/auth/controllers/auth-controller.js:14](../../hiringloop-backend/src/modules/auth/controllers/auth-controller.js#L14) defines use-case invocation, success status and envelope; linked use-case/repository/DTO sources above define reads/writes and serialized fields.
- **Failure behavior / tests / consumers:** Shared failures above plus business errors in the linked service. Related tests and frontend API sources are listed for this module; current behavior is not runtime-verified.

```js
router.post(
      '/password/reset',
      validateRequest({ body: resetPasswordRequestSchema }),
      rateLimit(rateLimiters.resetPasswordRateLimiter),
      controller.resetPassword,
    )
```

### GET /api/v1/auth/me

- **Handler:** [hiringloop-backend/src/modules/auth/controllers/auth-controller.js:144](../../hiringloop-backend/src/modules/auth/controllers/auth-controller.js#L144), method me; declaration [hiringloop-backend/src/modules/auth/routes/auth-routes.js:102](../../hiringloop-backend/src/modules/auth/routes/auth-routes.js#L102). Exact declaration line: hiringloop-backend/src/modules/auth/routes/auth-routes.js:102.
- **Authentication:** Live opaque-cookie session required. **Authorization:** See route context; no explicit permission constant on this declaration.
- **Request schema:** No body/query schema named; see middleware declaration below. Headers: Content-Type application/json when sending a JSON body. Path UUID/slug validation is endpoint-owned.
- **Service / DB / response:** [hiringloop-backend/src/modules/auth/controllers/auth-controller.js:144](../../hiringloop-backend/src/modules/auth/controllers/auth-controller.js#L144) defines use-case invocation, success status and envelope; linked use-case/repository/DTO sources above define reads/writes and serialized fields.
- **Failure behavior / tests / consumers:** Shared failures above plus business errors in the linked service. Related tests and frontend API sources are listed for this module; current behavior is not runtime-verified.

```js
router.get('/me', authenticateSession, controller.me)
```

### GET /api/v1/auth/csrf

- **Handler:** [hiringloop-backend/src/modules/auth/controllers/auth-controller.js:147](../../hiringloop-backend/src/modules/auth/controllers/auth-controller.js#L147), method csrf; declaration [hiringloop-backend/src/modules/auth/routes/auth-routes.js:103](../../hiringloop-backend/src/modules/auth/routes/auth-routes.js#L103). Exact declaration line: hiringloop-backend/src/modules/auth/routes/auth-routes.js:103.
- **Authentication:** Live opaque-cookie session required. **Authorization:** See route context; no explicit permission constant on this declaration.
- **Request schema:** No body/query schema named; see middleware declaration below. Headers: Content-Type application/json when sending a JSON body. Path UUID/slug validation is endpoint-owned.
- **Service / DB / response:** [hiringloop-backend/src/modules/auth/controllers/auth-controller.js:147](../../hiringloop-backend/src/modules/auth/controllers/auth-controller.js#L147) defines use-case invocation, success status and envelope; linked use-case/repository/DTO sources above define reads/writes and serialized fields.
- **Failure behavior / tests / consumers:** Shared failures above plus business errors in the linked service. Related tests and frontend API sources are listed for this module; current behavior is not runtime-verified.

```js
router.get('/csrf', authenticateSession, controller.csrf)
```

### POST /api/v1/auth/logout

- **Handler:** [hiringloop-backend/src/modules/auth/controllers/auth-controller.js:10](../../hiringloop-backend/src/modules/auth/controllers/auth-controller.js#L10), method logout; declaration [hiringloop-backend/src/modules/auth/routes/auth-routes.js:78](../../hiringloop-backend/src/modules/auth/routes/auth-routes.js#L78). Exact declaration line: hiringloop-backend/src/modules/auth/routes/auth-routes.js:105.
- **Authentication:** Live opaque-cookie session required. **Authorization:** See route context; no explicit permission constant on this declaration.
- **Request schema:** No body/query schema named; see middleware declaration below. Headers: X-CSRF-Token required; Content-Type application/json when sending a JSON body. Path UUID/slug validation is endpoint-owned.
- **Service / DB / response:** [hiringloop-backend/src/modules/auth/controllers/auth-controller.js:10](../../hiringloop-backend/src/modules/auth/controllers/auth-controller.js#L10) defines use-case invocation, success status and envelope; linked use-case/repository/DTO sources above define reads/writes and serialized fields.
- **Failure behavior / tests / consumers:** Shared failures above plus business errors in the linked service. Related tests and frontend API sources are listed for this module; current behavior is not runtime-verified.

```js
router.post(
        '/logout',
        authenticateSession,
        requireCsrf ?? ((_request, _response, next) => next()),
        controller.logout,
      )
```

### POST /api/v1/auth/sessions/revoke-all

- **Handler:** [hiringloop-backend/src/modules/auth/controllers/auth-controller.js:11](../../hiringloop-backend/src/modules/auth/controllers/auth-controller.js#L11), method revokeAllSessions; declaration [hiringloop-backend/src/modules/auth/routes/auth-routes.js:78](../../hiringloop-backend/src/modules/auth/routes/auth-routes.js#L78). Exact declaration line: hiringloop-backend/src/modules/auth/routes/auth-routes.js:113.
- **Authentication:** Live opaque-cookie session required. **Authorization:** See route context; no explicit permission constant on this declaration.
- **Request schema:** No body/query schema named; see middleware declaration below. Headers: X-CSRF-Token required; Content-Type application/json when sending a JSON body. Path UUID/slug validation is endpoint-owned.
- **Service / DB / response:** [hiringloop-backend/src/modules/auth/controllers/auth-controller.js:11](../../hiringloop-backend/src/modules/auth/controllers/auth-controller.js#L11) defines use-case invocation, success status and envelope; linked use-case/repository/DTO sources above define reads/writes and serialized fields.
- **Failure behavior / tests / consumers:** Shared failures above plus business errors in the linked service. Related tests and frontend API sources are listed for this module; current behavior is not runtime-verified.

```js
router.post(
        '/sessions/revoke-all',
        authenticateSession,
        requireCsrf ?? ((_request, _response, next) => next()),
        controller.revokeAllSessions,
      )
```

### POST /api/v1/auth/password/change

- **Handler:** [hiringloop-backend/src/modules/auth/controllers/auth-controller.js:15](../../hiringloop-backend/src/modules/auth/controllers/auth-controller.js#L15), method changePassword; declaration [hiringloop-backend/src/modules/auth/routes/auth-routes.js:78](../../hiringloop-backend/src/modules/auth/routes/auth-routes.js#L78). Exact declaration line: hiringloop-backend/src/modules/auth/routes/auth-routes.js:121.
- **Authentication:** Live opaque-cookie session required. **Authorization:** See route context; no explicit permission constant on this declaration.
- **Request schema:** body: changePasswordRequestSchema. Headers: X-CSRF-Token required; Content-Type application/json when sending a JSON body. Path UUID/slug validation is endpoint-owned.
- **Service / DB / response:** [hiringloop-backend/src/modules/auth/controllers/auth-controller.js:15](../../hiringloop-backend/src/modules/auth/controllers/auth-controller.js#L15) defines use-case invocation, success status and envelope; linked use-case/repository/DTO sources above define reads/writes and serialized fields.
- **Failure behavior / tests / consumers:** Shared failures above plus business errors in the linked service. Related tests and frontend API sources are listed for this module; current behavior is not runtime-verified.

```js
router.post(
        '/password/change',
        authenticateSession,
        requireCsrf ?? ((_request, _response, next) => next()),
        validateRequest({ body: changePasswordRequestSchema }),
        rateLimit(rateLimiters.passwordChangeRateLimiter),
        controller.changePassword,
      )
```

### POST /api/v1/auth/verification/resend

- **Handler:** [hiringloop-backend/src/modules/auth/controllers/auth-controller.js:6](../../hiringloop-backend/src/modules/auth/controllers/auth-controller.js#L6), method resendVerification; declaration [hiringloop-backend/src/modules/auth/routes/auth-routes.js:78](../../hiringloop-backend/src/modules/auth/routes/auth-routes.js#L78). Exact declaration line: hiringloop-backend/src/modules/auth/routes/auth-routes.js:131.
- **Authentication:** Anonymous permitted; Google routes conditional on provider config. **Authorization:** No tenant membership required; public jobs are OPEN-only..
- **Request schema:** body: resendVerificationRequestSchema. Headers: Content-Type application/json when sending a JSON body. Path UUID/slug validation is endpoint-owned.
- **Service / DB / response:** [hiringloop-backend/src/modules/auth/controllers/auth-controller.js:6](../../hiringloop-backend/src/modules/auth/controllers/auth-controller.js#L6) defines use-case invocation, success status and envelope; linked use-case/repository/DTO sources above define reads/writes and serialized fields.
- **Failure behavior / tests / consumers:** Shared failures above plus business errors in the linked service. Related tests and frontend API sources are listed for this module; current behavior is not runtime-verified.

```js
router.post(
    '/verification/resend',
    validateRequest({ body: resendVerificationRequestSchema }),
    rateLimit(rateLimiters.verificationResendRateLimiter),
    controller.resendVerification,
  )
```

### POST /api/v1/auth/register

- **Handler:** [hiringloop-backend/src/modules/auth/controllers/auth-controller.js:4](../../hiringloop-backend/src/modules/auth/controllers/auth-controller.js#L4), method register; declaration [hiringloop-backend/src/modules/auth/routes/auth-routes.js:78](../../hiringloop-backend/src/modules/auth/routes/auth-routes.js#L78). Exact declaration line: hiringloop-backend/src/modules/auth/routes/auth-routes.js:137.
- **Authentication:** Anonymous permitted; Google routes conditional on provider config. **Authorization:** No tenant membership required; public jobs are OPEN-only..
- **Request schema:** body: registrationRequestSchema. Headers: Content-Type application/json when sending a JSON body. Path UUID/slug validation is endpoint-owned.
- **Service / DB / response:** [hiringloop-backend/src/modules/auth/controllers/auth-controller.js:4](../../hiringloop-backend/src/modules/auth/controllers/auth-controller.js#L4) defines use-case invocation, success status and envelope; linked use-case/repository/DTO sources above define reads/writes and serialized fields.
- **Failure behavior / tests / consumers:** Shared failures above plus business errors in the linked service. Related tests and frontend API sources are listed for this module; current behavior is not runtime-verified.

```js
router.post(
    '/register',
    validateRequest({ body: registrationRequestSchema }),
    rateLimit(rateLimiters.registrationRateLimiter),
    controller.register,
  )
```

### POST /api/v1/auth/verify-email

- **Handler:** [hiringloop-backend/src/modules/auth/controllers/auth-controller.js:5](../../hiringloop-backend/src/modules/auth/controllers/auth-controller.js#L5), method verifyEmail; declaration [hiringloop-backend/src/modules/auth/routes/auth-routes.js:78](../../hiringloop-backend/src/modules/auth/routes/auth-routes.js#L78). Exact declaration line: hiringloop-backend/src/modules/auth/routes/auth-routes.js:143.
- **Authentication:** Anonymous permitted; Google routes conditional on provider config. **Authorization:** No tenant membership required; public jobs are OPEN-only..
- **Request schema:** body: verifyEmailRequestSchema. Headers: Content-Type application/json when sending a JSON body. Path UUID/slug validation is endpoint-owned.
- **Service / DB / response:** [hiringloop-backend/src/modules/auth/controllers/auth-controller.js:5](../../hiringloop-backend/src/modules/auth/controllers/auth-controller.js#L5) defines use-case invocation, success status and envelope; linked use-case/repository/DTO sources above define reads/writes and serialized fields.
- **Failure behavior / tests / consumers:** Shared failures above plus business errors in the linked service. Related tests and frontend API sources are listed for this module; current behavior is not runtime-verified.

```js
router.post(
    '/verify-email',
    validateRequest({ body: verifyEmailRequestSchema }),
    controller.verifyEmail,
  )
```

**Module business/infrastructure error vocabulary:** authTokenInvalidError, emailDeliveryFailedError, isUniqueConstraintError, conflictError, authenticationFailedError, passwordChangeRejectedError.

## candidates

**Use-case/service sources:** [hiringloop-backend/src/modules/candidates/use-cases/candidate-management-use-cases.js:1](../../hiringloop-backend/src/modules/candidates/use-cases/candidate-management-use-cases.js#L1)

**Persistence sources:** [hiringloop-backend/src/modules/candidates/repositories/candidate-management-repository.js:1](../../hiringloop-backend/src/modules/candidates/repositories/candidate-management-repository.js#L1)

**Frontend consumers:** [hiringloop-frontend/src/features/candidate-management/api/candidate-management.api.ts:1](../../hiringloop-frontend/src/features/candidate-management/api/candidate-management.api.ts#L1). This maps the owning feature; direct per-method call-site reachability is not fully verified.

**Existing related tests:** [hiringloop-backend/tests/integration/database/candidate-application-foundation.test.js:1](../../hiringloop-backend/tests/integration/database/candidate-application-foundation.test.js#L1); [hiringloop-backend/tests/modules/candidates/candidate-management-use-cases.test.js:1](../../hiringloop-backend/tests/modules/candidates/candidate-management-use-cases.test.js#L1); [hiringloop-backend/tests/modules/candidates/candidate-management-http.test.js:1](../../hiringloop-backend/tests/modules/candidates/candidate-management-http.test.js#L1); [hiringloop-frontend/src/features/candidate-management/candidate-management.test.tsx:1](../../hiringloop-frontend/src/features/candidate-management/candidate-management.test.tsx#L1); [hiringloop-frontend/src/features/candidate-management/api/candidate-management.api.test.ts:1](../../hiringloop-frontend/src/features/candidate-management/api/candidate-management.api.test.ts#L1); [hiringloop-frontend/src/features/candidate-application/utils/direct-upload.test.ts:1](../../hiringloop-frontend/src/features/candidate-application/utils/direct-upload.test.ts#L1); [hiringloop-frontend/src/features/candidate-application/utils/application-utils.test.ts:1](../../hiringloop-frontend/src/features/candidate-application/utils/application-utils.test.ts#L1); [hiringloop-frontend/src/features/candidate-application/pages/PublicApplyPage.test.tsx:1](../../hiringloop-frontend/src/features/candidate-application/pages/PublicApplyPage.test.tsx#L1). File association is verified; endpoint-specific assertion completeness and current pass status are UNKNOWN.

### GET /api/v1/organizations/:organizationId/candidates

- **Handler:** [hiringloop-backend/src/modules/candidates/controllers/candidate-management-controller.js:7](../../hiringloop-backend/src/modules/candidates/controllers/candidate-management-controller.js#L7), method list; declaration [hiringloop-backend/src/modules/candidates/routes/candidate-management-routes.js:29](../../hiringloop-backend/src/modules/candidates/routes/candidate-management-routes.js#L29). Exact declaration line: hiringloop-backend/src/modules/candidates/routes/candidate-management-routes.js:29.
- **Authentication:** Live opaque-cookie session required. **Authorization:** CANDIDATE_LIST.
- **Request schema:** params: candidateListParamsSchema; query: candidateListQuerySchema. Headers: Content-Type application/json when sending a JSON body. Path UUID/slug validation is endpoint-owned.
- **Service / DB / response:** [hiringloop-backend/src/modules/candidates/controllers/candidate-management-controller.js:7](../../hiringloop-backend/src/modules/candidates/controllers/candidate-management-controller.js#L7) defines use-case invocation, success status and envelope; linked use-case/repository/DTO sources above define reads/writes and serialized fields. DTOs: [hiringloop-backend/src/modules/candidates/domain/candidate-management-dto.js:1](../../hiringloop-backend/src/modules/candidates/domain/candidate-management-dto.js#L1).
- **Failure behavior / tests / consumers:** Shared failures above plus business errors in the linked service. Related tests and frontend API sources are listed for this module; current behavior is not runtime-verified.

```js
router.get(
    '/candidates',
    ...readContext(PERMISSIONS.CANDIDATE_LIST),
    validateRequest({
      params: candidateListParamsSchema,
      query: candidateListQuerySchema,
    }),
    controller.list,
  )
```

### GET /api/v1/organizations/:organizationId/candidates/:candidateId

- **Handler:** [hiringloop-backend/src/modules/candidates/controllers/candidate-management-controller.js:21](../../hiringloop-backend/src/modules/candidates/controllers/candidate-management-controller.js#L21), method candidateDetail; declaration [hiringloop-backend/src/modules/candidates/routes/candidate-management-routes.js:29](../../hiringloop-backend/src/modules/candidates/routes/candidate-management-routes.js#L29). Exact declaration line: hiringloop-backend/src/modules/candidates/routes/candidate-management-routes.js:38.
- **Authentication:** Live opaque-cookie session required. **Authorization:** CANDIDATE_READ.
- **Request schema:** params: candidateParamsSchema. Headers: Content-Type application/json when sending a JSON body. Path UUID/slug validation is endpoint-owned.
- **Service / DB / response:** [hiringloop-backend/src/modules/candidates/controllers/candidate-management-controller.js:21](../../hiringloop-backend/src/modules/candidates/controllers/candidate-management-controller.js#L21) defines use-case invocation, success status and envelope; linked use-case/repository/DTO sources above define reads/writes and serialized fields. DTOs: [hiringloop-backend/src/modules/candidates/domain/candidate-management-dto.js:1](../../hiringloop-backend/src/modules/candidates/domain/candidate-management-dto.js#L1).
- **Failure behavior / tests / consumers:** Shared failures above plus business errors in the linked service. Related tests and frontend API sources are listed for this module; current behavior is not runtime-verified.

```js
router.get(
    '/candidates/:candidateId',
    ...readContext(PERMISSIONS.CANDIDATE_READ),
    validateRequest({ params: candidateParamsSchema }),
    controller.candidateDetail,
  )
```

### GET /api/v1/organizations/:organizationId/applications/:applicationId

- **Handler:** [hiringloop-backend/src/modules/candidates/controllers/candidate-management-controller.js:30](../../hiringloop-backend/src/modules/candidates/controllers/candidate-management-controller.js#L30), method applicationDetail; declaration [hiringloop-backend/src/modules/candidates/routes/candidate-management-routes.js:29](../../hiringloop-backend/src/modules/candidates/routes/candidate-management-routes.js#L29). Exact declaration line: hiringloop-backend/src/modules/candidates/routes/candidate-management-routes.js:44.
- **Authentication:** Live opaque-cookie session required. **Authorization:** CANDIDATE_READ.
- **Request schema:** params: applicationParamsSchema. Headers: Content-Type application/json when sending a JSON body. Path UUID/slug validation is endpoint-owned.
- **Service / DB / response:** [hiringloop-backend/src/modules/candidates/controllers/candidate-management-controller.js:30](../../hiringloop-backend/src/modules/candidates/controllers/candidate-management-controller.js#L30) defines use-case invocation, success status and envelope; linked use-case/repository/DTO sources above define reads/writes and serialized fields. DTOs: [hiringloop-backend/src/modules/candidates/domain/candidate-management-dto.js:1](../../hiringloop-backend/src/modules/candidates/domain/candidate-management-dto.js#L1).
- **Failure behavior / tests / consumers:** Shared failures above plus business errors in the linked service. Related tests and frontend API sources are listed for this module; current behavior is not runtime-verified.

```js
router.get(
    '/applications/:applicationId',
    ...readContext(PERMISSIONS.CANDIDATE_READ),
    validateRequest({ params: applicationParamsSchema }),
    controller.applicationDetail,
  )
```

### POST /api/v1/organizations/:organizationId/candidate-documents/:documentId/access

- **Handler:** [hiringloop-backend/src/modules/candidates/controllers/candidate-management-controller.js:41](../../hiringloop-backend/src/modules/candidates/controllers/candidate-management-controller.js#L41), method accessDocument; declaration [hiringloop-backend/src/modules/candidates/routes/candidate-management-routes.js:50](../../hiringloop-backend/src/modules/candidates/routes/candidate-management-routes.js#L50). Exact declaration line: hiringloop-backend/src/modules/candidates/routes/candidate-management-routes.js:50.
- **Authentication:** Live opaque-cookie session required. **Authorization:** CANDIDATE_DOCUMENT_ACCESS.
- **Request schema:** params: documentParamsSchema. Headers: X-CSRF-Token required; Content-Type application/json when sending a JSON body. Path UUID/slug validation is endpoint-owned.
- **Service / DB / response:** [hiringloop-backend/src/modules/candidates/controllers/candidate-management-controller.js:41](../../hiringloop-backend/src/modules/candidates/controllers/candidate-management-controller.js#L41) defines use-case invocation, success status and envelope; linked use-case/repository/DTO sources above define reads/writes and serialized fields. DTOs: [hiringloop-backend/src/modules/candidates/domain/candidate-management-dto.js:1](../../hiringloop-backend/src/modules/candidates/domain/candidate-management-dto.js#L1).
- **Failure behavior / tests / consumers:** Shared failures above plus business errors in the linked service. Related tests and frontend API sources are listed for this module; current behavior is not runtime-verified.

```js
router.post(
    '/candidate-documents/:documentId/access',
    authenticateSession,
    requireCsrf,
    tenantContextMiddleware,
    requirePermission(PERMISSIONS.CANDIDATE_DOCUMENT_ACCESS),
    validateRequest({ params: documentParamsSchema }),
    controller.accessDocument,
  )
```

**Module business/infrastructure error vocabulary:** notFoundError, applicationStorageUnavailableError.

## communications

**Use-case/service sources:** [hiringloop-backend/src/modules/communications/communications-module.js:1](../../hiringloop-backend/src/modules/communications/communications-module.js#L1)

**Persistence sources:** [hiringloop-backend/src/modules/communications/repositories/communication-repository.js:1](../../hiringloop-backend/src/modules/communications/repositories/communication-repository.js#L1)

**Frontend consumers:** [hiringloop-frontend/src/features/communications/api/communications.api.ts:1](../../hiringloop-frontend/src/features/communications/api/communications.api.ts#L1). This maps the owning feature; direct per-method call-site reachability is not fully verified.

**Existing related tests:** [hiringloop-backend/tests/integration/database/phase16-http.test.js:1](../../hiringloop-backend/tests/integration/database/phase16-http.test.js#L1); [hiringloop-backend/tests/integration/database/phase16-communication-notification-integrity.test.js:1](../../hiringloop-backend/tests/integration/database/phase16-communication-notification-integrity.test.js#L1); [hiringloop-backend/tests/modules/phase16-notification-triggers.test.js:1](../../hiringloop-backend/tests/modules/phase16-notification-triggers.test.js#L1); [hiringloop-frontend/src/features/communications/communications.test.tsx:1](../../hiringloop-frontend/src/features/communications/communications.test.tsx#L1). File association is verified; endpoint-specific assertion completeness and current pass status are UNKNOWN.

### POST /api/v1/organizations/:organizationId/applications/:applicationId/communications

- **Handler:** [hiringloop-backend/src/modules/communications/communications-module.js:1](../../hiringloop-backend/src/modules/communications/communications-module.js#L1) inline handler; declaration [hiringloop-backend/src/modules/communications/communications-module.js:106](../../hiringloop-backend/src/modules/communications/communications-module.js#L106). Exact declaration line: hiringloop-backend/src/modules/communications/communications-module.js:106.
- **Authentication:** Live opaque-cookie session required. **Authorization:** COMMUNICATION_SEND.
- **Request schema:** body: sendBody. Headers: X-CSRF-Token required; Content-Type application/json when sending a JSON body. Path UUID/slug validation is endpoint-owned.
- **Service / DB / response:** Inline async handler below is the exact Prisma operation and success-response schema.
- **Failure behavior / tests / consumers:** Shared failures above plus business errors in the linked service. Related tests and frontend API sources are listed for this module; current behavior is not runtime-verified.

```js
r.post(
    '/applications/:applicationId/communications',
    ...ctx(PERMISSIONS.COMMUNICATION_SEND, true),
    communicationSendRateLimiter,
    validateRequest({ params, body: sendBody }),
    async (req, res, next) => {
      try {
        const { organizationId, applicationId } = req.validated.params;
        const { subject, body, idempotencyKey } = req.validated.body;
        const createdByUserId = req.auth.userId;
        const app = await prisma.application.findFirst({
          where: { id: applicationId, organizationId },
          include: { candidate: true },
        });
        if (!app)
          throw new ApplicationError({
            status: 404,
            code: 'APPLICATION_NOT_FOUND',
            message: 'Application not found',
          });
        const payloadHash = createHash('sha256')
          .update(`${subject}\n${body}`)
          .digest('hex');
        const existing = await prisma.communication.findFirst({
          where: {
            organizationId,
            applicationId,
            createdByUserId,
            idempotencyKey,
          },
          include: { createdBy: { select: { id: true, email: true } } },
        });
        if (existing) {
          if (existing.payloadHash !== payloadHash) throw conflict();
          return res
            .status(200)
            .json({ data: { communication: dto(existing) } });
        }
        let c;
        try {
          c = await communications.createSendRequest({
            organizationId,
            applicationId,
            createdByUserId,
            recipientEmail: app.candidate.email,
            subject,
            body,
            provider: config.email.provider,
            payloadHash,
            idempotencyKey,
            requestId: req.requestId,
          });
        } catch (error) {
          if (error?.code !== 'P2002') throw error;
          const concurrent = await prisma.communication.findFirst({
            where: {
              organizationId,
              applicationId,
              createdByUserId,
              idempotencyKey,
            },
            include: { createdBy: { select: { id: true, email: true } } },
          });
          if (!concurrent) throw error;
          if (concurrent.payloadHash !== payloadHash) throw conflict();
          return res
            .status(200)
            .json({ data: { communication: dto(concurrent) } });
        }
        const result = await delivery.dispatchPersisted({
          communicationId: c.id,
          organizationId,
          applicationId,
          createdByUserId,
        });
        if (result.kind === 'SENT') {
          return res
            .status(201)
            .json({ data: { communication: dto(result.communication) } });
        }
        if (result.kind === 'UNCONFIRMED')
          return res.status(202).json({
            data: { communication: dto(c), deliveryState: 'UNCONFIRMED' },
          });
        throw failure();
      } catch (e) {
        next(e);
      }
    },
  )
```

### GET /api/v1/organizations/:organizationId/applications/:applicationId/communications

- **Handler:** [hiringloop-backend/src/modules/communications/communications-module.js:1](../../hiringloop-backend/src/modules/communications/communications-module.js#L1) inline handler; declaration [hiringloop-backend/src/modules/communications/communications-module.js:196](../../hiringloop-backend/src/modules/communications/communications-module.js#L196). Exact declaration line: hiringloop-backend/src/modules/communications/communications-module.js:196.
- **Authentication:** Live opaque-cookie session required. **Authorization:** COMMUNICATION_VIEW.
- **Request schema:** query: page. Headers: Content-Type application/json when sending a JSON body. Path UUID/slug validation is endpoint-owned.
- **Service / DB / response:** Inline async handler below is the exact Prisma operation and success-response schema.
- **Failure behavior / tests / consumers:** Shared failures above plus business errors in the linked service. Related tests and frontend API sources are listed for this module; current behavior is not runtime-verified.

```js
r.get(
    '/applications/:applicationId/communications',
    ...ctx(PERMISSIONS.COMMUNICATION_VIEW),
    validateRequest({ params, query: page }),
    async (req, res, next) => {
      try {
        const { organizationId, applicationId } = req.validated.params;
        const application = await prisma.application.findFirst({
          where: { id: applicationId, organizationId },
          select: { id: true },
        });
        if (!application)
          throw new ApplicationError({
            status: 404,
            code: 'APPLICATION_NOT_FOUND',
            message: 'Application not found',
          });
        const rows = await prisma.communication.findMany({
          where: { organizationId, applicationId },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          skip: (req.validated.query.page - 1) * req.validated.query.pageSize,
          take: req.validated.query.pageSize,
          include: { createdBy: { select: { id: true, email: true } } },
        });
        res.json({
          data: rows.map(dto),
          pagination: {
            page: req.validated.query.page,
            pageSize: req.validated.query.pageSize,
          },
        });
      } catch (e) {
        next(e);
      }
    },
  )
```

### GET /api/v1/organizations/:organizationId/communication-templates

- **Handler:** [hiringloop-backend/src/modules/communications/communications-module.js:1](../../hiringloop-backend/src/modules/communications/communications-module.js#L1) inline handler; declaration [hiringloop-backend/src/modules/communications/communications-module.js:196](../../hiringloop-backend/src/modules/communications/communications-module.js#L196). Exact declaration line: hiringloop-backend/src/modules/communications/communications-module.js:232.
- **Authentication:** Live opaque-cookie session required. **Authorization:** COMMUNICATION_TEMPLATE_VIEW.
- **Request schema:** params: orgParams; query: page. Headers: Content-Type application/json when sending a JSON body. Path UUID/slug validation is endpoint-owned.
- **Service / DB / response:** Inline async handler below is the exact Prisma operation and success-response schema.
- **Failure behavior / tests / consumers:** Shared failures above plus business errors in the linked service. Related tests and frontend API sources are listed for this module; current behavior is not runtime-verified.

```js
r.get(
    '/communication-templates',
    ...ctx(PERMISSIONS.COMMUNICATION_TEMPLATE_VIEW),
    validateRequest({ params: orgParams, query: page }),
    async (req, res, next) => {
      try {
        const rows = await prisma.communicationTemplate.findMany({
          where: { organizationId: req.validated.params.organizationId },
          orderBy: [{ name: 'asc' }, { id: 'asc' }],
          skip: (req.validated.query.page - 1) * req.validated.query.pageSize,
          take: req.validated.query.pageSize,
        });
        res.json({
          data: rows,
          pagination: {
            page: req.validated.query.page,
            pageSize: req.validated.query.pageSize,
          },
        });
      } catch (e) {
        next(e);
      }
    },
  )
```

### POST /api/v1/organizations/:organizationId/communication-templates

- **Handler:** [hiringloop-backend/src/modules/communications/communications-module.js:1](../../hiringloop-backend/src/modules/communications/communications-module.js#L1) inline handler; declaration [hiringloop-backend/src/modules/communications/communications-module.js:106](../../hiringloop-backend/src/modules/communications/communications-module.js#L106). Exact declaration line: hiringloop-backend/src/modules/communications/communications-module.js:256.
- **Authentication:** Live opaque-cookie session required. **Authorization:** COMMUNICATION_TEMPLATE_MANAGE.
- **Request schema:** params: orgParams; body: templateBody; body: req. Headers: X-CSRF-Token required; Content-Type application/json when sending a JSON body. Path UUID/slug validation is endpoint-owned.
- **Service / DB / response:** Inline async handler below is the exact Prisma operation and success-response schema.
- **Failure behavior / tests / consumers:** Shared failures above plus business errors in the linked service. Related tests and frontend API sources are listed for this module; current behavior is not runtime-verified.

```js
r.post(
    '/communication-templates',
    ...ctx(PERMISSIONS.COMMUNICATION_TEMPLATE_MANAGE, true),
    validateRequest({ params: orgParams, body: templateBody }),
    async (req, res, next) => {
      try {
        const x = await prisma.communicationTemplate.create({
          data: {
            id: generateEntityId(),
            organizationId: req.validated.params.organizationId,
            createdByUserId: req.auth.userId,
            name: req.validated.body.name,
            subject: req.validated.body.subject,
            body: req.validated.body.body,
          },
        });
        res.status(201).json({ data: x });
      } catch (e) {
        if (e?.code === 'P2002') {
          return next(
            new ApplicationError({
              status: 409,
              code: 'COMMUNICATION_TEMPLATE_CONFLICT',
              message: 'A template with this name already exists',
            }),
          );
        }
        next(e);
      }
    },
  )
```

### PATCH /api/v1/organizations/:organizationId/communication-templates/:templateId

- **Handler:** [hiringloop-backend/src/modules/communications/communications-module.js:1](../../hiringloop-backend/src/modules/communications/communications-module.js#L1) inline handler; declaration [hiringloop-backend/src/modules/communications/communications-module.js:287](../../hiringloop-backend/src/modules/communications/communications-module.js#L287). Exact declaration line: hiringloop-backend/src/modules/communications/communications-module.js:287.
- **Authentication:** Live opaque-cookie session required. **Authorization:** COMMUNICATION_TEMPLATE_MANAGE.
- **Request schema:** params: templateParams; body: templateUpdateBody; body: b. Headers: X-CSRF-Token required; Content-Type application/json when sending a JSON body. Path UUID/slug validation is endpoint-owned.
- **Service / DB / response:** Inline async handler below is the exact Prisma operation and success-response schema.
- **Failure behavior / tests / consumers:** Shared failures above plus business errors in the linked service. Related tests and frontend API sources are listed for this module; current behavior is not runtime-verified.

```js
r.patch(
    '/communication-templates/:templateId',
    ...ctx(PERMISSIONS.COMMUNICATION_TEMPLATE_MANAGE, true),
    validateRequest({ params: templateParams, body: templateUpdateBody }),
    async (req, res, next) => {
      try {
        const b = req.validated.body;
        const q = await prisma.communicationTemplate.updateMany({
          where: {
            id: req.validated.params.templateId,
            organizationId: req.validated.params.organizationId,
            revision: b.expectedRevision,
          },
          data: {
            name: b.name,
            subject: b.subject,
            body: b.body,
            revision: { increment: 1 },
          },
        });
        if (!q.count)
          throw new ApplicationError({
            status: 409,
            code: 'COMMUNICATION_TEMPLATE_CONFLICT',
            message: 'Template was changed or not found',
          });
        res.json({
          data: await prisma.communicationTemplate.findFirst({
            where: {
              id: req.validated.params.templateId,
              organizationId: req.validated.params.organizationId,
            },
          }),
        });
      } catch (e) {
        if (
          e?.code === 'P2002' &&
          (e.meta?.target === 'CommunicationTemplate_organizationId_name_key' ||
            e.meta?.driverAdapterError?.cause?.constraint?.index ===
              'CommunicationTemplate_organizationId_name_key' ||
            (Array.isArray(e.meta?.target) &&
              e.meta.target.length === 2 &&
              e.meta.target.includes('organizationId') &&
              e.meta.target.includes('name')))
        ) {
          return next(
            new ApplicationError({
              status: 409,
              code: 'COMMUNICATION_TEMPLATE_CONFLICT',
              message: 'A template with this name already exists',
            }),
          );
        }
        next(e);
      }
    },
  )
```

### DELETE /api/v1/organizations/:organizationId/communication-templates/:templateId

- **Handler:** [hiringloop-backend/src/modules/communications/communications-module.js:1](../../hiringloop-backend/src/modules/communications/communications-module.js#L1) inline handler; declaration [hiringloop-backend/src/modules/communications/communications-module.js:344](../../hiringloop-backend/src/modules/communications/communications-module.js#L344). Exact declaration line: hiringloop-backend/src/modules/communications/communications-module.js:344.
- **Authentication:** Live opaque-cookie session required. **Authorization:** COMMUNICATION_TEMPLATE_MANAGE.
- **Request schema:** params: templateParams. Headers: X-CSRF-Token required; Content-Type application/json when sending a JSON body. Path UUID/slug validation is endpoint-owned.
- **Service / DB / response:** Inline async handler below is the exact Prisma operation and success-response schema.
- **Failure behavior / tests / consumers:** Shared failures above plus business errors in the linked service. Related tests and frontend API sources are listed for this module; current behavior is not runtime-verified.

```js
r.delete(
    '/communication-templates/:templateId',
    ...ctx(PERMISSIONS.COMMUNICATION_TEMPLATE_MANAGE, true),
    validateRequest({ params: templateParams }),
    async (req, res, next) => {
      try {
        const q = await prisma.communicationTemplate.deleteMany({
          where: {
            id: req.validated.params.templateId,
            organizationId: req.validated.params.organizationId,
          },
        });
        if (!q.count)
          throw new ApplicationError({
            status: 404,
            code: 'COMMUNICATION_TEMPLATE_NOT_FOUND',
            message: 'Template not found',
          });
        res.status(204).end();
      } catch (e) {
        next(e);
      }
    },
  )
```

**Module business/infrastructure error vocabulary:** See inline handlers and shared errors.

## interviews

**Use-case/service sources:** [hiringloop-backend/src/modules/interviews/use-cases/interview-use-cases.js:1](../../hiringloop-backend/src/modules/interviews/use-cases/interview-use-cases.js#L1)

**Persistence sources:** [hiringloop-backend/src/modules/interviews/repositories/interview-repository.js:1](../../hiringloop-backend/src/modules/interviews/repositories/interview-repository.js#L1)

**Frontend consumers:** [hiringloop-frontend/src/features/interviews/api/interviews.api.ts:1](../../hiringloop-frontend/src/features/interviews/api/interviews.api.ts#L1). This maps the owning feature; direct per-method call-site reachability is not fully verified.

**Existing related tests:** [hiringloop-backend/tests/integration/database/phase18-interview-audit.test.js:1](../../hiringloop-backend/tests/integration/database/phase18-interview-audit.test.js#L1); [hiringloop-backend/tests/integration/database/interview-scheduling-foundation.test.js:1](../../hiringloop-backend/tests/integration/database/interview-scheduling-foundation.test.js#L1); [hiringloop-backend/tests/modules/interviews/interview-use-cases.test.js:1](../../hiringloop-backend/tests/modules/interviews/interview-use-cases.test.js#L1); [hiringloop-backend/tests/modules/interviews/interview-http.test.js:1](../../hiringloop-backend/tests/modules/interviews/interview-http.test.js#L1); [hiringloop-frontend/src/features/interviews/utils/interview-utils.test.ts:1](../../hiringloop-frontend/src/features/interviews/utils/interview-utils.test.ts#L1); [hiringloop-frontend/src/features/interviews/interviews.test.tsx:1](../../hiringloop-frontend/src/features/interviews/interviews.test.tsx#L1). Phase 3B test results are recorded in document 20.

### GET /api/v1/organizations/:organizationId/interviews/participants

- **Handler:** [hiringloop-backend/src/modules/interviews/controllers/interview-controller.js:13](../../hiringloop-backend/src/modules/interviews/controllers/interview-controller.js#L13), method `listEligibleParticipants`; declaration [hiringloop-backend/src/modules/interviews/routes/interview-routes.js:38](../../hiringloop-backend/src/modules/interviews/routes/interview-routes.js#L38).
- **Authentication:** Live opaque-cookie session required. **Authorization:** `INTERVIEW_PARTICIPANT_READ` (Admin and Recruiter only); separate from `MEMBER_READ` and team membership management.
- **Request schema:** params: `interviewOrganizationParamsSchema`. No body or CSRF token.
- **Service / DB / response:** Membership query is scoped by resolved `organizationId`; response envelope is `{data:{participants:[{user:{id,email},role}]}}`.
- **Failure behavior / tests / consumers:** Shared authentication/tenant/permission failures. Recruiter allow and Interviewer denial are covered in `interview-http.test.js`; tenant filtering is covered in `interview-scheduling-foundation.test.js`. Frontend call: [hiringloop-frontend/src/features/interviews/api/interviews.api.ts:48](../../hiringloop-frontend/src/features/interviews/api/interviews.api.ts#L48).

```js
router.get(
  '/interviews/participants',
  ...context(PERMISSIONS.INTERVIEW_PARTICIPANT_READ),
  validateRequest({ params: interviewOrganizationParamsSchema }),
  controller.listEligibleParticipants,
)
```

### POST /api/v1/organizations/:organizationId/applications/:applicationId/interviews

- **Handler:** [hiringloop-backend/src/modules/interviews/controllers/interview-controller.js:13](../../hiringloop-backend/src/modules/interviews/controllers/interview-controller.js#L13), method schedule; declaration [hiringloop-backend/src/modules/interviews/routes/interview-routes.js:38](../../hiringloop-backend/src/modules/interviews/routes/interview-routes.js#L38). Exact declaration line: hiringloop-backend/src/modules/interviews/routes/interview-routes.js:38.
- **Authentication:** Live opaque-cookie session required. **Authorization:** INTERVIEW_CREATE.
- **Request schema:** params: applicationInterviewParamsSchema; body: scheduleInterviewBodySchema. Headers: X-CSRF-Token required; Content-Type application/json when sending a JSON body. Path UUID/slug validation is endpoint-owned.
- **Service / DB / response:** [hiringloop-backend/src/modules/interviews/controllers/interview-controller.js:13](../../hiringloop-backend/src/modules/interviews/controllers/interview-controller.js#L13) defines use-case invocation, success status and envelope; linked use-case/repository/DTO sources above define reads/writes and serialized fields. DTOs: [hiringloop-backend/src/modules/interviews/domain/interview-dto.js:1](../../hiringloop-backend/src/modules/interviews/domain/interview-dto.js#L1).
- **Failure behavior / tests / consumers:** Shared failures above plus business errors in the linked service. Related tests and frontend API sources are listed for this module; current behavior is not runtime-verified.

```js
router.post(
    '/applications/:applicationId/interviews',
    ...mutationContext(PERMISSIONS.INTERVIEW_CREATE),
    validateRequest({
      params: applicationInterviewParamsSchema,
      body: scheduleInterviewBodySchema,
    }),
    controller.schedule,
  )
```

### GET /api/v1/organizations/:organizationId/applications/:applicationId/interviews

- **Handler:** [hiringloop-backend/src/modules/interviews/controllers/interview-controller.js:28](../../hiringloop-backend/src/modules/interviews/controllers/interview-controller.js#L28), method listForApplication; declaration [hiringloop-backend/src/modules/interviews/routes/interview-routes.js:47](../../hiringloop-backend/src/modules/interviews/routes/interview-routes.js#L47). Exact declaration line: hiringloop-backend/src/modules/interviews/routes/interview-routes.js:47.
- **Authentication:** Live opaque-cookie session required. **Authorization:** INTERVIEW_VIEW_ASSIGNED.
- **Request schema:** params: applicationInterviewParamsSchema. Headers: Content-Type application/json when sending a JSON body. Path UUID/slug validation is endpoint-owned.
- **Service / DB / response:** [hiringloop-backend/src/modules/interviews/controllers/interview-controller.js:28](../../hiringloop-backend/src/modules/interviews/controllers/interview-controller.js#L28) defines use-case invocation, success status and envelope; linked use-case/repository/DTO sources above define reads/writes and serialized fields. DTOs: [hiringloop-backend/src/modules/interviews/domain/interview-dto.js:1](../../hiringloop-backend/src/modules/interviews/domain/interview-dto.js#L1).
- **Failure behavior / tests / consumers:** Shared failures above plus business errors in the linked service. Related tests and frontend API sources are listed for this module; current behavior is not runtime-verified.

```js
router.get(
    '/applications/:applicationId/interviews',
    ...context(PERMISSIONS.INTERVIEW_VIEW_ASSIGNED),
    validateRequest({ params: applicationInterviewParamsSchema }),
    controller.listForApplication,
  )
```

### GET /api/v1/organizations/:organizationId/interviews

- **Handler:** [hiringloop-backend/src/modules/interviews/controllers/interview-controller.js:41](../../hiringloop-backend/src/modules/interviews/controllers/interview-controller.js#L41), method listForOrganization; declaration [hiringloop-backend/src/modules/interviews/routes/interview-routes.js:47](../../hiringloop-backend/src/modules/interviews/routes/interview-routes.js#L47). Exact declaration line: hiringloop-backend/src/modules/interviews/routes/interview-routes.js:53.
- **Authentication:** Live opaque-cookie session required. **Authorization:** INTERVIEW_VIEW_ASSIGNED.
- **Request schema:** params: interviewOrganizationParamsSchema; query: listInterviewsQuerySchema. Headers: Content-Type application/json when sending a JSON body. Path UUID/slug validation is endpoint-owned.
- **Service / DB / response:** [hiringloop-backend/src/modules/interviews/controllers/interview-controller.js:41](../../hiringloop-backend/src/modules/interviews/controllers/interview-controller.js#L41) defines use-case invocation, success status and envelope; linked use-case/repository/DTO sources above define reads/writes and serialized fields. DTOs: [hiringloop-backend/src/modules/interviews/domain/interview-dto.js:1](../../hiringloop-backend/src/modules/interviews/domain/interview-dto.js#L1).
- **Failure behavior / tests / consumers:** Shared failures above plus business errors in the linked service. Related tests and frontend API sources are listed for this module; current behavior is not runtime-verified.

```js
router.get(
    '/interviews',
    ...context(PERMISSIONS.INTERVIEW_VIEW_ASSIGNED),
    validateRequest({
      params: interviewOrganizationParamsSchema,
      query: listInterviewsQuerySchema,
    }),
    controller.listForOrganization,
  )
```

### GET /api/v1/organizations/:organizationId/interviews/:interviewId

- **Handler:** [hiringloop-backend/src/modules/interviews/controllers/interview-controller.js:56](../../hiringloop-backend/src/modules/interviews/controllers/interview-controller.js#L56), method detail; declaration [hiringloop-backend/src/modules/interviews/routes/interview-routes.js:47](../../hiringloop-backend/src/modules/interviews/routes/interview-routes.js#L47). Exact declaration line: hiringloop-backend/src/modules/interviews/routes/interview-routes.js:62.
- **Authentication:** Live opaque-cookie session required. **Authorization:** INTERVIEW_VIEW_ASSIGNED.
- **Request schema:** params: interviewParamsSchema. Headers: Content-Type application/json when sending a JSON body. Path UUID/slug validation is endpoint-owned.
- **Service / DB / response:** [hiringloop-backend/src/modules/interviews/controllers/interview-controller.js:56](../../hiringloop-backend/src/modules/interviews/controllers/interview-controller.js#L56) defines use-case invocation, success status and envelope; linked use-case/repository/DTO sources above define reads/writes and serialized fields. DTOs: [hiringloop-backend/src/modules/interviews/domain/interview-dto.js:1](../../hiringloop-backend/src/modules/interviews/domain/interview-dto.js#L1).
- **Failure behavior / tests / consumers:** Shared failures above plus business errors in the linked service. Related tests and frontend API sources are listed for this module; current behavior is not runtime-verified.

```js
router.get(
    '/interviews/:interviewId',
    ...context(PERMISSIONS.INTERVIEW_VIEW_ASSIGNED),
    validateRequest({ params: interviewParamsSchema }),
    controller.detail,
  )
```

### PATCH /api/v1/organizations/:organizationId/interviews/:interviewId

- **Handler:** [hiringloop-backend/src/modules/interviews/controllers/interview-controller.js:65](../../hiringloop-backend/src/modules/interviews/controllers/interview-controller.js#L65), method update; declaration [hiringloop-backend/src/modules/interviews/routes/interview-routes.js:68](../../hiringloop-backend/src/modules/interviews/routes/interview-routes.js#L68). Exact declaration line: hiringloop-backend/src/modules/interviews/routes/interview-routes.js:68.
- **Authentication:** Live opaque-cookie session required. **Authorization:** INTERVIEW_UPDATE.
- **Request schema:** params: interviewParamsSchema; body: updateInterviewBodySchema. Headers: X-CSRF-Token required; Content-Type application/json when sending a JSON body. Path UUID/slug validation is endpoint-owned.
- **Service / DB / response:** [hiringloop-backend/src/modules/interviews/controllers/interview-controller.js:65](../../hiringloop-backend/src/modules/interviews/controllers/interview-controller.js#L65) defines use-case invocation, success status and envelope; linked use-case/repository/DTO sources above define reads/writes and serialized fields. DTOs: [hiringloop-backend/src/modules/interviews/domain/interview-dto.js:1](../../hiringloop-backend/src/modules/interviews/domain/interview-dto.js#L1).
- **Failure behavior / tests / consumers:** Shared failures above plus business errors in the linked service. Related tests and frontend API sources are listed for this module; current behavior is not runtime-verified.

```js
router.patch(
    '/interviews/:interviewId',
    ...mutationContext(PERMISSIONS.INTERVIEW_UPDATE),
    validateRequest({
      params: interviewParamsSchema,
      body: updateInterviewBodySchema,
    }),
    controller.update,
  )
```

### POST /api/v1/organizations/:organizationId/interviews/:interviewId/reschedule

- **Handler:** [hiringloop-backend/src/modules/interviews/controllers/interview-controller.js:79](../../hiringloop-backend/src/modules/interviews/controllers/interview-controller.js#L79), method reschedule; declaration [hiringloop-backend/src/modules/interviews/routes/interview-routes.js:38](../../hiringloop-backend/src/modules/interviews/routes/interview-routes.js#L38). Exact declaration line: hiringloop-backend/src/modules/interviews/routes/interview-routes.js:77.
- **Authentication:** Live opaque-cookie session required. **Authorization:** INTERVIEW_RESCHEDULE.
- **Request schema:** params: interviewParamsSchema; body: rescheduleInterviewBodySchema. Headers: X-CSRF-Token required; Content-Type application/json when sending a JSON body. Path UUID/slug validation is endpoint-owned.
- **Service / DB / response:** [hiringloop-backend/src/modules/interviews/controllers/interview-controller.js:79](../../hiringloop-backend/src/modules/interviews/controllers/interview-controller.js#L79) defines use-case invocation, success status and envelope; linked use-case/repository/DTO sources above define reads/writes and serialized fields. DTOs: [hiringloop-backend/src/modules/interviews/domain/interview-dto.js:1](../../hiringloop-backend/src/modules/interviews/domain/interview-dto.js#L1).
- **Failure behavior / tests / consumers:** Shared failures above plus business errors in the linked service. Related tests and frontend API sources are listed for this module; current behavior is not runtime-verified.

```js
router.post(
    '/interviews/:interviewId/reschedule',
    ...mutationContext(PERMISSIONS.INTERVIEW_RESCHEDULE),
    validateRequest({
      params: interviewParamsSchema,
      body: rescheduleInterviewBodySchema,
    }),
    controller.reschedule,
  )
```

### POST /api/v1/organizations/:organizationId/interviews/:interviewId/cancel

- **Handler:** [hiringloop-backend/src/modules/interviews/controllers/interview-controller.js:93](../../hiringloop-backend/src/modules/interviews/controllers/interview-controller.js#L93), method cancel; declaration [hiringloop-backend/src/modules/interviews/routes/interview-routes.js:38](../../hiringloop-backend/src/modules/interviews/routes/interview-routes.js#L38). Exact declaration line: hiringloop-backend/src/modules/interviews/routes/interview-routes.js:86.
- **Authentication:** Live opaque-cookie session required. **Authorization:** INTERVIEW_CANCEL.
- **Request schema:** params: interviewParamsSchema; body: cancelInterviewBodySchema. Headers: X-CSRF-Token required; Content-Type application/json when sending a JSON body. Path UUID/slug validation is endpoint-owned.
- **Service / DB / response:** [hiringloop-backend/src/modules/interviews/controllers/interview-controller.js:93](../../hiringloop-backend/src/modules/interviews/controllers/interview-controller.js#L93) defines use-case invocation, success status and envelope; linked use-case/repository/DTO sources above define reads/writes and serialized fields. DTOs: [hiringloop-backend/src/modules/interviews/domain/interview-dto.js:1](../../hiringloop-backend/src/modules/interviews/domain/interview-dto.js#L1).
- **Failure behavior / tests / consumers:** Shared failures above plus business errors in the linked service. Related tests and frontend API sources are listed for this module; current behavior is not runtime-verified.

```js
router.post(
    '/interviews/:interviewId/cancel',
    ...mutationContext(PERMISSIONS.INTERVIEW_CANCEL),
    validateRequest({
      params: interviewParamsSchema,
      body: cancelInterviewBodySchema,
    }),
    controller.cancel,
  )
```

**Module business/infrastructure error vocabulary:** validationError, forbiddenError, conflictError, interviewScheduleConflictError, invalidInterviewParticipantError, interviewNotFoundError, interviewCannotUpdateError, interviewCannotRescheduleError, interviewAlreadyCancelledError.

## invitations

**Use-case/service sources:** [hiringloop-backend/src/modules/invitations/use-cases/revoke-invitation.js:1](../../hiringloop-backend/src/modules/invitations/use-cases/revoke-invitation.js#L1); [hiringloop-backend/src/modules/invitations/use-cases/list-invitations.js:1](../../hiringloop-backend/src/modules/invitations/use-cases/list-invitations.js#L1); [hiringloop-backend/src/modules/invitations/use-cases/create-invitation.js:1](../../hiringloop-backend/src/modules/invitations/use-cases/create-invitation.js#L1); [hiringloop-backend/src/modules/invitations/use-cases/accept-invitation.js:1](../../hiringloop-backend/src/modules/invitations/use-cases/accept-invitation.js#L1)

**Persistence sources:** [hiringloop-backend/src/modules/invitations/repositories/invitation-repository.js:1](../../hiringloop-backend/src/modules/invitations/repositories/invitation-repository.js#L1)

**Frontend consumers:** [hiringloop-frontend/src/features/team/api/team.api.ts:1](../../hiringloop-frontend/src/features/team/api/team.api.ts#L1). This maps the owning feature; direct per-method call-site reachability is not fully verified.

**Existing related tests:** [hiringloop-backend/tests/integration/database/invitation-foundation.test.js:1](../../hiringloop-backend/tests/integration/database/invitation-foundation.test.js#L1); [hiringloop-backend/tests/modules/invitations/invitation-workflows.test.js:1](../../hiringloop-backend/tests/modules/invitations/invitation-workflows.test.js#L1); [hiringloop-backend/tests/modules/invitations/accept-invitation.test.js:1](../../hiringloop-backend/tests/modules/invitations/accept-invitation.test.js#L1). File association is verified; endpoint-specific assertion completeness and current pass status are UNKNOWN.

### POST /api/v1/organizations/:organizationId/invitations

- **Handler:** [hiringloop-backend/src/modules/invitations/controllers/invitation-controller.js:1](../../hiringloop-backend/src/modules/invitations/controllers/invitation-controller.js#L1), method create; declaration [hiringloop-backend/src/modules/invitations/routes/invitation-routes.js:29](../../hiringloop-backend/src/modules/invitations/routes/invitation-routes.js#L29). Exact declaration line: hiringloop-backend/src/modules/invitations/routes/invitation-routes.js:29.
- **Authentication:** Live opaque-cookie session required. **Authorization:** MEMBER_INVITE.
- **Request schema:** params: invitationParamsSchema; body: createInvitationRequestSchema. Headers: X-CSRF-Token required; Content-Type application/json when sending a JSON body. Path UUID/slug validation is endpoint-owned.
- **Service / DB / response:** [hiringloop-backend/src/modules/invitations/controllers/invitation-controller.js:1](../../hiringloop-backend/src/modules/invitations/controllers/invitation-controller.js#L1) defines use-case invocation, success status and envelope; linked use-case/repository/DTO sources above define reads/writes and serialized fields. DTOs: [hiringloop-backend/src/modules/invitations/domain/invitation-dto.js:1](../../hiringloop-backend/src/modules/invitations/domain/invitation-dto.js#L1).
- **Failure behavior / tests / consumers:** Shared failures above plus business errors in the linked service. Related tests and frontend API sources are listed for this module; current behavior is not runtime-verified.

```js
router.post(
    '/',
    authenticateSession,
    requireCsrf,
    tenantContextMiddleware,
    requirePermission(PERMISSIONS.MEMBER_INVITE),
    validateRequest({
      params: invitationParamsSchema,
      body: createInvitationRequestSchema,
    }),
    controller.create,
  )
```

### GET /api/v1/organizations/:organizationId/invitations

- **Handler:** [hiringloop-backend/src/modules/invitations/controllers/invitation-controller.js:3](../../hiringloop-backend/src/modules/invitations/controllers/invitation-controller.js#L3), method list; declaration [hiringloop-backend/src/modules/invitations/routes/invitation-routes.js:41](../../hiringloop-backend/src/modules/invitations/routes/invitation-routes.js#L41). Exact declaration line: hiringloop-backend/src/modules/invitations/routes/invitation-routes.js:41.
- **Authentication:** Live opaque-cookie session required. **Authorization:** INVITATION_READ.
- **Request schema:** params: invitationParamsSchema. Headers: Content-Type application/json when sending a JSON body. Path UUID/slug validation is endpoint-owned.
- **Service / DB / response:** [hiringloop-backend/src/modules/invitations/controllers/invitation-controller.js:3](../../hiringloop-backend/src/modules/invitations/controllers/invitation-controller.js#L3) defines use-case invocation, success status and envelope; linked use-case/repository/DTO sources above define reads/writes and serialized fields. DTOs: [hiringloop-backend/src/modules/invitations/domain/invitation-dto.js:1](../../hiringloop-backend/src/modules/invitations/domain/invitation-dto.js#L1).
- **Failure behavior / tests / consumers:** Shared failures above plus business errors in the linked service. Related tests and frontend API sources are listed for this module; current behavior is not runtime-verified.

```js
router.get(
    '/',
    authenticateSession,
    tenantContextMiddleware,
    requirePermission(PERMISSIONS.INVITATION_READ),
    validateRequest({ params: invitationParamsSchema }),
    controller.list,
  )
```

### DELETE /api/v1/organizations/:organizationId/invitations/:invitationId

- **Handler:** [hiringloop-backend/src/modules/invitations/controllers/invitation-controller.js:4](../../hiringloop-backend/src/modules/invitations/controllers/invitation-controller.js#L4), method revoke; declaration [hiringloop-backend/src/modules/invitations/routes/invitation-routes.js:49](../../hiringloop-backend/src/modules/invitations/routes/invitation-routes.js#L49). Exact declaration line: hiringloop-backend/src/modules/invitations/routes/invitation-routes.js:49.
- **Authentication:** Live opaque-cookie session required. **Authorization:** INVITATION_REVOKE.
- **Request schema:** params: invitationWithIdParamsSchema. Headers: X-CSRF-Token required; Content-Type application/json when sending a JSON body. Path UUID/slug validation is endpoint-owned.
- **Service / DB / response:** [hiringloop-backend/src/modules/invitations/controllers/invitation-controller.js:4](../../hiringloop-backend/src/modules/invitations/controllers/invitation-controller.js#L4) defines use-case invocation, success status and envelope; linked use-case/repository/DTO sources above define reads/writes and serialized fields. DTOs: [hiringloop-backend/src/modules/invitations/domain/invitation-dto.js:1](../../hiringloop-backend/src/modules/invitations/domain/invitation-dto.js#L1).
- **Failure behavior / tests / consumers:** Shared failures above plus business errors in the linked service. Related tests and frontend API sources are listed for this module; current behavior is not runtime-verified.

```js
router.delete(
    '/:invitationId',
    authenticateSession,
    requireCsrf,
    tenantContextMiddleware,
    requirePermission(PERMISSIONS.INVITATION_REVOKE),
    validateRequest({ params: invitationWithIdParamsSchema }),
    controller.revoke,
  )
```

### POST /api/v1/invitations/accept

- **Handler:** [hiringloop-backend/src/modules/invitations/controllers/invitation-controller.js:5](../../hiringloop-backend/src/modules/invitations/controllers/invitation-controller.js#L5), method accept; declaration [hiringloop-backend/src/modules/invitations/routes/invitation-routes.js:29](../../hiringloop-backend/src/modules/invitations/routes/invitation-routes.js#L29). Exact declaration line: hiringloop-backend/src/modules/invitations/routes/invitation-routes.js:70.
- **Authentication:** Live opaque-cookie session required. **Authorization:** Authenticated verified email must match invitation.
- **Request schema:** body: acceptInvitationRequestSchema. Headers: X-CSRF-Token required; Content-Type application/json when sending a JSON body. Path UUID/slug validation is endpoint-owned.
- **Service / DB / response:** [hiringloop-backend/src/modules/invitations/controllers/invitation-controller.js:5](../../hiringloop-backend/src/modules/invitations/controllers/invitation-controller.js#L5) defines use-case invocation, success status and envelope; linked use-case/repository/DTO sources above define reads/writes and serialized fields. DTOs: [hiringloop-backend/src/modules/invitations/domain/invitation-dto.js:1](../../hiringloop-backend/src/modules/invitations/domain/invitation-dto.js#L1).
- **Failure behavior / tests / consumers:** Shared failures above plus business errors in the linked service. Related tests and frontend API sources are listed for this module; current behavior is not runtime-verified.

```js
router.post(
    '/accept',
    authenticateSession,
    requireCsrf,
    validateRequest({ body: acceptInvitationRequestSchema }),
    controller.accept,
  )
```

**Module business/infrastructure error vocabulary:** notFoundError, conflictError, emailDeliveryFailedError, unauthenticatedError, forbiddenError.

## jobs

**Use-case/service sources:** [hiringloop-backend/src/modules/jobs/use-cases/job-use-cases.js:1](../../hiringloop-backend/src/modules/jobs/use-cases/job-use-cases.js#L1)

**Persistence sources:** [hiringloop-backend/src/modules/jobs/repositories/job-repository.js:1](../../hiringloop-backend/src/modules/jobs/repositories/job-repository.js#L1)

**Frontend consumers:** [hiringloop-frontend/src/features/jobs/api/jobs.api.ts:1](../../hiringloop-frontend/src/features/jobs/api/jobs.api.ts#L1). This maps the owning feature; direct per-method call-site reachability is not fully verified.

**Existing related tests:** [hiringloop-backend/tests/integration/database/job-management.test.js:1](../../hiringloop-backend/tests/integration/database/job-management.test.js#L1); [hiringloop-backend/tests/integration/database/job-foundation.test.js:1](../../hiringloop-backend/tests/integration/database/job-foundation.test.js#L1); [hiringloop-backend/tests/modules/jobs/job-workflows.test.js:1](../../hiringloop-backend/tests/modules/jobs/job-workflows.test.js#L1); [hiringloop-frontend/src/app/router/job-routes.test.tsx:1](../../hiringloop-frontend/src/app/router/job-routes.test.tsx#L1); [hiringloop-frontend/src/features/jobs/jobs.test.ts:1](../../hiringloop-frontend/src/features/jobs/jobs.test.ts#L1); [hiringloop-frontend/src/features/jobs/job-permissions.test.tsx:1](../../hiringloop-frontend/src/features/jobs/job-permissions.test.tsx#L1); [hiringloop-frontend/src/features/jobs/pages/CreateJobPage.test.tsx:1](../../hiringloop-frontend/src/features/jobs/pages/CreateJobPage.test.tsx#L1); [hiringloop-frontend/src/features/jobs/pages/JobDetailPage.test.tsx:1](../../hiringloop-frontend/src/features/jobs/pages/JobDetailPage.test.tsx#L1). File association is verified; endpoint-specific assertion completeness and current pass status are UNKNOWN.

### POST /api/v1/organizations/:organizationId/jobs

- **Handler:** [hiringloop-backend/src/modules/jobs/controllers/job-controller.js:1](../../hiringloop-backend/src/modules/jobs/controllers/job-controller.js#L1), method create; declaration [hiringloop-backend/src/modules/jobs/routes/job-routes.js:43](../../hiringloop-backend/src/modules/jobs/routes/job-routes.js#L43). Exact declaration line: hiringloop-backend/src/modules/jobs/routes/job-routes.js:43.
- **Authentication:** Live opaque-cookie session required. **Authorization:** JOB_CREATE.
- **Request schema:** params: jobOrganizationParamsSchema; body: createJobBodySchema. Headers: X-CSRF-Token required; Content-Type application/json when sending a JSON body. Path UUID/slug validation is endpoint-owned.
- **Service / DB / response:** [hiringloop-backend/src/modules/jobs/controllers/job-controller.js:1](../../hiringloop-backend/src/modules/jobs/controllers/job-controller.js#L1) defines use-case invocation, success status and envelope; linked use-case/repository/DTO sources above define reads/writes and serialized fields. DTOs: [hiringloop-backend/src/modules/jobs/domain/job-dto.js:1](../../hiringloop-backend/src/modules/jobs/domain/job-dto.js#L1).
- **Failure behavior / tests / consumers:** Shared failures above plus business errors in the linked service. Related tests and frontend API sources are listed for this module; current behavior is not runtime-verified.

```js
router.post(
    '/',
    ...mutationContext(PERMISSIONS.JOB_CREATE),
    validateRequest({
      params: jobOrganizationParamsSchema,
      body: createJobBodySchema,
    }),
    controller.create,
  )
```

### GET /api/v1/organizations/:organizationId/jobs

- **Handler:** [hiringloop-backend/src/modules/jobs/controllers/job-controller.js:26](../../hiringloop-backend/src/modules/jobs/controllers/job-controller.js#L26), method list; declaration [hiringloop-backend/src/modules/jobs/routes/job-routes.js:52](../../hiringloop-backend/src/modules/jobs/routes/job-routes.js#L52). Exact declaration line: hiringloop-backend/src/modules/jobs/routes/job-routes.js:52.
- **Authentication:** Live opaque-cookie session required. **Authorization:** JOB_LIST.
- **Request schema:** params: jobOrganizationParamsSchema; query: listJobsQuerySchema. Headers: Content-Type application/json when sending a JSON body. Path UUID/slug validation is endpoint-owned.
- **Service / DB / response:** [hiringloop-backend/src/modules/jobs/controllers/job-controller.js:26](../../hiringloop-backend/src/modules/jobs/controllers/job-controller.js#L26) defines use-case invocation, success status and envelope; linked use-case/repository/DTO sources above define reads/writes and serialized fields. DTOs: [hiringloop-backend/src/modules/jobs/domain/job-dto.js:1](../../hiringloop-backend/src/modules/jobs/domain/job-dto.js#L1).
- **Failure behavior / tests / consumers:** Shared failures above plus business errors in the linked service. Related tests and frontend API sources are listed for this module; current behavior is not runtime-verified.

```js
router.get(
    '/',
    ...context(PERMISSIONS.JOB_LIST),
    validateRequest({
      params: jobOrganizationParamsSchema,
      query: listJobsQuerySchema,
    }),
    controller.list,
  )
```

### GET /api/v1/organizations/:organizationId/jobs/:jobId

- **Handler:** [hiringloop-backend/src/modules/jobs/controllers/job-controller.js:40](../../hiringloop-backend/src/modules/jobs/controllers/job-controller.js#L40), method detail; declaration [hiringloop-backend/src/modules/jobs/routes/job-routes.js:52](../../hiringloop-backend/src/modules/jobs/routes/job-routes.js#L52). Exact declaration line: hiringloop-backend/src/modules/jobs/routes/job-routes.js:61.
- **Authentication:** Live opaque-cookie session required. **Authorization:** JOB_READ.
- **Request schema:** params: jobParamsSchema. Headers: Content-Type application/json when sending a JSON body. Path UUID/slug validation is endpoint-owned.
- **Service / DB / response:** [hiringloop-backend/src/modules/jobs/controllers/job-controller.js:40](../../hiringloop-backend/src/modules/jobs/controllers/job-controller.js#L40) defines use-case invocation, success status and envelope; linked use-case/repository/DTO sources above define reads/writes and serialized fields. DTOs: [hiringloop-backend/src/modules/jobs/domain/job-dto.js:1](../../hiringloop-backend/src/modules/jobs/domain/job-dto.js#L1).
- **Failure behavior / tests / consumers:** Shared failures above plus business errors in the linked service. Related tests and frontend API sources are listed for this module; current behavior is not runtime-verified.

```js
router.get(
    '/:jobId',
    ...context(PERMISSIONS.JOB_READ),
    validateRequest({ params: jobParamsSchema }),
    controller.detail,
  )
```

### PATCH /api/v1/organizations/:organizationId/jobs/:jobId

- **Handler:** [hiringloop-backend/src/modules/jobs/controllers/job-controller.js:49](../../hiringloop-backend/src/modules/jobs/controllers/job-controller.js#L49), method update; declaration [hiringloop-backend/src/modules/jobs/routes/job-routes.js:67](../../hiringloop-backend/src/modules/jobs/routes/job-routes.js#L67). Exact declaration line: hiringloop-backend/src/modules/jobs/routes/job-routes.js:67.
- **Authentication:** Live opaque-cookie session required. **Authorization:** JOB_UPDATE.
- **Request schema:** params: jobParamsSchema; body: updateJobBodySchema. Headers: X-CSRF-Token required; Content-Type application/json when sending a JSON body. Path UUID/slug validation is endpoint-owned.
- **Service / DB / response:** [hiringloop-backend/src/modules/jobs/controllers/job-controller.js:49](../../hiringloop-backend/src/modules/jobs/controllers/job-controller.js#L49) defines use-case invocation, success status and envelope; linked use-case/repository/DTO sources above define reads/writes and serialized fields. DTOs: [hiringloop-backend/src/modules/jobs/domain/job-dto.js:1](../../hiringloop-backend/src/modules/jobs/domain/job-dto.js#L1).
- **Failure behavior / tests / consumers:** Shared failures above plus business errors in the linked service. Related tests and frontend API sources are listed for this module; current behavior is not runtime-verified.

```js
router.patch(
    '/:jobId',
    ...mutationContext(PERMISSIONS.JOB_UPDATE),
    validateRequest({ params: jobParamsSchema, body: updateJobBodySchema }),
    controller.update,
  )
```

### POST /api/v1/organizations/:organizationId/jobs/:jobId/open

- **Handler:** [hiringloop-backend/src/modules/jobs/controllers/job-controller.js:62](../../hiringloop-backend/src/modules/jobs/controllers/job-controller.js#L62), method open; declaration [hiringloop-backend/src/modules/jobs/routes/job-routes.js:43](../../hiringloop-backend/src/modules/jobs/routes/job-routes.js#L43). Exact declaration line: hiringloop-backend/src/modules/jobs/routes/job-routes.js:79.
- **Authentication:** Live opaque-cookie session required. **Authorization:** JOB_OPEN.
- **Request schema:** params: jobParamsSchema; body: jobMutationBodySchema. Headers: X-CSRF-Token required; Content-Type application/json when sending a JSON body. Path UUID/slug validation is endpoint-owned.
- **Service / DB / response:** [hiringloop-backend/src/modules/jobs/controllers/job-controller.js:62](../../hiringloop-backend/src/modules/jobs/controllers/job-controller.js#L62) defines use-case invocation, success status and envelope; linked use-case/repository/DTO sources above define reads/writes and serialized fields. DTOs: [hiringloop-backend/src/modules/jobs/domain/job-dto.js:1](../../hiringloop-backend/src/modules/jobs/domain/job-dto.js#L1).
- **Failure behavior / tests / consumers:** Shared failures above plus business errors in the linked service. Related tests and frontend API sources are listed for this module; current behavior is not runtime-verified.

```js
router.post(
      `/:jobId/${operation}`,
      ...mutationContext(permission),
      validateRequest({
        params: jobParamsSchema,
        body: jobMutationBodySchema,
      }),
      controller[operation],
    )
```

### POST /api/v1/organizations/:organizationId/jobs/:jobId/close

- **Handler:** [hiringloop-backend/src/modules/jobs/controllers/job-controller.js:63](../../hiringloop-backend/src/modules/jobs/controllers/job-controller.js#L63), method close; declaration [hiringloop-backend/src/modules/jobs/routes/job-routes.js:43](../../hiringloop-backend/src/modules/jobs/routes/job-routes.js#L43). Exact declaration line: hiringloop-backend/src/modules/jobs/routes/job-routes.js:79.
- **Authentication:** Live opaque-cookie session required. **Authorization:** JOB_CLOSE.
- **Request schema:** params: jobParamsSchema; body: jobMutationBodySchema. Headers: X-CSRF-Token required; Content-Type application/json when sending a JSON body. Path UUID/slug validation is endpoint-owned.
- **Service / DB / response:** [hiringloop-backend/src/modules/jobs/controllers/job-controller.js:63](../../hiringloop-backend/src/modules/jobs/controllers/job-controller.js#L63) defines use-case invocation, success status and envelope; linked use-case/repository/DTO sources above define reads/writes and serialized fields. DTOs: [hiringloop-backend/src/modules/jobs/domain/job-dto.js:1](../../hiringloop-backend/src/modules/jobs/domain/job-dto.js#L1).
- **Failure behavior / tests / consumers:** Shared failures above plus business errors in the linked service. Related tests and frontend API sources are listed for this module; current behavior is not runtime-verified.

```js
router.post(
      `/:jobId/${operation}`,
      ...mutationContext(permission),
      validateRequest({
        params: jobParamsSchema,
        body: jobMutationBodySchema,
      }),
      controller[operation],
    )
```

### POST /api/v1/organizations/:organizationId/jobs/:jobId/reopen

- **Handler:** [hiringloop-backend/src/modules/jobs/controllers/job-controller.js:64](../../hiringloop-backend/src/modules/jobs/controllers/job-controller.js#L64), method reopen; declaration [hiringloop-backend/src/modules/jobs/routes/job-routes.js:43](../../hiringloop-backend/src/modules/jobs/routes/job-routes.js#L43). Exact declaration line: hiringloop-backend/src/modules/jobs/routes/job-routes.js:79.
- **Authentication:** Live opaque-cookie session required. **Authorization:** JOB_REOPEN.
- **Request schema:** params: jobParamsSchema; body: jobMutationBodySchema. Headers: X-CSRF-Token required; Content-Type application/json when sending a JSON body. Path UUID/slug validation is endpoint-owned.
- **Service / DB / response:** [hiringloop-backend/src/modules/jobs/controllers/job-controller.js:64](../../hiringloop-backend/src/modules/jobs/controllers/job-controller.js#L64) defines use-case invocation, success status and envelope; linked use-case/repository/DTO sources above define reads/writes and serialized fields. DTOs: [hiringloop-backend/src/modules/jobs/domain/job-dto.js:1](../../hiringloop-backend/src/modules/jobs/domain/job-dto.js#L1).
- **Failure behavior / tests / consumers:** Shared failures above plus business errors in the linked service. Related tests and frontend API sources are listed for this module; current behavior is not runtime-verified.

```js
router.post(
      `/:jobId/${operation}`,
      ...mutationContext(permission),
      validateRequest({
        params: jobParamsSchema,
        body: jobMutationBodySchema,
      }),
      controller[operation],
    )
```

### POST /api/v1/organizations/:organizationId/jobs/:jobId/archive

- **Handler:** [hiringloop-backend/src/modules/jobs/controllers/job-controller.js:65](../../hiringloop-backend/src/modules/jobs/controllers/job-controller.js#L65), method archive; declaration [hiringloop-backend/src/modules/jobs/routes/job-routes.js:43](../../hiringloop-backend/src/modules/jobs/routes/job-routes.js#L43). Exact declaration line: hiringloop-backend/src/modules/jobs/routes/job-routes.js:79.
- **Authentication:** Live opaque-cookie session required. **Authorization:** JOB_ARCHIVE.
- **Request schema:** params: jobParamsSchema; body: jobMutationBodySchema. Headers: X-CSRF-Token required; Content-Type application/json when sending a JSON body. Path UUID/slug validation is endpoint-owned.
- **Service / DB / response:** [hiringloop-backend/src/modules/jobs/controllers/job-controller.js:65](../../hiringloop-backend/src/modules/jobs/controllers/job-controller.js#L65) defines use-case invocation, success status and envelope; linked use-case/repository/DTO sources above define reads/writes and serialized fields. DTOs: [hiringloop-backend/src/modules/jobs/domain/job-dto.js:1](../../hiringloop-backend/src/modules/jobs/domain/job-dto.js#L1).
- **Failure behavior / tests / consumers:** Shared failures above plus business errors in the linked service. Related tests and frontend API sources are listed for this module; current behavior is not runtime-verified.

```js
router.post(
      `/:jobId/${operation}`,
      ...mutationContext(permission),
      validateRequest({
        params: jobParamsSchema,
        body: jobMutationBodySchema,
      }),
      controller[operation],
    )
```

**Module business/infrastructure error vocabulary:** jobNotFoundError, jobVersionConflictError, jobNotReadyToOpenError, jobInvalidTransitionError, jobArchivedError.

## members

**Use-case/service sources:** [hiringloop-backend/src/modules/members/use-cases/update-member-role.js:1](../../hiringloop-backend/src/modules/members/use-cases/update-member-role.js#L1); [hiringloop-backend/src/modules/members/use-cases/remove-member.js:1](../../hiringloop-backend/src/modules/members/use-cases/remove-member.js#L1); [hiringloop-backend/src/modules/members/use-cases/list-members.js:1](../../hiringloop-backend/src/modules/members/use-cases/list-members.js#L1)

**Persistence sources:** [hiringloop-backend/src/modules/members/repositories/member-repository.js:1](../../hiringloop-backend/src/modules/members/repositories/member-repository.js#L1)

**Frontend consumers:** [hiringloop-frontend/src/features/team/api/team.api.ts:1](../../hiringloop-frontend/src/features/team/api/team.api.ts#L1). This maps the owning feature; direct per-method call-site reachability is not fully verified.

**Existing related tests:** [hiringloop-backend/tests/integration/database/member-management.test.js:1](../../hiringloop-backend/tests/integration/database/member-management.test.js#L1); [hiringloop-backend/tests/modules/members/member-workflows.test.js:1](../../hiringloop-backend/tests/modules/members/member-workflows.test.js#L1). File association is verified; endpoint-specific assertion completeness and current pass status are UNKNOWN.

### GET /api/v1/organizations/:organizationId/members

- **Handler:** [hiringloop-backend/src/modules/members/controllers/member-controller.js:2](../../hiringloop-backend/src/modules/members/controllers/member-controller.js#L2), method list; declaration [hiringloop-backend/src/modules/members/routes/member-routes.js:28](../../hiringloop-backend/src/modules/members/routes/member-routes.js#L28). Exact declaration line: hiringloop-backend/src/modules/members/routes/member-routes.js:28.
- **Authentication:** Live opaque-cookie session required. **Authorization:** MEMBER_READ.
- **Request schema:** params: memberParamsSchema. Headers: Content-Type application/json when sending a JSON body. Path UUID/slug validation is endpoint-owned.
- **Service / DB / response:** [hiringloop-backend/src/modules/members/controllers/member-controller.js:2](../../hiringloop-backend/src/modules/members/controllers/member-controller.js#L2) defines use-case invocation, success status and envelope; linked use-case/repository/DTO sources above define reads/writes and serialized fields. DTOs: [hiringloop-backend/src/modules/members/domain/member-dto.js:1](../../hiringloop-backend/src/modules/members/domain/member-dto.js#L1).
- **Failure behavior / tests / consumers:** Shared failures above plus business errors in the linked service. Related tests and frontend API sources are listed for this module; current behavior is not runtime-verified.

```js
router.get(
    '/',
    authenticateSession,
    tenantContextMiddleware,
    requirePermission(PERMISSIONS.MEMBER_READ),
    validateRequest({ params: memberParamsSchema }),
    controller.list,
  )
```

### PATCH /api/v1/organizations/:organizationId/members/:membershipId/role

- **Handler:** [hiringloop-backend/src/modules/members/controllers/member-controller.js:17](../../hiringloop-backend/src/modules/members/controllers/member-controller.js#L17), method updateRole; declaration [hiringloop-backend/src/modules/members/routes/member-routes.js:36](../../hiringloop-backend/src/modules/members/routes/member-routes.js#L36). Exact declaration line: hiringloop-backend/src/modules/members/routes/member-routes.js:36.
- **Authentication:** Live opaque-cookie session required. **Authorization:** MEMBER_ROLE_CHANGE.
- **Request schema:** params: memberWithIdParamsSchema; body: updateMemberRoleRequestSchema. Headers: X-CSRF-Token required; Content-Type application/json when sending a JSON body. Path UUID/slug validation is endpoint-owned.
- **Service / DB / response:** [hiringloop-backend/src/modules/members/controllers/member-controller.js:17](../../hiringloop-backend/src/modules/members/controllers/member-controller.js#L17) defines use-case invocation, success status and envelope; linked use-case/repository/DTO sources above define reads/writes and serialized fields. DTOs: [hiringloop-backend/src/modules/members/domain/member-dto.js:1](../../hiringloop-backend/src/modules/members/domain/member-dto.js#L1).
- **Failure behavior / tests / consumers:** Shared failures above plus business errors in the linked service. Related tests and frontend API sources are listed for this module; current behavior is not runtime-verified.

```js
router.patch(
    '/:membershipId/role',
    authenticateSession,
    requireCsrf,
    tenantContextMiddleware,
    requirePermission(PERMISSIONS.MEMBER_ROLE_CHANGE),
    validateRequest({
      params: memberWithIdParamsSchema,
      body: updateMemberRoleRequestSchema,
    }),
    controller.updateRole,
  )
```

### DELETE /api/v1/organizations/:organizationId/members/:membershipId

- **Handler:** [hiringloop-backend/src/modules/members/controllers/member-controller.js:4](../../hiringloop-backend/src/modules/members/controllers/member-controller.js#L4), method remove; declaration [hiringloop-backend/src/modules/members/routes/member-routes.js:48](../../hiringloop-backend/src/modules/members/routes/member-routes.js#L48). Exact declaration line: hiringloop-backend/src/modules/members/routes/member-routes.js:48.
- **Authentication:** Live opaque-cookie session required. **Authorization:** MEMBER_REMOVE.
- **Request schema:** params: memberWithIdParamsSchema. Headers: X-CSRF-Token required; Content-Type application/json when sending a JSON body. Path UUID/slug validation is endpoint-owned.
- **Service / DB / response:** [hiringloop-backend/src/modules/members/controllers/member-controller.js:4](../../hiringloop-backend/src/modules/members/controllers/member-controller.js#L4) defines use-case invocation, success status and envelope; linked use-case/repository/DTO sources above define reads/writes and serialized fields. DTOs: [hiringloop-backend/src/modules/members/domain/member-dto.js:1](../../hiringloop-backend/src/modules/members/domain/member-dto.js#L1).
- **Failure behavior / tests / consumers:** Shared failures above plus business errors in the linked service. Related tests and frontend API sources are listed for this module; current behavior is not runtime-verified.

```js
router.delete(
    '/:membershipId',
    authenticateSession,
    requireCsrf,
    tenantContextMiddleware,
    requirePermission(PERMISSIONS.MEMBER_REMOVE),
    validateRequest({ params: memberWithIdParamsSchema }),
    controller.remove,
  )
```

**Module business/infrastructure error vocabulary:** notFoundError, conflictError.

## notifications

**Use-case/service sources:** [hiringloop-backend/src/modules/notifications/notifications-module.js:1](../../hiringloop-backend/src/modules/notifications/notifications-module.js#L1)

**Persistence sources:** [hiringloop-backend/src/modules/notifications/notifications-module.js:1](../../hiringloop-backend/src/modules/notifications/notifications-module.js#L1)

**Frontend consumers:** [hiringloop-frontend/src/features/notifications/api/notifications.api.ts:1](../../hiringloop-frontend/src/features/notifications/api/notifications.api.ts#L1). This maps the owning feature; direct per-method call-site reachability is not fully verified.

**Existing related tests:** [hiringloop-backend/tests/integration/database/phase16-http.test.js:1](../../hiringloop-backend/tests/integration/database/phase16-http.test.js#L1); [hiringloop-backend/tests/integration/database/phase16-communication-notification-integrity.test.js:1](../../hiringloop-backend/tests/integration/database/phase16-communication-notification-integrity.test.js#L1); [hiringloop-backend/tests/modules/phase16-notification-triggers.test.js:1](../../hiringloop-backend/tests/modules/phase16-notification-triggers.test.js#L1); [hiringloop-frontend/src/features/notifications/notifications.test.tsx:1](../../hiringloop-frontend/src/features/notifications/notifications.test.tsx#L1). File association is verified; endpoint-specific assertion completeness and current pass status are UNKNOWN.

### GET /api/v1/organizations/:organizationId/notifications

- **Handler:** [hiringloop-backend/src/modules/notifications/notifications-module.js:1](../../hiringloop-backend/src/modules/notifications/notifications-module.js#L1) inline handler; declaration [hiringloop-backend/src/modules/notifications/notifications-module.js:57](../../hiringloop-backend/src/modules/notifications/notifications-module.js#L57). Exact declaration line: hiringloop-backend/src/modules/notifications/notifications-module.js:57.
- **Authentication:** Live opaque-cookie session required. **Authorization:** NOTIFICATION_VIEW_OWN.
- **Request schema:** params: org; query: pagination. Headers: Content-Type application/json when sending a JSON body. Path UUID/slug validation is endpoint-owned.
- **Service / DB / response:** Inline async handler below is the exact Prisma operation and success-response schema.
- **Failure behavior / tests / consumers:** Shared failures above plus business errors in the linked service. Related tests and frontend API sources are listed for this module; current behavior is not runtime-verified.

```js
r.get(
    '/notifications',
    ...ctx(PERMISSIONS.NOTIFICATION_VIEW_OWN),
    validateRequest({ params: org, query: pagination }),
    async (q, s, n) => {
      try {
        s.json({
          data: (
            await prisma.notification.findMany({
              where: {
                organizationId: q.validated.params.organizationId,
                recipientUserId: q.auth.userId,
              },
              orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
              skip: (q.validated.query.page - 1) * q.validated.query.pageSize,
              take: q.validated.query.pageSize,
            })
          ).map(notificationDto),
          pagination: {
            page: q.validated.query.page,
            pageSize: q.validated.query.pageSize,
          },
        });
      } catch (e) {
        n(e);
      }
    },
  )
```

### GET /api/v1/organizations/:organizationId/notifications/unread-count

- **Handler:** [hiringloop-backend/src/modules/notifications/notifications-module.js:1](../../hiringloop-backend/src/modules/notifications/notifications-module.js#L1) inline handler; declaration [hiringloop-backend/src/modules/notifications/notifications-module.js:57](../../hiringloop-backend/src/modules/notifications/notifications-module.js#L57). Exact declaration line: hiringloop-backend/src/modules/notifications/notifications-module.js:85.
- **Authentication:** Live opaque-cookie session required. **Authorization:** NOTIFICATION_VIEW_OWN.
- **Request schema:** params: org. Headers: Content-Type application/json when sending a JSON body. Path UUID/slug validation is endpoint-owned.
- **Service / DB / response:** Inline async handler below is the exact Prisma operation and success-response schema.
- **Failure behavior / tests / consumers:** Shared failures above plus business errors in the linked service. Related tests and frontend API sources are listed for this module; current behavior is not runtime-verified.

```js
r.get(
    '/notifications/unread-count',
    ...ctx(PERMISSIONS.NOTIFICATION_VIEW_OWN),
    validateRequest({ params: org }),
    async (q, s, n) => {
      try {
        s.json({
          count: await prisma.notification.count({
            where: {
              organizationId: q.validated.params.organizationId,
              recipientUserId: q.auth.userId,
              readAt: null,
            },
          }),
        });
      } catch (e) {
        n(e);
      }
    },
  )
```

### PATCH /api/v1/organizations/:organizationId/notifications/:notificationId/read

- **Handler:** [hiringloop-backend/src/modules/notifications/notifications-module.js:1](../../hiringloop-backend/src/modules/notifications/notifications-module.js#L1) inline handler; declaration [hiringloop-backend/src/modules/notifications/notifications-module.js:105](../../hiringloop-backend/src/modules/notifications/notifications-module.js#L105). Exact declaration line: hiringloop-backend/src/modules/notifications/notifications-module.js:105.
- **Authentication:** Live opaque-cookie session required. **Authorization:** NOTIFICATION_READ_OWN.
- **Request schema:** params: item. Headers: X-CSRF-Token required; Content-Type application/json when sending a JSON body. Path UUID/slug validation is endpoint-owned.
- **Service / DB / response:** Inline async handler below is the exact Prisma operation and success-response schema.
- **Failure behavior / tests / consumers:** Shared failures above plus business errors in the linked service. Related tests and frontend API sources are listed for this module; current behavior is not runtime-verified.

```js
r.patch(
    '/notifications/:notificationId/read',
    ...ctx(PERMISSIONS.NOTIFICATION_READ_OWN, true),
    validateRequest({ params: item }),
    async (q, s, n) => {
      try {
        await prisma.notification.updateMany({
          where: {
            id: q.validated.params.notificationId,
            organizationId: q.validated.params.organizationId,
            recipientUserId: q.auth.userId,
            readAt: null,
          },
          data: { readAt: new Date() },
        });
        const x = await prisma.notification.findFirst({
          where: {
            id: q.validated.params.notificationId,
            organizationId: q.validated.params.organizationId,
            recipientUserId: q.auth.userId,
          },
        });
        if (!x) throw notFoundError('Notification not found');
        s.json({ data: notificationDto(x) });
      } catch (e) {
        n(e);
      }
    },
  )
```

### POST /api/v1/organizations/:organizationId/notifications/read-all

- **Handler:** [hiringloop-backend/src/modules/notifications/notifications-module.js:1](../../hiringloop-backend/src/modules/notifications/notifications-module.js#L1) inline handler; declaration [hiringloop-backend/src/modules/notifications/notifications-module.js:134](../../hiringloop-backend/src/modules/notifications/notifications-module.js#L134). Exact declaration line: hiringloop-backend/src/modules/notifications/notifications-module.js:134.
- **Authentication:** Live opaque-cookie session required. **Authorization:** NOTIFICATION_READ_OWN.
- **Request schema:** params: org. Headers: X-CSRF-Token required; Content-Type application/json when sending a JSON body. Path UUID/slug validation is endpoint-owned.
- **Service / DB / response:** Inline async handler below is the exact Prisma operation and success-response schema.
- **Failure behavior / tests / consumers:** Shared failures above plus business errors in the linked service. Related tests and frontend API sources are listed for this module; current behavior is not runtime-verified.

```js
r.post(
    '/notifications/read-all',
    ...ctx(PERMISSIONS.NOTIFICATION_READ_OWN, true),
    validateRequest({ params: org }),
    async (q, s, n) => {
      try {
        const x = await prisma.notification.updateMany({
          where: {
            organizationId: q.validated.params.organizationId,
            recipientUserId: q.auth.userId,
            readAt: null,
          },
          data: { readAt: new Date() },
        });
        s.json({ updatedCount: x.count });
      } catch (e) {
        n(e);
      }
    },
  )
```

### GET /api/v1/organizations/:organizationId/notification-preferences

- **Handler:** [hiringloop-backend/src/modules/notifications/notifications-module.js:1](../../hiringloop-backend/src/modules/notifications/notifications-module.js#L1) inline handler; declaration [hiringloop-backend/src/modules/notifications/notifications-module.js:57](../../hiringloop-backend/src/modules/notifications/notifications-module.js#L57). Exact declaration line: hiringloop-backend/src/modules/notifications/notifications-module.js:154.
- **Authentication:** Live opaque-cookie session required. **Authorization:** NOTIFICATION_PREFERENCE_MANAGE_OWN.
- **Request schema:** params: org. Headers: Content-Type application/json when sending a JSON body. Path UUID/slug validation is endpoint-owned.
- **Service / DB / response:** Inline async handler below is the exact Prisma operation and success-response schema.
- **Failure behavior / tests / consumers:** Shared failures above plus business errors in the linked service. Related tests and frontend API sources are listed for this module; current behavior is not runtime-verified.

```js
r.get(
    '/notification-preferences',
    ...ctx(PERMISSIONS.NOTIFICATION_PREFERENCE_MANAGE_OWN),
    validateRequest({ params: org }),
    async (q, s, n) => {
      try {
        const x = await prisma.notificationPreference.findMany({
          where: {
            organizationId: q.validated.params.organizationId,
            userId: q.auth.userId,
          },
        });
        const map = new Map(x.map((v) => [v.notificationType, v.enabled]));
        s.json({
          data: types.map((notificationType) => ({
            notificationType,
            enabled: map.get(notificationType) ?? true,
          })),
        });
      } catch (e) {
        n(e);
      }
    },
  )
```

### PUT /api/v1/organizations/:organizationId/notification-preferences

- **Handler:** [hiringloop-backend/src/modules/notifications/notifications-module.js:1](../../hiringloop-backend/src/modules/notifications/notifications-module.js#L1) inline handler; declaration [hiringloop-backend/src/modules/notifications/notifications-module.js:178](../../hiringloop-backend/src/modules/notifications/notifications-module.js#L178). Exact declaration line: hiringloop-backend/src/modules/notifications/notifications-module.js:178.
- **Authentication:** Live opaque-cookie session required. **Authorization:** NOTIFICATION_PREFERENCE_MANAGE_OWN.
- **Request schema:** params: org; body: preferences. Headers: X-CSRF-Token required; Content-Type application/json when sending a JSON body. Path UUID/slug validation is endpoint-owned.
- **Service / DB / response:** Inline async handler below is the exact Prisma operation and success-response schema.
- **Failure behavior / tests / consumers:** Shared failures above plus business errors in the linked service. Related tests and frontend API sources are listed for this module; current behavior is not runtime-verified.

```js
r.put(
    '/notification-preferences',
    ...ctx(PERMISSIONS.NOTIFICATION_PREFERENCE_MANAGE_OWN, true),
    validateRequest({ params: org, body: preferences }),
    async (q, s, n) => {
      try {
        for (const p of q.validated.body.preferences)
          if (p.notificationType !== 'CANDIDATE_COMMUNICATION_FAILED')
            await prisma.notificationPreference.upsert({
              where: {
                organizationId_userId_notificationType: {
                  organizationId: q.validated.params.organizationId,
                  userId: q.auth.userId,
                  notificationType: p.notificationType,
                },
              },
              create: {
                id: generateEntityId(),
                organizationId: q.validated.params.organizationId,
                userId: q.auth.userId,
                ...p,
              },
              update: { enabled: p.enabled },
            });
        s.sendStatus(204);
      } catch (e) {
        n(e);
      }
    },
  )
```

**Module business/infrastructure error vocabulary:** See inline handlers and shared errors.

## offers

**Use-case/service sources:** [hiringloop-backend/src/modules/offers/use-cases/offer-use-cases.js:1](../../hiringloop-backend/src/modules/offers/use-cases/offer-use-cases.js#L1)

**Persistence sources:** [hiringloop-backend/src/modules/offers/repositories/offer-repository.js:1](../../hiringloop-backend/src/modules/offers/repositories/offer-repository.js#L1)

**Frontend consumers:** [hiringloop-frontend/src/features/offers/api/offers.api.ts:1](../../hiringloop-frontend/src/features/offers/api/offers.api.ts#L1). This maps the owning feature; direct per-method call-site reachability is not fully verified.

**Existing related tests:** [hiringloop-backend/tests/integration/phase17-tenant-isolation-http.test.js:1](../../hiringloop-backend/tests/integration/phase17-tenant-isolation-http.test.js#L1); [hiringloop-backend/tests/integration/phase17-talent-pools-http.test.js:1](../../hiringloop-backend/tests/integration/phase17-talent-pools-http.test.js#L1); [hiringloop-backend/tests/integration/phase17-outcomes-http.test.js:1](../../hiringloop-backend/tests/integration/phase17-outcomes-http.test.js#L1); [hiringloop-backend/tests/integration/phase17-offers-http.test.js:1](../../hiringloop-backend/tests/integration/phase17-offers-http.test.js#L1); [hiringloop-backend/tests/integration/phase17-access-http.test.js:1](../../hiringloop-backend/tests/integration/phase17-access-http.test.js#L1); [hiringloop-backend/tests/integration/database/phase17-offer-talent-integrity.test.js:1](../../hiringloop-backend/tests/integration/database/phase17-offer-talent-integrity.test.js#L1); [hiringloop-backend/tests/modules/phase17-offer-outcome-use-cases.test.js:1](../../hiringloop-backend/tests/modules/phase17-offer-outcome-use-cases.test.js#L1); [hiringloop-backend/tests/modules/offer-repository-transaction.test.js:1](../../hiringloop-backend/tests/modules/offer-repository-transaction.test.js#L1); [hiringloop-frontend/src/features/offers/components/OfferSection.test.tsx:1](../../hiringloop-frontend/src/features/offers/components/OfferSection.test.tsx#L1); [hiringloop-frontend/src/features/offers/components/ApplicationOutcomeSection.test.tsx:1](../../hiringloop-frontend/src/features/offers/components/ApplicationOutcomeSection.test.tsx#L1). File association is verified; endpoint-specific assertion completeness and current pass status are UNKNOWN.

### GET /api/v1/organizations/:organizationId/applications/:applicationId/offer

- **Handler:** [hiringloop-backend/src/modules/offers/controllers/offer-controller.js:24](../../hiringloop-backend/src/modules/offers/controllers/offer-controller.js#L24), method byApplication; declaration [hiringloop-backend/src/modules/offers/routes/offer-routes.js:34](../../hiringloop-backend/src/modules/offers/routes/offer-routes.js#L34). Exact declaration line: hiringloop-backend/src/modules/offers/routes/offer-routes.js:34.
- **Authentication:** Live opaque-cookie session required. **Authorization:** OFFER_VIEW.
- **Request schema:** params: offerApplicationParamsSchema. Headers: Content-Type application/json when sending a JSON body. Path UUID/slug validation is endpoint-owned.
- **Service / DB / response:** [hiringloop-backend/src/modules/offers/controllers/offer-controller.js:24](../../hiringloop-backend/src/modules/offers/controllers/offer-controller.js#L24) defines use-case invocation, success status and envelope; linked use-case/repository/DTO sources above define reads/writes and serialized fields. DTOs: [hiringloop-backend/src/modules/offers/domain/offer-dto.js:1](../../hiringloop-backend/src/modules/offers/domain/offer-dto.js#L1).
- **Failure behavior / tests / consumers:** Shared failures above plus business errors in the linked service. Related tests and frontend API sources are listed for this module; current behavior is not runtime-verified.

```js
router.get(
    '/applications/:applicationId/offer',
    ...read(PERMISSIONS.OFFER_VIEW),
    validateRequest({ params: offerApplicationParamsSchema }),
    controller.byApplication,
  )
```

### POST /api/v1/organizations/:organizationId/applications/:applicationId/offer

- **Handler:** [hiringloop-backend/src/modules/offers/controllers/offer-controller.js:1](../../hiringloop-backend/src/modules/offers/controllers/offer-controller.js#L1), method create; declaration [hiringloop-backend/src/modules/offers/routes/offer-routes.js:40](../../hiringloop-backend/src/modules/offers/routes/offer-routes.js#L40). Exact declaration line: hiringloop-backend/src/modules/offers/routes/offer-routes.js:40.
- **Authentication:** Live opaque-cookie session required. **Authorization:** OFFER_CREATE.
- **Request schema:** params: offerApplicationParamsSchema; body: createOfferBodySchema. Headers: X-CSRF-Token required; Content-Type application/json when sending a JSON body. Path UUID/slug validation is endpoint-owned.
- **Service / DB / response:** [hiringloop-backend/src/modules/offers/controllers/offer-controller.js:1](../../hiringloop-backend/src/modules/offers/controllers/offer-controller.js#L1) defines use-case invocation, success status and envelope; linked use-case/repository/DTO sources above define reads/writes and serialized fields. DTOs: [hiringloop-backend/src/modules/offers/domain/offer-dto.js:1](../../hiringloop-backend/src/modules/offers/domain/offer-dto.js#L1).
- **Failure behavior / tests / consumers:** Shared failures above plus business errors in the linked service. Related tests and frontend API sources are listed for this module; current behavior is not runtime-verified.

```js
router.post(
    '/applications/:applicationId/offer',
    ...write(PERMISSIONS.OFFER_CREATE),
    validateRequest({
      params: offerApplicationParamsSchema,
      body: createOfferBodySchema,
    }),
    controller.create,
  )
```

### GET /api/v1/organizations/:organizationId/offers/:offerId

- **Handler:** [hiringloop-backend/src/modules/offers/controllers/offer-controller.js:25](../../hiringloop-backend/src/modules/offers/controllers/offer-controller.js#L25), method byId; declaration [hiringloop-backend/src/modules/offers/routes/offer-routes.js:34](../../hiringloop-backend/src/modules/offers/routes/offer-routes.js#L34). Exact declaration line: hiringloop-backend/src/modules/offers/routes/offer-routes.js:49.
- **Authentication:** Live opaque-cookie session required. **Authorization:** OFFER_VIEW.
- **Request schema:** params: offerParamsSchema. Headers: Content-Type application/json when sending a JSON body. Path UUID/slug validation is endpoint-owned.
- **Service / DB / response:** [hiringloop-backend/src/modules/offers/controllers/offer-controller.js:25](../../hiringloop-backend/src/modules/offers/controllers/offer-controller.js#L25) defines use-case invocation, success status and envelope; linked use-case/repository/DTO sources above define reads/writes and serialized fields. DTOs: [hiringloop-backend/src/modules/offers/domain/offer-dto.js:1](../../hiringloop-backend/src/modules/offers/domain/offer-dto.js#L1).
- **Failure behavior / tests / consumers:** Shared failures above plus business errors in the linked service. Related tests and frontend API sources are listed for this module; current behavior is not runtime-verified.

```js
router.get(
    '/offers/:offerId',
    ...read(PERMISSIONS.OFFER_VIEW),
    validateRequest({ params: offerParamsSchema }),
    controller.byId,
  )
```

### PATCH /api/v1/organizations/:organizationId/offers/:offerId/draft

- **Handler:** [hiringloop-backend/src/modules/offers/controllers/offer-controller.js:27](../../hiringloop-backend/src/modules/offers/controllers/offer-controller.js#L27), method editDraft; declaration [hiringloop-backend/src/modules/offers/routes/offer-routes.js:55](../../hiringloop-backend/src/modules/offers/routes/offer-routes.js#L55). Exact declaration line: hiringloop-backend/src/modules/offers/routes/offer-routes.js:55.
- **Authentication:** Live opaque-cookie session required. **Authorization:** OFFER_UPDATE.
- **Request schema:** params: offerParamsSchema; body: editOfferBodySchema. Headers: X-CSRF-Token required; Content-Type application/json when sending a JSON body. Path UUID/slug validation is endpoint-owned.
- **Service / DB / response:** [hiringloop-backend/src/modules/offers/controllers/offer-controller.js:27](../../hiringloop-backend/src/modules/offers/controllers/offer-controller.js#L27) defines use-case invocation, success status and envelope; linked use-case/repository/DTO sources above define reads/writes and serialized fields. DTOs: [hiringloop-backend/src/modules/offers/domain/offer-dto.js:1](../../hiringloop-backend/src/modules/offers/domain/offer-dto.js#L1).
- **Failure behavior / tests / consumers:** Shared failures above plus business errors in the linked service. Related tests and frontend API sources are listed for this module; current behavior is not runtime-verified.

```js
router.patch(
    '/offers/:offerId/draft',
    ...write(PERMISSIONS.OFFER_UPDATE),
    validateRequest({ params: offerParamsSchema, body: editOfferBodySchema }),
    controller.editDraft,
  )
```

### POST /api/v1/organizations/:organizationId/offers/:offerId/revisions

- **Handler:** [hiringloop-backend/src/modules/offers/controllers/offer-controller.js:28](../../hiringloop-backend/src/modules/offers/controllers/offer-controller.js#L28), method revise; declaration [hiringloop-backend/src/modules/offers/routes/offer-routes.js:40](../../hiringloop-backend/src/modules/offers/routes/offer-routes.js#L40). Exact declaration line: hiringloop-backend/src/modules/offers/routes/offer-routes.js:61.
- **Authentication:** Live opaque-cookie session required. **Authorization:** OFFER_REVISE.
- **Request schema:** params: offerParamsSchema; body: editOfferBodySchema. Headers: X-CSRF-Token required; Content-Type application/json when sending a JSON body. Path UUID/slug validation is endpoint-owned.
- **Service / DB / response:** [hiringloop-backend/src/modules/offers/controllers/offer-controller.js:28](../../hiringloop-backend/src/modules/offers/controllers/offer-controller.js#L28) defines use-case invocation, success status and envelope; linked use-case/repository/DTO sources above define reads/writes and serialized fields. DTOs: [hiringloop-backend/src/modules/offers/domain/offer-dto.js:1](../../hiringloop-backend/src/modules/offers/domain/offer-dto.js#L1).
- **Failure behavior / tests / consumers:** Shared failures above plus business errors in the linked service. Related tests and frontend API sources are listed for this module; current behavior is not runtime-verified.

```js
router.post(
    '/offers/:offerId/revisions',
    ...write(PERMISSIONS.OFFER_REVISE),
    validateRequest({ params: offerParamsSchema, body: editOfferBodySchema }),
    controller.revise,
  )
```

### POST /api/v1/organizations/:organizationId/offers/:offerId/send

- **Handler:** [hiringloop-backend/src/modules/offers/controllers/offer-controller.js:29](../../hiringloop-backend/src/modules/offers/controllers/offer-controller.js#L29), method send; declaration [hiringloop-backend/src/modules/offers/routes/offer-routes.js:40](../../hiringloop-backend/src/modules/offers/routes/offer-routes.js#L40). Exact declaration line: hiringloop-backend/src/modules/offers/routes/offer-routes.js:67.
- **Authentication:** Live opaque-cookie session required. **Authorization:** OFFER_SEND.
- **Request schema:** params: offerParamsSchema; body: sendOfferBodySchema. Headers: X-CSRF-Token required; Content-Type application/json when sending a JSON body. Path UUID/slug validation is endpoint-owned.
- **Service / DB / response:** [hiringloop-backend/src/modules/offers/controllers/offer-controller.js:29](../../hiringloop-backend/src/modules/offers/controllers/offer-controller.js#L29) defines use-case invocation, success status and envelope; linked use-case/repository/DTO sources above define reads/writes and serialized fields. DTOs: [hiringloop-backend/src/modules/offers/domain/offer-dto.js:1](../../hiringloop-backend/src/modules/offers/domain/offer-dto.js#L1).
- **Failure behavior / tests / consumers:** Shared failures above plus business errors in the linked service. Related tests and frontend API sources are listed for this module; current behavior is not runtime-verified.

```js
router.post(
    '/offers/:offerId/send',
    ...write(PERMISSIONS.OFFER_SEND),
    validateRequest({ params: offerParamsSchema, body: sendOfferBodySchema }),
    controller.send,
  )
```

### POST /api/v1/organizations/:organizationId/offers/:offerId/accept

- **Handler:** [hiringloop-backend/src/modules/offers/controllers/offer-controller.js:42](../../hiringloop-backend/src/modules/offers/controllers/offer-controller.js#L42), method accept; declaration [hiringloop-backend/src/modules/offers/routes/offer-routes.js:40](../../hiringloop-backend/src/modules/offers/routes/offer-routes.js#L40). Exact declaration line: hiringloop-backend/src/modules/offers/routes/offer-routes.js:78.
- **Authentication:** Live opaque-cookie session required. **Authorization:** OFFER_RECORD_ACCEPTANCE.
- **Request schema:** params: offerParamsSchema; body: offerRevisionSchema. Headers: X-CSRF-Token required; Content-Type application/json when sending a JSON body. Path UUID/slug validation is endpoint-owned.
- **Service / DB / response:** [hiringloop-backend/src/modules/offers/controllers/offer-controller.js:42](../../hiringloop-backend/src/modules/offers/controllers/offer-controller.js#L42) defines use-case invocation, success status and envelope; linked use-case/repository/DTO sources above define reads/writes and serialized fields. DTOs: [hiringloop-backend/src/modules/offers/domain/offer-dto.js:1](../../hiringloop-backend/src/modules/offers/domain/offer-dto.js#L1).
- **Failure behavior / tests / consumers:** Shared failures above plus business errors in the linked service. Related tests and frontend API sources are listed for this module; current behavior is not runtime-verified.

```js
router.post(
      `/offers/:offerId/${name}`,
      ...write(permission),
      validateRequest({ params: offerParamsSchema, body: offerRevisionSchema }),
      controller[name],
    )
```

### POST /api/v1/organizations/:organizationId/offers/:offerId/decline

- **Handler:** [hiringloop-backend/src/modules/offers/controllers/offer-controller.js:55](../../hiringloop-backend/src/modules/offers/controllers/offer-controller.js#L55), method decline; declaration [hiringloop-backend/src/modules/offers/routes/offer-routes.js:40](../../hiringloop-backend/src/modules/offers/routes/offer-routes.js#L40). Exact declaration line: hiringloop-backend/src/modules/offers/routes/offer-routes.js:78.
- **Authentication:** Live opaque-cookie session required. **Authorization:** OFFER_RECORD_DECLINE.
- **Request schema:** params: offerParamsSchema; body: offerRevisionSchema. Headers: X-CSRF-Token required; Content-Type application/json when sending a JSON body. Path UUID/slug validation is endpoint-owned.
- **Service / DB / response:** [hiringloop-backend/src/modules/offers/controllers/offer-controller.js:55](../../hiringloop-backend/src/modules/offers/controllers/offer-controller.js#L55) defines use-case invocation, success status and envelope; linked use-case/repository/DTO sources above define reads/writes and serialized fields. DTOs: [hiringloop-backend/src/modules/offers/domain/offer-dto.js:1](../../hiringloop-backend/src/modules/offers/domain/offer-dto.js#L1).
- **Failure behavior / tests / consumers:** Shared failures above plus business errors in the linked service. Related tests and frontend API sources are listed for this module; current behavior is not runtime-verified.

```js
router.post(
      `/offers/:offerId/${name}`,
      ...write(permission),
      validateRequest({ params: offerParamsSchema, body: offerRevisionSchema }),
      controller[name],
    )
```

### POST /api/v1/organizations/:organizationId/offers/:offerId/withdraw

- **Handler:** [hiringloop-backend/src/modules/offers/controllers/offer-controller.js:68](../../hiringloop-backend/src/modules/offers/controllers/offer-controller.js#L68), method withdraw; declaration [hiringloop-backend/src/modules/offers/routes/offer-routes.js:40](../../hiringloop-backend/src/modules/offers/routes/offer-routes.js#L40). Exact declaration line: hiringloop-backend/src/modules/offers/routes/offer-routes.js:78.
- **Authentication:** Live opaque-cookie session required. **Authorization:** OFFER_WITHDRAW.
- **Request schema:** params: offerParamsSchema; body: offerRevisionSchema. Headers: X-CSRF-Token required; Content-Type application/json when sending a JSON body. Path UUID/slug validation is endpoint-owned.
- **Service / DB / response:** [hiringloop-backend/src/modules/offers/controllers/offer-controller.js:68](../../hiringloop-backend/src/modules/offers/controllers/offer-controller.js#L68) defines use-case invocation, success status and envelope; linked use-case/repository/DTO sources above define reads/writes and serialized fields. DTOs: [hiringloop-backend/src/modules/offers/domain/offer-dto.js:1](../../hiringloop-backend/src/modules/offers/domain/offer-dto.js#L1).
- **Failure behavior / tests / consumers:** Shared failures above plus business errors in the linked service. Related tests and frontend API sources are listed for this module; current behavior is not runtime-verified.

```js
router.post(
      `/offers/:offerId/${name}`,
      ...write(permission),
      validateRequest({ params: offerParamsSchema, body: offerRevisionSchema }),
      controller[name],
    )
```

**Module business/infrastructure error vocabulary:** ApplicationError, OFFER_NOT_FOUND, APPLICATION_NOT_FOUND, OFFER_ALREADY_EXISTS, OFFER_INVALID_TRANSITION, OFFER_VERSION_IMMUTABLE, OFFER_VERSION_CONFLICT, OFFER_RECIPIENT_UNAVAILABLE, COMMUNICATION_IDEMPOTENCY_CONFLICT, EMAIL_DELIVERY_FAILED.

## organizations

**Use-case/service sources:** [hiringloop-backend/src/modules/organizations/use-cases/resolve-tenant-context.js:1](../../hiringloop-backend/src/modules/organizations/use-cases/resolve-tenant-context.js#L1); [hiringloop-backend/src/modules/organizations/use-cases/get-organization-by-id.js:1](../../hiringloop-backend/src/modules/organizations/use-cases/get-organization-by-id.js#L1); [hiringloop-backend/src/modules/organizations/use-cases/create-organization-for-user.js:1](../../hiringloop-backend/src/modules/organizations/use-cases/create-organization-for-user.js#L1)

**Persistence sources:** [hiringloop-backend/src/modules/organizations/repositories/organization-repository.js:1](../../hiringloop-backend/src/modules/organizations/repositories/organization-repository.js#L1)

**Frontend consumers:** [hiringloop-frontend/src/features/organizations/api/organizations.api.ts:1](../../hiringloop-frontend/src/features/organizations/api/organizations.api.ts#L1). This maps the owning feature; direct per-method call-site reachability is not fully verified.

**Existing related tests:** [hiringloop-backend/tests/integration/database/organization-public-slug.test.js:1](../../hiringloop-backend/tests/integration/database/organization-public-slug.test.js#L1); [hiringloop-backend/tests/modules/organizations/tenant-context.test.js:1](../../hiringloop-backend/tests/modules/organizations/tenant-context.test.js#L1); [hiringloop-backend/tests/modules/organizations/organization-workflows.test.js:1](../../hiringloop-backend/tests/modules/organizations/organization-workflows.test.js#L1); [hiringloop-frontend/src/features/organizations/organizations.test.tsx:1](../../hiringloop-frontend/src/features/organizations/organizations.test.tsx#L1). File association is verified; endpoint-specific assertion completeness and current pass status are UNKNOWN.

### GET /api/v1/organizations

- **Handler:** [hiringloop-backend/src/modules/organizations/controllers/organization-controller.js:5](../../hiringloop-backend/src/modules/organizations/controllers/organization-controller.js#L5), method list; declaration [hiringloop-backend/src/modules/organizations/routes/organization-routes.js:67](../../hiringloop-backend/src/modules/organizations/routes/organization-routes.js#L67). Exact declaration line: hiringloop-backend/src/modules/organizations/routes/organization-routes.js:67.
- **Authentication:** Live opaque-cookie session required. **Authorization:** Membership for detail; authenticated identity for create/list.
- **Request schema:** No body/query schema named; see middleware declaration below. Headers: Content-Type application/json when sending a JSON body. Path UUID/slug validation is endpoint-owned.
- **Service / DB / response:** [hiringloop-backend/src/modules/organizations/controllers/organization-controller.js:5](../../hiringloop-backend/src/modules/organizations/controllers/organization-controller.js#L5) defines use-case invocation, success status and envelope; linked use-case/repository/DTO sources above define reads/writes and serialized fields. DTOs: [hiringloop-backend/src/modules/organizations/domain/organization-dto.js:1](../../hiringloop-backend/src/modules/organizations/domain/organization-dto.js#L1).
- **Failure behavior / tests / consumers:** Shared failures above plus business errors in the linked service. Related tests and frontend API sources are listed for this module; current behavior is not runtime-verified.

```js
router.get('/', authenticateSession, controller.list)
```

### POST /api/v1/organizations

- **Handler:** [hiringloop-backend/src/modules/organizations/controllers/organization-controller.js:3](../../hiringloop-backend/src/modules/organizations/controllers/organization-controller.js#L3), method create; declaration [hiringloop-backend/src/modules/organizations/routes/organization-routes.js:68](../../hiringloop-backend/src/modules/organizations/routes/organization-routes.js#L68). Exact declaration line: hiringloop-backend/src/modules/organizations/routes/organization-routes.js:68.
- **Authentication:** Live opaque-cookie session required. **Authorization:** Membership for detail; authenticated identity for create/list.
- **Request schema:** body: createOrganizationRequestSchema. Headers: X-CSRF-Token required; Content-Type application/json when sending a JSON body. Path UUID/slug validation is endpoint-owned.
- **Service / DB / response:** [hiringloop-backend/src/modules/organizations/controllers/organization-controller.js:3](../../hiringloop-backend/src/modules/organizations/controllers/organization-controller.js#L3) defines use-case invocation, success status and envelope; linked use-case/repository/DTO sources above define reads/writes and serialized fields. DTOs: [hiringloop-backend/src/modules/organizations/domain/organization-dto.js:1](../../hiringloop-backend/src/modules/organizations/domain/organization-dto.js#L1).
- **Failure behavior / tests / consumers:** Shared failures above plus business errors in the linked service. Related tests and frontend API sources are listed for this module; current behavior is not runtime-verified.

```js
router.post(
    '/',
    authenticateSession,
    requireCsrf,
    validateRequest({ body: createOrganizationRequestSchema }),
    controller.create,
  )
```

### GET /api/v1/organizations/:organizationId

- **Handler:** [hiringloop-backend/src/modules/organizations/controllers/organization-controller.js:6](../../hiringloop-backend/src/modules/organizations/controllers/organization-controller.js#L6), method get; declaration [hiringloop-backend/src/modules/organizations/routes/organization-routes.js:67](../../hiringloop-backend/src/modules/organizations/routes/organization-routes.js#L67). Exact declaration line: hiringloop-backend/src/modules/organizations/routes/organization-routes.js:75.
- **Authentication:** Live opaque-cookie session required. **Authorization:** Membership for detail; authenticated identity for create/list.
- **Request schema:** params: organizationIdParamsSchema. Headers: Content-Type application/json when sending a JSON body. Path UUID/slug validation is endpoint-owned.
- **Service / DB / response:** [hiringloop-backend/src/modules/organizations/controllers/organization-controller.js:6](../../hiringloop-backend/src/modules/organizations/controllers/organization-controller.js#L6) defines use-case invocation, success status and envelope; linked use-case/repository/DTO sources above define reads/writes and serialized fields. DTOs: [hiringloop-backend/src/modules/organizations/domain/organization-dto.js:1](../../hiringloop-backend/src/modules/organizations/domain/organization-dto.js#L1).
- **Failure behavior / tests / consumers:** Shared failures above plus business errors in the linked service. Related tests and frontend API sources are listed for this module; current behavior is not runtime-verified.

```js
router.get(
    '/:organizationId',
    authenticateSession,
    validateRequest({ params: organizationIdParamsSchema }),
    tenantContextMiddleware,
    controller.get,
  )
```

**Module business/infrastructure error vocabulary:** notFoundError, conflictError.

## pipelines

**Use-case/service sources:** [hiringloop-backend/src/modules/pipelines/use-cases/pipeline-use-cases.js:1](../../hiringloop-backend/src/modules/pipelines/use-cases/pipeline-use-cases.js#L1)

**Persistence sources:** [hiringloop-backend/src/modules/pipelines/repositories/pipeline-repository.js:1](../../hiringloop-backend/src/modules/pipelines/repositories/pipeline-repository.js#L1)

**Frontend consumers:** [hiringloop-frontend/src/features/pipelines/api/pipelines.api.ts:1](../../hiringloop-frontend/src/features/pipelines/api/pipelines.api.ts#L1). This maps the owning feature; direct per-method call-site reachability is not fully verified.

**Existing related tests:** [hiringloop-backend/tests/integration/database/pipeline-foundation.test.js:1](../../hiringloop-backend/tests/integration/database/pipeline-foundation.test.js#L1); [hiringloop-backend/tests/integration/database/pipeline-configuration.test.js:1](../../hiringloop-backend/tests/integration/database/pipeline-configuration.test.js#L1); [hiringloop-backend/tests/modules/pipelines/pipeline-workflows.test.js:1](../../hiringloop-backend/tests/modules/pipelines/pipeline-workflows.test.js#L1); [hiringloop-frontend/src/features/pipelines/utils/pipeline-utils.test.ts:1](../../hiringloop-frontend/src/features/pipelines/utils/pipeline-utils.test.ts#L1); [hiringloop-frontend/src/features/pipelines/pages/PipelineConfigurationPage.test.tsx:1](../../hiringloop-frontend/src/features/pipelines/pages/PipelineConfigurationPage.test.tsx#L1); [hiringloop-frontend/src/features/pipelines/hooks/mutations.test.tsx:1](../../hiringloop-frontend/src/features/pipelines/hooks/mutations.test.tsx#L1); [hiringloop-frontend/src/features/pipelines/api/pipelines.api.test.ts:1](../../hiringloop-frontend/src/features/pipelines/api/pipelines.api.test.ts#L1). File association is verified; endpoint-specific assertion completeness and current pass status are UNKNOWN.

### GET /api/v1/organizations/:organizationId/jobs/:jobId/pipeline

- **Handler:** [hiringloop-backend/src/modules/pipelines/controllers/pipeline-controller.js:26](../../hiringloop-backend/src/modules/pipelines/controllers/pipeline-controller.js#L26), method get; declaration [hiringloop-backend/src/modules/pipelines/routes/pipeline-routes.js:29](../../hiringloop-backend/src/modules/pipelines/routes/pipeline-routes.js#L29). Exact declaration line: hiringloop-backend/src/modules/pipelines/routes/pipeline-routes.js:29.
- **Authentication:** Live opaque-cookie session required. **Authorization:** PIPELINE_VIEW.
- **Request schema:** params: pipelineJobParamsSchema. Headers: Content-Type application/json when sending a JSON body. Path UUID/slug validation is endpoint-owned.
- **Service / DB / response:** [hiringloop-backend/src/modules/pipelines/controllers/pipeline-controller.js:26](../../hiringloop-backend/src/modules/pipelines/controllers/pipeline-controller.js#L26) defines use-case invocation, success status and envelope; linked use-case/repository/DTO sources above define reads/writes and serialized fields. DTOs: [hiringloop-backend/src/modules/pipelines/domain/pipeline-dto.js:1](../../hiringloop-backend/src/modules/pipelines/domain/pipeline-dto.js#L1).
- **Failure behavior / tests / consumers:** Shared failures above plus business errors in the linked service. Related tests and frontend API sources are listed for this module; current behavior is not runtime-verified.

```js
router.get(
    '/',
    ...context(PERMISSIONS.PIPELINE_VIEW),
    validateRequest({ params: pipelineJobParamsSchema }),
    controller.get,
  )
```

### POST /api/v1/organizations/:organizationId/jobs/:jobId/pipeline/stages

- **Handler:** [hiringloop-backend/src/modules/pipelines/controllers/pipeline-controller.js:35](../../hiringloop-backend/src/modules/pipelines/controllers/pipeline-controller.js#L35), method createStage; declaration [hiringloop-backend/src/modules/pipelines/routes/pipeline-routes.js:35](../../hiringloop-backend/src/modules/pipelines/routes/pipeline-routes.js#L35). Exact declaration line: hiringloop-backend/src/modules/pipelines/routes/pipeline-routes.js:35.
- **Authentication:** Live opaque-cookie session required. **Authorization:** PIPELINE_CONFIGURE.
- **Request schema:** params: pipelineJobParamsSchema; body: createPipelineStageBodySchema. Headers: X-CSRF-Token required; Content-Type application/json when sending a JSON body. Path UUID/slug validation is endpoint-owned.
- **Service / DB / response:** [hiringloop-backend/src/modules/pipelines/controllers/pipeline-controller.js:35](../../hiringloop-backend/src/modules/pipelines/controllers/pipeline-controller.js#L35) defines use-case invocation, success status and envelope; linked use-case/repository/DTO sources above define reads/writes and serialized fields. DTOs: [hiringloop-backend/src/modules/pipelines/domain/pipeline-dto.js:1](../../hiringloop-backend/src/modules/pipelines/domain/pipeline-dto.js#L1).
- **Failure behavior / tests / consumers:** Shared failures above plus business errors in the linked service. Related tests and frontend API sources are listed for this module; current behavior is not runtime-verified.

```js
router.post(
    '/stages',
    ...context(PERMISSIONS.PIPELINE_CONFIGURE, true),
    validateRequest({
      params: pipelineJobParamsSchema,
      body: createPipelineStageBodySchema,
    }),
    controller.createStage,
  )
```

### PATCH /api/v1/organizations/:organizationId/jobs/:jobId/pipeline/stages/:stageId

- **Handler:** [hiringloop-backend/src/modules/pipelines/controllers/pipeline-controller.js:36](../../hiringloop-backend/src/modules/pipelines/controllers/pipeline-controller.js#L36), method renameStage; declaration [hiringloop-backend/src/modules/pipelines/routes/pipeline-routes.js:44](../../hiringloop-backend/src/modules/pipelines/routes/pipeline-routes.js#L44). Exact declaration line: hiringloop-backend/src/modules/pipelines/routes/pipeline-routes.js:44.
- **Authentication:** Live opaque-cookie session required. **Authorization:** PIPELINE_CONFIGURE.
- **Request schema:** params: pipelineStageParamsSchema; body: renamePipelineStageBodySchema. Headers: X-CSRF-Token required; Content-Type application/json when sending a JSON body. Path UUID/slug validation is endpoint-owned.
- **Service / DB / response:** [hiringloop-backend/src/modules/pipelines/controllers/pipeline-controller.js:36](../../hiringloop-backend/src/modules/pipelines/controllers/pipeline-controller.js#L36) defines use-case invocation, success status and envelope; linked use-case/repository/DTO sources above define reads/writes and serialized fields. DTOs: [hiringloop-backend/src/modules/pipelines/domain/pipeline-dto.js:1](../../hiringloop-backend/src/modules/pipelines/domain/pipeline-dto.js#L1).
- **Failure behavior / tests / consumers:** Shared failures above plus business errors in the linked service. Related tests and frontend API sources are listed for this module; current behavior is not runtime-verified.

```js
router.patch(
    '/stages/:stageId',
    ...context(PERMISSIONS.PIPELINE_CONFIGURE, true),
    validateRequest({
      params: pipelineStageParamsSchema,
      body: renamePipelineStageBodySchema,
    }),
    controller.renameStage,
  )
```

### PUT /api/v1/organizations/:organizationId/jobs/:jobId/pipeline/stages/order

- **Handler:** [hiringloop-backend/src/modules/pipelines/controllers/pipeline-controller.js:37](../../hiringloop-backend/src/modules/pipelines/controllers/pipeline-controller.js#L37), method reorderStages; declaration [hiringloop-backend/src/modules/pipelines/routes/pipeline-routes.js:53](../../hiringloop-backend/src/modules/pipelines/routes/pipeline-routes.js#L53). Exact declaration line: hiringloop-backend/src/modules/pipelines/routes/pipeline-routes.js:53.
- **Authentication:** Live opaque-cookie session required. **Authorization:** PIPELINE_CONFIGURE.
- **Request schema:** params: pipelineJobParamsSchema; body: reorderPipelineStagesBodySchema. Headers: X-CSRF-Token required; Content-Type application/json when sending a JSON body. Path UUID/slug validation is endpoint-owned.
- **Service / DB / response:** [hiringloop-backend/src/modules/pipelines/controllers/pipeline-controller.js:37](../../hiringloop-backend/src/modules/pipelines/controllers/pipeline-controller.js#L37) defines use-case invocation, success status and envelope; linked use-case/repository/DTO sources above define reads/writes and serialized fields. DTOs: [hiringloop-backend/src/modules/pipelines/domain/pipeline-dto.js:1](../../hiringloop-backend/src/modules/pipelines/domain/pipeline-dto.js#L1).
- **Failure behavior / tests / consumers:** Shared failures above plus business errors in the linked service. Related tests and frontend API sources are listed for this module; current behavior is not runtime-verified.

```js
router.put(
    '/stages/order',
    ...context(PERMISSIONS.PIPELINE_CONFIGURE, true),
    validateRequest({
      params: pipelineJobParamsSchema,
      body: reorderPipelineStagesBodySchema,
    }),
    controller.reorderStages,
  )
```

### DELETE /api/v1/organizations/:organizationId/jobs/:jobId/pipeline/stages/:stageId

- **Handler:** [hiringloop-backend/src/modules/pipelines/controllers/pipeline-controller.js:38](../../hiringloop-backend/src/modules/pipelines/controllers/pipeline-controller.js#L38), method deleteStage; declaration [hiringloop-backend/src/modules/pipelines/routes/pipeline-routes.js:62](../../hiringloop-backend/src/modules/pipelines/routes/pipeline-routes.js#L62). Exact declaration line: hiringloop-backend/src/modules/pipelines/routes/pipeline-routes.js:62.
- **Authentication:** Live opaque-cookie session required. **Authorization:** PIPELINE_CONFIGURE.
- **Request schema:** params: pipelineStageParamsSchema; body: deletePipelineStageBodySchema. Headers: X-CSRF-Token required; Content-Type application/json when sending a JSON body. Path UUID/slug validation is endpoint-owned.
- **Service / DB / response:** [hiringloop-backend/src/modules/pipelines/controllers/pipeline-controller.js:38](../../hiringloop-backend/src/modules/pipelines/controllers/pipeline-controller.js#L38) defines use-case invocation, success status and envelope; linked use-case/repository/DTO sources above define reads/writes and serialized fields. DTOs: [hiringloop-backend/src/modules/pipelines/domain/pipeline-dto.js:1](../../hiringloop-backend/src/modules/pipelines/domain/pipeline-dto.js#L1).
- **Failure behavior / tests / consumers:** Shared failures above plus business errors in the linked service. Related tests and frontend API sources are listed for this module; current behavior is not runtime-verified.

```js
router.delete(
    '/stages/:stageId',
    ...context(PERMISSIONS.PIPELINE_CONFIGURE, true),
    validateRequest({
      params: pipelineStageParamsSchema,
      body: deletePipelineStageBodySchema,
    }),
    controller.deleteStage,
  )
```

**Module business/infrastructure error vocabulary:** pipelineNotFoundError, pipelineJobLockedError, pipelineVersionConflictError, pipelineStageNotFoundError, pipelineDuplicateNameError, pipelineStageLimitError, pipelineInvalidOrderError, pipelineEntryMoveError, pipelineEntryDeleteError.

## public-careers

**Use-case/service sources:** [hiringloop-backend/src/modules/public-careers/use-cases/public-career-use-cases.js:1](../../hiringloop-backend/src/modules/public-careers/use-cases/public-career-use-cases.js#L1)

**Persistence sources:** [hiringloop-backend/src/modules/public-careers/public-career-module.js:1](../../hiringloop-backend/src/modules/public-careers/public-career-module.js#L1)

**Frontend consumers:** [hiringloop-frontend/src/features/public-careers/api/public-careers.api.ts:1](../../hiringloop-frontend/src/features/public-careers/api/public-careers.api.ts#L1); [hiringloop-frontend/src/features/public-careers/api/public-application.api.ts:1](../../hiringloop-frontend/src/features/public-careers/api/public-application.api.ts#L1). This maps the owning feature; direct per-method call-site reachability is not fully verified.

**Existing related tests:** [hiringloop-backend/tests/integration/database/public-career-site.test.js:1](../../hiringloop-backend/tests/integration/database/public-career-site.test.js#L1); [hiringloop-backend/tests/modules/public-careers/public-career-use-cases.test.js:1](../../hiringloop-backend/tests/modules/public-careers/public-career-use-cases.test.js#L1); [hiringloop-backend/tests/modules/public-careers/public-career-http.test.js:1](../../hiringloop-backend/tests/modules/public-careers/public-career-http.test.js#L1); [hiringloop-frontend/src/features/public-careers/public-careers.test.tsx:1](../../hiringloop-frontend/src/features/public-careers/public-careers.test.tsx#L1); [hiringloop-frontend/src/features/public-careers/hooks/query-keys.test.ts:1](../../hiringloop-frontend/src/features/public-careers/hooks/query-keys.test.ts#L1); [hiringloop-frontend/src/features/public-careers/api/public-application.api.test.ts:1](../../hiringloop-frontend/src/features/public-careers/api/public-application.api.test.ts#L1). File association is verified; endpoint-specific assertion completeness and current pass status are UNKNOWN.

### GET /api/v1/public/careers/:organizationSlug/jobs

- **Handler:** [hiringloop-backend/src/modules/public-careers/controllers/public-career-controller.js:3](../../hiringloop-backend/src/modules/public-careers/controllers/public-career-controller.js#L3), method list; declaration [hiringloop-backend/src/modules/public-careers/routes/public-career-routes.js:30](../../hiringloop-backend/src/modules/public-careers/routes/public-career-routes.js#L30). Exact declaration line: hiringloop-backend/src/modules/public-careers/routes/public-career-routes.js:30.
- **Authentication:** Anonymous permitted; Google routes conditional on provider config. **Authorization:** No tenant membership required; public jobs are OPEN-only..
- **Request schema:** params: publicCareerOrganizationParamsSchema; query: publicCareerListQuerySchema. Headers: Content-Type application/json when sending a JSON body. Path UUID/slug validation is endpoint-owned.
- **Service / DB / response:** [hiringloop-backend/src/modules/public-careers/controllers/public-career-controller.js:3](../../hiringloop-backend/src/modules/public-careers/controllers/public-career-controller.js#L3) defines use-case invocation, success status and envelope; linked use-case/repository/DTO sources above define reads/writes and serialized fields. DTOs: [hiringloop-backend/src/modules/public-careers/domain/public-career-dto.js:1](../../hiringloop-backend/src/modules/public-careers/domain/public-career-dto.js#L1).
- **Failure behavior / tests / consumers:** Shared failures above plus business errors in the linked service. Related tests and frontend API sources are listed for this module; current behavior is not runtime-verified.

```js
router.get(
    '/careers/:organizationSlug/jobs',
    publicCareerReadRateLimiter,
    validateRequest({
      params: publicCareerOrganizationParamsSchema,
      query: publicCareerListQuerySchema,
    }),
    controller.list,
  )
```

### GET /api/v1/public/careers/:organizationSlug/jobs/:jobId

- **Handler:** [hiringloop-backend/src/modules/public-careers/controllers/public-career-controller.js:17](../../hiringloop-backend/src/modules/public-careers/controllers/public-career-controller.js#L17), method detail; declaration [hiringloop-backend/src/modules/public-careers/routes/public-career-routes.js:30](../../hiringloop-backend/src/modules/public-careers/routes/public-career-routes.js#L30). Exact declaration line: hiringloop-backend/src/modules/public-careers/routes/public-career-routes.js:39.
- **Authentication:** Anonymous permitted; Google routes conditional on provider config. **Authorization:** No tenant membership required; public jobs are OPEN-only..
- **Request schema:** params: publicCareerJobParamsSchema. Headers: Content-Type application/json when sending a JSON body. Path UUID/slug validation is endpoint-owned.
- **Service / DB / response:** [hiringloop-backend/src/modules/public-careers/controllers/public-career-controller.js:17](../../hiringloop-backend/src/modules/public-careers/controllers/public-career-controller.js#L17) defines use-case invocation, success status and envelope; linked use-case/repository/DTO sources above define reads/writes and serialized fields. DTOs: [hiringloop-backend/src/modules/public-careers/domain/public-career-dto.js:1](../../hiringloop-backend/src/modules/public-careers/domain/public-career-dto.js#L1).
- **Failure behavior / tests / consumers:** Shared failures above plus business errors in the linked service. Related tests and frontend API sources are listed for this module; current behavior is not runtime-verified.

```js
router.get(
    '/careers/:organizationSlug/jobs/:jobId',
    publicCareerReadRateLimiter,
    validateRequest({ params: publicCareerJobParamsSchema }),
    controller.detail,
  )
```

### GET /api/v1/public/careers/:organizationSlug/jobs/:jobId/application-form

- **Handler:** [hiringloop-backend/src/modules/public-careers/controllers/public-career-controller.js:1](../../hiringloop-backend/src/modules/public-careers/controllers/public-career-controller.js#L1), method inline; declaration [hiringloop-backend/src/modules/public-careers/routes/public-career-routes.js:30](../../hiringloop-backend/src/modules/public-careers/routes/public-career-routes.js#L30). Exact declaration line: hiringloop-backend/src/modules/public-careers/routes/public-career-routes.js:46.
- **Authentication:** Anonymous permitted; Google routes conditional on provider config. **Authorization:** No tenant membership required; public jobs are OPEN-only..
- **Request schema:** params: publicApplicationParamsSchema. Headers: Content-Type application/json when sending a JSON body. Path UUID/slug validation is endpoint-owned.
- **Service / DB / response:** [hiringloop-backend/src/modules/public-careers/controllers/public-career-controller.js:1](../../hiringloop-backend/src/modules/public-careers/controllers/public-career-controller.js#L1) defines use-case invocation, success status and envelope; linked use-case/repository/DTO sources above define reads/writes and serialized fields. DTOs: [hiringloop-backend/src/modules/public-careers/domain/public-career-dto.js:1](../../hiringloop-backend/src/modules/public-careers/domain/public-career-dto.js#L1).
- **Failure behavior / tests / consumers:** Shared failures above plus business errors in the linked service. Related tests and frontend API sources are listed for this module; current behavior is not runtime-verified.

```js
router.get(
      '/careers/:organizationSlug/jobs/:jobId/application-form',
      publicApplicationRateLimiters.applicationFormRateLimiter,
      validateRequest({ params: publicApplicationParamsSchema }),
      applicationController.form,
    )
```

### POST /api/v1/public/careers/:organizationSlug/jobs/:jobId/application-uploads

- **Handler:** [hiringloop-backend/src/modules/public-careers/controllers/public-career-controller.js:1](../../hiringloop-backend/src/modules/public-careers/controllers/public-career-controller.js#L1), method inline; declaration [hiringloop-backend/src/modules/public-careers/routes/public-career-routes.js:52](../../hiringloop-backend/src/modules/public-careers/routes/public-career-routes.js#L52). Exact declaration line: hiringloop-backend/src/modules/public-careers/routes/public-career-routes.js:52.
- **Authentication:** Anonymous permitted; Google routes conditional on provider config. **Authorization:** No tenant membership required; public jobs are OPEN-only..
- **Request schema:** params: publicApplicationParamsSchema; body: applicationUploadBodySchema. Headers: Content-Type application/json when sending a JSON body. Path UUID/slug validation is endpoint-owned.
- **Service / DB / response:** [hiringloop-backend/src/modules/public-careers/controllers/public-career-controller.js:1](../../hiringloop-backend/src/modules/public-careers/controllers/public-career-controller.js#L1) defines use-case invocation, success status and envelope; linked use-case/repository/DTO sources above define reads/writes and serialized fields. DTOs: [hiringloop-backend/src/modules/public-careers/domain/public-career-dto.js:1](../../hiringloop-backend/src/modules/public-careers/domain/public-career-dto.js#L1).
- **Failure behavior / tests / consumers:** Shared failures above plus business errors in the linked service. Related tests and frontend API sources are listed for this module; current behavior is not runtime-verified.

```js
router.post(
      '/careers/:organizationSlug/jobs/:jobId/application-uploads',
      publicApplicationRateLimiters.applicationUploadRateLimiter,
      validateRequest({
        params: publicApplicationParamsSchema,
        body: applicationUploadBodySchema,
      }),
      applicationController.authorizeUpload,
    )
```

### POST /api/v1/public/careers/:organizationSlug/jobs/:jobId/applications

- **Handler:** [hiringloop-backend/src/modules/public-careers/controllers/public-career-controller.js:1](../../hiringloop-backend/src/modules/public-careers/controllers/public-career-controller.js#L1), method inline; declaration [hiringloop-backend/src/modules/public-careers/routes/public-career-routes.js:52](../../hiringloop-backend/src/modules/public-careers/routes/public-career-routes.js#L52). Exact declaration line: hiringloop-backend/src/modules/public-careers/routes/public-career-routes.js:61.
- **Authentication:** Anonymous permitted; Google routes conditional on provider config. **Authorization:** No tenant membership required; public jobs are OPEN-only..
- **Request schema:** params: publicApplicationParamsSchema; body: applicationSubmissionBodySchema. Headers: Idempotency-Key UUID required; Content-Type application/json when sending a JSON body. Path UUID/slug validation is endpoint-owned.
- **Service / DB / response:** [hiringloop-backend/src/modules/public-careers/controllers/public-career-controller.js:1](../../hiringloop-backend/src/modules/public-careers/controllers/public-career-controller.js#L1) defines use-case invocation, success status and envelope; linked use-case/repository/DTO sources above define reads/writes and serialized fields. DTOs: [hiringloop-backend/src/modules/public-careers/domain/public-career-dto.js:1](../../hiringloop-backend/src/modules/public-careers/domain/public-career-dto.js#L1).
- **Failure behavior / tests / consumers:** Shared failures above plus business errors in the linked service. Related tests and frontend API sources are listed for this module; current behavior is not runtime-verified.

```js
router.post(
      '/careers/:organizationSlug/jobs/:jobId/applications',
      publicApplicationRateLimiters.applicationSubmissionRateLimiter,
      validateRequest({
        params: publicApplicationParamsSchema,
        body: applicationSubmissionBodySchema,
      }),
      validateIdempotencyKey,
      applicationController.submit,
    )
```

**Module business/infrastructure error vocabulary:** notFoundError.

## scorecards

**Use-case/service sources:** [hiringloop-backend/src/modules/scorecards/use-cases/scorecard-use-cases.js:1](../../hiringloop-backend/src/modules/scorecards/use-cases/scorecard-use-cases.js#L1)

**Persistence sources:** [hiringloop-backend/src/modules/scorecards/repositories/scorecard-repository.js:1](../../hiringloop-backend/src/modules/scorecards/repositories/scorecard-repository.js#L1)

**Frontend consumers:** [hiringloop-frontend/src/features/scorecards/api/scorecards.api.ts:1](../../hiringloop-frontend/src/features/scorecards/api/scorecards.api.ts#L1). This maps the owning feature; direct per-method call-site reachability is not fully verified.

**Existing related tests:** [hiringloop-backend/tests/integration/database/phase18-scorecard-audit.test.js:1](../../hiringloop-backend/tests/integration/database/phase18-scorecard-audit.test.js#L1); [hiringloop-backend/tests/modules/scorecards/scorecard-schemas.test.js:1](../../hiringloop-backend/tests/modules/scorecards/scorecard-schemas.test.js#L1); [hiringloop-backend/tests/modules/scorecards/scorecard-http.test.js:1](../../hiringloop-backend/tests/modules/scorecards/scorecard-http.test.js#L1); [hiringloop-frontend/src/features/scorecards/pages/ScorecardTemplatePage.test.tsx:1](../../hiringloop-frontend/src/features/scorecards/pages/ScorecardTemplatePage.test.tsx#L1); [hiringloop-frontend/src/features/scorecards/pages/MyScorecardPage.test.tsx:1](../../hiringloop-frontend/src/features/scorecards/pages/MyScorecardPage.test.tsx#L1); [hiringloop-frontend/src/features/scorecards/components/ScorecardForm.test.tsx:1](../../hiringloop-frontend/src/features/scorecards/components/ScorecardForm.test.tsx#L1); [hiringloop-frontend/src/features/scorecards/components/FeedbackSections.test.tsx:1](../../hiringloop-frontend/src/features/scorecards/components/FeedbackSections.test.tsx#L1). File association is verified; endpoint-specific assertion completeness and current pass status are UNKNOWN.

### GET /api/v1/organizations/:organizationId/jobs/:jobId/scorecard-template

- **Handler:** [hiringloop-backend/src/modules/scorecards/controllers/scorecard-controller.js:20](../../hiringloop-backend/src/modules/scorecards/controllers/scorecard-controller.js#L20), method getTemplate; declaration [hiringloop-backend/src/modules/scorecards/routes/scorecard-routes.js:33](../../hiringloop-backend/src/modules/scorecards/routes/scorecard-routes.js#L33). Exact declaration line: hiringloop-backend/src/modules/scorecards/routes/scorecard-routes.js:33.
- **Authentication:** Live opaque-cookie session required. **Authorization:** SCORECARD_TEMPLATE_VIEW.
- **Request schema:** params: jobParams. Headers: Content-Type application/json when sending a JSON body. Path UUID/slug validation is endpoint-owned.
- **Service / DB / response:** [hiringloop-backend/src/modules/scorecards/controllers/scorecard-controller.js:20](../../hiringloop-backend/src/modules/scorecards/controllers/scorecard-controller.js#L20) defines use-case invocation, success status and envelope; linked use-case/repository/DTO sources above define reads/writes and serialized fields. DTOs: [hiringloop-backend/src/modules/scorecards/domain/scorecard-dto.js:1](../../hiringloop-backend/src/modules/scorecards/domain/scorecard-dto.js#L1).
- **Failure behavior / tests / consumers:** Shared failures above plus business errors in the linked service. Related tests and frontend API sources are listed for this module; current behavior is not runtime-verified.

```js
router.get(
    '/jobs/:jobId/scorecard-template',
    ...ctx(PERMISSIONS.SCORECARD_TEMPLATE_VIEW),
    validateRequest({ params: jobParams }),
    c.getTemplate,
  )
```

### POST /api/v1/organizations/:organizationId/jobs/:jobId/scorecard-template/draft

- **Handler:** [hiringloop-backend/src/modules/scorecards/controllers/scorecard-controller.js:21](../../hiringloop-backend/src/modules/scorecards/controllers/scorecard-controller.js#L21), method createDraft; declaration [hiringloop-backend/src/modules/scorecards/routes/scorecard-routes.js:39](../../hiringloop-backend/src/modules/scorecards/routes/scorecard-routes.js#L39). Exact declaration line: hiringloop-backend/src/modules/scorecards/routes/scorecard-routes.js:39.
- **Authentication:** Live opaque-cookie session required. **Authorization:** SCORECARD_TEMPLATE_MANAGE.
- **Request schema:** params: jobParams; body: emptyBody. Headers: X-CSRF-Token required; Content-Type application/json when sending a JSON body. Path UUID/slug validation is endpoint-owned.
- **Service / DB / response:** [hiringloop-backend/src/modules/scorecards/controllers/scorecard-controller.js:21](../../hiringloop-backend/src/modules/scorecards/controllers/scorecard-controller.js#L21) defines use-case invocation, success status and envelope; linked use-case/repository/DTO sources above define reads/writes and serialized fields. DTOs: [hiringloop-backend/src/modules/scorecards/domain/scorecard-dto.js:1](../../hiringloop-backend/src/modules/scorecards/domain/scorecard-dto.js#L1).
- **Failure behavior / tests / consumers:** Shared failures above plus business errors in the linked service. Related tests and frontend API sources are listed for this module; current behavior is not runtime-verified.

```js
router.post(
    '/jobs/:jobId/scorecard-template/draft',
    ...ctx(PERMISSIONS.SCORECARD_TEMPLATE_MANAGE, true),
    validateRequest({ params: jobParams, body: emptyBody }),
    c.createDraft,
  )
```

### PATCH /api/v1/organizations/:organizationId/jobs/:jobId/scorecard-template/draft

- **Handler:** [hiringloop-backend/src/modules/scorecards/controllers/scorecard-controller.js:22](../../hiringloop-backend/src/modules/scorecards/controllers/scorecard-controller.js#L22), method updateTemplate; declaration [hiringloop-backend/src/modules/scorecards/routes/scorecard-routes.js:45](../../hiringloop-backend/src/modules/scorecards/routes/scorecard-routes.js#L45). Exact declaration line: hiringloop-backend/src/modules/scorecards/routes/scorecard-routes.js:45.
- **Authentication:** Live opaque-cookie session required. **Authorization:** SCORECARD_TEMPLATE_MANAGE.
- **Request schema:** params: jobParams; body: templateUpdateBody. Headers: X-CSRF-Token required; Content-Type application/json when sending a JSON body. Path UUID/slug validation is endpoint-owned.
- **Service / DB / response:** [hiringloop-backend/src/modules/scorecards/controllers/scorecard-controller.js:22](../../hiringloop-backend/src/modules/scorecards/controllers/scorecard-controller.js#L22) defines use-case invocation, success status and envelope; linked use-case/repository/DTO sources above define reads/writes and serialized fields. DTOs: [hiringloop-backend/src/modules/scorecards/domain/scorecard-dto.js:1](../../hiringloop-backend/src/modules/scorecards/domain/scorecard-dto.js#L1).
- **Failure behavior / tests / consumers:** Shared failures above plus business errors in the linked service. Related tests and frontend API sources are listed for this module; current behavior is not runtime-verified.

```js
router.patch(
    '/jobs/:jobId/scorecard-template/draft',
    ...ctx(PERMISSIONS.SCORECARD_TEMPLATE_MANAGE, true),
    validateRequest({ params: jobParams, body: templateUpdateBody }),
    c.updateTemplate,
  )
```

### POST /api/v1/organizations/:organizationId/jobs/:jobId/scorecard-template/publish

- **Handler:** [hiringloop-backend/src/modules/scorecards/controllers/scorecard-controller.js:23](../../hiringloop-backend/src/modules/scorecards/controllers/scorecard-controller.js#L23), method publishTemplate; declaration [hiringloop-backend/src/modules/scorecards/routes/scorecard-routes.js:39](../../hiringloop-backend/src/modules/scorecards/routes/scorecard-routes.js#L39). Exact declaration line: hiringloop-backend/src/modules/scorecards/routes/scorecard-routes.js:51.
- **Authentication:** Live opaque-cookie session required. **Authorization:** SCORECARD_TEMPLATE_MANAGE.
- **Request schema:** params: jobParams; body: revisionBody. Headers: X-CSRF-Token required; Content-Type application/json when sending a JSON body. Path UUID/slug validation is endpoint-owned.
- **Service / DB / response:** [hiringloop-backend/src/modules/scorecards/controllers/scorecard-controller.js:23](../../hiringloop-backend/src/modules/scorecards/controllers/scorecard-controller.js#L23) defines use-case invocation, success status and envelope; linked use-case/repository/DTO sources above define reads/writes and serialized fields. DTOs: [hiringloop-backend/src/modules/scorecards/domain/scorecard-dto.js:1](../../hiringloop-backend/src/modules/scorecards/domain/scorecard-dto.js#L1).
- **Failure behavior / tests / consumers:** Shared failures above plus business errors in the linked service. Related tests and frontend API sources are listed for this module; current behavior is not runtime-verified.

```js
router.post(
    '/jobs/:jobId/scorecard-template/publish',
    ...ctx(PERMISSIONS.SCORECARD_TEMPLATE_MANAGE, true),
    validateRequest({ params: jobParams, body: revisionBody }),
    c.publishTemplate,
  )
```

### GET /api/v1/organizations/:organizationId/interviews/:interviewId/scorecards

- **Handler:** [hiringloop-backend/src/modules/scorecards/controllers/scorecard-controller.js:24](../../hiringloop-backend/src/modules/scorecards/controllers/scorecard-controller.js#L24), method summary; declaration [hiringloop-backend/src/modules/scorecards/routes/scorecard-routes.js:33](../../hiringloop-backend/src/modules/scorecards/routes/scorecard-routes.js#L33). Exact declaration line: hiringloop-backend/src/modules/scorecards/routes/scorecard-routes.js:57.
- **Authentication:** Live opaque-cookie session required. **Authorization:** SCORECARD_VIEW_SUBMITTED.
- **Request schema:** params: interviewParams. Headers: Content-Type application/json when sending a JSON body. Path UUID/slug validation is endpoint-owned.
- **Service / DB / response:** [hiringloop-backend/src/modules/scorecards/controllers/scorecard-controller.js:24](../../hiringloop-backend/src/modules/scorecards/controllers/scorecard-controller.js#L24) defines use-case invocation, success status and envelope; linked use-case/repository/DTO sources above define reads/writes and serialized fields. DTOs: [hiringloop-backend/src/modules/scorecards/domain/scorecard-dto.js:1](../../hiringloop-backend/src/modules/scorecards/domain/scorecard-dto.js#L1).
- **Failure behavior / tests / consumers:** Shared failures above plus business errors in the linked service. Related tests and frontend API sources are listed for this module; current behavior is not runtime-verified.

```js
router.get(
    '/interviews/:interviewId/scorecards',
    ...ctx(PERMISSIONS.SCORECARD_VIEW_SUBMITTED),
    validateRequest({ params: interviewParams }),
    c.summary,
  )
```

### GET /api/v1/organizations/:organizationId/interviews/:interviewId/my-scorecard

- **Handler:** [hiringloop-backend/src/modules/scorecards/controllers/scorecard-controller.js:25](../../hiringloop-backend/src/modules/scorecards/controllers/scorecard-controller.js#L25), method my; declaration [hiringloop-backend/src/modules/scorecards/routes/scorecard-routes.js:33](../../hiringloop-backend/src/modules/scorecards/routes/scorecard-routes.js#L33). Exact declaration line: hiringloop-backend/src/modules/scorecards/routes/scorecard-routes.js:63.
- **Authentication:** Live opaque-cookie session required. **Authorization:** SCORECARD_COMPLETE.
- **Request schema:** params: interviewParams. Headers: Content-Type application/json when sending a JSON body. Path UUID/slug validation is endpoint-owned.
- **Service / DB / response:** [hiringloop-backend/src/modules/scorecards/controllers/scorecard-controller.js:25](../../hiringloop-backend/src/modules/scorecards/controllers/scorecard-controller.js#L25) defines use-case invocation, success status and envelope; linked use-case/repository/DTO sources above define reads/writes and serialized fields. DTOs: [hiringloop-backend/src/modules/scorecards/domain/scorecard-dto.js:1](../../hiringloop-backend/src/modules/scorecards/domain/scorecard-dto.js#L1).
- **Failure behavior / tests / consumers:** Shared failures above plus business errors in the linked service. Related tests and frontend API sources are listed for this module; current behavior is not runtime-verified.

```js
router.get(
    '/interviews/:interviewId/my-scorecard',
    ...ctx(PERMISSIONS.SCORECARD_COMPLETE),
    validateRequest({ params: interviewParams }),
    c.my,
  )
```

### PATCH /api/v1/organizations/:organizationId/interviews/:interviewId/my-scorecard

- **Handler:** [hiringloop-backend/src/modules/scorecards/controllers/scorecard-controller.js:26](../../hiringloop-backend/src/modules/scorecards/controllers/scorecard-controller.js#L26), method saveMy; declaration [hiringloop-backend/src/modules/scorecards/routes/scorecard-routes.js:45](../../hiringloop-backend/src/modules/scorecards/routes/scorecard-routes.js#L45). Exact declaration line: hiringloop-backend/src/modules/scorecards/routes/scorecard-routes.js:69.
- **Authentication:** Live opaque-cookie session required. **Authorization:** SCORECARD_COMPLETE.
- **Request schema:** params: interviewParams; body: scorecardBody. Headers: X-CSRF-Token required; Content-Type application/json when sending a JSON body. Path UUID/slug validation is endpoint-owned.
- **Service / DB / response:** [hiringloop-backend/src/modules/scorecards/controllers/scorecard-controller.js:26](../../hiringloop-backend/src/modules/scorecards/controllers/scorecard-controller.js#L26) defines use-case invocation, success status and envelope; linked use-case/repository/DTO sources above define reads/writes and serialized fields. DTOs: [hiringloop-backend/src/modules/scorecards/domain/scorecard-dto.js:1](../../hiringloop-backend/src/modules/scorecards/domain/scorecard-dto.js#L1).
- **Failure behavior / tests / consumers:** Shared failures above plus business errors in the linked service. Related tests and frontend API sources are listed for this module; current behavior is not runtime-verified.

```js
router.patch(
    '/interviews/:interviewId/my-scorecard',
    ...ctx(PERMISSIONS.SCORECARD_COMPLETE, true),
    validateRequest({ params: interviewParams, body: scorecardBody }),
    c.saveMy,
  )
```

### POST /api/v1/organizations/:organizationId/interviews/:interviewId/my-scorecard/submit

- **Handler:** [hiringloop-backend/src/modules/scorecards/controllers/scorecard-controller.js:27](../../hiringloop-backend/src/modules/scorecards/controllers/scorecard-controller.js#L27), method submitMy; declaration [hiringloop-backend/src/modules/scorecards/routes/scorecard-routes.js:39](../../hiringloop-backend/src/modules/scorecards/routes/scorecard-routes.js#L39). Exact declaration line: hiringloop-backend/src/modules/scorecards/routes/scorecard-routes.js:75.
- **Authentication:** Live opaque-cookie session required. **Authorization:** SCORECARD_COMPLETE.
- **Request schema:** params: interviewParams; body: scorecardBody. Headers: X-CSRF-Token required; Content-Type application/json when sending a JSON body. Path UUID/slug validation is endpoint-owned.
- **Service / DB / response:** [hiringloop-backend/src/modules/scorecards/controllers/scorecard-controller.js:27](../../hiringloop-backend/src/modules/scorecards/controllers/scorecard-controller.js#L27) defines use-case invocation, success status and envelope; linked use-case/repository/DTO sources above define reads/writes and serialized fields. DTOs: [hiringloop-backend/src/modules/scorecards/domain/scorecard-dto.js:1](../../hiringloop-backend/src/modules/scorecards/domain/scorecard-dto.js#L1).
- **Failure behavior / tests / consumers:** Shared failures above plus business errors in the linked service. Related tests and frontend API sources are listed for this module; current behavior is not runtime-verified.

```js
router.post(
    '/interviews/:interviewId/my-scorecard/submit',
    ...ctx(PERMISSIONS.SCORECARD_COMPLETE, true),
    validateRequest({ params: interviewParams, body: scorecardBody }),
    c.submitMy,
  )
```

### GET /api/v1/organizations/:organizationId/interviews/:interviewId/scorecards/:scorecardId

- **Handler:** [hiringloop-backend/src/modules/scorecards/controllers/scorecard-controller.js:28](../../hiringloop-backend/src/modules/scorecards/controllers/scorecard-controller.js#L28), method submitted; declaration [hiringloop-backend/src/modules/scorecards/routes/scorecard-routes.js:33](../../hiringloop-backend/src/modules/scorecards/routes/scorecard-routes.js#L33). Exact declaration line: hiringloop-backend/src/modules/scorecards/routes/scorecard-routes.js:81.
- **Authentication:** Live opaque-cookie session required. **Authorization:** SCORECARD_VIEW_SUBMITTED.
- **Request schema:** params: scorecardParams. Headers: Content-Type application/json when sending a JSON body. Path UUID/slug validation is endpoint-owned.
- **Service / DB / response:** [hiringloop-backend/src/modules/scorecards/controllers/scorecard-controller.js:28](../../hiringloop-backend/src/modules/scorecards/controllers/scorecard-controller.js#L28) defines use-case invocation, success status and envelope; linked use-case/repository/DTO sources above define reads/writes and serialized fields. DTOs: [hiringloop-backend/src/modules/scorecards/domain/scorecard-dto.js:1](../../hiringloop-backend/src/modules/scorecards/domain/scorecard-dto.js#L1).
- **Failure behavior / tests / consumers:** Shared failures above plus business errors in the linked service. Related tests and frontend API sources are listed for this module; current behavior is not runtime-verified.

```js
router.get(
    '/interviews/:interviewId/scorecards/:scorecardId',
    ...ctx(PERMISSIONS.SCORECARD_VIEW_SUBMITTED),
    validateRequest({ params: scorecardParams }),
    c.submitted,
  )
```

### GET /api/v1/organizations/:organizationId/applications/:applicationId/scorecards

- **Handler:** [hiringloop-backend/src/modules/scorecards/controllers/scorecard-controller.js:29](../../hiringloop-backend/src/modules/scorecards/controllers/scorecard-controller.js#L29), method application; declaration [hiringloop-backend/src/modules/scorecards/routes/scorecard-routes.js:33](../../hiringloop-backend/src/modules/scorecards/routes/scorecard-routes.js#L33). Exact declaration line: hiringloop-backend/src/modules/scorecards/routes/scorecard-routes.js:87.
- **Authentication:** Live opaque-cookie session required. **Authorization:** SCORECARD_VIEW_SUBMITTED.
- **Request schema:** params: applicationParams. Headers: Content-Type application/json when sending a JSON body. Path UUID/slug validation is endpoint-owned.
- **Service / DB / response:** [hiringloop-backend/src/modules/scorecards/controllers/scorecard-controller.js:29](../../hiringloop-backend/src/modules/scorecards/controllers/scorecard-controller.js#L29) defines use-case invocation, success status and envelope; linked use-case/repository/DTO sources above define reads/writes and serialized fields. DTOs: [hiringloop-backend/src/modules/scorecards/domain/scorecard-dto.js:1](../../hiringloop-backend/src/modules/scorecards/domain/scorecard-dto.js#L1).
- **Failure behavior / tests / consumers:** Shared failures above plus business errors in the linked service. Related tests and frontend API sources are listed for this module; current behavior is not runtime-verified.

```js
router.get(
    '/applications/:applicationId/scorecards',
    ...ctx(PERMISSIONS.SCORECARD_VIEW_SUBMITTED),
    validateRequest({ params: applicationParams }),
    c.application,
  )
```

### GET /api/v1/organizations/:organizationId/applications/:applicationId/notes

- **Handler:** [hiringloop-backend/src/modules/scorecards/controllers/scorecard-controller.js:30](../../hiringloop-backend/src/modules/scorecards/controllers/scorecard-controller.js#L30), method listNotes; declaration [hiringloop-backend/src/modules/scorecards/routes/scorecard-routes.js:33](../../hiringloop-backend/src/modules/scorecards/routes/scorecard-routes.js#L33). Exact declaration line: hiringloop-backend/src/modules/scorecards/routes/scorecard-routes.js:93.
- **Authentication:** Live opaque-cookie session required. **Authorization:** APPLICATION_NOTE_MANAGE.
- **Request schema:** params: applicationParams. Headers: Content-Type application/json when sending a JSON body. Path UUID/slug validation is endpoint-owned.
- **Service / DB / response:** [hiringloop-backend/src/modules/scorecards/controllers/scorecard-controller.js:30](../../hiringloop-backend/src/modules/scorecards/controllers/scorecard-controller.js#L30) defines use-case invocation, success status and envelope; linked use-case/repository/DTO sources above define reads/writes and serialized fields. DTOs: [hiringloop-backend/src/modules/scorecards/domain/scorecard-dto.js:1](../../hiringloop-backend/src/modules/scorecards/domain/scorecard-dto.js#L1).
- **Failure behavior / tests / consumers:** Shared failures above plus business errors in the linked service. Related tests and frontend API sources are listed for this module; current behavior is not runtime-verified.

```js
router.get(
    '/applications/:applicationId/notes',
    ...ctx(PERMISSIONS.APPLICATION_NOTE_MANAGE),
    validateRequest({ params: applicationParams }),
    c.listNotes,
  )
```

### POST /api/v1/organizations/:organizationId/applications/:applicationId/notes

- **Handler:** [hiringloop-backend/src/modules/scorecards/controllers/scorecard-controller.js:31](../../hiringloop-backend/src/modules/scorecards/controllers/scorecard-controller.js#L31), method createNote; declaration [hiringloop-backend/src/modules/scorecards/routes/scorecard-routes.js:39](../../hiringloop-backend/src/modules/scorecards/routes/scorecard-routes.js#L39). Exact declaration line: hiringloop-backend/src/modules/scorecards/routes/scorecard-routes.js:99.
- **Authentication:** Live opaque-cookie session required. **Authorization:** APPLICATION_NOTE_MANAGE.
- **Request schema:** params: applicationParams; body: noteCreateBody. Headers: X-CSRF-Token required; Content-Type application/json when sending a JSON body. Path UUID/slug validation is endpoint-owned.
- **Service / DB / response:** [hiringloop-backend/src/modules/scorecards/controllers/scorecard-controller.js:31](../../hiringloop-backend/src/modules/scorecards/controllers/scorecard-controller.js#L31) defines use-case invocation, success status and envelope; linked use-case/repository/DTO sources above define reads/writes and serialized fields. DTOs: [hiringloop-backend/src/modules/scorecards/domain/scorecard-dto.js:1](../../hiringloop-backend/src/modules/scorecards/domain/scorecard-dto.js#L1).
- **Failure behavior / tests / consumers:** Shared failures above plus business errors in the linked service. Related tests and frontend API sources are listed for this module; current behavior is not runtime-verified.

```js
router.post(
    '/applications/:applicationId/notes',
    ...ctx(PERMISSIONS.APPLICATION_NOTE_MANAGE, true),
    validateRequest({ params: applicationParams, body: noteCreateBody }),
    c.createNote,
  )
```

### PATCH /api/v1/organizations/:organizationId/applications/:applicationId/notes/:noteId

- **Handler:** [hiringloop-backend/src/modules/scorecards/controllers/scorecard-controller.js:32](../../hiringloop-backend/src/modules/scorecards/controllers/scorecard-controller.js#L32), method updateNote; declaration [hiringloop-backend/src/modules/scorecards/routes/scorecard-routes.js:45](../../hiringloop-backend/src/modules/scorecards/routes/scorecard-routes.js#L45). Exact declaration line: hiringloop-backend/src/modules/scorecards/routes/scorecard-routes.js:105.
- **Authentication:** Live opaque-cookie session required. **Authorization:** APPLICATION_NOTE_MANAGE.
- **Request schema:** params: noteParams; body: noteUpdateBody. Headers: X-CSRF-Token required; Content-Type application/json when sending a JSON body. Path UUID/slug validation is endpoint-owned.
- **Service / DB / response:** [hiringloop-backend/src/modules/scorecards/controllers/scorecard-controller.js:32](../../hiringloop-backend/src/modules/scorecards/controllers/scorecard-controller.js#L32) defines use-case invocation, success status and envelope; linked use-case/repository/DTO sources above define reads/writes and serialized fields. DTOs: [hiringloop-backend/src/modules/scorecards/domain/scorecard-dto.js:1](../../hiringloop-backend/src/modules/scorecards/domain/scorecard-dto.js#L1).
- **Failure behavior / tests / consumers:** Shared failures above plus business errors in the linked service. Related tests and frontend API sources are listed for this module; current behavior is not runtime-verified.

```js
router.patch(
    '/applications/:applicationId/notes/:noteId',
    ...ctx(PERMISSIONS.APPLICATION_NOTE_MANAGE, true),
    validateRequest({ params: noteParams, body: noteUpdateBody }),
    c.updateNote,
  )
```

### DELETE /api/v1/organizations/:organizationId/applications/:applicationId/notes/:noteId

- **Handler:** [hiringloop-backend/src/modules/scorecards/controllers/scorecard-controller.js:33](../../hiringloop-backend/src/modules/scorecards/controllers/scorecard-controller.js#L33), method deleteNote; declaration [hiringloop-backend/src/modules/scorecards/routes/scorecard-routes.js:111](../../hiringloop-backend/src/modules/scorecards/routes/scorecard-routes.js#L111). Exact declaration line: hiringloop-backend/src/modules/scorecards/routes/scorecard-routes.js:111.
- **Authentication:** Live opaque-cookie session required. **Authorization:** APPLICATION_NOTE_MANAGE.
- **Request schema:** params: noteParams; body: emptyBody. Headers: X-CSRF-Token required; Content-Type application/json when sending a JSON body. Path UUID/slug validation is endpoint-owned.
- **Service / DB / response:** [hiringloop-backend/src/modules/scorecards/controllers/scorecard-controller.js:33](../../hiringloop-backend/src/modules/scorecards/controllers/scorecard-controller.js#L33) defines use-case invocation, success status and envelope; linked use-case/repository/DTO sources above define reads/writes and serialized fields. DTOs: [hiringloop-backend/src/modules/scorecards/domain/scorecard-dto.js:1](../../hiringloop-backend/src/modules/scorecards/domain/scorecard-dto.js#L1).
- **Failure behavior / tests / consumers:** Shared failures above plus business errors in the linked service. Related tests and frontend API sources are listed for this module; current behavior is not runtime-verified.

```js
router.delete(
    '/applications/:applicationId/notes/:noteId',
    ...ctx(PERMISSIONS.APPLICATION_NOTE_MANAGE, true),
    validateRequest({ params: noteParams, body: emptyBody }),
    c.deleteNote,
  )
```

**Module business/infrastructure error vocabulary:** conflictError, notFoundError, validationError, forbiddenError.

## talent-pools

**Use-case/service sources:** [hiringloop-backend/src/modules/talent-pools/use-cases/talent-pool-use-cases.js:1](../../hiringloop-backend/src/modules/talent-pools/use-cases/talent-pool-use-cases.js#L1)

**Persistence sources:** [hiringloop-backend/src/modules/talent-pools/repositories/talent-pool-repository.js:1](../../hiringloop-backend/src/modules/talent-pools/repositories/talent-pool-repository.js#L1)

**Frontend consumers:** [hiringloop-frontend/src/features/talent-pools/api/talent-pools.api.ts:1](../../hiringloop-frontend/src/features/talent-pools/api/talent-pools.api.ts#L1). This maps the owning feature; direct per-method call-site reachability is not fully verified.

**Existing related tests:** [hiringloop-backend/tests/integration/phase17-tenant-isolation-http.test.js:1](../../hiringloop-backend/tests/integration/phase17-tenant-isolation-http.test.js#L1); [hiringloop-backend/tests/integration/phase17-talent-pools-http.test.js:1](../../hiringloop-backend/tests/integration/phase17-talent-pools-http.test.js#L1); [hiringloop-backend/tests/integration/phase17-outcomes-http.test.js:1](../../hiringloop-backend/tests/integration/phase17-outcomes-http.test.js#L1); [hiringloop-backend/tests/integration/phase17-offers-http.test.js:1](../../hiringloop-backend/tests/integration/phase17-offers-http.test.js#L1); [hiringloop-backend/tests/integration/phase17-access-http.test.js:1](../../hiringloop-backend/tests/integration/phase17-access-http.test.js#L1); [hiringloop-backend/tests/integration/database/phase17-offer-talent-integrity.test.js:1](../../hiringloop-backend/tests/integration/database/phase17-offer-talent-integrity.test.js#L1); [hiringloop-backend/tests/modules/phase17-offer-outcome-use-cases.test.js:1](../../hiringloop-backend/tests/modules/phase17-offer-outcome-use-cases.test.js#L1); [hiringloop-frontend/src/features/talent-pools/talent-pools.test.tsx:1](../../hiringloop-frontend/src/features/talent-pools/talent-pools.test.tsx#L1). File association is verified; endpoint-specific assertion completeness and current pass status are UNKNOWN.

### GET /api/v1/organizations/:organizationId/talent-pools

- **Handler:** [hiringloop-backend/src/modules/talent-pools/controllers/talent-pool-controller.js:25](../../hiringloop-backend/src/modules/talent-pools/controllers/talent-pool-controller.js#L25), method list; declaration [hiringloop-backend/src/modules/talent-pools/routes/talent-pool-routes.js:35](../../hiringloop-backend/src/modules/talent-pools/routes/talent-pool-routes.js#L35). Exact declaration line: hiringloop-backend/src/modules/talent-pools/routes/talent-pool-routes.js:35.
- **Authentication:** Live opaque-cookie session required. **Authorization:** TALENT_POOL_VIEW.
- **Request schema:** params: poolOrganizationParamsSchema; query: poolPageSchema. Headers: Content-Type application/json when sending a JSON body. Path UUID/slug validation is endpoint-owned.
- **Service / DB / response:** [hiringloop-backend/src/modules/talent-pools/controllers/talent-pool-controller.js:25](../../hiringloop-backend/src/modules/talent-pools/controllers/talent-pool-controller.js#L25) defines use-case invocation, success status and envelope; linked use-case/repository/DTO sources above define reads/writes and serialized fields. DTOs: [hiringloop-backend/src/modules/talent-pools/domain/talent-pool-dto.js:1](../../hiringloop-backend/src/modules/talent-pools/domain/talent-pool-dto.js#L1).
- **Failure behavior / tests / consumers:** Shared failures above plus business errors in the linked service. Related tests and frontend API sources are listed for this module; current behavior is not runtime-verified.

```js
router.get(
    '/talent-pools',
    ...read(PERMISSIONS.TALENT_POOL_VIEW),
    validateRequest({
      params: poolOrganizationParamsSchema,
      query: poolPageSchema,
    }),
    controller.list,
  )
```

### POST /api/v1/organizations/:organizationId/talent-pools

- **Handler:** [hiringloop-backend/src/modules/talent-pools/controllers/talent-pool-controller.js:1](../../hiringloop-backend/src/modules/talent-pools/controllers/talent-pool-controller.js#L1), method create; declaration [hiringloop-backend/src/modules/talent-pools/routes/talent-pool-routes.js:44](../../hiringloop-backend/src/modules/talent-pools/routes/talent-pool-routes.js#L44). Exact declaration line: hiringloop-backend/src/modules/talent-pools/routes/talent-pool-routes.js:44.
- **Authentication:** Live opaque-cookie session required. **Authorization:** TALENT_POOL_MANAGE.
- **Request schema:** params: poolOrganizationParamsSchema; body: poolBodySchema. Headers: X-CSRF-Token required; Content-Type application/json when sending a JSON body. Path UUID/slug validation is endpoint-owned.
- **Service / DB / response:** [hiringloop-backend/src/modules/talent-pools/controllers/talent-pool-controller.js:1](../../hiringloop-backend/src/modules/talent-pools/controllers/talent-pool-controller.js#L1) defines use-case invocation, success status and envelope; linked use-case/repository/DTO sources above define reads/writes and serialized fields. DTOs: [hiringloop-backend/src/modules/talent-pools/domain/talent-pool-dto.js:1](../../hiringloop-backend/src/modules/talent-pools/domain/talent-pool-dto.js#L1).
- **Failure behavior / tests / consumers:** Shared failures above plus business errors in the linked service. Related tests and frontend API sources are listed for this module; current behavior is not runtime-verified.

```js
router.post(
    '/talent-pools',
    ...write(PERMISSIONS.TALENT_POOL_MANAGE),
    validateRequest({
      params: poolOrganizationParamsSchema,
      body: poolBodySchema,
    }),
    controller.create,
  )
```

### PATCH /api/v1/organizations/:organizationId/talent-pools/:talentPoolId

- **Handler:** [hiringloop-backend/src/modules/talent-pools/controllers/talent-pool-controller.js:27](../../hiringloop-backend/src/modules/talent-pools/controllers/talent-pool-controller.js#L27), method update; declaration [hiringloop-backend/src/modules/talent-pools/routes/talent-pool-routes.js:53](../../hiringloop-backend/src/modules/talent-pools/routes/talent-pool-routes.js#L53). Exact declaration line: hiringloop-backend/src/modules/talent-pools/routes/talent-pool-routes.js:53.
- **Authentication:** Live opaque-cookie session required. **Authorization:** TALENT_POOL_MANAGE.
- **Request schema:** params: poolParamsSchema; body: poolUpdateBodySchema. Headers: X-CSRF-Token required; Content-Type application/json when sending a JSON body. Path UUID/slug validation is endpoint-owned.
- **Service / DB / response:** [hiringloop-backend/src/modules/talent-pools/controllers/talent-pool-controller.js:27](../../hiringloop-backend/src/modules/talent-pools/controllers/talent-pool-controller.js#L27) defines use-case invocation, success status and envelope; linked use-case/repository/DTO sources above define reads/writes and serialized fields. DTOs: [hiringloop-backend/src/modules/talent-pools/domain/talent-pool-dto.js:1](../../hiringloop-backend/src/modules/talent-pools/domain/talent-pool-dto.js#L1).
- **Failure behavior / tests / consumers:** Shared failures above plus business errors in the linked service. Related tests and frontend API sources are listed for this module; current behavior is not runtime-verified.

```js
router.patch(
    '/talent-pools/:talentPoolId',
    ...write(PERMISSIONS.TALENT_POOL_MANAGE),
    validateRequest({ params: poolParamsSchema, body: poolUpdateBodySchema }),
    controller.update,
  )
```

### GET /api/v1/organizations/:organizationId/talent-pools/:talentPoolId/members

- **Handler:** [hiringloop-backend/src/modules/talent-pools/controllers/talent-pool-controller.js:28](../../hiringloop-backend/src/modules/talent-pools/controllers/talent-pool-controller.js#L28), method listMembers; declaration [hiringloop-backend/src/modules/talent-pools/routes/talent-pool-routes.js:35](../../hiringloop-backend/src/modules/talent-pools/routes/talent-pool-routes.js#L35). Exact declaration line: hiringloop-backend/src/modules/talent-pools/routes/talent-pool-routes.js:59.
- **Authentication:** Live opaque-cookie session required. **Authorization:** TALENT_POOL_VIEW.
- **Request schema:** params: poolParamsSchema; query: poolPageSchema. Headers: Content-Type application/json when sending a JSON body. Path UUID/slug validation is endpoint-owned.
- **Service / DB / response:** [hiringloop-backend/src/modules/talent-pools/controllers/talent-pool-controller.js:28](../../hiringloop-backend/src/modules/talent-pools/controllers/talent-pool-controller.js#L28) defines use-case invocation, success status and envelope; linked use-case/repository/DTO sources above define reads/writes and serialized fields. DTOs: [hiringloop-backend/src/modules/talent-pools/domain/talent-pool-dto.js:1](../../hiringloop-backend/src/modules/talent-pools/domain/talent-pool-dto.js#L1).
- **Failure behavior / tests / consumers:** Shared failures above plus business errors in the linked service. Related tests and frontend API sources are listed for this module; current behavior is not runtime-verified.

```js
router.get(
    '/talent-pools/:talentPoolId/members',
    ...read(PERMISSIONS.TALENT_POOL_VIEW),
    validateRequest({ params: poolParamsSchema, query: poolPageSchema }),
    controller.listMembers,
  )
```

### POST /api/v1/organizations/:organizationId/talent-pools/:talentPoolId/members

- **Handler:** [hiringloop-backend/src/modules/talent-pools/controllers/talent-pool-controller.js:29](../../hiringloop-backend/src/modules/talent-pools/controllers/talent-pool-controller.js#L29), method addMember; declaration [hiringloop-backend/src/modules/talent-pools/routes/talent-pool-routes.js:44](../../hiringloop-backend/src/modules/talent-pools/routes/talent-pool-routes.js#L44). Exact declaration line: hiringloop-backend/src/modules/talent-pools/routes/talent-pool-routes.js:65.
- **Authentication:** Live opaque-cookie session required. **Authorization:** TALENT_POOL_MEMBER_MANAGE.
- **Request schema:** params: poolParamsSchema; body: poolMemberBodySchema. Headers: X-CSRF-Token required; Content-Type application/json when sending a JSON body. Path UUID/slug validation is endpoint-owned.
- **Service / DB / response:** [hiringloop-backend/src/modules/talent-pools/controllers/talent-pool-controller.js:29](../../hiringloop-backend/src/modules/talent-pools/controllers/talent-pool-controller.js#L29) defines use-case invocation, success status and envelope; linked use-case/repository/DTO sources above define reads/writes and serialized fields. DTOs: [hiringloop-backend/src/modules/talent-pools/domain/talent-pool-dto.js:1](../../hiringloop-backend/src/modules/talent-pools/domain/talent-pool-dto.js#L1).
- **Failure behavior / tests / consumers:** Shared failures above plus business errors in the linked service. Related tests and frontend API sources are listed for this module; current behavior is not runtime-verified.

```js
router.post(
    '/talent-pools/:talentPoolId/members',
    ...write(PERMISSIONS.TALENT_POOL_MEMBER_MANAGE),
    validateRequest({ params: poolParamsSchema, body: poolMemberBodySchema }),
    controller.addMember,
  )
```

### DELETE /api/v1/organizations/:organizationId/talent-pools/:talentPoolId/members/:candidateId

- **Handler:** [hiringloop-backend/src/modules/talent-pools/controllers/talent-pool-controller.js:30](../../hiringloop-backend/src/modules/talent-pools/controllers/talent-pool-controller.js#L30), method removeMember; declaration [hiringloop-backend/src/modules/talent-pools/routes/talent-pool-routes.js:71](../../hiringloop-backend/src/modules/talent-pools/routes/talent-pool-routes.js#L71). Exact declaration line: hiringloop-backend/src/modules/talent-pools/routes/talent-pool-routes.js:71.
- **Authentication:** Live opaque-cookie session required. **Authorization:** TALENT_POOL_MEMBER_MANAGE.
- **Request schema:** params: memberParamsSchema. Headers: X-CSRF-Token required; Content-Type application/json when sending a JSON body. Path UUID/slug validation is endpoint-owned.
- **Service / DB / response:** [hiringloop-backend/src/modules/talent-pools/controllers/talent-pool-controller.js:30](../../hiringloop-backend/src/modules/talent-pools/controllers/talent-pool-controller.js#L30) defines use-case invocation, success status and envelope; linked use-case/repository/DTO sources above define reads/writes and serialized fields. DTOs: [hiringloop-backend/src/modules/talent-pools/domain/talent-pool-dto.js:1](../../hiringloop-backend/src/modules/talent-pools/domain/talent-pool-dto.js#L1).
- **Failure behavior / tests / consumers:** Shared failures above plus business errors in the linked service. Related tests and frontend API sources are listed for this module; current behavior is not runtime-verified.

```js
router.delete(
    '/talent-pools/:talentPoolId/members/:candidateId',
    ...write(PERMISSIONS.TALENT_POOL_MEMBER_MANAGE),
    validateRequest({ params: memberParamsSchema }),
    controller.removeMember,
  )
```

**Module business/infrastructure error vocabulary:** ApplicationError, TALENT_POOL_CONFLICT, TALENT_POOL_NOT_FOUND, VALIDATION_ERROR.

## health

**Use-case/service sources:** inline liveness handler

**Persistence sources:** None

**Frontend consumers:** No dedicated frontend API consumer found. This maps the owning feature; direct per-method call-site reachability is not fully verified.

**Existing related tests:** [hiringloop-backend/tests/health.test.js:1](../../hiringloop-backend/tests/health.test.js#L1). File association is verified; endpoint-specific assertion completeness and current pass status are UNKNOWN.

### GET /health

- **Handler:** [hiringloop-backend/src/app.js:1](../../hiringloop-backend/src/app.js#L1) inline handler; declaration [hiringloop-backend/src/app.js:40](../../hiringloop-backend/src/app.js#L40). Exact declaration line: hiringloop-backend/src/app.js:40.
- **Authentication:** Anonymous permitted; Google routes conditional on provider config. **Authorization:** No tenant membership required; public jobs are OPEN-only..
- **Request schema:** No body/query schema named; see middleware declaration below. Headers: Content-Type application/json when sending a JSON body. Path UUID/slug validation is endpoint-owned.
- **Service / DB / response:** No DB work; returns 200 {status:ok}.
- **Failure behavior / tests / consumers:** Shared failures above plus business errors in the linked service. Related tests and frontend API sources are listed for this module; current behavior is not runtime-verified.

```js
app.get('/health', (_request, response) => {
  response.json({ status: 'ok' });
})
```

**Module business/infrastructure error vocabulary:** See inline handlers and shared errors.

## Exact request and response contract catalog

These are repository schemas/serializers, not generated OpenAPI or observed network samples. Resolve each endpoint's named schema and handler here. Validators can coerce dates, integers and BigInt; responses serialize offer minor units as strings. No private runtime values are included.

### hiringloop-backend/src/modules/talent-pools/schemas/talent-pool-schemas.js

[hiringloop-backend/src/modules/talent-pools/schemas/talent-pool-schemas.js:1](../../hiringloop-backend/src/modules/talent-pools/schemas/talent-pool-schemas.js#L1)

```js
import { z } from 'zod';
const id = z.uuid();
export const poolOrganizationParamsSchema = z.object({ organizationId: id });
export const poolParamsSchema = z.object({
  organizationId: id,
  talentPoolId: id,
});
export const memberParamsSchema = poolParamsSchema.extend({ candidateId: id });
export const poolBodySchema = z
  .object({
    name: z.string().trim().min(1).max(160),
    description: z.string().trim().max(1000).optional(),
  })
  .strict();
export const poolUpdateBodySchema = poolBodySchema
  .extend({ expectedRevision: z.number().int().positive() })
  .strict();
export const poolMemberBodySchema = z
  .object({
    candidateId: id,
    sourceApplicationId: id.optional(),
    note: z.string().trim().max(1000).optional(),
  })
  .strict();
export const poolPageSchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(25),
    search: z.string().trim().max(100).optional(),
  })
  .strict();

```

### hiringloop-backend/src/modules/candidates/schemas/candidate-management-schemas.js

[hiringloop-backend/src/modules/candidates/schemas/candidate-management-schemas.js:1](../../hiringloop-backend/src/modules/candidates/schemas/candidate-management-schemas.js#L1)

```js
import { z } from 'zod';

const organizationId = z.uuid();

export const candidateListParamsSchema = z.object({ organizationId });
export const candidateParamsSchema = z.object({
  organizationId,
  candidateId: z.uuid(),
});
export const applicationParamsSchema = z.object({
  organizationId,
  applicationId: z.uuid(),
});
export const documentParamsSchema = z.object({
  organizationId,
  documentId: z.uuid(),
});

export const candidateListQuerySchema = z
  .object({
    search: z.string().trim().min(1).max(320).optional(),
    jobId: z.uuid().optional(),
    stageId: z.uuid().optional(),
    sort: z
      .enum(['newestApplication', 'oldestApplication', 'nameAsc', 'nameDesc'])
      .default('newestApplication'),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(25),
  })
  .strict();

```

### hiringloop-backend/src/modules/talent-pools/domain/talent-pool-dto.js

[hiringloop-backend/src/modules/talent-pools/domain/talent-pool-dto.js:1](../../hiringloop-backend/src/modules/talent-pools/domain/talent-pool-dto.js#L1)

```js
export const toTalentPoolDto = (pool) => ({
  id: pool.id,
  name: pool.name,
  description: pool.description,
  revision: pool.revision,
  createdAt: pool.createdAt,
  updatedAt: pool.updatedAt,
  memberCount: pool['_count']?.members ?? pool.memberCount ?? 0,
});
export const toTalentPoolMemberDto = (member) => ({
  id: member.id,
  candidate: {
    id: member.candidate.id,
    firstName: member.candidate.firstName,
    lastName: member.candidate.lastName,
    email: member.candidate.email,
  },
  sourceApplicationId: member.sourceApplicationId,
  note: member.note,
  createdAt: member.createdAt,
});

```

### hiringloop-backend/src/modules/talent-pools/controllers/talent-pool-controller.js

[hiringloop-backend/src/modules/talent-pools/controllers/talent-pool-controller.js:1](../../hiringloop-backend/src/modules/talent-pools/controllers/talent-pool-controller.js#L1)

```js
export function createTalentPoolController(useCases) {
  const scope = (request) => ({
    organizationId: request.tenantContext.organizationId,
    talentPoolId: request.validated.params.talentPoolId,
    candidateId: request.validated.params.candidateId,
    actorUserId: request.auth.userId,
    requestId: request.requestId,
  });
  const handle =
    (name, status = 200) =>
    async (request, response, next) => {
      try {
        response.status(status).json({
          data: await useCases[name]({
            ...scope(request),
            data: request.validated.body,
            ...request.validated.query,
          }),
        });
      } catch (error) {
        next(error);
      }
    };
  return {
    list: handle('list'),
    create: handle('create', 201),
    update: handle('update'),
    listMembers: handle('listMembers'),
    addMember: handle('addMember', 201),
    removeMember: async (request, response, next) => {
      try {
        await useCases.removeMember(scope(request));
        response.status(204).end();
      } catch (error) {
        next(error);
      }
    },
  };
}

```

### hiringloop-backend/src/modules/candidates/domain/candidate-management-dto.js

[hiringloop-backend/src/modules/candidates/domain/candidate-management-dto.js:1](../../hiringloop-backend/src/modules/candidates/domain/candidate-management-dto.js#L1)

```js
function name(candidate) {
  return `${candidate.firstName} ${candidate.lastName}`.trim();
}

const stage = (item) => item && { id: item.id, name: item.name };

const applicationSummary = (application) => ({
  id: application.id,
  job: { id: application.job.id, title: application.job.title },
  currentStage: stage(application.currentStage),
  submittedAt: application.submittedAt,
});

function selectedOptions(answer) {
  const options = answer.question.options;
  const value = answer.value;
  const ids =
    answer.question.type === 'SINGLE_SELECT'
      ? [value?.optionId]
      : answer.question.type === 'MULTI_SELECT'
        ? value?.optionIds
        : [];
  if (!Array.isArray(ids)) return [];
  return ids
    .map((id) => options.find((option) => option.id === id))
    .filter(Boolean)
    .map((option) => ({ id: option.id, label: option.label }));
}

export const toCandidateListItemDto = (item) => ({
  id: item.candidateId,
  name: item.name,
  email: item.email,
  applicationCount: Number(item.applicationCount),
  latestApplication: item.applicationId
    ? {
        id: item.applicationId,
        job: { id: item.jobId, title: item.jobTitle },
        currentStage: { id: item.stageId, name: item.stageName },
        submittedAt: item.submittedAt,
      }
    : null,
});

export const toCandidateDetailDto = (candidate) => ({
  id: candidate.id,
  name: name(candidate),
  email: candidate.email,
  phone: candidate.phone,
  createdAt: candidate.createdAt,
  applications: candidate.applications.map(applicationSummary),
});

export const toApplicationDetailDto = (application) => ({
  id: application.id,
  submittedAt: application.submittedAt,
  formVersionId: application.applicationFormVersionId,
  candidate: {
    id: application.candidate.id,
    name: name(application.candidate),
    email: application.candidate.email,
    phone: application.candidate.phone,
  },
  job: { id: application.job.id, title: application.job.title },
  currentStage: stage(application.currentStage),
  outcome: application.outcome,
  outcomeRevision: application.outcomeRevision,
  outcomeUpdatedAt: application.outcomeUpdatedAt,
  outcomeHistory: (application.outcomeEvents ?? []).map((event) => ({
    id: event.id,
    type: event.type,
    reasonCode: event.reasonCode,
    reasonDetails: event.reasonDetails,
    occurredAt: event.occurredAt,
  })),
  answers: application.answers
    .sort((a, b) => a.question.sortOrder - b.question.sortOrder)
    .map((answer) => ({
      question: {
        id: answer.question.id,
        type: answer.question.type,
        label: answer.question.label,
        description: answer.question.description,
        required: answer.question.required,
        sortOrder: answer.question.sortOrder,
      },
      value: answer.value,
      selectedOptions: selectedOptions(answer),
    })),
  documents: application.documents.map((document) => ({
    id: document.id,
    fileName: document.originalFilename,
    contentType: document.mimeType,
    type: document.type,
    createdAt: document.createdAt,
  })),
  stageHistory: application.stageHistory.map((entry) => ({
    id: entry.id,
    event: entry.event,
    occurredAt: entry.occurredAt,
    fromStage: stage(entry.fromStage),
    toStage: stage(entry.toStage),
  })),
});

```

### hiringloop-backend/src/modules/scorecards/schemas/scorecard-schemas.js

[hiringloop-backend/src/modules/scorecards/schemas/scorecard-schemas.js:1](../../hiringloop-backend/src/modules/scorecards/schemas/scorecard-schemas.js#L1)

```js
import { z } from 'zod';

const uuid = z.uuid();
const text = (max) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => v || null);
export const jobParams = z.object({ organizationId: uuid, jobId: uuid });
export const interviewParams = z.object({
  organizationId: uuid,
  interviewId: uuid,
});
export const scorecardParams = interviewParams.extend({ scorecardId: uuid });
export const applicationParams = z.object({
  organizationId: uuid,
  applicationId: uuid,
});
export const noteParams = applicationParams.extend({ noteId: uuid });
export const emptyBody = z.object({}).strict();
export const templateUpdateBody = z
  .object({
    expectedRevision: z.number().int().min(1),
    title: z.string().trim().min(1).max(160),
    instructions: text(10000).optional(),
    criteria: z
      .array(
        z
          .object({
            id: uuid.optional(),
            label: z.string().trim().min(1).max(300),
            description: text(5000).optional(),
            type: z.enum(['RATING', 'TEXT']),
            required: z.boolean(),
            position: z.number().int().min(1),
          })
          .strict(),
      )
      .max(100),
  })
  .strict()
  .superRefine((v, ctx) => {
    const positions = v.criteria.map((c) => c.position);
    if (new Set(positions).size !== positions.length)
      ctx.addIssue({
        code: 'custom',
        message: 'Criterion positions must be unique',
      });
  });
export const revisionBody = z
  .object({ expectedRevision: z.number().int().min(1) })
  .strict();
const response = z
  .object({
    criterionId: uuid,
    ratingValue: z.number().int().min(1).max(5).nullable().optional(),
    textValue: text(10000).optional(),
    comment: text(5000).optional(),
  })
  .strict();
export const scorecardBody = z
  .object({
    expectedRevision: z.number().int().min(1).optional(),
    responses: z.array(response).max(100),
    overallRecommendation: z
      .enum(['STRONG_NO', 'NO', 'MIXED', 'YES', 'STRONG_YES'])
      .nullable()
      .optional(),
    overallComment: text(10000).optional(),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (
      new Set(v.responses.map((r) => r.criterionId)).size !== v.responses.length
    )
      ctx.addIssue({
        code: 'custom',
        message: 'Responses must be unique by criterion',
      });
  });
export const noteCreateBody = z
  .object({ body: z.string().trim().min(1).max(10000) })
  .strict();
export const noteUpdateBody = z
  .object({
    expectedRevision: z.number().int().min(1),
    body: z.string().trim().min(1).max(10000),
  })
  .strict();

```

### hiringloop-backend/src/modules/candidates/controllers/candidate-management-controller.js

[hiringloop-backend/src/modules/candidates/controllers/candidate-management-controller.js:1](../../hiringloop-backend/src/modules/candidates/controllers/candidate-management-controller.js#L1)

```js
export function createCandidateManagementController(useCases) {
  const input = (request) => ({
    organizationId: request.tenantContext.organizationId,
    ...request.validated.params,
  });
  return {
    list: async (request, response, next) => {
      try {
        const result = await useCases.list({
          organizationId: request.tenantContext.organizationId,
          ...request.validated.query,
        });
        response.status(200).json({
          data: { candidates: result.candidates },
          pagination: result.pagination,
        });
      } catch (error) {
        next(error);
      }
    },
    candidateDetail: async (request, response, next) => {
      try {
        response.status(200).json({
          data: { candidate: await useCases.candidateDetail(input(request)) },
        });
      } catch (error) {
        next(error);
      }
    },
    applicationDetail: async (request, response, next) => {
      try {
        response.status(200).json({
          data: {
            application: await useCases.applicationDetail(input(request)),
          },
        });
      } catch (error) {
        next(error);
      }
    },
    accessDocument: async (request, response, next) => {
      try {
        response
          .status(200)
          .json({ data: await useCases.accessDocument(input(request)) });
      } catch (error) {
        next(error);
      }
    },
  };
}

```

### hiringloop-backend/src/modules/scorecards/domain/scorecard-dto.js

[hiringloop-backend/src/modules/scorecards/domain/scorecard-dto.js:1](../../hiringloop-backend/src/modules/scorecards/domain/scorecard-dto.js#L1)

```js
const criterion = ({ id, label, description, type, required, position }) => ({
  id,
  label,
  description,
  type,
  required,
  position,
});
const version = (v) =>
  v && {
    id: v.id,
    versionNumber: v.versionNumber,
    status: v.status,
    title: v.title,
    instructions: v.instructions,
    revision: v.revision,
    publishedAt: v.publishedAt,
    criteria: (v.criteria || []).map(criterion),
  };
export const toTemplateDto = (t) =>
  t && {
    id: t.id,
    jobId: t.jobId,
    activeVersion: version(t.activeVersion),
    draft: version(t.versions?.find((v) => v.status === 'DRAFT')),
  };
export const toMyScorecardDto = ({
  interview,
  participant,
  scorecard,
  templateVersion,
}) => ({
  id: scorecard?.id ?? null,
  interviewId: interview.id,
  interviewParticipantId: participant.id,
  status: scorecard?.status ?? 'NOT_STARTED',
  revision: scorecard?.revision ?? null,
  templateVersion: version(scorecard?.templateVersion ?? templateVersion),
  responses: (scorecard?.responses ?? []).map(
    ({ criterionId, ratingValue, textValue, comment }) => ({
      criterionId,
      ratingValue,
      textValue,
      comment,
    }),
  ),
  overallRecommendation: scorecard?.overallRecommendation ?? null,
  overallComment: scorecard?.overallComment ?? null,
  submittedAt: scorecard?.submittedAt ?? null,
});
export const toSummaryDto = (s) => ({
  id: s.id,
  participant: {
    id: s.participant.id,
    user: { id: s.participant.user.id },
  },
  status: s.status,
  submittedAt: s.submittedAt,
  overallRecommendation:
    s.status === 'SUBMITTED' ? s.overallRecommendation : null,
});
export const toSubmittedDto = (s) => ({
  ...toSummaryDto(s),
  templateVersion: version(s.templateVersion),
  responses: s.responses.map(
    ({ criterionId, ratingValue, textValue, comment }) => ({
      criterionId,
      ratingValue,
      textValue,
      comment,
    }),
  ),
  overallComment: s.overallComment,
});
export const toNoteDto = (n) => ({
  id: n.id,
  applicationId: n.applicationId,
  author: { id: n.author.id },
  body: n.body,
  revision: n.revision,
  createdAt: n.createdAt,
  updatedAt: n.updatedAt,
});

```

### hiringloop-backend/src/modules/offers/schemas/offer-schemas.js

[hiringloop-backend/src/modules/offers/schemas/offer-schemas.js:1](../../hiringloop-backend/src/modules/offers/schemas/offer-schemas.js#L1)

```js
import { z } from 'zod';

const id = z.uuid();
const compensationMinor = z.coerce
  .bigint()
  .nonnegative()
  .max(9223372036854775807n);
export const offerApplicationParamsSchema = z.object({
  organizationId: id,
  applicationId: id,
});
export const offerParamsSchema = z.object({ organizationId: id, offerId: id });
export const offerTermsSchema = z
  .object({
    jobTitle: z.string().trim().min(1).max(160),
    currency: z.string().regex(/^[A-Z]{3}$/),
    baseCompensationMinor: compensationMinor,
    bonusCompensationMinor: compensationMinor.optional(),
    additionalCompensationText: z.string().trim().max(10000).optional(),
    startDate: z.coerce.date().optional(),
    expirationDate: z.coerce.date().optional(),
    location: z.string().trim().max(160).optional(),
    workplaceType: z.enum(['ONSITE', 'HYBRID', 'REMOTE']).optional(),
    additionalTerms: z.string().trim().max(10000).optional(),
  })
  .strict()
  .refine(
    (value) =>
      !value.startDate ||
      !value.expirationDate ||
      value.expirationDate >= value.startDate,
    { message: 'expirationDate must not precede startDate' },
  );
export const offerRevisionSchema = z
  .object({ expectedRevision: z.number().int().positive() })
  .strict();
export const createOfferBodySchema = offerTermsSchema
  .extend({ idempotencyKey: id.optional() })
  .strict();
export const editOfferBodySchema = offerTermsSchema
  .extend(offerRevisionSchema.shape)
  .strict();
export const sendOfferBodySchema = offerRevisionSchema
  .extend({ idempotencyKey: id })
  .strict();

```

### hiringloop-backend/src/modules/scorecards/controllers/scorecard-controller.js

[hiringloop-backend/src/modules/scorecards/controllers/scorecard-controller.js:1](../../hiringloop-backend/src/modules/scorecards/controllers/scorecard-controller.js#L1)

```js
export function createScorecardController(useCases) {
  const base = (r) => ({
    organizationId: r.tenantContext.organizationId,
    actorRole: r.tenantContext.role,
    actorUserId: r.auth.userId,
    ...r.validated.params,
    ...r.validated.body,
  });
  const respond =
    (method, key, status = 200) =>
    async (r, res, next) => {
      try {
        const value = await useCases[method](base(r));
        res.status(status).json({ data: { [key]: value } });
      } catch (e) {
        next(e);
      }
    };
  return {
    getTemplate: respond('getTemplate', 'scorecardTemplate'),
    createDraft: respond('createDraft', 'scorecardTemplate', 201),
    updateTemplate: respond('updateTemplate', 'scorecardTemplate'),
    publishTemplate: respond('publishTemplate', 'scorecardTemplate'),
    summary: respond('summary', 'scorecards'),
    my: respond('my', 'scorecard'),
    saveMy: respond('saveMy', 'scorecard'),
    submitMy: respond('submitMy', 'scorecard'),
    submitted: respond('submitted', 'scorecard'),
    application: respond('applicationScorecards', 'scorecards'),
    listNotes: respond('listNotes', 'notes'),
    createNote: respond('createNote', 'note', 201),
    updateNote: respond('updateNote', 'note'),
    deleteNote: async (r, res, next) => {
      try {
        await useCases.deleteNote(base(r));
        res.status(204).end();
      } catch (e) {
        next(e);
      }
    },
  };
}

```

### hiringloop-backend/src/modules/audit/schemas/audit-schemas.js

[hiringloop-backend/src/modules/audit/schemas/audit-schemas.js:1](../../hiringloop-backend/src/modules/audit/schemas/audit-schemas.js#L1)

```js
import { z } from 'zod';
const uuid = z.string().uuid();
const utcTimestamp = z.string().datetime({ offset: false });
export const auditParamsSchema = z.object({ organizationId: uuid });
export const auditDetailParamsSchema = z.object({
  organizationId: uuid,
  auditEventId: uuid,
});
export const auditListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(25),
    from: utcTimestamp.optional(),
    to: utcTimestamp.optional(),
    actorUserId: uuid.optional(),
    action: z.string().trim().min(1).max(64).optional(),
    resourceType: z.string().trim().min(1).max(64).optional(),
    resourceId: uuid.optional(),
  })
  .superRefine((value, ctx) => {
    if (
      value.from &&
      value.to &&
      new Date(value.from).getTime() >= new Date(value.to).getTime()
    )
      ctx.addIssue({
        code: 'custom',
        message: 'from must be before to',
        path: ['to'],
      });
    if (
      value.from &&
      value.to &&
      new Date(value.to).getTime() - new Date(value.from).getTime() >
        366 * 24 * 60 * 60 * 1000
    )
      ctx.addIssue({
        code: 'custom',
        message: 'Date range must not exceed 366 days',
        path: ['to'],
      });
  })
  .transform((value) => ({
    ...value,
    ...(value.from ? { from: new Date(value.from) } : {}),
    ...(value.to ? { to: new Date(value.to) } : {}),
  }));

```

### hiringloop-backend/src/modules/auth/schemas/auth-schemas.js

[hiringloop-backend/src/modules/auth/schemas/auth-schemas.js:1](../../hiringloop-backend/src/modules/auth/schemas/auth-schemas.js#L1)

```js
import { z } from 'zod';

export const registrationRequestSchema = z.object({
  email: z.string().email().max(320),
  password: z.string().min(12).max(128),
});

export const resendVerificationRequestSchema = z.object({
  email: z.string().email().max(320),
});

export const verifyEmailRequestSchema = z.object({
  token: z.string().min(1).max(512),
});

export const loginRequestSchema = z.object({
  email: z.string().trim().email().max(320),
  // Login deliberately does not enforce registration's minimum. Existing
  // credentials must reach Argon2 verification before being classified.
  password: z.string().max(128),
});

export const forgotPasswordRequestSchema = z.object({
  email: z.string().trim().email().max(320),
});

export const resetPasswordRequestSchema = z.object({
  token: z.string().min(1).max(512),
  newPassword: z.string().min(12).max(128),
});

export const changePasswordRequestSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(12).max(128),
});

```

### hiringloop-backend/src/modules/offers/domain/offer-dto.js

[hiringloop-backend/src/modules/offers/domain/offer-dto.js:1](../../hiringloop-backend/src/modules/offers/domain/offer-dto.js#L1)

```js
export const toOfferVersionDto = (version) => ({
  id: version.id,
  versionNumber: version.versionNumber,
  jobTitle: version.jobTitle,
  currency: version.currency,
  baseCompensationMinor: version.baseCompensationMinor.toString(),
  bonusCompensationMinor: version.bonusCompensationMinor?.toString() ?? null,
  additionalCompensationText: version.additionalCompensationText,
  startDate: version.startDate,
  expirationDate: version.expirationDate,
  location: version.location,
  workplaceType: version.workplaceType,
  additionalTerms: version.additionalTerms,
  revision: version.revision,
  issuedAt: version.issuedAt,
  createdAt: version.createdAt,
});
export const toOfferDto = (offer) => ({
  id: offer.id,
  applicationId: offer.applicationId,
  status: offer.status,
  revision: offer.revision,
  sentAt: offer.sentAt,
  acceptedAt: offer.acceptedAt,
  declinedAt: offer.declinedAt,
  withdrawnAt: offer.withdrawnAt,
  currentVersion: offer.currentVersion
    ? toOfferVersionDto(offer.currentVersion)
    : null,
  versions: offer.versions?.map((version) => ({
    id: version.id,
    versionNumber: version.versionNumber,
    issuedAt: version.issuedAt,
    createdAt: version.createdAt,
  })),
});

```

### hiringloop-backend/src/modules/public-careers/schemas/public-career-schemas.js

[hiringloop-backend/src/modules/public-careers/schemas/public-career-schemas.js:1](../../hiringloop-backend/src/modules/public-careers/schemas/public-career-schemas.js#L1)

```js
import { z } from 'zod';

import { ORGANIZATION_SLUG_PATTERN } from '../../organizations/domain/organization-slug.js';

const organizationSlug = z
  .string()
  .regex(ORGANIZATION_SLUG_PATTERN, 'Invalid organization slug')
  .min(3)
  .max(63);

export const publicCareerOrganizationParamsSchema = z.object({
  organizationSlug,
});

export const publicCareerJobParamsSchema = z.object({
  organizationSlug,
  jobId: z.uuid(),
});

export const publicCareerListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict()
  .transform(({ page, pageSize }) => ({ page, limit: pageSize }));

```

### hiringloop-backend/src/modules/audit/domain/audit-dto.js

[hiringloop-backend/src/modules/audit/domain/audit-dto.js:1](../../hiringloop-backend/src/modules/audit/domain/audit-dto.js#L1)

```js
// Audit JSON is intentionally treated as untrusted at the read boundary.  Audit
// writers are expected to store only small, safe change summaries, but this
// layer is the final protection against a legacy writer (or a directly seeded
// row) accidentally exposing private data.
const changeFields = Object.freeze({
  ORGANIZATION_CREATED: ['name', 'website'],
  ORGANIZATION_UPDATED: ['name', 'website'],
  MEMBERSHIP_ROLE_CHANGED: ['role'],
  MEMBERSHIP_REMOVED: ['role'],
  INVITATION_CREATED: ['role'],
  INVITATION_REVOKED: ['role'],
  JOB_CREATED: ['status', 'title'],
  JOB_UPDATED: ['status', 'title'],
  JOB_OPENED: ['status', 'title'],
  JOB_CLOSED: ['status', 'title'],
  JOB_REOPENED: ['status', 'title'],
  JOB_ARCHIVED: ['status', 'title'],
  PIPELINE_STAGE_CREATED: ['name', 'position'],
  PIPELINE_STAGE_UPDATED: ['name', 'position'],
  PIPELINE_REORDERED: ['position'],
  PIPELINE_STAGE_DELETED: ['name', 'position'],
  APPLICATION_FORM_PUBLISHED: ['status'],
  INTERVIEW_SCHEDULED: [
    'status',
    'scheduledStartAt',
    'scheduledEndAt',
    'participantCount',
  ],
  INTERVIEW_UPDATED: [
    'status',
    'scheduledStartAt',
    'scheduledEndAt',
    'participantCount',
  ],
  INTERVIEW_RESCHEDULED: [
    'status',
    'scheduledStartAt',
    'scheduledEndAt',
    'participantCount',
  ],
  INTERVIEW_CANCELLED: ['status'],
  SCORECARD_TEMPLATE_PUBLISHED: ['status', 'versionNumber'],
  SCORECARD_SUBMITTED: ['status'],
  OFFER_CREATED: ['status', 'versionNumber'],
  OFFER_REVISED: ['status', 'versionNumber'],
  OFFER_SENT: ['status', 'versionNumber'],
  OFFER_ACCEPTED: ['status', 'versionNumber'],
  OFFER_DECLINED: ['status', 'versionNumber'],
  OFFER_WITHDRAWN: ['status', 'versionNumber'],
  APPLICATION_HIRED: ['outcome'],
  APPLICATION_REJECTED: ['outcome', 'reasonCode'],
  APPLICATION_REOPENED: ['outcome'],
  TALENT_POOL_CREATED: ['name'],
  TALENT_POOL_UPDATED: ['name'],
});

const metadataFields = Object.freeze({
  SCORECARD_TEMPLATE_PUBLISHED: ['versionId'],
  SCORECARD_SUBMITTED: ['interviewId', 'applicationId', 'templateVersionId'],
  PIPELINE_REORDERED: ['stageCount'],
  APPLICATION_FORM_PUBLISHED: ['versionId', 'versionNumber'],
  TALENT_POOL_MEMBER_ADDED: [
    'talentPoolId',
    'candidateId',
    'hasSourceApplication',
  ],
  TALENT_POOL_MEMBER_REMOVED: ['talentPoolId', 'candidateId'],
  COMMUNICATION_SEND_REQUESTED: ['channel', 'status'],
});

const isSafeScalar = (value) =>
  value === null ||
  typeof value === 'string' ||
  typeof value === 'number' ||
  typeof value === 'boolean';

function allowFields(value, fields) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || !fields)
    return null;
  const safe = {};
  for (const field of fields)
    if (Object.hasOwn(value, field) && isSafeScalar(value[field]))
      safe[field] = value[field];
  return safe;
}

function sanitizeChange(event, value) {
  return allowFields(value, changeFields[event.action]);
}

function sanitizeMetadata(event) {
  return allowFields(event.metadata, metadataFields[event.action]);
}

export function toAuditEventDto(event) {
  return {
    id: event.id,
    actorType: event.actorType,
    action: event.action,
    resourceType: event.resourceType,
    resourceId: event.resourceId,
    before: sanitizeChange(event, event.before),
    after: sanitizeChange(event, event.after),
    metadata: sanitizeMetadata(event),
    occurredAt: event.occurredAt,
    actor: event.actor
      ? { id: event.actor.id, email: event.actor.email }
      : null,
  };
}

```

### hiringloop-backend/src/modules/offers/controllers/offer-controller.js

[hiringloop-backend/src/modules/offers/controllers/offer-controller.js:1](../../hiringloop-backend/src/modules/offers/controllers/offer-controller.js#L1)

```js
export function createOfferController(offerUseCases) {
  const scope = (request) => ({
    organizationId: request.tenantContext.organizationId,
    offerId: request.validated.params.offerId,
    applicationId: request.validated.params.applicationId,
    actorUserId: request.auth.userId,
    requestId: request.requestId,
  });
  const handle =
    (operation, status = 200) =>
    async (request, response, next) => {
      try {
        response.status(status).json({
          data: await offerUseCases[operation]({
            ...scope(request),
            data: request.validated.body,
          }),
        });
      } catch (error) {
        next(error);
      }
    };
  return {
    byApplication: handle('get'),
    byId: handle('get'),
    create: handle('create', 201),
    editDraft: handle('editDraft'),
    revise: handle('revise', 201),
    send: async (request, response, next) => {
      try {
        const result = await offerUseCases.send({
          ...scope(request),
          data: request.validated.body,
        });
        response
          .status(result.unconfirmed ? 202 : result.retrySafe ? 200 : 201)
          .json({ data: result });
      } catch (error) {
        next(error);
      }
    },
    accept: async (request, response, next) => {
      try {
        response.json({
          data: await offerUseCases.transition({
            ...scope(request),
            expectedRevision: request.validated.body.expectedRevision,
            operation: 'accept',
          }),
        });
      } catch (error) {
        next(error);
      }
    },
    decline: async (request, response, next) => {
      try {
        response.json({
          data: await offerUseCases.transition({
            ...scope(request),
            expectedRevision: request.validated.body.expectedRevision,
            operation: 'decline',
          }),
        });
      } catch (error) {
        next(error);
      }
    },
    withdraw: async (request, response, next) => {
      try {
        response.json({
          data: await offerUseCases.transition({
            ...scope(request),
            expectedRevision: request.validated.body.expectedRevision,
            operation: 'withdraw',
          }),
        });
      } catch (error) {
        next(error);
      }
    },
  };
}

```

### hiringloop-backend/src/modules/audit/controllers/audit-controller.js

[hiringloop-backend/src/modules/audit/controllers/audit-controller.js:1](../../hiringloop-backend/src/modules/audit/controllers/audit-controller.js#L1)

```js
export function createAuditController(useCases) {
  return {
    list: async (req, res, next) => {
      try {
        res.json({
          data: await useCases.list({
            organizationId: req.tenantContext.organizationId,
            ...req.validated.query,
          }),
        });
      } catch (error) {
        next(error);
      }
    },
    get: async (req, res, next) => {
      try {
        res.json({
          data: await useCases.get({
            organizationId: req.tenantContext.organizationId,
            auditEventId: req.validated.params.auditEventId,
          }),
        });
      } catch (error) {
        next(error);
      }
    },
  };
}

```

### hiringloop-backend/src/modules/public-careers/domain/public-career-dto.js

[hiringloop-backend/src/modules/public-careers/domain/public-career-dto.js:1](../../hiringloop-backend/src/modules/public-careers/domain/public-career-dto.js#L1)

```js
function pick(value, fields) {
  return Object.fromEntries(fields.map((field) => [field, value[field]]));
}

export const toPublicOrganizationDto = (organization) =>
  pick(organization, ['name', 'slug', 'website', 'description']);

export const toPublicJobSummaryDto = (job) =>
  pick(job, [
    'id',
    'title',
    'employmentType',
    'workplaceType',
    'location',
    'openings',
    'openedAt',
  ]);

export const toPublicJobDetailDto = (job) =>
  pick(job, [
    'id',
    'title',
    'description',
    'employmentType',
    'workplaceType',
    'location',
    'openings',
    'openedAt',
  ]);

```

### hiringloop-backend/src/modules/public-careers/controllers/public-career-controller.js

[hiringloop-backend/src/modules/public-careers/controllers/public-career-controller.js:1](../../hiringloop-backend/src/modules/public-careers/controllers/public-career-controller.js#L1)

```js
export function createPublicCareerController(publicCareerUseCases) {
  return {
    list: async (request, response, next) => {
      try {
        const result = await publicCareerUseCases.list({
          organizationSlug: request.validated.params.organizationSlug,
          ...request.validated.query,
        });
        response.status(200).json({
          data: { organization: result.organization, jobs: result.jobs },
          pagination: result.pagination,
        });
      } catch (error) {
        next(error);
      }
    },
    detail: async (request, response, next) => {
      try {
        const result = await publicCareerUseCases.detail({
          organizationSlug: request.validated.params.organizationSlug,
          jobId: request.validated.params.jobId,
        });
        response.status(200).json({ data: result });
      } catch (error) {
        next(error);
      }
    },
  };
}

```

### hiringloop-backend/src/modules/applications/schemas/public-application-schemas.js

[hiringloop-backend/src/modules/applications/schemas/public-application-schemas.js:1](../../hiringloop-backend/src/modules/applications/schemas/public-application-schemas.js#L1)

```js
import { z } from 'zod';

import { validationError } from '../../../errors/application-error.js';
import { publicCareerJobParamsSchema } from '../../public-careers/schemas/public-career-schemas.js';

const filename = z
  .string()
  .trim()
  .min(1)
  .max(255)
  .refine(
    (value) => !/[\\/]/.test(value) && !value.includes('\0'),
    'Filename must not contain a path',
  );

export const publicApplicationParamsSchema = publicCareerJobParamsSchema;
export const applicationUploadBodySchema = z
  .object({
    filename,
    mimeType: z.string().trim().min(1).max(127),
    sizeBytes: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  })
  .strict();

export const applicationSubmissionBodySchema = z
  .object({
    candidate: z
      .object({
        firstName: z.string().trim().min(1).max(100),
        lastName: z.string().trim().min(1).max(100),
        email: z.string().trim().email().max(320),
        phone: z.string().trim().min(1).max(50).optional(),
      })
      .strict(),
    formVersionId: z.uuid(),
    answers: z
      .array(z.object({ questionId: z.uuid(), value: z.unknown() }).strict())
      .max(100),
    resumeUploadId: z.uuid(),
  })
  .strict();

const idempotencyKeySchema = z.uuid();

export function validateIdempotencyKey(request, _response, next) {
  const result = idempotencyKeySchema.safeParse(request.get('Idempotency-Key'));
  if (!result.success) {
    return next(
      validationError('A valid Idempotency-Key header is required', [
        { path: ['Idempotency-Key'], message: 'Expected a UUID' },
      ]),
    );
  }
  request.validated = {
    ...(request.validated ?? {}),
    headers: { idempotencyKey: result.data },
  };
  return next();
}

```

### hiringloop-backend/src/modules/applications/schemas/outcome-schemas.js

[hiringloop-backend/src/modules/applications/schemas/outcome-schemas.js:1](../../hiringloop-backend/src/modules/applications/schemas/outcome-schemas.js#L1)

```js
import { z } from 'zod';
const id = z.uuid();
export const outcomeApplicationParamsSchema = z.object({
  organizationId: id,
  applicationId: id,
});
export const outcomeRevisionSchema = z
  .object({ expectedRevision: z.number().int().positive() })
  .strict();
export const rejectApplicationBodySchema = outcomeRevisionSchema
  .extend({
    reasonCode: z.enum([
      'ROLE_CLOSED',
      'CANDIDATE_WITHDREW',
      'QUALIFICATIONS',
      'INTERVIEW_FEEDBACK',
      'OTHER',
    ]),
    reasonDetails: z.string().trim().max(1000).optional(),
    talentPoolId: id.optional(),
  })
  .strict();
export const reopenApplicationBodySchema = outcomeRevisionSchema
  .extend({ reasonDetails: z.string().trim().min(1).max(1000) })
  .strict();

```

### hiringloop-backend/src/modules/analytics/schemas/analytics-schemas.js

[hiringloop-backend/src/modules/analytics/schemas/analytics-schemas.js:1](../../hiringloop-backend/src/modules/analytics/schemas/analytics-schemas.js#L1)

```js
import { z } from 'zod';
const uuid = z.string().uuid();
// Reporting windows are instants, rather than calendar dates.  Requiring a
// UTC ISO timestamp keeps the API's inclusive-from/exclusive-to contract
// unambiguous for callers in every timezone.
const utcTimestamp = z.string().datetime({ offset: false });
const rangeInput = z
  .object({
    from: utcTimestamp.optional(),
    to: utcTimestamp.optional(),
    jobId: uuid.optional(),
  })
  .superRefine((value, ctx) => {
    if (Boolean(value.from) !== Boolean(value.to))
      ctx.addIssue({
        code: 'custom',
        message: 'from and to must be supplied together',
        path: value.from ? ['to'] : ['from'],
      });
    if (
      value.from &&
      value.to &&
      new Date(value.from).getTime() >= new Date(value.to).getTime()
    )
      ctx.addIssue({
        code: 'custom',
        message: 'from must be before to',
        path: ['to'],
      });
    if (
      value.from &&
      value.to &&
      new Date(value.to).getTime() - new Date(value.from).getTime() >
        366 * 86400000
    )
      ctx.addIssue({
        code: 'custom',
        message: 'Date range must not exceed 366 days',
        path: ['to'],
      });
  });
const withDates = (schema) =>
  schema.transform((value) => ({
    ...value,
    ...(value.from ? { from: new Date(value.from) } : {}),
    ...(value.to ? { to: new Date(value.to) } : {}),
  }));
export const analyticsParamsSchema = z.object({ organizationId: uuid });
export const analyticsQuerySchema = withDates(rangeInput);
export const analyticsJobsQuerySchema = withDates(
  rangeInput.safeExtend({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(25),
  }),
);

```

### hiringloop-backend/src/modules/applications/domain/outcome-dto.js

[hiringloop-backend/src/modules/applications/domain/outcome-dto.js:1](../../hiringloop-backend/src/modules/applications/domain/outcome-dto.js#L1)

```js
export const toOutcomeDto = (application, events = []) => ({
  applicationId: application.id,
  outcome: application.outcome,
  outcomeRevision: application.outcomeRevision,
  outcomeUpdatedAt: application.outcomeUpdatedAt,
  history: events.map((event) => ({
    id: event.id,
    type: event.type,
    reasonCode: event.reasonCode,
    reasonDetails: event.reasonDetails,
    occurredAt: event.occurredAt,
  })),
});

```

### hiringloop-backend/src/modules/applications/domain/application-dto.js

[hiringloop-backend/src/modules/applications/domain/application-dto.js:1](../../hiringloop-backend/src/modules/applications/domain/application-dto.js#L1)

```js
export const toPublicApplicationFormDto = (form) => ({
  versionId: form.activeVersion.id,
  questions: form.activeVersion.questions.map((question) => ({
    id: question.id,
    type: question.type,
    label: question.label,
    description: question.description,
    placeholder: question.placeholder,
    required: question.required,
    options: question.options.map((option) => ({
      id: option.id,
      label: option.label,
      value: option.value,
    })),
  })),
});

export const toUploadReservationDto = (upload, signedUpload) => ({
  uploadId: upload.id,
  signedUploadUrl: signedUpload.url,
  expiresAt: upload.expiresAt,
  requiredHeaders: signedUpload.requiredHeaders,
});

export const toApplicationConfirmationDto = (application) => ({
  submitted: true,
  submittedAt: application.submittedAt,
  job: application.job,
});

```

### hiringloop-backend/src/modules/auth/controllers/auth-controller.js

[hiringloop-backend/src/modules/auth/controllers/auth-controller.js:1](../../hiringloop-backend/src/modules/auth/controllers/auth-controller.js#L1)

```js
import { parseCookie } from 'cookie';

export function createAuthController({
  registerUser,
  verifyEmail,
  resendVerification,
  loginUser,
  serializeSessionCookie,
  clearSessionCookie,
  logoutSession,
  revokeAllSessions,
  getCurrentUser,
  forgotPassword,
  resetPassword,
  changePassword,
  googleOidcProvider,
  loginWithGoogle,
  googleRedirectUri,
  frontendOrigin,
  secureCookies = false,
  serializeGoogleTransactionCookie,
  clearGoogleTransactionCookie,
  createCsrfToken,
}) {
  const googleLoginRedirect = (reason) =>
    `${frontendOrigin}/login?oauth=${reason}`;
  return {
    googleStart: async (request, response, next) => {
      try {
        const result = await googleOidcProvider.start();
        response.append(
          'Set-Cookie',
          serializeGoogleTransactionCookie(result.cookieValue, {
            secure: secureCookies,
          }),
        );
        response.redirect(result.url);
      } catch (error) {
        next(error);
      }
    },
    googleCallback: async (request, response) => {
      try {
        const query = new URLSearchParams(request.query).toString();
        const identity = await googleOidcProvider.callback({
          callbackUrl: `${googleRedirectUri}${query ? `?${query}` : ''}`,
          cookieValue: parseCookie(request.headers.cookie ?? '')
            .hiringloop_google_oidc,
        });
        const result = await loginWithGoogle(identity);
        response.append(
          'Set-Cookie',
          clearGoogleTransactionCookie({ secure: secureCookies }),
        );
        response.append(
          'Set-Cookie',
          serializeSessionCookie(result.rawSessionSecret, result.expiresAt),
        );
        response.redirect(`${frontendOrigin}/app`);
      } catch (error) {
        response.append(
          'Set-Cookie',
          clearGoogleTransactionCookie({ secure: secureCookies }),
        );
        if (
          error?.code === 'CONFLICT' &&
          error?.details?.reason === 'ACCOUNT_LINKING_REQUIRED'
        ) {
          response.redirect(googleLoginRedirect('account-linking-required'));
          return;
        }
        response.redirect(googleLoginRedirect('authentication-failed'));
      }
    },
    register: async (request, response, next) => {
      try {
        const result = await registerUser(request.validated.body);
        response.status(202).json({ data: result });
      } catch (error) {
        next(error);
      }
    },
    verifyEmail: async (request, response, next) => {
      try {
        const result = await verifyEmail(request.validated.body);
        response.status(200).json({ data: result });
      } catch (error) {
        next(error);
      }
    },
    resendVerification: async (request, response, next) => {
      try {
        const result = await resendVerification(request.validated.body);
        response.status(202).json({ data: result });
      } catch (error) {
        next(error);
      }
    },
    forgotPassword: async (request, response, next) => {
      try {
        const result = await forgotPassword(request.validated.body);
        response.status(202).json({ data: result });
      } catch (error) {
        next(error);
      }
    },
    resetPassword: async (request, response, next) => {
      try {
        const result = await resetPassword(request.validated.body);
        response.status(200).json({ data: result });
      } catch (error) {
        next(error);
      }
    },
    changePassword: async (request, response, next) => {
      try {
        const result = await changePassword({
          ...request.validated.body,
          userId: request.auth.userId,
        });
        response.append(
          'Set-Cookie',
          serializeSessionCookie(result.rawSessionSecret, result.expiresAt),
        );
        response.status(200).json({
          data: { user: getCurrentUser(request) },
        });
      } catch (error) {
        next(error);
      }
    },
    login: async (request, response, next) => {
      try {
        const result = await loginUser(request.validated.body);
        response.append(
          'Set-Cookie',
          serializeSessionCookie(result.rawSessionSecret, result.expiresAt),
        );
        response.status(200).json({ data: { user: result.user } });
      } catch (error) {
        next(error);
      }
    },
    me: (request, response) => {
      response.status(200).json({ data: { user: getCurrentUser(request) } });
    },
    csrf: (request, response) => {
      response.status(200).json({
        data: {
          csrfToken: createCsrfToken({ sessionId: request.auth.sessionId }),
        },
      });
    },
    logout: async (request, response, next) => {
      try {
        await logoutSession({
          sessionId: request.auth.sessionId,
          userId: request.auth.userId,
        });
        response.append('Set-Cookie', clearSessionCookie());
        response.status(204).send();
      } catch (error) {
        next(error);
      }
    },
    revokeAllSessions: async (request, response, next) => {
      try {
        await revokeAllSessions({ userId: request.auth.userId });
        response.append('Set-Cookie', clearSessionCookie());
        response.status(204).send();
      } catch (error) {
        next(error);
      }
    },
  };
}

```

### hiringloop-backend/src/modules/applications/controllers/public-application-controller.js

[hiringloop-backend/src/modules/applications/controllers/public-application-controller.js:1](../../hiringloop-backend/src/modules/applications/controllers/public-application-controller.js#L1)

```js
export function createPublicApplicationController(publicApplicationUseCases) {
  return {
    form: async (request, response, next) => {
      try {
        const result = await publicApplicationUseCases.form(
          request.validated.params,
        );
        response.status(200).json({ data: { applicationForm: result } });
      } catch (error) {
        next(error);
      }
    },
    authorizeUpload: async (request, response, next) => {
      try {
        const result = await publicApplicationUseCases.authorizeUpload({
          ...request.validated.params,
          ...request.validated.body,
        });
        response.status(201).json({ data: result });
      } catch (error) {
        next(error);
      }
    },
    submit: async (request, response, next) => {
      try {
        const result = await publicApplicationUseCases.submit({
          ...request.validated.params,
          ...request.validated.body,
          idempotencyKey: request.validated.headers.idempotencyKey,
        });
        response.status(201).json({ data: result });
      } catch (error) {
        next(error);
      }
    },
  };
}

```

### hiringloop-backend/src/modules/applications/controllers/application-outcome-controller.js

[hiringloop-backend/src/modules/applications/controllers/application-outcome-controller.js:1](../../hiringloop-backend/src/modules/applications/controllers/application-outcome-controller.js#L1)

```js
export function createApplicationOutcomeController(useCases) {
  const input = (request) => ({
    organizationId: request.tenantContext.organizationId,
    applicationId: request.validated.params.applicationId,
    actorUserId: request.auth.userId,
    requestId: request.requestId,
    data: request.validated.body,
  });
  const action = (name) => async (request, response, next) => {
    try {
      response.json({ data: await useCases[name](input(request)) });
    } catch (error) {
      next(error);
    }
  };
  return {
    hire: action('hire'),
    reject: action('reject'),
    reopen: action('reopen'),
  };
}

```

### hiringloop-backend/src/modules/pipelines/schemas/pipeline-schemas.js

[hiringloop-backend/src/modules/pipelines/schemas/pipeline-schemas.js:1](../../hiringloop-backend/src/modules/pipelines/schemas/pipeline-schemas.js#L1)

```js
import { z } from 'zod';

const expectedVersion = z.number().int().min(1);
const stageName = z.string().trim().min(1).max(80);

export const pipelineJobParamsSchema = z.object({
  organizationId: z.uuid(),
  jobId: z.uuid(),
});
export const pipelineStageParamsSchema = pipelineJobParamsSchema.extend({
  stageId: z.uuid(),
});
export const createPipelineStageBodySchema = z
  .object({ name: stageName, expectedVersion })
  .strict();
export const renamePipelineStageBodySchema = createPipelineStageBodySchema;
export const reorderPipelineStagesBodySchema = z
  .object({ expectedVersion, stageIds: z.array(z.uuid()).min(1).max(20) })
  .strict();
export const deletePipelineStageBodySchema = z
  .object({ expectedVersion })
  .strict();

```

### hiringloop-backend/src/modules/analytics/controllers/analytics-controller.js

[hiringloop-backend/src/modules/analytics/controllers/analytics-controller.js:1](../../hiringloop-backend/src/modules/analytics/controllers/analytics-controller.js#L1)

```js
export function createAnalyticsController(useCases) {
  const handler = (name) => async (req, res, next) => {
    try {
      res.json({
        data: await useCases[name]({
          organizationId: req.tenantContext.organizationId,
          ...req.validated.query,
        }),
      });
    } catch (error) {
      next(error);
    }
  };
  return {
    overview: handler('overview'),
    funnel: handler('funnel'),
    pipeline: handler('pipeline'),
    interviews: handler('interviews'),
    communications: handler('communications'),
    outcomes: handler('outcomes'),
    jobs: handler('jobs'),
  };
}

```

### hiringloop-backend/src/modules/application-forms/schemas/application-form-schemas.js

[hiringloop-backend/src/modules/application-forms/schemas/application-form-schemas.js:1](../../hiringloop-backend/src/modules/application-forms/schemas/application-form-schemas.js#L1)

```js
import { z } from 'zod';

const types = [
  'SHORT_TEXT',
  'LONG_TEXT',
  'NUMBER',
  'YES_NO',
  'SINGLE_SELECT',
  'MULTI_SELECT',
  'DATE',
  'URL',
];
const text = z.string().trim().min(1).max(500);
const nullableText = z.string().trim().max(500).nullable().optional();
const option = z
  .object({ label: text, value: z.string().trim().min(1).max(200) })
  .strict();
const revision = z.number().int().min(1);
const configuration = z
  .object({
    type: z.enum(types),
    label: text,
    description: nullableText,
    placeholder: nullableText,
    required: z.boolean(),
    options: z.array(option).min(2).max(50).optional(),
  })
  .strict();

function optionRules(value, context) {
  const choice = ['SINGLE_SELECT', 'MULTI_SELECT'].includes(value.type);
  if (choice && !value.options)
    context.addIssue({
      code: 'custom',
      path: ['options'],
      message: 'Choice questions require at least two options',
    });
  if (!choice && value.options)
    context.addIssue({
      code: 'custom',
      path: ['options'],
      message: 'Options are allowed only for choice questions',
    });
  if (
    value.options &&
    new Set(value.options.map((item) => item.value)).size !==
      value.options.length
  )
    context.addIssue({
      code: 'custom',
      path: ['options'],
      message: 'Option values must be unique',
    });
}
export const formParamsSchema = z.object({
  organizationId: z.uuid(),
  jobId: z.uuid(),
});
export const questionParamsSchema = formParamsSchema.extend({
  questionId: z.uuid(),
});
export const emptyBodySchema = z.object({}).strict();
export const createQuestionBodySchema = configuration
  .extend({ expectedRevision: revision })
  .superRefine(optionRules);
export const updateQuestionBodySchema = configuration
  .extend({ expectedRevision: revision })
  .superRefine(optionRules);
export const revisionBodySchema = z
  .object({ expectedRevision: revision })
  .strict();
export const reorderQuestionsBodySchema = z
  .object({
    expectedRevision: revision,
    questionIds: z.array(z.uuid()).max(100),
  })
  .strict();

```

### hiringloop-backend/src/modules/pipelines/domain/pipeline-dto.js

[hiringloop-backend/src/modules/pipelines/domain/pipeline-dto.js:1](../../hiringloop-backend/src/modules/pipelines/domain/pipeline-dto.js#L1)

```js
const PIPELINE_FIELDS = ['id', 'jobId', 'version', 'createdAt', 'updatedAt'];
const STAGE_FIELDS = ['id', 'name', 'kind', 'position'];

function pick(value, fields) {
  return Object.fromEntries(fields.map((field) => [field, value[field]]));
}

export const toPipelineDto = (pipeline) => ({
  ...pick(pipeline, PIPELINE_FIELDS),
  stages: pipeline.stages.map((stage) => pick(stage, STAGE_FIELDS)),
});

```

### hiringloop-backend/src/modules/application-forms/domain/application-form-dto.js

[hiringloop-backend/src/modules/application-forms/domain/application-form-dto.js:1](../../hiringloop-backend/src/modules/application-forms/domain/application-form-dto.js#L1)

```js
const option = ({ id, label, value, sortOrder }) => ({
  id,
  label,
  value,
  sortOrder,
});
const question = ({
  id,
  questionKey,
  type,
  label,
  description,
  placeholder,
  required,
  sortOrder,
  options,
}) => ({
  id,
  questionKey,
  type,
  label,
  description,
  placeholder,
  required,
  sortOrder,
  options: options.map(option),
});
const version = (item) =>
  item && {
    id: item.id,
    versionNumber: item.versionNumber,
    status: item.status,
    revision: item.revision,
    publishedAt: item.publishedAt,
    questions: item.questions.map(question),
  };
export const toApplicationFormBuilderDto = (form) => ({
  id: form.id,
  jobId: form.jobId,
  activeVersion: version(form.activeVersion),
  draft: version(form.versions.find((item) => item.status === 'DRAFT') ?? null),
});

```

### hiringloop-backend/src/modules/application-forms/controllers/application-form-controller.js

[hiringloop-backend/src/modules/application-forms/controllers/application-form-controller.js:1](../../hiringloop-backend/src/modules/application-forms/controllers/application-form-controller.js#L1)

```js
export function createApplicationFormController(useCases) {
  const input = (request) => ({
    organizationId: request.tenantContext.organizationId,
    actorUserId: request.auth.userId,
    jobId: request.validated.params.jobId,
  });
  const respond =
    (method, status = 200) =>
    async (request, response, next) => {
      try {
        const builder = await useCases[method]({
          ...input(request),
          ...request.validated.body,
          questionId: request.validated.params.questionId,
        });
        response.status(status).json({ data: { applicationForm: builder } });
      } catch (error) {
        next(error);
      }
    };
  return {
    get: respond('get'),
    createDraft: respond('createDraft', 201),
    addQuestion: respond('addQuestion', 201),
    updateQuestion: respond('updateQuestion'),
    deleteQuestion: respond('deleteQuestion'),
    reorderQuestions: respond('reorderQuestions'),
    publish: respond('publish'),
    discard: respond('discard'),
  };
}

```

### hiringloop-backend/src/modules/pipelines/controllers/pipeline-controller.js

[hiringloop-backend/src/modules/pipelines/controllers/pipeline-controller.js:1](../../hiringloop-backend/src/modules/pipelines/controllers/pipeline-controller.js#L1)

```js
export function createPipelineController(pipelineUseCases) {
  const input = (request) => ({
    organizationId: request.tenantContext.organizationId,
    actorUserId: request.auth.userId,
    jobId: request.validated.params.jobId,
  });
  const mutation = (request) => ({
    ...input(request),
    ...request.validated.body,
    stageId: request.validated.params.stageId,
  });
  const respond =
    (method, status = 200) =>
    async (request, response, next) => {
      try {
        response.status(status).json({
          data: {
            pipeline: await pipelineUseCases[method](mutation(request)),
          },
        });
      } catch (error) {
        next(error);
      }
    };
  return {
    get: async (request, response, next) => {
      try {
        response.status(200).json({
          data: { pipeline: await pipelineUseCases.get(input(request)) },
        });
      } catch (error) {
        next(error);
      }
    },
    createStage: respond('createStage', 201),
    renameStage: respond('renameStage'),
    reorderStages: respond('reorderStages'),
    deleteStage: respond('deleteStage'),
  };
}

```

### hiringloop-backend/src/modules/jobs/controllers/job-controller.js

[hiringloop-backend/src/modules/jobs/controllers/job-controller.js:1](../../hiringloop-backend/src/modules/jobs/controllers/job-controller.js#L1)

```js
export function createJobController(jobUseCases) {
  const input = (request) => ({
    organizationId: request.tenantContext.organizationId,
    jobId: request.validated.params?.jobId,
    actorUserId: request.auth.userId,
    requestId: request.requestId,
  });
  const mutation = (request) => ({
    ...input(request),
    expectedVersion: request.validated.body.expectedVersion,
  });
  return {
    create: async (request, response, next) => {
      try {
        const job = await jobUseCases.create({
          organizationId: request.tenantContext.organizationId,
          actorUserId: request.auth.userId,
          requestId: request.requestId,
          data: request.validated.body,
        });
        response.status(201).json({ data: { job } });
      } catch (error) {
        next(error);
      }
    },
    list: async (request, response, next) => {
      try {
        const result = await jobUseCases.list({
          organizationId: request.tenantContext.organizationId,
          ...request.validated.query,
        });
        response.status(200).json({
          data: { jobs: result.jobs },
          pagination: result.pagination,
        });
      } catch (error) {
        next(error);
      }
    },
    detail: async (request, response, next) => {
      try {
        response
          .status(200)
          .json({ data: { job: await jobUseCases.detail(input(request)) } });
      } catch (error) {
        next(error);
      }
    },
    update: async (request, response, next) => {
      try {
        const { expectedVersion, ...data } = request.validated.body;
        const job = await jobUseCases.update({
          ...input(request),
          expectedVersion,
          data,
        });
        response.status(200).json({ data: { job } });
      } catch (error) {
        next(error);
      }
    },
    open: action('open'),
    close: action('close'),
    reopen: action('reopen'),
    archive: action('archive'),
  };

  function action(name) {
    return async (request, response, next) => {
      try {
        const job = await jobUseCases[name](mutation(request));
        response.status(200).json({ data: { job } });
      } catch (error) {
        next(error);
      }
    };
  }
}

```

### hiringloop-backend/src/modules/jobs/domain/job-dto.js

[hiringloop-backend/src/modules/jobs/domain/job-dto.js:1](../../hiringloop-backend/src/modules/jobs/domain/job-dto.js#L1)

```js
const BASE_FIELDS = [
  'id',
  'title',
  'department',
  'employmentType',
  'workplaceType',
  'location',
  'openings',
  'status',
  'openedAt',
  'closedAt',
  'archivedAt',
  'version',
  'createdAt',
  'updatedAt',
];

function pick(job, fields) {
  return Object.fromEntries(fields.map((field) => [field, job[field]]));
}

export const toJobListDto = (job) => pick(job, BASE_FIELDS);
export const toJobDetailDto = (job) => ({
  ...pick(job, BASE_FIELDS),
  description: job.description,
});

```

### hiringloop-backend/src/modules/jobs/schemas/job-schemas.js

[hiringloop-backend/src/modules/jobs/schemas/job-schemas.js:1](../../hiringloop-backend/src/modules/jobs/schemas/job-schemas.js#L1)

```js
import { z } from 'zod';

const nullableText = (maximum) =>
  z
    .union([
      z
        .string()
        .trim()
        .max(maximum)
        .transform((value) => value || null),
      z.null(),
    ])
    .optional();
const optionalDescription = z
  .union([
    z
      .string()
      .max(50_000)
      .transform((value) => (value.trim() === '' ? null : value.trim())),
    z.null(),
  ])
  .optional();

const createFields = {
  title: z.string().trim().max(160),
  department: nullableText(100),
  employmentType: z
    .enum([
      'FULL_TIME',
      'PART_TIME',
      'CONTRACT',
      'TEMPORARY',
      'INTERNSHIP',
      'OTHER',
    ])
    .optional(),
  workplaceType: z.enum(['ONSITE', 'HYBRID', 'REMOTE']).optional(),
  location: nullableText(160),
  description: optionalDescription,
  openings: z.number().int().min(1).max(1000).optional(),
};

export const jobOrganizationParamsSchema = z.object({
  organizationId: z.uuid(),
});
export const jobParamsSchema = z.object({
  organizationId: z.uuid(),
  jobId: z.uuid(),
});
export const createJobBodySchema = z.object(createFields).strict();
export const updateJobBodySchema = z
  .object({
    ...Object.fromEntries(
      Object.entries(createFields).map(([key, schema]) => [
        key,
        schema.optional(),
      ]),
    ),
    expectedVersion: z.number().int().min(1),
  })
  .strict()
  .refine(
    (value) => Object.keys(value).some((key) => key !== 'expectedVersion'),
    { message: 'At least one editable field is required' },
  );
export const jobMutationBodySchema = z
  .object({ expectedVersion: z.number().int().min(1) })
  .strict();
export const listJobsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().trim().min(1).max(160).optional(),
    status: z.enum(['DRAFT', 'OPEN', 'CLOSED', 'ARCHIVED']).optional(),
    employmentType: z
      .enum([
        'FULL_TIME',
        'PART_TIME',
        'CONTRACT',
        'TEMPORARY',
        'INTERNSHIP',
        'OTHER',
      ])
      .optional(),
    workplaceType: z.enum(['ONSITE', 'HYBRID', 'REMOTE']).optional(),
    sortBy: z
      .enum(['updatedAt', 'createdAt', 'title', 'openedAt'])
      .default('updatedAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  })
  .strict();

```

### hiringloop-backend/src/modules/members/domain/member-dto.js

[hiringloop-backend/src/modules/members/domain/member-dto.js:1](../../hiringloop-backend/src/modules/members/domain/member-dto.js#L1)

```js
export function toMemberDto(membership) {
  return {
    id: membership.id,
    role: membership.role,
    joinedAt: membership.createdAt,
    user: {
      id: membership.user.id,
      email: membership.user.email,
    },
  };
}

```

### hiringloop-backend/src/modules/members/controllers/member-controller.js

[hiringloop-backend/src/modules/members/controllers/member-controller.js:1](../../hiringloop-backend/src/modules/members/controllers/member-controller.js#L1)

```js
export function createMemberController({
  listMembers,
  updateMemberRole,
  removeMember,
}) {
  return {
    list: async (request, response, next) => {
      try {
        const members = await listMembers({
          organizationId: request.tenantContext.organizationId,
        });
        response.status(200).json({ data: { members } });
      } catch (error) {
        next(error);
      }
    },
    updateRole: async (request, response, next) => {
      try {
        const member = await updateMemberRole({
          organizationId: request.tenantContext.organizationId,
          membershipId: request.validated.params.membershipId,
          role: request.validated.body.role,
          actorUserId: request.auth.userId,
          requestId: request.requestId,
        });
        response.status(200).json({ data: { member } });
      } catch (error) {
        next(error);
      }
    },
    remove: async (request, response, next) => {
      try {
        const result = await removeMember({
          organizationId: request.tenantContext.organizationId,
          membershipId: request.validated.params.membershipId,
          actorUserId: request.auth.userId,
          requestId: request.requestId,
        });
        response.status(200).json({ data: result });
      } catch (error) {
        next(error);
      }
    },
  };
}

```

### hiringloop-backend/src/modules/invitations/schemas/invitation-schemas.js

[hiringloop-backend/src/modules/invitations/schemas/invitation-schemas.js:1](../../hiringloop-backend/src/modules/invitations/schemas/invitation-schemas.js#L1)

```js
import { z } from 'zod';

import { ORGANIZATION_ROLES } from '../../../authorization/permissions.js';

export const invitationParamsSchema = z.object({
  organizationId: z.uuid(),
});

export const invitationWithIdParamsSchema = z.object({
  organizationId: z.uuid(),
  invitationId: z.uuid(),
});

export const createInvitationRequestSchema = z.object({
  email: z.string().trim().email().max(320),
  role: z.enum(Object.values(ORGANIZATION_ROLES)),
});

export const acceptInvitationRequestSchema = z.object({
  token: z.string().min(1).max(512),
});

```

### hiringloop-backend/src/modules/members/schemas/member-schemas.js

[hiringloop-backend/src/modules/members/schemas/member-schemas.js:1](../../hiringloop-backend/src/modules/members/schemas/member-schemas.js#L1)

```js
import { z } from 'zod';

import { ORGANIZATION_ROLES } from '../../../authorization/permissions.js';

export const memberParamsSchema = z.object({
  organizationId: z.uuid(),
});

export const memberWithIdParamsSchema = z.object({
  organizationId: z.uuid(),
  membershipId: z.uuid(),
});

export const updateMemberRoleRequestSchema = z.object({
  role: z.enum(Object.values(ORGANIZATION_ROLES)),
});

```

### hiringloop-backend/src/modules/organizations/controllers/organization-controller.js

[hiringloop-backend/src/modules/organizations/controllers/organization-controller.js:1](../../hiringloop-backend/src/modules/organizations/controllers/organization-controller.js#L1)

```js
import { notFoundError } from '../../../errors/application-error.js';

export function createOrganizationController({
  createOrganizationForUser,
  listOrganizationsForUser,
  getOrganizationById,
}) {
  return {
    create: async (request, response, next) => {
      try {
        const organization = await createOrganizationForUser({
          userId: request.auth.userId,
          organizationInput: request.validated.body,
        });
        response.status(201).json({ data: { organization } });
      } catch (error) {
        next(error);
      }
    },
    list: async (request, response, next) => {
      try {
        const organizations = await listOrganizationsForUser(
          request.auth.userId,
        );
        response.status(200).json({ data: { organizations } });
      } catch (error) {
        next(error);
      }
    },
    get: async (request, response, next) => {
      try {
        const organization = await getOrganizationById({
          organizationId: request.tenantContext.organizationId,
          role: request.tenantContext.role,
        });
        if (!organization) {
          throw notFoundError();
        }
        response.status(200).json({ data: { organization } });
      } catch (error) {
        next(error);
      }
    },
  };
}

```

### hiringloop-backend/src/modules/organizations/domain/organization-dto.js

[hiringloop-backend/src/modules/organizations/domain/organization-dto.js:1](../../hiringloop-backend/src/modules/organizations/domain/organization-dto.js#L1)

```js
export function toOrganizationDto(organization) {
  return {
    id: organization.id,
    name: organization.name,
    slug: organization.slug,
    website: organization.website,
    description: organization.description,
    createdAt: organization.createdAt,
    updatedAt: organization.updatedAt,
  };
}

export function toCurrentOrganizationDto(organization, permissions) {
  return {
    ...toOrganizationDto(organization),
    permissions: [...permissions],
  };
}

```

### hiringloop-backend/src/modules/organizations/schemas/organization-schemas.js

[hiringloop-backend/src/modules/organizations/schemas/organization-schemas.js:1](../../hiringloop-backend/src/modules/organizations/schemas/organization-schemas.js#L1)

```js
import { z } from 'zod';

const optionalText = (max) => z.string().trim().max(max).optional();
const publicWebsite = z
  .string()
  .trim()
  .url()
  .max(2048)
  .refine(
    (value) => {
      const protocol = new URL(value).protocol;
      return protocol === 'http:' || protocol === 'https:';
    },
    { message: 'Website must use http or https.' },
  );

export const createOrganizationRequestSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    website: publicWebsite.optional(),
    description: optionalText(2000),
  })
  .strict();

export const organizationIdParamsSchema = z.object({
  organizationId: z.uuid(),
});

```

### hiringloop-backend/src/modules/invitations/controllers/invitation-controller.js

[hiringloop-backend/src/modules/invitations/controllers/invitation-controller.js:1](../../hiringloop-backend/src/modules/invitations/controllers/invitation-controller.js#L1)

```js
export function createInvitationController({
  createInvitation,
  listInvitations,
  revokeInvitation,
  acceptInvitation,
}) {
  return {
    create: async (request, response, next) => {
      try {
        const invitation = await createInvitation({
          organizationId: request.tenantContext.organizationId,
          inviterMembershipId: request.tenantContext.membershipId,
          actorUserId: request.auth.userId,
          ...request.validated.body,
        });
        response.status(201).json({ data: { invitation } });
      } catch (error) {
        next(error);
      }
    },
    list: async (request, response, next) => {
      try {
        const invitations = await listInvitations({
          organizationId: request.tenantContext.organizationId,
        });
        response.status(200).json({ data: { invitations } });
      } catch (error) {
        next(error);
      }
    },
    revoke: async (request, response, next) => {
      try {
        const invitation = await revokeInvitation({
          organizationId: request.tenantContext.organizationId,
          invitationId: request.validated.params.invitationId,
          actorUserId: request.auth.userId,
        });
        response.status(200).json({ data: { invitation } });
      } catch (error) {
        next(error);
      }
    },
    accept: async (request, response, next) => {
      try {
        const result = await acceptInvitation({
          ...request.validated.body,
          auth: request.auth,
        });
        response.status(200).json({ data: result });
      } catch (error) {
        next(error);
      }
    },
  };
}

```

### hiringloop-backend/src/modules/invitations/domain/invitation-dto.js

[hiringloop-backend/src/modules/invitations/domain/invitation-dto.js:1](../../hiringloop-backend/src/modules/invitations/domain/invitation-dto.js#L1)

```js
export function toInvitationDto(invitation) {
  return {
    id: invitation.id,
    organizationId: invitation.organizationId,
    email: invitation.email,
    role: invitation.role,
    expiresAt: invitation.expiresAt,
    acceptedAt: invitation.acceptedAt,
    revokedAt: invitation.revokedAt,
    createdAt: invitation.createdAt,
    updatedAt: invitation.updatedAt,
  };
}

```

### hiringloop-backend/src/modules/interviews/schemas/interview-schemas.js

[hiringloop-backend/src/modules/interviews/schemas/interview-schemas.js:1](../../hiringloop-backend/src/modules/interviews/schemas/interview-schemas.js#L1)

```js
import { z } from 'zod';

const organizationId = z.uuid();
const uuid = z.uuid();
const MAX_DURATION_MINUTES = 24 * 60;
const MAX_CALENDAR_RANGE_MS = 31 * 24 * 60 * 60 * 1000;

const supportedTimeZones = new Set(
  typeof Intl.supportedValuesOf === 'function'
    ? Intl.supportedValuesOf('timeZone')
    : [],
);

function isIanaTimeZone(value) {
  if (value === 'UTC') return true;
  if (supportedTimeZones.size > 0) return supportedTimeZones.has(value);
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value }).format();
    return value.includes('/');
  } catch {
    return false;
  }
}

const dateTime = z
  .string()
  .trim()
  .refine(
    (value) =>
      /(?:Z|[+-]\d{2}:\d{2})$/i.test(value) && !Number.isNaN(Date.parse(value)),
    'A timezone-aware ISO-8601 datetime is required',
  )
  .transform((value) => new Date(value));

const timeZone = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .refine(isIanaTimeZone, 'A valid IANA timezone is required');

const participantUserIds = z
  .array(uuid)
  .min(1)
  .max(50)
  .superRefine((ids, context) => {
    if (new Set(ids).size !== ids.length) {
      context.addIssue({
        code: 'custom',
        message: 'Participant user IDs must be unique',
      });
    }
  });

const nullableUrl = z
  .union([
    z
      .string()
      .trim()
      .max(2048)
      .url()
      .refine((value) => {
        const protocol = new URL(value).protocol;
        return protocol === 'http:' || protocol === 'https:';
      }, 'Meeting URL must use HTTP or HTTPS')
      .transform((value) => value || null),
    z.null(),
  ])
  .optional();
const nullableLocation = z
  .union([
    z
      .string()
      .trim()
      .max(240)
      .transform((value) => value || null),
    z.null(),
  ])
  .optional();

export const interviewOrganizationParamsSchema = z.object({ organizationId });
export const applicationInterviewParamsSchema = z.object({
  organizationId,
  applicationId: uuid,
});
export const interviewParamsSchema = z.object({
  organizationId,
  interviewId: uuid,
});

export const scheduleInterviewBodySchema = z
  .object({
    title: z.string().trim().min(1).max(160),
    format: z.enum(['VIDEO', 'PHONE', 'ONSITE']),
    scheduledStartAt: dateTime,
    durationMinutes: z.number().int().min(1).max(MAX_DURATION_MINUTES),
    timeZone,
    participantUserIds,
    meetingUrl: nullableUrl,
    location: nullableLocation,
  })
  .strict();

export const updateInterviewBodySchema = z
  .object({
    title: z.string().trim().min(1).max(160).optional(),
    format: z.enum(['VIDEO', 'PHONE', 'ONSITE']).optional(),
    participantUserIds: participantUserIds.optional(),
    meetingUrl: nullableUrl,
    location: nullableLocation,
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one editable field is required',
  });

export const rescheduleInterviewBodySchema = z
  .object({
    scheduledStartAt: dateTime,
    durationMinutes: z.number().int().min(1).max(MAX_DURATION_MINUTES),
    timeZone,
  })
  .strict();

export const cancelInterviewBodySchema = z
  .object({
    cancellationReason: z
      .string()
      .trim()
      .max(500)
      .transform((value) => value || null)
      .optional(),
  })
  .strict();

export const listInterviewsQuerySchema = z
  .object({
    from: dateTime,
    to: dateTime,
    mine: z
      .union([z.boolean(), z.enum(['true', 'false'])])
      .default(false)
      .transform((value) => value === true || value === 'true'),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.to <= value.from) {
      context.addIssue({
        code: 'custom',
        path: ['to'],
        message: 'The calendar range must end after it starts',
      });
    }
    if (value.to.getTime() - value.from.getTime() > MAX_CALENDAR_RANGE_MS) {
      context.addIssue({
        code: 'custom',
        path: ['to'],
        message: 'The calendar range cannot exceed 31 days',
      });
    }
  });

export { MAX_DURATION_MINUTES };

```

### hiringloop-backend/src/modules/interviews/controllers/interview-controller.js

[hiringloop-backend/src/modules/interviews/controllers/interview-controller.js:1](../../hiringloop-backend/src/modules/interviews/controllers/interview-controller.js#L1)

```js
export function createInterviewController(useCases) {
  const actor = (request) => ({
    organizationId: request.tenantContext.organizationId,
    actorRole: request.tenantContext.role,
    actorUserId: request.auth.userId,
  });
  const resourceInput = (request) => ({
    ...actor(request),
    ...request.validated.params,
  });

  return {
    schedule: async (request, response, next) => {
      try {
        response.status(201).json({
          data: {
            interview: await useCases.schedule({
              ...actor(request),
              applicationId: request.validated.params.applicationId,
              ...request.validated.body,
            }),
          },
        });
      } catch (error) {
        next(error);
      }
    },
    listForApplication: async (request, response, next) => {
      try {
        response.status(200).json({
          data: {
            interviews: await useCases.listForApplication(
              resourceInput(request),
            ),
          },
        });
      } catch (error) {
        next(error);
      }
    },
    listForOrganization: async (request, response, next) => {
      try {
        response.status(200).json({
          data: {
            interviews: await useCases.listForOrganization({
              ...actor(request),
              ...request.validated.params,
              ...request.validated.query,
            }),
          },
        });
      } catch (error) {
        next(error);
      }
    },
    detail: async (request, response, next) => {
      try {
        response.status(200).json({
          data: { interview: await useCases.detail(resourceInput(request)) },
        });
      } catch (error) {
        next(error);
      }
    },
    update: async (request, response, next) => {
      try {
        response.status(200).json({
          data: {
            interview: await useCases.update({
              ...resourceInput(request),
              ...request.validated.body,
            }),
          },
        });
      } catch (error) {
        next(error);
      }
    },
    reschedule: async (request, response, next) => {
      try {
        response.status(200).json({
          data: {
            interview: await useCases.reschedule({
              ...resourceInput(request),
              ...request.validated.body,
            }),
          },
        });
      } catch (error) {
        next(error);
      }
    },
    cancel: async (request, response, next) => {
      try {
        response.status(200).json({
          data: {
            interview: await useCases.cancel({
              ...resourceInput(request),
              ...request.validated.body,
            }),
          },
        });
      } catch (error) {
        next(error);
      }
    },
  };
}

```

### hiringloop-backend/src/modules/interviews/domain/interview-dto.js

[hiringloop-backend/src/modules/interviews/domain/interview-dto.js:1](../../hiringloop-backend/src/modules/interviews/domain/interview-dto.js#L1)

```js
function candidateName(candidate) {
  return `${candidate.firstName} ${candidate.lastName}`.trim();
}

function applicationSummary(application) {
  return {
    id: application.id,
    candidate: {
      id: application.candidate.id,
      name: candidateName(application.candidate),
      email: application.candidate.email,
    },
    job: {
      id: application.job.id,
      title: application.job.title,
    },
  };
}

export function toInterviewDto(interview) {
  return {
    id: interview.id,
    title: interview.title,
    format: interview.format,
    status: interview.status,
    scheduledStartAt: interview.scheduledStartAt,
    scheduledEndAt: interview.scheduledEndAt,
    timeZone: interview.timeZone,
    meetingUrl: interview.meetingUrl,
    location: interview.location,
    participants: interview.participants.map((participant) => ({
      id: participant.id,
      user: {
        id: participant.user.id,
        email: participant.user.email,
      },
    })),
    application: applicationSummary(interview.application),
    cancellation:
      interview.status === 'CANCELLED'
        ? {
            cancelledAt: interview.cancelledAt,
            cancelledByUserId: interview.cancelledByUserId,
            reason: interview.cancellationReason,
          }
        : null,
    createdAt: interview.createdAt,
    updatedAt: interview.updatedAt,
  };
}

```

## INFERRED

No duplicate mounted method/path was found after expansion. Contract styles differ: nested data.resource, direct data, top-level count/updatedCount and pagination field names. Optional create-offer idempotencyKey is accepted without replay behavior. The Phase 3A repair corrected the formerly mismatched Offer and Communication Template frontend serialization while retaining strict server request bodies. Conditional route factories and stubs are not proof of provider/DB readiness.

## NOT VERIFIED / UNKNOWN

No current runtime, database, browser, load, provider, or production verification was performed. Historical test results are documentation claims, not results reproduced by this investigation.

No live OpenAPI validation, traffic-based unused endpoint assessment or exhaustive per-endpoint test assertion audit was performed. Repository call-site references support maintenance navigation; uncertain response/business-rule behavior must be checked in the linked implementation and runtime tests.
