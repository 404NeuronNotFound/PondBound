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

Supabase infrastructure was verified in 00.04 and authentication/Player identity in 00.05. Further Phase 00 tasks remain separate. The preview is an engine integration check; it is not a playable world.

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

## 00.04 — Supabase and Prisma

Configured the user-selected existing PondBound Development project. The private `game` schema and initial Player migration are applied. Separate `pondbound_migrator` and `pondbound_api` logins use separate ignored configuration files; runtime has no elevated attributes, role memberships, DDL or migration-history access. RLS permits only explicit backend access, and public/authenticated database roles have no game-schema grants.

The server owns one bounded PostgreSQL pool, using verified TLS and the provider's public CA. Runtime and migration connections use Supavisor session mode; the migration engine enforces strict TLS with its CA parameter. The private `pondbound-media` bucket accepts PNG/WebP/JPEG objects up to 5 MB.

Verification on November 3, 2026:

- `pnpm check` passed lint, workspace typecheck, all 12 frontend tests, all 12 backend tests and production builds. Prisma schema validation passed.
- Five integration tests passed against an isolated PostgreSQL 17.11 database: migration redeployment, permissions, RLS-backed Prisma CRUD/rollback, bounded pooling and real database readiness.
- The live Supabase migration completed and `db:status` reported up to date. `db:verify` passed against the restricted runtime login.
- Live API `/ready` and its frontend proxy returned `ok` / `connected` after the app restart.
- The browser's public Supabase client was denied the `game` schema with `PGRST106`.
- Storage server upload/download succeeded; anonymous reads, uploads and public-URL access failed. Temporary test objects were removed.
- Runtime, migration, provisioning and browser environment files are ignored by Git. Server secrets were not copied into frontend configuration.

See the [infrastructure guide](../deployment/supabase/README.md) for repeatable provisioning, credentials, pooling and migration authoring. Auth and player upload features remain outside 00.04.

00.04 acceptance follow-up: added a GitHub Actions workflow with disposable PostgreSQL and no cloud credentials. A fresh local clone passed frozen installation, the full CI command sequence and a migration to an asserted-clean database with `CI=true`. The secret-boundary guard passed against real local configuration and the browser build; negative canary/browser-variable cases were rejected. This verifies the CI commands locally; a GitHub-hosted run is pending a push.

## 00.05 — Authentication and identity

Supabase Auth verifies identity. NestJS protects routes by default using a global guard and request-time `getUser(token)` verification with the public project key. Health and API identity are explicitly public. Protected `POST/GET /api/v1/players/me` initialize/read only the verified caller's profile, keyed by the existing unique auth UUID. User metadata, request IDs and client roles do not determine identity or permissions.

The `/account` page supports existing-account sign-in, session restoration, profile verification/retry and sign-out. Public foundation routes remain available. Registration/reset/deletion interfaces and future administrative permissions are outside this task.

Verification on November 3, 2026: automated tests passed 20 backend and 18 frontend cases. Live Supabase verification rejected missing/malformed/tampered tokens, resolved the correct Player for two users, rejected body/metadata/query identity overrides, and reused one Player during five concurrent first logins. The live test exposed a unique-conflict race in empty-update upsert; it was corrected and retested. All temporary users/profiles were removed. No browser connection was available for visual verification.

See [authentication](AUTHENTICATION.md) for configuration and `pnpm auth:verify`. No applied schema migration was edited.

## 00.06 — Configuration and secret management

Added separate development/test/production templates and loaders. Process values take precedence; test and production do not inherit development files. Production API startup requires explicit database, Auth and HTTPS CORS configuration. Runtime/admin/migration credentials remain separate. Validation failures report field names without submitted values.

Browser builds explicitly expose only the three validated public variables. Unknown public names and misplaced server credentials fail validation. CORS now validates exact origins, rejects unlisted requests/preflights with JSON 403, allows the required Bearer headers and disables cookie credentials. Secret scanning covers all actual mode files. Rotation guidance covers independent database roles, Supabase API keys and JWT signing keys.

Verification passed 26 backend and 20 frontend tests, lint, typecheck, builds and secret checks. A production startup check failed before serving with missing config and no development fallback. Live CORS checks returned 200 for a listed origin and 403 for an unlisted origin. Mode setup preserved both development-file hashes. No production credentials were populated or rotated. See [configuration](CONFIGURATION.md).

## 00.07 — CI, code quality and tests

Added pinned Prettier formatting and an initial source/configuration formatting pass. ESLint now covers JavaScript utilities and tests as well as TypeScript, enforces React Hooks rules and fails on warnings. Shared compiler settings also reject unused declarations, missing overrides, incomplete returns and switch fallthrough. The stricter checks prompted a profile-retry render fix and safer live-test failure reporting.

Backend test filenames and commands distinguish unit checks from HTTP integration tests; Vitest continues to run frontend component/unit tests. Real PostgreSQL tests remain an explicit separate suite. Pull-request/push CI now enforces formatting alongside lint, types, tests, builds, secret checks and clean-database migrations, with superseded-run cancellation. Optional pre-commit hook files are provided without changing local Git configuration.

Verification on November 3, 2026: frozen installation, `pnpm check`, both targeted test commands and Prisma validation passed. Results were 20 frontend tests, 10 backend unit tests, 16 HTTP integration tests and 5 real PostgreSQL tests. The database suite ran with `CI=true` against a newly initialized PostgreSQL 17.11 cluster; the cluster was stopped and its generated password file removed. The original whitepaper hash and applied migration remained unchanged. GitHub-hosted workflow execution is pending a push. See [code quality and tests](CODE_QUALITY.md).

00.07 acceptance is complete as of November 3, 2026. The [hosted pull-request run](https://github.com/404NeuronNotFound/PondBound/actions/runs/41620220546) and corresponding push run passed frozen installation, formatting, lint, typecheck, frontend/backend tests, build, secret checks, Prisma validation and clean PostgreSQL migration/permission tests. `main` now requires the up-to-date `verify` check from the GitHub Actions app, including for administrators, and requires pull requests. GitHub reported PR #1 as blocked while its required check was pending. Failed or missing required checks therefore prevent merging. These repository settings were read back from the protection API after configuration; they are separate from the workflow file.

## 00.08 — Database foundations

Added a forward migration for PostgreSQL-generated UUID defaults, timezone-aware timestamps and immutable Player IDs/Auth IDs/creation time. Database triggers assign creation/update time and record Player creation/deletion atomically in an append-only AuditEvent table. Audit rows have bounded object metadata, constrained event names, timeline indexes, backend-only RLS and mutation/truncation protection. The original applied migration is unchanged.

Documented internal-Player ownership foreign keys/indexes, restrictive deletion, atomic transfers, audit snapshot exceptions, and a forward-only migration/recovery policy. Explicit local-only Prisma seeds create two deterministic relational fixtures without Auth users or economic state; reruns preserve existing fixtures and conflicting identities roll back. Profile creation remains compatible with the original schema during deployment.

Local verification passed 20 frontend tests, 27 ordinary backend tests and 13 real PostgreSQL tests, plus formatting, lint, typecheck, Prisma validation, production builds and secret-boundary checks. Database tests cover clean deployment/redeployment, Prisma schema drift, indexes, runtime/browser grants, UUID/time enforcement, immutable audit events, transactional rollback, seed CLI/repeatability/conflicts, and forward upgrade with existing UUIDs/timestamps and profile creation before/after migration. Disposable clusters were stopped and their password files removed. Hosted application is pending: automatic approval review rejected exporting the development database into a private recovery backup because that data transfer requires explicit authorization. No hosted database migration or seed was run. The implementation is recorded in local commit `114195d`. See [database foundations](DATABASE.md).

00.08 acceptance follow-up: all three criteria pass locally for the foundation scope. Transaction-scoped ownership fixtures verify Player foreign keys, owner-scoped uniqueness, restrictive deletion and matching parent/child owners without adding premature gameplay tables. Repeated seeds preserve full Player rows and audit counts; identity conflicts roll back. The migration-specific rollback/recovery runbook covers failed transactions, conditional Prisma history reconciliation, application rollback and separate-database recovery. An injected failure before COMMIT proves that new tables/functions/triggers/defaults, timezone conversion and data repair roll back before a successful redeployment. A hosted backup restoration was not performed.

## 00.09 — Documentation and environment runbook

Updated the root README and documentation index with direct onboarding links. Added an architecture decision log covering workspace boundaries, React/Phaser responsibilities, server authority, identity, database roles, environment isolation, required CI and migration/audit policy. Added game-config conventions tied to the actual viewport export and consumers, plus root contribution/coding rules. The environment runbook covers preview, connected development, isolated tests and production handoff, with expected probes, troubleshooting and sanitized handoff information.

Setup now identifies the pending hosted 00.08 rollout and explains that migration deployment applies every pending migration. Architecture/API module descriptions reflect the implemented Auth/Player modules and local audit schema. Initial verification checked Markdown formatting, repository-relative links and documented pnpm examples against package scripts. Live localhost probes returned 200 for API liveness, database readiness and the Vite health proxy; frontend `/`, `/play` and `/account` served their SPA entry pages. These HTTP checks do not establish visual rendering or browser interaction. The initial documentation pass did not rerun application/database tests; the later bootstrap rehearsal below did. No hosted database changes or publication occurred during this task.

00.09 bootstrap acceptance passed locally on November 3, 2026 with Node 24.19.0, pnpm 12.9.1 and PostgreSQL 17.11. The review added explicit tool installation, first-run success criteria, a least-privilege existing-project handoff and a complete disposable PostgreSQL recipe. A temporary source snapshot containing 168 repository files was cloned with `git clone --no-local`; it contained no actual environment files, dependencies, generated Prisma client or build outputs. The snapshot included current local documentation changes and does not represent a verification of the older GitHub checkout.

- Frozen installation succeeded with an unchanged lockfile, using the existing public dependency cache.
- The documented `pnpm dev` started both apps without credentials. Direct/proxied health returned 200; readiness returned the expected 503/`unconfigured`. All three frontend routes served their SPA entry pages.
- Repeated development environment setup preserved file hashes; test/production template setup also succeeded without private credentials.
- `pnpm check` and Prisma validation passed in the checkout: 20 frontend and 27 ordinary backend tests, formatting, lint, strict types, builds and secret boundaries.
- The PowerShell PostgreSQL recipe was copied verbatim from the setup guide and executed with preinstalled PostgreSQL 17 binaries on PATH. All 13 real database tests passed; the disposable cluster stopped and its password file was removed.
- The checkout's Git working tree remained clean. The original workspace's localhost servers were restored and reported healthy/connected. No cloud provisioning, private database export or hosted migration occurred.

This verifies bootstrap without private project knowledge for preview development and local tests. Connected Supabase development still needs the explicitly documented restricted credentials and existing test account from the operator; production hosting and the pending hosted 00.08 deployment remain separate.

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
