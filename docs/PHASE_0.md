# Phase 0: project foundation

## Scope

Establish the monorepo and runnable stack before Phase 1 world development. Preserve the user-provided whitepaper at the repository root.

## Phase 00 exit-gate review — November 3, 2026

**Technical decision: GO for the Phase 00 foundation, conditional on the protected closeout PR passing CI and merging. Release publication is the last outstanding operation.**

The initial HOLD review identified missing browser evidence, a delayed development migration and unpublished work. Browser acceptance and the hosted migration are now verified. The closeout release includes the three local foundation commits and the final favicon/mobile fixes. Task narratives below preserve earlier verification history; this section records current status.

| Exit criterion                                         | Result                                | Evidence                                                                                                                                                                                   |
| ------------------------------------------------------ | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Essential tasks complete and reviewed                  | Pass technically                      | 00.01–00.10 implementation and acceptance reviewed; development migration/permissions and browser flows are now verified.                                                                  |
| Automated/manual acceptance passed; defects documented | Pass                                  | 76 automated tests, clean-checkout rehearsal, real Chrome interactions/screenshot inspection, live Auth isolation and temporary-account browser flow; resolved defects below.              |
| Database/assets versioned; docs updated                | Pass in release                       | Both immutable migrations/schema and asset placeholders/pipeline are tracked. Closeout changes and this review are included in the release PR. Original game artwork remains Phase 1 work. |
| Security/performance/economy risks assessed            | Pass                                  | Controls and scoped residual risks are accepted below for the development foundation.                                                                                                      |
| Reviewer signs off                                     | Technical GO, subject to protected CI | Codex implementation/technical review is recorded below; independent human review is not claimed.                                                                                          |

### Acceptance and browser evidence

- Automated gate: 38 backend, 25 frontend and 13 real PostgreSQL tests passed, with formatting, lint, strict types, builds, schema/migration/permission/seed checks and secret boundaries. The separate synthetic restore drill preserved data, timestamps, migration checksums, RLS/grants and audit immutability; its archive checksum was rechecked.
- Clean-checkout bootstrap: frozen installation, both app startups without private files, repeated environment setup and the documented isolated PostgreSQL recipe passed with an unchanged lockfile/worktree.
- Real browser: approved temporary driver and separately installed headless Chrome **156.0.8078.80**, fresh contexts, desktop 1280×900 and mobile viewports 390×844 / 320×844. This is a real renderer, not the unavailable in-app browser or mocked Phaser. Physical mobile hardware was not used.
- Checked home/play/account direct entry, active navigation, back/forward, keyboard reachability of the skip link and main focus, unknown-route recovery, actual Phaser canvas creation/cleanup/reentry, and no horizontal overflow at both mobile widths. Screenshots were inspected for desktop home/play, mobile home/play and signed-in account layout.
- Deliberately interrupted only the test browser's health request and engine import; offline/reconnect and error-boundary/reload recovery both passed. The normal browser scenario ended with zero unexpected console/page errors.
- Live browser account: one confirmed temporary fixture account (no email sent) signed in through Supabase, resolved the correct API Player, restored its session, reused one profile after reload, rendered a long email at 320px and signed out. Each temporary user/profile was removed; immutable lifecycle snapshots contain internal entity IDs and no copied email/Auth UUID.
- Live backend Auth smoke: invalid/tampered tokens, two-user identity isolation, spoofed role/ID rejection and concurrent first login passed after the hosted migration; its temporary users/profiles were removed.
- Browser scripts/screenshots, empty-schema checkpoint and nonproduction restore evidence remain in ignored local verification artifacts. Credentials and private row exports are not included in the release.

### Hosted development database closeout

Verified the designated migration role, UTC, zero Player rows and the original migration checksum. Under a Player-table share lock, saved **schema DDL only** plus non-sensitive baseline migration metadata. No private row data or passwords were exported. This safely replaced the earlier rejected private-data export for the empty foundation; it is not a full backup procedure for a populated project.

Applied `20261103010000_database_foundations`; `db:status` is up to date and `db:verify` passed runtime ownership/RLS, schema/migration isolation, audit append-only grants and browser denial. Real application profile creation and cleanup then passed. The [recovery plan](DATABASE.md) and [backup policy](SECURITY.md) remain mandatory for future populated deployments.

### Defects resolved

| Finding                                         | Resolution / verification                                                  |
| ----------------------------------------------- | -------------------------------------------------------------------------- |
| First-login unique-conflict race                | Existing fix retained; concurrency/live Auth checks pass                   |
| Unsafe malformed-URL diagnostics                | Guarded validation and sanitized startup test pass                         |
| React default raw error logging                 | Safe root callbacks and actual-root canary tests pass                      |
| Sensitive values embedded in log message text   | Default-deny free text and allowlisted metadata; canaries pass             |
| Missing favicon generated a browser console 404 | Explicit empty preview favicon; normal browser console is clean            |
| Long signed-in email overflowed at 320px        | Account paragraph wrapping; real authenticated mobile browser check passes |

### Risk disposition for the phase boundary

| Category                                | Assessment / control                                                                                                                              | Accepted residual and owner/target                                                                                                                                                                        |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Security: disclosure/identity/ownership | Isolated modes/roles, public-field allowlist, safe logs/root hooks, token/DTO/ownership/RLS/audit tests, clean dependency audit                   | External SDK/hosting/collector configuration: project operator before public production deployment. New gameplay ownership rules: backend feature owner in each feature phase.                            |
| Security: schema/recovery               | Both development migrations applied and grants verified; empty-schema checkpoint and separate synthetic restore verified                          | Populated/provider-wide backup, Auth/Storage coverage and recovery targets: project operator before real production data. No hosted restore drill is claimed.                                             |
| Security: abuse/dependency maintenance  | API/auth-verification budgets, body cap, explicit proxy CIDRs, patched overrides and CI advisory scan                                             | Per-process limits reset on restart; shared/edge limits and provider login policy: operator before public/multiple-replica deployment. Override maintenance: repository maintainer on dependency changes. |
| Performance: engine/client rendering    | Lazy engine, real desktop/mobile viewport canvas checks; current engine asset ~1.19 MB before compression                                         | Large-chunk warning accepted for this foundation. Physical-device FPS, asset/frame/loading budgets: Phase 1 owner before world/content acceptance; no production load benchmark is claimed.               |
| Performance: API/database/logging       | Bounded pools/timeouts, request timings and throttle/pool tests                                                                                   | Capacity, replica/pool/log budgets: deployment owner before public traffic.                                                                                                                               |
| Economy                                 | No Gold/wallet/market/token mutation exists; public config is presentation-only; server authority/ownership/transaction/audit conventions defined | Economy invariants, inflation/exploit simulation and recovery: feature owners when progression/economy/market systems are introduced. No economy balance certification is implied.                        |

### Reviewer sign-off and scope

- Reviewer: **Codex, implementing and technical-review agent**. Review type is explicitly agent technical review; no independent human approval is asserted.
- Decision: **GO for Phase 00's reproducible development foundation**, after the required closeout CI/merge. Final code revision and hosted run will be recorded once available.
- Accepted evidence: automated checks, real-renderer/browser screenshot inspection and interactions, real temporary-account Auth flow, development migration/permissions and synthetic recovery drill.
- Accepted residuals: the assigned later-phase/production items above do not block local Phase 1 visual/world development. They cannot be treated as production readiness.
- Phase 1 work has **not started**; the project owner chooses when to issue the next implementation command.

The protected GitHub `verify` check remains mandatory, including for administrators. Release completion will be recorded after that exact closeout revision passes and is merged.

## Implemented

- pnpm workspace with shared contracts, game presentation settings, and TypeScript configuration.
- React + TypeScript + Vite + Tailwind frontend and Phaser 3 boot scene.
- NestJS API with validation, explicit origins, graceful shutdown, liveness and database readiness.
- Prisma PostgreSQL adapter, schema and migration commands.
- Optional public Supabase frontend client and credential templates.
- Reserved feature, art, asset, deployment, script and artifact directories.
- Setup, architecture, asset pipeline and development conventions.

## Completion boundary

All ten tasks have implementation/acceptance records. Supabase infrastructure, identity and both development migrations are verified; the current exit review and release status are recorded above. The preview is an engine integration check; it is not a playable world.

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

## 00.10 — Monitoring and baseline security

Added allowlisted JSON logging, server-generated request UUIDs, safe response/log correlation and filtered 5xx reporting through an injectable adapter. Startup/fatal failures use sanitized structured events; uncaught process failures exit rather than continuing. React error boundaries invoke a safe browser reporting hook, and API failures retain validated request IDs without copying response messages.

Independent API and protected-route verification budgets run before expensive work. Defaults are 120 API requests and 30 auth-verification attempts per IP per 60 seconds, with explicit proxy CIDRs and untrusted forwarding headers ignored. Probes/preflights remain operational. Helmet, no-store caching and a 16 KiB body limit provide API response/parser safeguards. The security guide describes single-process scope, shared-store requirements, provider-side password login limits and separate frontend-host headers.

Dependency scans now have root commands and a CI step plus a weekly trigger. Targeted patched overrides resolved Prisma tooling and minimatch advisories; full and production graph scans reported no known vulnerabilities. A malformed database URL validation path was corrected so startup diagnostics identify fields without leaking input. Backup coverage, proposed retention/RPO/RTO, restore steps and operator monitoring/response responsibilities are documented in [monitoring and security](SECURITY.md).

Local verification passed `pnpm check`: 37 backend and 23 frontend tests, formatting, lint, strict types, builds and secret checks. Another 13 real PostgreSQL tests passed with the patched dependencies, including Prisma schema drift, migrations, ownership, seeds and audit enforcement. Frozen installation remained reproducible. New HTTP tests exercised safe request/report metadata, spoofed IDs/forwarding headers, 429/Retry-After and window reset before upstream Auth calls, 413/malformed/CORS errors, security headers and failing reporters. Process tests verified JSON startup failures and safe fatal exits. Browser tests verified sanitized hook payloads, adapter-failure isolation and request-ID validation.

A synthetic local backup/restore drill passed with PostgreSQL 17.11: Player/audit content, timestamps, migration checksums and grants/RLS matched after restoring into a separate database; audit immutability remained enforced. Localhost liveness/readiness returned 200 and an unauthenticated profile request returned a correlated 401 with baseline headers. Both dependency scans were clean. New CI/scheduled execution awaits publication; collector/alert destinations, distributed production throttling, Supabase Auth settings and hosted backup/restore configuration remain deployment responsibilities. No hosted database data was exported or changed during this task.

00.10 acceptance follow-up: all three criteria pass locally for the owned application paths. Review found and closed React's default raw root-error logging path, then strengthened the logger to reject unapproved free-form message text. Tests cover nested credentials and unlabelled sensitive strings, raw errors/stacks, request bodies/headers/query/path values and invalid configuration. API IDs correlate response headers/envelopes with completion logs/reports across async context; browser records have unique event IDs and safe root callbacks. The full quality gate passed 38 backend and 25 frontend tests, builds, formatting, lint, types and secret checks. Together with the existing 13 PostgreSQL checks, this is 76 passing tests. The separate synthetic nonproduction dump/restore drill remains valid, with matching archive checksum, restored data/migration checksums and permissions/audit enforcement. External SDK/hosting/provider logging and a real hosted recovery drill remain outside this local verification.

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
