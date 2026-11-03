# Development setup

## Prerequisites

Install Git and select Node.js **24.x** from the [official Node download page](https://nodejs.org/en/download). Node includes npm. Then install the repository's pinned pnpm version using [pnpm's npm installation method](https://pnpm.io/installation):

```sh
npm install --global pnpm@12.9.1
git --version
node --version
pnpm --version
```

Expect Node `v24.x` and pnpm `12.9.1`. Open a new terminal after installing tools if PATH has not refreshed. In PowerShell, use `npm.cmd` and `pnpm.cmd` if script-wrapper policy blocks their `.ps1` files. PostgreSQL and Supabase access are optional for the application preview and ordinary tests; real database tests have a separate recipe below. No software or credentials from another project are required.

## Local apps

Install Node.js 24 and pnpm 12.9.1, then run these commands:

```sh
git clone https://github.com/404NeuronNotFound/PondBound.git
cd PondBound
pnpm install --frozen-lockfile
pnpm dev
```

The root development command builds `packages/shared` and `packages/game-config` once before starting both apps in parallel. No previous `dist` directories, generated Prisma client or `.env` files are required. Frontend: http://localhost:5173. Backend: http://localhost:3000/api/health. The frontend also proxies `/api/health` to the backend. Stop both processes with Ctrl+C.

In another terminal, verify the API and proxy with `curl http://127.0.0.1:3000/health` and `curl http://localhost:5173/api/health` (`curl.exe` in PowerShell). Both should return HTTP 200 with `status: ok` and `service: pondbound-api`. Open `/`, `/play` and `/account` on port 5173. Without configured services, `/ready` returns 503/`unconfigured` and the account page explains that sign-in is unavailable. This is a successful preview bootstrap.

Stop development before running `pnpm check` and `pnpm db:validate` in the same checkout: builds and tests regenerate shared outputs and the Prisma client. Those commands require no Supabase credentials. See [troubleshooting](RUNBOOK.md) if an expected result differs.

Restart development after changing shared package source, or run that package's `dev` watch script separately. Ports 5173 and 3000 must be available. Vite deliberately fails if port 5173 is occupied.

Run `pnpm env:setup` to create missing runtime, web, migration and provisioning environment files from their templates without overwriting settings. These copies are optional for the credential-free preview. Never commit populated environment files.

Use `pnpm env:setup --mode test` or `--mode production` for separate files. Test/production never read development `.env` files. API `start` selects production and requires explicit database/Auth/CORS values. See [configuration](CONFIGURATION.md) for precedence and rotation.

The API binds to loopback by default; use `HOST` deliberately for container hosting. Set `PORT` to change its port and adjust the Vite proxy if needed. `WEB_ORIGIN` lists exact frontend origins. Browser `VITE_API_URL` is the API origin without `/api`; empty uses the development proxy or a configured production same-origin proxy. Production builds use only production public configuration.

## Connect to an existing development project

This is the normal path for a developer who needs real sign-in or database access. Ask the project operator for the **restricted runtime database URL**, public Supabase URL/publishable key, and a development test account through the approved secret-sharing process. Administrator/service-role/migration credentials are not needed to run the application.

1. Run `pnpm env:setup`; the generated files start with blank service credentials.
2. Set `DATABASE_URL` in `apps/api/.env` to the supplied `pondbound_api` URL. For remote TLS, set `DB_SSL_CA_FILE` to the absolute local path of `deployment/supabase/supabase-ca.crt` after confirming it matches the provider's current CA. The operator supplies the correct host, port and project-qualified username.
3. Set public `SUPABASE_URL`/`SUPABASE_PUBLISHABLE_KEY` in the API file and matching `VITE_SUPABASE_URL`/`VITE_SUPABASE_PUBLISHABLE_KEY` in `apps/web/.env`. Leave the migration/provisioning files blank unless you are responsible for those operations.
4. Restart `pnpm dev`, confirm `/ready` returns 200/`connected`, and sign in at `/account` with the supplied existing test account. The UI does not yet provide registration or password reset. Ask the operator to resolve access or migration-version issues; do not run bootstrap against a shared project to fix a login error.

To work independently, an operator can provision a separate dedicated project using the next section. Preview development and ordinary tests remain available without any private handoff.

## Provision a dedicated Supabase project

Create or select a Supabase project dedicated to Pondbound. Do not reuse PaServe credentials or its database.

1. Follow the [Supabase infrastructure guide](../deployment/supabase/README.md) to populate the ignored provisioning file and configure the provider CA.
2. Run `pnpm db:bootstrap` to create restricted roles/schema and generate separate runtime and migration credentials. Administrator credentials never belong in the runtime `DATABASE_URL`.
3. Review pending migrations and the [database deployment/recovery procedure](DATABASE.md), then run `pnpm db:deploy`, `pnpm db:verify`, and `pnpm db:status` in that reviewed deployment window. Run `pnpm storage:provision` for the private bucket.
4. Restart the API and request `http://127.0.0.1:3000/ready`. HTTP 200 with `database: connected` confirms a Prisma query succeeded. A 503 reports unconfigured or unavailable without exposing connection secrets.
5. Add the public project URL and publishable key to both API (`SUPABASE_*`) and web (`VITE_SUPABASE_*`) environments. `/account` supports sign-in for existing accounts. Registration/reset UI and user-facing Storage operations are later tasks. See [authentication](AUTHENTICATION.md).

The initial Player model lives in a private `game` schema. Keep this schema out of Supabase's exposed Data API schemas and do not grant `anon` or `authenticated` direct table access. If a future table is exposed, enable and test Row Level Security before making it client-accessible. The NestJS API will own gameplay writes.

The existing PondBound Development project now has the initial migration, restricted roles and private Storage bucket applied. Credentials remain local and ignored. A fresh clone runs without them; connecting that clone to a database requires its own environment configuration.

The 00.08 forward migration is tested locally but has not been applied to the hosted project; its recovery backup/deployment is awaiting explicit approval. Running `db:deploy` applies all pending migrations. Readiness confirms connectivity rather than migration completeness. See the [environment runbook](RUNBOOK.md) for expected responses and troubleshooting.

## Commands

| Command                             | Purpose                                                                              |
| ----------------------------------- | ------------------------------------------------------------------------------------ |
| `pnpm dev`                          | Start frontend and API                                                               |
| `pnpm env:setup`                    | Copy missing environment templates without overwriting settings                      |
| `pnpm build`                        | Generate Prisma client and build packages/apps in dependency order                   |
| `pnpm typecheck`                    | Check TypeScript                                                                     |
| `pnpm lint`                         | Check code conventions                                                               |
| `pnpm test`                         | Build shared packages and run frontend and backend tests                             |
| `pnpm --filter @pondbound/web test` | Run frontend routing, loading, recovery and lifecycle tests                          |
| `pnpm format`                       | Format source, configuration and documentation                                       |
| `pnpm format:check`                 | Check formatting without changing files                                              |
| `pnpm test:unit`                    | Run frontend tests and backend unit tests                                            |
| `pnpm test:integration`             | Run backend HTTP integration tests                                                   |
| `pnpm test:database`                | Run integration tests against explicit disposable local PostgreSQL                   |
| `pnpm check`                        | Format check, lint, typecheck, test, build and secret-boundary checks                |
| `pnpm check:secrets`                | Check source/browser credential boundaries after building                            |
| `pnpm security:audit`               | Scan all dependencies; high/critical advisories or registry errors fail              |
| `pnpm security:audit:prod`          | Scan the production dependency graph                                                 |
| `pnpm db:generate`                  | Generate Prisma client without a live database                                       |
| `pnpm db:validate`                  | Validate Prisma schema/configuration                                                 |
| `pnpm db:bootstrap`                 | Provision roles/schema and local role credentials using the administrator connection |
| `pnpm db:deploy`                    | Apply committed migrations using migration-only credentials                          |
| `pnpm db:verify`                    | Check live runtime permissions and browser isolation                                 |
| `pnpm db:status`                    | Inspect applied migration status                                                     |
| `pnpm db:seed`                      | Seed deterministic fixtures in a disposable local database only                      |
| `pnpm storage:provision`            | Create or verify the private Storage bucket                                          |
| `pnpm auth:verify`                  | Explicit live Auth/profile smoke test with temporary development users and cleanup   |

The generated Prisma client and build outputs are ignored. `pnpm install --frozen-lockfile` plus `pnpm build` reconstructs them. In PowerShell environments that restrict `.ps1` wrappers, use `pnpm.cmd` for every pnpm command. Windows uses the same root commands as macOS and Linux.

Canonical backend probes are `http://localhost:3000/health` and `http://localhost:3000/ready`. Versioned API information is available at `http://localhost:3000/api/v1`. The frontend continues to use the `/api/health` compatibility alias through Vite. See the [API guide](API.md) for contracts and error responses.

## Optional disposable PostgreSQL tests on Windows

Install PostgreSQL **17** server tools from the [official Windows download page](https://www.postgresql.org/download/windows/) and put its `bin` directory on PATH. The usual installer location is `C:\Program Files\PostgreSQL\17\bin`; use your selected installation path. Confirm `pg_ctl --version` reports 17.x. This recipe starts its own loopback cluster and uses no existing PostgreSQL service, database, Supabase account or other project's tools.

Run the following in PowerShell from the repository root after the frozen install. Port 55432 must be free. `onboarding-postgres` must not already exist; choose another unused artifact directory for another run. The password is a disposable local fixture, not a project credential. The suite creates random, separate runtime/migration role passwords internally.

```powershell
$ErrorActionPreference = 'Stop'
$testRoot = Join-Path (Get-Location).Path 'artifacts/onboarding-postgres'
if (Test-Path -LiteralPath $testRoot) { throw 'Choose a new disposable test directory' }
New-Item -ItemType Directory -Path $testRoot | Out-Null
$dataDir = Join-Path $testRoot 'data'
$pwFile = Join-Path $testRoot 'admin-password.txt'
[System.IO.File]::WriteAllText($pwFile, 'onboarding_local_only')
$started = $false
try {
  initdb -D $dataDir -U pondbound_test_admin --pwfile=$pwFile --auth-host=scram-sha-256 --auth-local=trust --encoding=UTF8 --locale=C
  if ($LASTEXITCODE -ne 0) { throw 'initdb failed' }
  pg_ctl start -D $dataDir -l (Join-Path $testRoot 'postgres.log') -o '-h 127.0.0.1 -p 55432' -w
  if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL start failed' }
  $started = $true
  $env:PGPASSWORD = 'onboarding_local_only'
  createdb -h 127.0.0.1 -p 55432 -U pondbound_test_admin pondbound_test_onboarding
  if ($LASTEXITCODE -ne 0) { throw 'createdb failed' }
  Remove-Item Env:PGPASSWORD
  $env:TEST_DB_ADMIN_URL = 'postgresql://pondbound_test_admin:onboarding_local_only@127.0.0.1:55432/pondbound_test_onboarding'
  $env:CI = 'true'
  pnpm.cmd test:database
  if ($LASTEXITCODE -ne 0) { throw 'Database checks failed' }
} finally {
  if ($started) { pg_ctl stop -D $dataDir -m fast -w }
  Remove-Item Env:PGPASSWORD, Env:TEST_DB_ADMIN_URL, Env:CI -ErrorAction SilentlyContinue
  Remove-Item -LiteralPath $pwFile -ErrorAction SilentlyContinue
}
```

Success means all database tests pass, the cluster stops and its password file is removed. The remaining data/log files are ignored artifacts from a disposable instance. No hosted migration or seed runs. On macOS/Linux, provide an equivalently isolated PostgreSQL 17 cluster and set the same `TEST_DB_ADMIN_URL`/`CI` inputs before `pnpm test:database`; the Windows cluster-management commands above are PowerShell-specific.

## Bootstrap verification

The current local source was rehearsed in a fresh local clone on November 3, 2026: frozen installation, credential-free app startup, environment setup/rerun, `pnpm check`, Prisma validation and the Windows PostgreSQL recipe all passed. There were no copied private configuration files, and all 60 tests passed. The clone's Git state and lockfile remained unchanged. See [Phase 0 evidence](PHASE_0.md) for scope and limitations; this does not claim a new GitHub publication or hosted deployment.
