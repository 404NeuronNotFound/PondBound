# Monitoring and baseline security

The baseline runs locally with no monitoring vendor credentials. The API emits JSON lines, correlates requests, reports safe failures through an adapter hook, limits API/Auth-verification traffic and applies Helmet headers/body limits. Existing identity, CORS, role, RLS and secret boundaries remain in force. [Database recovery](DATABASE.md) covers migration/recovery procedures; 00.08 is applied to the development project. Production hosting, collectors and provider backup settings are not provisioned by this change.

## Logs and request IDs

Each API request receives a server-generated UUID in `X-Request-Id`, including parser, CORS, rate-limit and unknown-route errors. An inbound request ID is ignored. Error envelopes also contain `requestId`; existing clients can omit that optional contract field. CORS exposes the correlation/rate headers to allowed browser origins. The web API error class retains a valid server UUID for support/reporting adapters.

`JsonLogger` emits one object per line with UTC timestamp, level, service and event. Request completion adds method, registered route template, HTTP status, monotonic elapsed milliseconds, finished/aborted outcome and request ID. Unknown routes log `unmatched`. Request context also follows asynchronous server logs. System logs outside a request have no correlation ID.

Raw URL/query strings, path parameter values, IP addresses, request/response bodies, headers, cookies, access tokens, arbitrary exception objects and stack arguments are not included in request logs or reports. Structured logger fields are allowlisted; error objects are not serialized. Free-form message text is rejected by default, including nested JSON encoded as a string and unlabelled values. Only explicitly listed operational messages and configuration diagnostics containing recognized field names are emitted. Extend these safe messages through review; use typed event metadata for new diagnostics. Startup failures are JSON records with safe configuration field names when available. Uncaught exceptions/rejections produce a sanitized fatal classification and exit with code 1; a process supervisor must restart the API rather than continuing after a fatal failure.

Collect stdout/stderr through the deployment's access-controlled log service. Proposed baseline retention is 14 days, with access limited to operators; choose and configure the actual retention before production. Audit events are a separate persistent record and do not share this log deletion policy.

## Error reporting adapters

The API's `ERROR_REPORTER` injection token accepts an `ErrorReporter.capture(ErrorReport)` adapter. Its default `LoggingErrorReporter` emits `error.reported` for filtered 5xx failures. Reports contain immutable request ID/method/route/status/time/classification metadata; the original exception is not passed. Override the token in the observability module when an approved collector is selected. Store any vendor secret in server deployment configuration, set transport timeouts and handle backpressure. At most 32 async reports may be pending; additional ones emit `reporting.overloaded`. Sync/async adapter failures emit `reporting.failed` without changing the HTTP response or logging the adapter's exception.

The browser's `registerClientErrorReporter` hook receives immutable render-failure records with a unique `eventId`, timestamp and classification. The actual React root overrides caught, uncaught and recoverable error callbacks, preventing React's default raw-error console logging. Error boundaries retain their recovery UI; reporting is owned by the root to avoid duplicate events. No original message, component stack, URL, user or session is passed. Its default development diagnostic is JSON with the same event ID; production sends nothing until an adapter is registered. Adapter errors cannot replace the recovery UI. Browser hook data is untrusted telemetry and must never authorize a game action. Browser extensions, SDKs and hosting services require their own logging review; the application tests do not certify those external systems.

Request completion logs also cover 503 readiness responses; the exception hook handles thrown failures. Fatal process events use the synchronous stderr log path so they can be collected even during exit. No hosted error dashboard or alert destination is claimed as configured.

## API and authentication limits

| Setting                | Default | Meaning                                                                           |
| ---------------------- | ------- | --------------------------------------------------------------------------------- |
| `API_RATE_LIMIT`       | `120`   | Requests per IP/window before body parsing and route/auth execution               |
| `AUTH_RATE_LIMIT`      | `30`    | Protected-route attempts per IP/window before token parsing/provider verification |
| `RATE_LIMIT_WINDOW_MS` | `60000` | Shared window length, 1 second to 1 hour                                          |
| `TRUSTED_PROXY_CIDRS`  | empty   | Explicit proxy IPs/CIDRs used by Express to derive client IP                      |

Limits use separate express-rate-limit memory stores, expire with the window and reset on process restart. IPv6 clients are grouped using the library's default subnet policy. All protected attempts count, including invalid credentials. A blocked call returns the usual JSON error shape, 429, `Retry-After`, draft-8 rate headers and a request ID. CORS preflights and the four exact health/readiness paths bypass the API budget so probes remain operational. Restrict probe exposure at the deployment edge, especially readiness queries.

Forwarded addresses are ignored by default. Configure only the actual proxy addresses, ensure that proxy overwrites client-supplied forwarding headers and prevents direct API access, then test the effective IP path. Wildcards, hostnames, the `true` trust shortcut and `/0` networks are rejected. Vite's local proxy shares a loopback bucket with this safe default; use direct API tests or deliberate local configuration when testing multiple clients.

Memory-store limits apply to one process. Before multiple API replicas or public production load, use an approved shared store/edge limit with the same budgets and fail-closed behavior; per-process limits alone do not provide a global quota. Heap usage, abuse and probe volume also need edge monitoring.

Password sign-in currently goes directly from the browser to Supabase Auth. Nest's auth limiter protects API token verification, not that provider endpoint. Supabase applies its own [Auth rate limits](https://supabase.com/docs/guides/auth/rate-limits); the project operator must verify the project's actual Authentication > Rate Limits settings and bot protection before a public launch. This task does not modify those hosted settings or claim to test provider lockouts.

Helmet applies API security headers and removes `X-Powered-By`. HSTS is enabled in production and disabled for local HTTP. Responses use `Cache-Control: no-store`. JSON/form bodies are limited to 16 KiB; oversized requests receive a correlated JSON 413. Static frontend hosting must configure its own appropriate headers/CSP; API headers do not configure a separate web host.

## Dependency advisory policy

Run `pnpm security:audit` for the complete workspace graph, or `pnpm security:audit:prod` for the production graph. Both fail for high/critical findings; registry errors also fail. Lower-severity findings remain visible and need review. Do not use ignore flags, audit fixes with unreviewed broad upgrades, or bypass the required CI check. The workflow scans every push/PR, manual run and Monday at 03:17 UTC (11:17 Asia/Shanghai). Scheduled execution takes effect after publication on the default branch.

The lockfile currently uses targeted overrides for Prisma's `deepmerge-ts`/`mysql2` transitives and the affected `minimatch` version. These include major-version replacements for tooling dependencies, so validate lint, Prisma generation/schema diff, migrations and application tests when changing/removing them. Revisit each override when its parent adopts a patched compatible version; the lockfile records exact resolution. No advisory exception or release-age bypass is configured.

| Advisory                                                                 | Mitigation                                       |
| ------------------------------------------------------------------------ | ------------------------------------------------ |
| [GHSA-ggr8-5vv4-36mx](https://github.com/advisories/GHSA-ggr8-5vv4-36mx) | `@prisma/config>deepmerge-ts` pinned to `8.0.2`  |
| [GHSA-3f6p-5ww8-9rcr](https://github.com/advisories/GHSA-3f6p-5ww8-9rcr) | `prisma>mysql2` pinned to `3.24.6`               |
| [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249) | Affected `minimatch@10.2.6` replaced by `11.0.1` |

A passing audit describes known advisories in the queried registry at that time; it is not proof of vulnerability-free code. Retain the scan result with a release, review findings by actual dependency path, and rotate credentials if an incident exposed them. See [rotation guidance](CONFIGURATION.md).

## Backup and restore plan

**Owner and targets:** the project operator owns backups, access and recovery approval. For the development foundation, proposed targets are RPO 24 hours and RTO 4 hours. These are planning targets, not measured service guarantees. Before a production economy, choose stronger requirements and verify the provider plan's retention/PITR capabilities. No paid service or provider backup setting is enabled here.

**Coverage:** track the game schema/data, functions, triggers, grants/RLS, migration history, deployed source revision and required runtime/migration role definitions. Preserve Player/Auth identity mapping and immutable audit events. Provider Auth configuration/users, Storage policies/manifest and actual Storage objects require their own coverage. A logical `game` dump does not back up Auth, role passwords or Storage object bytes. Protect secret-manager history separately and retain the public CA/configuration references needed to rebuild connections.

**Schedule and handling:** take an approved recovery point before hosted migrations and at least daily during active development. Proposed development retention is seven daily and four weekly recovery points; confirm the actual storage/provider policy supports that target. Verify provider backup success/retention explicitly; do not assume the project's plan supplies the required coverage. Keep authorized exports encrypted, access-controlled and outside Git, with a documented retention/expiry owner. Verify backup checksums and restore ability. The earlier review rejected private-data export; Phase 00 closeout instead verified zero Player rows and saved only schema DDL plus the known migration checksum before the development migration. No private data rows or passwords were exported.

**Logical restore procedure:** restore into a new isolated recovery database. Recreate required login roles with separately controlled passwords and bootstrap the private schema/permissions. For a custom-format `game` archive, inspect `pg_restore --list`: when the schema is pre-created by bootstrap, omit only its `SCHEMA - game` creation entry from the restore list. Preserve ACL/policy/trigger entries. Restore with `--no-owner`, `--role=pondbound_migrator`, `--use-list`, `--single-transaction` and `--exit-on-error`, using a controlled administrator connection permitted to assume that role. This avoids granting database-wide CREATE to the migrator. Supply passwords through a protected credential mechanism, never command arguments.

Compare restored migration checksums/counts, Player UUID/Auth IDs/timestamps, audit IDs/data/order and role/RLS/trigger behavior against the recovery point. Run `pnpm db:status`, `pnpm db:verify`, readiness and a controlled Auth/profile smoke check. Verify Storage object availability separately. Keep writes paused, reconcile legitimate writes/events after the recovery point, then switch the API connection only after validation. Preserve the old database for investigation; do not overwrite it or delete history to make recovery appear successful. See the [migration-specific recovery runbook](DATABASE.md) for rollback versus forward repair.

**Drills:** rehearse recovery after backup/schema changes and at least quarterly before production. Record source revision, tool versions, backup checksum, elapsed backup/restore time, validation and any gap against RPO/RTO. A disposable local fixture drill validates mechanics; a hosted recovery exercise still needs authorized provider access and does not become complete merely because this plan exists.

Local drill on November 3, 2026 used PostgreSQL 17.11 and synthetic data in an isolated loopback cluster. A custom-format archive restored successfully using the schema-entry filtering/role procedure above. Full Player/audit rows and timestamps, migration names/checksums, runtime ownership/RLS/grants and audit mutation rejection matched after restore. Dump/restore/validation took 870 ms for the small fixture; this is not a production RTO measurement. The recovery database was removed and the cluster stopped. The archive/checksum evidence remains in ignored local verification artifacts.

## Operator monitoring and response

Acceptance verification on November 3, 2026 passed for the application's owned logging/reporting paths. Backend canaries covered headers/cookies, bodies/nested credentials, query/path values, raw errors/stacks, arbitrary message strings and invalid configuration. HTTP tests correlated the same server request UUID across header, error envelope, completion record and reporting hook, including async request context. Actual React-root tests checked caught/uncaught handling and recoverable-callback wiring using errors whose messages/stacks contain canaries; raw console arguments were inspected with Error contents preserved. Browser records carry unique event IDs. The nonproduction restore drill above was verified again against its archive SHA-256; no hosted restore is claimed.

Create alerts in the selected collector for `startup.failed`, `process.failed`, sustained 5xx/readiness failures, `reporting.failed`/`overloaded`, increased 401/429 rates, latency changes, audit-scan failures and missed recovery points. Initial investigation thresholds can use three failed readiness probes, 5xx above 1% over five minutes, or p95 request time above one second; establish actual traffic baselines before treating these as production SLOs.

On an incident, identify the deployment/request ID and scope from sanitized logs, contain abuse at the trusted edge, pause risky writes if data integrity is uncertain, preserve audit/recovery evidence and rotate affected secrets through the [configuration runbook](CONFIGURATION.md). Use a reviewed forward fix or validated recovery. Record what was verified, remaining provider/hosting dependencies and the recovery-point age before resuming traffic.

References: [Express proxy trust](https://expressjs.com/en/guide/behind-proxies/), [rate-limit configuration](https://express-rate-limit.mintlify.app/reference/configuration), [Nest logger interface](https://docs.nestjs.com/techniques/logger).
