# Architecture decision log

Recorded November 3, 2026. This log explains the decisions represented by the current code. The [architecture guide](ARCHITECTURE.md) describes responsibilities; [Phase 0](PHASE_0.md) records verification and deployment status.

Keep decision IDs stable. Add a new entry when a choice changes a package boundary, source of truth, persistent data format, identity model or deployment contract. Record context, decision, consequences and status. Mark a replaced entry as superseded and link its replacement; preserve the original reasoning.

| ID      | Decision                                                                 | Status                                               |
| ------- | ------------------------------------------------------------------------ | ---------------------------------------------------- |
| ADR-001 | pnpm workspace with buildable shared packages                            | Accepted; implemented                                |
| ADR-002 | React shell and lazy Phaser viewport                                     | Accepted; implemented                                |
| ADR-003 | Server-authoritative gameplay with shared public contracts               | Accepted; foundation implemented                     |
| ADR-004 | Supabase Auth UUID mapped to an internal Player UUID                     | Accepted; implemented                                |
| ADR-005 | Private Prisma schema and separate database roles                        | Accepted; implemented                                |
| ADR-006 | Validated, isolated environment modes and explicit browser configuration | Accepted; implemented                                |
| ADR-007 | Required CI check with disposable database tests                         | Accepted; configured in 00.07                        |
| ADR-008 | Forward migrations, append-only audit and local-only fixtures            | Accepted; development migration applied and verified |
| ADR-009 | Safe structured telemetry and bounded baseline security                  | Accepted; implemented locally                        |

## ADR-001: pnpm workspace

**Context:** the browser and API need consistent types, configuration and commands while retaining independent runtime dependencies.

**Decision:** use `apps/web`, `apps/api`, `packages/shared`, `packages/game-config` and `packages/typescript-config` in one pnpm workspace. Node is pinned to the supported major in `.node-version`; `packageManager` pins pnpm and the committed lockfile pins resolved dependencies. Shared runtime packages export their compiled ESM output and declarations.

**Consequences:** root scripts build dependencies before app development/type checking. Root `dev` builds shared packages once; changes to those sources require rebuilding/restarting or a separate package watcher. Keep package dependencies acyclic and avoid imports into another package's private source directories.

## ADR-002: React and Phaser responsibilities

**Context:** navigation, forms and account recovery need normal web UI, while the world needs a canvas engine.

**Decision:** React Router owns the shell and route lifecycle. `/play` loads Phaser asynchronously; the viewport creates and destroys one engine instance. React owns loading and error recovery. Phaser owns scenes, canvas rendering and future world input.

**Consequences:** the home route avoids loading the engine. DOM tests mock Phaser; actual canvas rendering needs browser verification. The current boot scene is a text preview. Pixel art, movement and the playable world are later work. The separate engine chunk has a known build-size warning.

## ADR-003: authority and public contracts

**Context:** fishing, upgrades and trading will affect persistent inventory and currency.

**Decision:** NestJS owns authoritative outcomes, authorization and database writes. `packages/shared` supplies public Zod response/configuration schemas and inferred TypeScript types. Nest request DTOs use global class-validator validation. `packages/game-config` currently contains public presentation constants only.

**Consequences:** client animation and displayed configuration cannot authorize a reward. Do not put hidden probabilities, credentials or authoritative economic rules into browser-imported packages. Introduce each gameplay transaction with its roadmap phase and tests. See [game-config conventions](GAME_CONFIG.md).

## ADR-004: identity mapping

**Context:** provider authentication and application-owned history have different lifecycles.

**Decision:** verify Supabase access tokens in NestJS through `getUser(token)`. Map the verified Auth UUID to unique `Player.authId`; use `Player.id` for application ownership. Routes are protected by default, with explicit public probes. Client roles, IDs and metadata never select the caller's Player.

**Consequences:** there is no database foreign key into provider-managed `auth.users`, and Auth deletion does not cascade application data. Auth availability is required for protected calls. Account lifecycle/recovery operations need their own design. The UI currently supports existing-account sign-in, not registration/reset.

## ADR-005: database and infrastructure boundaries

**Context:** the browser must not bypass server validation, and an API credential must not administer schema changes.

**Decision:** Prisma uses the private PostgreSQL `game` schema. Runtime, migration and provisioning roles/configuration are separate. The API owns one bounded `pg.Pool` per process. Hosted connections verify TLS; the configured development connection uses the session pooler. Storage is private and administered separately.

**Consequences:** every new table needs explicit grants and RLS in its migration. The shared backend role grants server access, so handlers must still enforce per-player ownership. `game` stays outside Supabase's exposed Data API schemas. Runtime cannot perform DDL or access migration history. See [infrastructure](../deployment/supabase/README.md).

## ADR-006: environment modes

**Context:** development credentials must not silently enter tests, production or browser builds.

**Decision:** select and validate development/test/production inputs independently. Process values override selected files. Test and production never inherit development files. The browser receives only three explicitly validated public fields; the API rejects administration and migration secrets.

**Consequences:** production startup fails on missing required inputs, public changes require a web rebuild, and changing API mode requires the matching configuration. Prisma/provisioning retain their own separate files. Exact-origin CORS complements authentication. See [configuration](CONFIGURATION.md).

## ADR-007: required quality check

**Context:** reproducibility includes formatting, strict types, tests, build output and database permissions.

**Decision:** use one `verify` GitHub Actions job for frozen installation, `pnpm check`, Prisma validation and a clean PostgreSQL migration/test run. `main` requires the up-to-date check from the GitHub Actions app, including for administrators. Local hooks are opt-in.

**Consequences:** failures or missing checks prevent normal merges. The workflow needs no Supabase secrets; live Auth checks remain explicit. Protection is a GitHub setting and must be recreated if the repository is recreated. Hosted evidence and test boundaries are in [code quality](CODE_QUALITY.md).

## ADR-008: persistent data changes and audit

**Context:** identities and audit history must remain interpretable as game systems are introduced.

**Decision:** use reviewed forward migrations, database-generated UUID defaults, UTC-aware timestamps, protected Player identities and append-only audit events. Player lifecycle events share the business transaction. Audit actor/entity IDs are historical snapshots; future owned entities use indexed, restrictive Player foreign keys. Seeds create deterministic fixtures only in disposable local databases.

**Consequences:** migration owners remain trusted DDL administrators. Audit corrections append events; destructive down-migrations are not the recovery mechanism. The 00.08 migration, ownership/seed tests and recovery plan are verified, and the hosted development migration is applied. A verified empty Player table allowed a schema-only checkpoint without private-row export. See [database foundations](DATABASE.md).

## ADR-009: monitoring and baseline security

**Context:** operators need request correlation and failure signals without forwarding credentials or arbitrary request data to logs/collectors.

**Decision:** generate request UUIDs on the API, log allowlisted JSON metadata, expose replaceable safe server/browser reporting hooks, and fail closed on fatal process errors. Apply independent API/Auth-verification budgets using per-process memory stores, explicit proxy-CIDR trust, Helmet and a body-size cap. Scan dependencies in CI and on a weekly schedule; review targeted security overrides with Prisma/lint/migration checks.

**Consequences:** original exceptions/stacks are omitted from reporting payloads, so root-cause diagnostics require deliberately designed safe fields. Memory limits reset on restart and need an edge/shared store before multiple replicas. Provider password-login limits, collector/alert configuration and actual hosted backup policy remain operator deployment responsibilities. The [security guide](SECURITY.md) defines those boundaries and the recovery plan.
