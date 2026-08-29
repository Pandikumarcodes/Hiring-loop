# HiringLoop frontend

This directory contains the HiringLoop frontend application. It is a separate
Node.js application from `hiringloop-backend/` and currently provides the
minimal Phase 01 application shell and developer tooling.

## Stack

- React
- TypeScript
- Vite
- Oxlint and Prettier
- Vitest with Testing Library

## Prerequisites

Use a current Node.js release and npm. The repository has been verified with
Node.js 24.x and npm 11.x. No `.nvmrc` or other version-manager policy is
currently defined; introducing one should be deferred until the repository
establishes a shared runtime policy.

## Install and run

From this directory:

```sh
npm install
npm run dev
```

Vite uses its normal default port and may select another available port if
needed. The development server supports hot module replacement.

## Build and quality commands

```sh
npm run build
npm run lint
npm run format
npm run format:check
npm run typecheck
npm run verify
```

`verify` is the non-interactive frontend quality gate. It runs linting, format
checking, type checking, tests, and the production build in sequence, stopping
when a command fails. `format` writes formatting changes; use
`format:check` for a read-only check.

## Tests

```sh
npm run test            # one non-interactive test run
npm run test:watch      # watch tests during development
npm run test:coverage   # one test run with coverage output
```

## Environment

For local frontend configuration, a developer may create `.env.local` from
`.env.example`:

```sh
copy .env.example .env.local
```

Do not commit `.env.local` or add real secret values. Any `VITE_*` variable is
embedded into the browser bundle and is therefore publicly visible; it must
never contain backend credentials or other secrets. `VITE_API_BASE_URL` is
optional at the current foundation stage. Backend credentials belong to the
separate backend application and are not configured here.

## Current scope

Phase 01 is limited to project foundations: the minimal frontend shell,
environment conventions, code quality, testing, and developer workflow. Product
features, authentication, routing, API integration, and application
architecture are deferred to later phases. See `docs-shared/` for the shared
project instructions, roadmap, architecture principles, and non-functional
requirements.
