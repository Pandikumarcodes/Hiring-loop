# HiringLoop Backend

This directory contains the HiringLoop backend foundation. It is a separate
Node.js application from `hiringloop-frontend/` and currently provides the
technical application shell and health endpoint only.

## Stack and prerequisites

- Node.js 24.x
- npm 11.x
- Express.js
- JavaScript with ES modules

Install dependencies from this directory:

```sh
npm install
```

Repository-wide Node/npm version pinning should be considered later. This
backend does not currently add an `.nvmrc`, `.node-version`, or Volta config.

## Local development

Copy `.env.example` to a local `.env` file when local configuration is needed;
do not commit local environment files. Start the watch-mode server with:

```sh
npm run dev
```

Start the backend normally with:

```sh
npm start
```

The runtime reads `NODE_ENV` and `PORT`. `NODE_ENV` may be `development`,
`test`, or `production`. `PORT` must be a whole number from 1 through 65535
and defaults to 3000. Invalid configuration fails startup immediately.

The additional provider-related variables in `.env.example` are reserved
placeholders for future phases; they are not currently required or connected
to any provider. Never put backend secrets in frontend `VITE_*` variables.

## Quality and testing

```sh
npm run lint
npm run format
npm run format:check
npm test
npm run test:watch
npm run test:coverage
npm run verify
```

`verify` is the non-interactive one-command check: lint, formatting check, and
the test suite. Coverage is intentionally separate. Tests use Vitest in the
Node environment, Supertest, and the `*.test.js` convention under `tests/`.

## Health endpoint

`GET /health` is a technical health check, not a product API. It returns:

```http
HTTP/1.1 200
```

```json
{ "status": "ok" }
```

## Current scope

Phase 01 contains only project foundation work. Database, authentication,
product routes, external providers, workers, realtime behavior, and AI are
not initialized here. For deeper project context, see the shared documents in
`docs-shared/`.
