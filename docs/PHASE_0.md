# Phase 0: project foundation

## Scope

Establish the monorepo and runnable stack before Phase 1 world development. Preserve the user-provided whitepaper at the repository root.

## Implemented

- pnpm workspace with shared contracts, game presentation settings, and TypeScript configuration.
- React + TypeScript + Vite + Tailwind frontend and Phaser 3 boot scene.
- NestJS API with validation, explicit origins, graceful shutdown, liveness and database readiness.
- Prisma PostgreSQL adapter, schema and migration commands.
- Optional public Supabase frontend client and credential templates.
- Reserved feature, art, asset, deployment, script and artifact directories.
- Setup, architecture, asset pipeline and development conventions.

## Completion boundary

A real Supabase PostgreSQL connection must be configured and verified before Phase 0 is fully complete. No database credentials were supplied, so cloud setup and the first applied migration remain pending. The preview is an engine integration check; it is not a playable world.

## 00.01 — Monorepo and workspace setup

Required workspaces: `apps/web`, `apps/api`, `packages/shared`, and `packages/game-config`. `packages/typescript-config` supplies the common compiler settings. The shared package was renamed from `contracts` to match the roadmap; both apps now import `@pondbound/shared`.

Root scripts provide `dev`, `build`, `lint`, `typecheck`, and `test`. The development command builds shared dependencies once before starting both apps. Installation uses the committed lockfile. Node 24 is recorded in `.node-version`; pnpm 12.9.1 is recorded in `packageManager`. `.gitattributes` keeps source line endings consistent.

Acceptance passed on November 3, 2026, on Windows with Node 24.19.0 and pnpm 12.9.1. A temporary local Git snapshot of the updated source was cloned with `git clone --no-local` into an ignored verification directory. This tested the current local changes; it did not modify the GitHub repository.

- The clone had no `node_modules`, app `.env` files, `dist` directories or generated Prisma client.
- `pnpm install --frozen-lockfile` succeeded without changing the lockfile.
- `pnpm dev` built the shared packages, generated Prisma, and started Vite and NestJS without a prior build.
- Frontend and transformed shared-module requests returned HTTP 200. Both the direct API health request and the Vite API proxy returned the expected healthy response.
- `pnpm check` passed lint, type checking, both backend integration tests, and all production builds in the clone.
- `pnpm env:setup` created missing environment files; a second run preserved their hashes. The clone's Git working tree remained clean after all checks.

This verifies 00.01's install-and-run criterion. It does not complete the later authentication, database provisioning or infrastructure work within Phase 00.

## 00.02 — React application shell

Implemented React Router routes for `/` and `/play`, a catch-all 404, and a persistent app shell with active navigation and server status. Pages load lazily with an accessible Suspense fallback. Root and route error boundaries offer reload/home recovery; navigation clears a route failure. Phaser startup has a loading overlay, catches asynchronous startup failures and cleans up on unmount.

The responsive baseline supports a 320px minimum viewport, fluid typography, wrapping navigation, a stacked mobile layout and a constrained game aspect ratio. Keyboard support includes a skip link, visible focus, main-content focus after navigation, and document-title changes. Reduced-motion preferences disable the loading animation.

Verification on November 3, 2026:

- `pnpm check` passed lint, TypeScript, frontend tests, both backend tests, and production builds. Final frontend checks passed all 12 tests after adding trailing-slash and timeout coverage.
- Frontend tests exercise navigation and active links, direct route entry, unknown-route recovery, offline reconnect, request cancellation, lazy loading, rejected imports, route-error recovery, engine readiness and engine cleanup. Phaser is mocked in DOM tests; these do not verify WebGL rendering.
- HTTP checks returned the app entry at `/`, `/play` and an unknown deep path, confirming Vite's history fallback. Unknown paths render the application 404 while returning HTTP 200 from the SPA host.
- The browser runtime exposed no browser connection. Responsive appearance, real canvas rendering, and interactive browser history are not visually verified.

Deployment hosts must serve `index.html` for frontend route requests while preserving asset and API routes. See the deployment guide.

## 00.03 — NestJS API foundation

`AppModule` now composes dedicated health and database modules. Canonical version-neutral probes are `/health` and `/ready`, with the previous URLs retained as aliases. Application routes use URI versioning under `/api/v1`; the API identity endpoint demonstrates the versioned namespace.

Global DTO validation rejects extra and invalid fields, transforms DTO instances, and omits submitted values and targets from validation metadata. A global exception filter returns a typed JSON envelope, hides server exception details, and handles unknown routes both inside and outside the API prefix. Readiness reports operational state with HTTP 200/503 and its own probe contract.

HTTP integration tests cover probe aliases, all readiness states, URI version selection, DTO validation, malformed JSON, unknown routes, and exception redaction. Test-only controllers are excluded from the production module. Readiness tests use a substituted provider for connected/unavailable cases; live Supabase connectivity remains pending.

Verification on November 3, 2026: `pnpm check` passed lint, workspace type checking, all 8 backend tests, all 12 frontend tests, and production builds. Live localhost checks returned 200 for `/health`, `/api/v1`, and `/api/health`; 503 for `/ready` and its alias with no database configured; and 404 for unsupported versions and unknown root paths. This completes 00.03's API foundation scope; it does not verify a live Supabase connection.

## Initial scaffold verification — November 3, 2026

- `pnpm install`: passed; generated `pnpm-lock.yaml`.
- `pnpm check`: passed lint, TypeScript checks, both backend tests, and production builds for shared packages and both apps.
- `pnpm db:validate`: passed with Prisma 7.10.0.
- `pnpm dev`: both development servers started successfully.
- Frontend HTTP smoke check: HTTP 200 and application entry served at port 5173.
- Frontend proxy smoke check: `/api/health` returned the expected NestJS service response through Vite.
- Backend integration checks covered HTTP liveness, missing-database readiness, allowed/disallowed CORS origins, unknown routes and invalid configuration.

The browser runtime reported no available browser connections, so canvas rendering and responsive appearance have not been visually verified. Database connectivity and migrations remain unverified pending a dedicated Supabase connection. Vite reports a large Phaser engine chunk; Phaser loads separately from the initial application code.

The managed Windows sandbox blocked pnpm's shared cache and Node test subprocesses; dependency installation and the complete check succeeded with approved execution outside that sandbox.
