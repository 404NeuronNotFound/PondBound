# Environment and troubleshooting runbook

Use [setup](SETUP.md) for installation and the command catalog, [configuration](CONFIGURATION.md) for variable precedence, and [database foundations](DATABASE.md) for migration/recovery procedures. Run commands from the repository root unless a different directory is specified. PowerShell users can substitute `pnpm.cmd`; use `curl.exe` for the curl examples on Windows.

## Environment checklist

| Environment           | Start/check                                                              | Required inputs                                                                                                 | Expected boundary                                                                                                  |
| --------------------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Local preview         | `pnpm install --frozen-lockfile`, then `pnpm dev`                        | Node 24 and pnpm 12.9.1; no credentials required                                                                | UI and API liveness work; readiness is 503 and account sign-in unavailable when services are unconfigured          |
| Connected development | `pnpm env:setup`, configure dedicated development files, then `pnpm dev` | Restricted API database URL; public Auth URL/key in API and web; migration/admin files remain separate          | Readiness 200; existing account sign-in resolves its own Player                                                    |
| Ordinary tests        | `pnpm test` or `pnpm check`                                              | Injected test fixtures; no cloud credentials                                                                    | Frontend/backend tests use isolated test configuration                                                             |
| Real database tests   | `pnpm test:database`                                                     | `TEST_DB_ADMIN_URL` for a fresh loopback `pondbound_test_*` database in a disposable PostgreSQL 17 cluster      | Creates test roles, applies migrations and verifies data/permissions; with `CI=true`, asserts an empty game schema |
| Production handoff    | `pnpm build`, then `pnpm --filter @pondbound/api start`                  | Explicit production runtime/Auth/HTTPS origins, public web build configuration and reviewed database migrations | API fails fast on missing required inputs; frontend/API hosting must be configured separately                      |

The hosted development project has its original migration and infrastructure. The 00.08 database-foundation migration has local verification but is awaiting approval for its hosted recovery backup/deployment. `/ready` checks connectivity, not migration completeness. Check deployment status in [Phase 0](PHASE_0.md) before treating a healthy database as current schema. Do not run seeds against the hosted project.

## Start or resume local development

1. Check `node --version` and `pnpm --version` against `.node-version` and `package.json`. Follow the explicit [prerequisite setup](SETUP.md#prerequisites) if tools are missing.
2. Install with `pnpm install --frozen-lockfile`. Keep the lockfile unchanged for a normal checkout. Use `pnpm env:setup` only when local files are needed; it preserves existing values.
3. Run `pnpm dev` and keep the terminal open. Wait for both Vite and NestJS startup messages. Open `http://localhost:5173`, then visit `/play` and `/account`. The current game route is an engine preview.
4. Use a second terminal for probes and checks. Stop the root dev process with Ctrl+C. Restart after changing environment files or shared-package source.

For real database checks, use the self-contained [disposable PostgreSQL recipe](SETUP.md#optional-disposable-postgresql-tests-on-windows). For shared project access, follow [connect to an existing development project](SETUP.md#connect-to-an-existing-development-project); normal application development does not require administrator or migration credentials.

```sh
curl -i http://127.0.0.1:3000/health
curl -i http://127.0.0.1:3000/ready
curl -i http://localhost:5173/api/health
```

Liveness and the frontend proxy return 200 with `service: pondbound-api`. Readiness returns 200/`connected`, or 503/`unconfigured` or `unavailable`. A 503 without credentials is expected for the local preview. `/ready` does not probe Auth/Storage availability. A successful SPA response at `/play` still needs a browser check to establish that Phaser renders correctly.

## Diagnose by symptom

| Symptom                                                    | Check                                                                          | Action                                                                                                                                                  |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm` missing or PowerShell blocks a `.ps1` wrapper       | Node/pnpm versions and executable on PATH                                      | Install/select the pinned tools; use `pnpm.cmd` on Windows                                                                                              |
| Frozen installation reports a lockfile mismatch            | Whether manifest or lockfile was changed/omitted                               | Restore the matching source revision, or deliberately regenerate/review the lockfile when changing dependencies; keep frozen installation in CI         |
| Vite port 5173 occupied, or API reports `EADDRINUSE`       | Another dev terminal/process owns the port                                     | Stop the owned dev session with Ctrl+C and restart. Inspect the process before stopping it                                                              |
| API moved to a different port but web status stays offline | Vite's `/api` proxy still targets `127.0.0.1:3000`                             | Update the proxy to the intended API port and restart. Add the actual frontend origin to `WEB_ORIGIN` if the frontend origin changed                    |
| Shared imports/types or viewport values look stale         | Workspace exports point to compiled package output                             | Stop/restart root development, or rebuild the changed shared package and restart its consumers                                                          |
| Startup reports invalid/missing configuration              | Selected mode, reported field names, process overrides and mode files          | Configure the selected mode using templates; keep migration/admin variables out of the runtime shell. Test/production do not inherit `.env`             |
| `/health` fails                                            | API startup/compile output and port                                            | Fix the first reported error; liveness must work before investigating database readiness                                                                |
| `/health` 200, `/ready` 503 `unconfigured`                 | API mode's runtime database setting                                            | Configure the dedicated restricted runtime URL if connected development is intended; the preview works without it                                       |
| `/ready` 503 `unavailable`                                 | Database reachability, role password, provider status, pool limits and CA path | Correct the connection/verified TLS configuration and restart the API. Keep certificate verification enabled                                            |
| Missing table/column or schema drift                       | Migration status and deployed backend/schema revisions                         | Run `pnpm db:status` with migration credentials; follow the reviewed deployment/recovery procedure. Connectivity alone does not prove schema readiness  |
| Account page says sign-in is unavailable                   | The two public Auth fields in the selected web mode                            | Configure URL and publishable key together, restart dev or rebuild the web bundle. Keep API and browser on the same intended project                    |
| Protected API returns 401 or profile lookup 404            | Existing-account session and profile initialization                            | Sign out/in if the session is invalid. The app initializes its own profile through POST `/api/v1/players/me`; do not submit another user's UUID         |
| Protected API returns 503 while database readiness works   | Auth provider configuration/reachability                                       | Check public Auth URL/key pairing and upstream availability; database readiness only checks PostgreSQL                                                  |
| Browser sees CORS 403                                      | Actual browser origin compared with `WEB_ORIGIN`                               | Add the exact trusted origin, including scheme/port, and restart. Wildcards, path-based entries and `null` are rejected                                 |
| Game shows text but no world                               | Current BootScene and roadmap phase                                            | This is the Phase 0 preview. World graphics and movement are not implemented yet                                                                        |
| Game loading/error panel or blank canvas                   | Browser console/network, lazy chunk requests and viewport                      | Reload after a completed build, check asset/chunk paths and engine startup. Use the error recovery action; verify the canvas in a real browser          |
| Production deep link such as `/play` returns host 404      | Static-host routing and asset/API handlers                                     | Configure SPA history fallback to `index.html`, preserving `/assets/*`, `/api/*` and backend probes                                                     |
| API production startup fails after a successful build      | Explicit production runtime inputs                                             | Populate the intended production environment or host secret store; `start` does not load development credentials                                        |
| Seed command refuses the configured URL                    | Local-only target and non-production mode guard                                | Use an explicitly injected disposable local migration URL. The hosted URL is intentionally rejected                                                     |
| Migration fails or audit mutation is rejected              | Migration transaction state or requested operation                             | Follow the [database recovery runbook](DATABASE.md). Append a correction event for audit history; do not remove its protection                          |
| `verify` CI fails or merging is blocked                    | First failed/missing step and whether the branch is up to date                 | Reproduce that command locally, fix it and push the branch. Read [quality checks](CODE_QUALITY.md); retain the required check                           |
| Secret-boundary check fails                                | Reported file/key name and correct environment ownership                       | Remove misplaced server credentials from browser/source output, rotate actual exposed credentials under the rotation guide, rebuild and rerun the check |
| Build only warns about a large Phaser chunk                | Whether the command exits successfully and the engine stays lazy               | The engine chunk is a known foundation warning. Measure actual loading/rendering before changing bundling rules                                         |

On Windows, this read-only command identifies listening processes for the default ports:

```powershell
Get-NetTCPConnection -State Listen -LocalPort 5173,3000 |
  Select-Object LocalAddress,LocalPort,OwningProcess
```

Inspect the reported process in the OS process viewer or with `Get-Process -Id <OwningProcess>` before stopping a session. Avoid broad commands that terminate every Node process.

## Verify a fix and hand it off

For request failures, retain the API's `X-Request-Id` or error-body `requestId` and correlate it with `request.completed`/`error.reported` JSON records. A 429 includes `Retry-After`; wait for that budget to reopen rather than retrying in a loop. Diagnose missing/spoofed client IP separation through the explicit proxy configuration. `startup.failed` and `process.failed` require correcting the fault and restarting through the supervisor. Hook failures/overload, advisory scans, collector setup and the backup/restore plan are covered in [monitoring and security](SECURITY.md).

Run the smallest check that reproduces the issue, then the relevant [quality checks](CODE_QUALITY.md). For code changes, `pnpm check` covers formatting, lint, types, ordinary tests, build and secret boundaries. Add the disposable database suite for schema/permission changes. For documentation-only changes, check formatting, commands against package scripts and repository links; application/database tests need no rerun solely for prose.

Record the source revision, Node/pnpm versions, selected environment mode, command/route, HTTP status and sanitized error field names. Include expected versus observed behavior. Remove credentials, tokens, full connection strings and personal account data from logs/screenshots. Label mocked tests, actual browser checks and live-provider checks accurately. Hand off unresolved deployment dependencies explicitly; retain recovery points and audit history until a verified rollout is complete.
