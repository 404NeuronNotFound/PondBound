# Supabase and Prisma infrastructure

PondBound Development uses a dedicated Supabase PostgreSQL database and a private `pondbound-media` Storage bucket. The project was selected by the user; these scripts configure an existing project and do not create subscriptions or additional projects.

## Credentials and files

Run `pnpm env:setup` from the repository root to create missing local configuration files. Existing files are preserved.

| File | Purpose | Values |
| --- | --- | --- |
| `apps/web/.env` | Browser configuration | Project URL and publishable key only |
| `apps/api/.env` | NestJS runtime | `DATABASE_URL` as `pondbound_api`, pool limits, CA path |
| `apps/api/.env.migrations` | Prisma CLI | `DIRECT_URL` as `pondbound_migrator`, optional shadow URL |
| `deployment/supabase/.env` | One-time administration | Admin database URL, server secret key, generated role passwords, CA path |

All populated environment files are ignored by Git. Only placeholder templates and the public CA certificate are committed. Provisioning credentials are not loaded by the API runtime, and migration commands never fall back to runtime credentials.

The bootstrap writes development runtime credentials. Test/production have separate selected files or injected values and never inherit `.env`. Configure the intended project explicitly for each deployment; consult [configuration and secret rotation](../../docs/CONFIGURATION.md).

## Provision an existing dedicated project

1. In the Supabase project, choose **Connect → Session pooler**. Copy the administrator PostgreSQL URL for port 5432 into `SUPABASE_DB_ADMIN_URL` in the provisioning file. Replace the password placeholder and URL-encode special characters. A reachable direct connection is also supported. Port 6543 is rejected for administration and migrations.
2. Put a server secret key from **Settings → API Keys** into `SUPABASE_SECRET_KEY`. A legacy service-role key is also accepted by the Storage SDK. Put the project URL in `SUPABASE_URL` and keep it consistent with the database project.
3. Set `DB_SSL_CA_FILE` to the absolute path of the public certificate at `deployment/supabase/supabase-ca.crt`. Download a replacement from Supabase Database Settings when the provider rotates it. This CA was obtained over HTTPS from the exact download endpoint in Supabase's dashboard source. Its SHA-256 fingerprint is `80:70:25:AD:50:D4:ED:21:9D:2C:9C:7D:29:9C:00:4F:82:4E:B0:0C:F7:F6:5A:FE:F6:07:D0:7B:72:E6:CA:FA`, valid until April 26, 2031.
4. Run the following from the repository root:

```sh
pnpm db:bootstrap
pnpm db:deploy
pnpm db:verify
pnpm db:status
pnpm storage:provision
```

`db:bootstrap` creates the roles and private schema in a transaction. It generates independent random passwords when absent, saves them in the ignored provisioning file, and writes the corresponding runtime/migration URLs into their separate ignored files. Non-empty conflicting local values cause a failure instead of being replaced. Repeat execution uses the saved passwords; it does not rotate them. Password rotation is a separate operational change.

Restart `pnpm dev` after configuring credentials. `GET http://localhost:3000/ready` must return `{"status":"ok","database":"connected"}`. `db:verify` checks the actual connected role, schema/table ownership, RLS, browser access, and inability to create schemas/tables or alter migration history.

## Role boundaries

- `pondbound_migrator` owns the `game` schema and its application tables. It has no superuser, role-creation, database-creation, replication or bypass-RLS attribute. It can perform DDL inside `game`. The database administrator retains membership for management.
- `pondbound_api` has no role memberships or elevated attributes. It has schema usage and explicit CRUD grants on `game.Player`, with a policy limited to this backend role. It cannot perform DDL or access `_prisma_migrations`.
- `anon`, `authenticated`, and `PUBLIC` receive no access to the private schema or its tables. Keep `game` out of Supabase's Data API exposed schemas. The live public-client check returned `PGRST106` for this schema.

The migration role is a trusted table owner and can administer RLS; the runtime role is subject to it. This backend policy authorizes the server, not individual players. Future API handlers must authenticate users and validate ownership server-side. PostgreSQL's provider-managed default privileges outside `game` are preserved; provisioning does not revoke privileges from Supabase's managed services.

Default privileges remove public table/sequence/function grants for future objects owned by the migrator. Each new migration must add explicit runtime table grants and appropriate RLS policies. Runtime credentials must never be a migration role, administrator, or browser key.

## Migration workflow

The initial migration is committed at `apps/api/prisma/migrations/20261103000000_foundation`. Schema creation belongs to the administrator bootstrap; migrations operate inside the existing schema. This lets the migration login avoid database-wide CREATE privileges.

For later schema changes, use a disposable local development database and a separate disposable shadow database, then run:

```sh
pnpm db:migrate --name descriptive_change
```

Set `DIRECT_URL` and `SHADOW_DATABASE_URL` in `apps/api/.env.migrations`. The shadow database must be distinct from the application database; Prisma may reset it. The migration role must own the local shadow database or have CREATE privileges there so Prisma can reset its schema. Do not grant that privilege on the hosted application database. The bootstrap's role/schema setup must also be applied to the local databases before authoring migrations.

Review generated SQL, include new grants/RLS, run checks, and commit the migration. Apply reviewed SQL to Supabase with `pnpm db:deploy`; inspect with `pnpm db:status`. Never edit an already-applied migration or use `db push`/migration resets on the hosted project. Generation and schema validation work without database credentials.

## Pooling and TLS

NestJS owns one `pg.Pool` and Prisma client per process. Supavisor session mode on port 5432 suits the persistent local backend and is used by the current configuration. Hosts and project-qualified usernames are copied from the Connect panel, never inferred from a region. Migration connections use direct/session mode, not transaction mode.

Runtime limits are `DB_POOL_MAX` (default 5, maximum 20), `DB_CONNECTION_TIMEOUT_MS` (3000), `DB_QUERY_TIMEOUT_MS` (5000) and `DB_IDLE_TIMEOUT_MS` (10000). The runtime database role also has a 20-connection ceiling and 10-second statement/idle-transaction limits. Budget pool sizes across all API replicas and leave migration/provider headroom.

Remote Node connections always verify TLS certificates and hostnames. URL SSL overrides are removed before passing an explicit verified SSL configuration and CA to `pg`. Prisma's migration URL uses `sslmode=require&sslaccept=strict&sslcert=...`; `sslcert` is the Prisma migration-engine CA parameter. No global trust-store changes or certificate-verification bypasses are used.

If a later deployment uses transaction-mode Supavisor, review driver session-state restrictions first. This adapter configuration does not generate named prepared statements. Transaction-mode operation has not been certified by this task.

## Storage

`storage.json` is the source for `storage:provision`. The bucket is private, limits each object to 5 MB, and accepts PNG, WebP and JPEG. Existing matching configuration is verified; differing configuration stops for review. The script does not make a bucket public or add browser upload policies. Server secrets are used only by the provisioning script.

The live verification uploaded and downloaded a temporary PNG through the server key, confirmed anonymous reads/writes and a public download URL were denied, then removed the temporary objects. User upload endpoints and authenticated Storage policies are future work.

## Verification

`pnpm check` covers ordinary app tests, pool configuration and Storage provisioning behavior. Real database integration tests are explicit:

```sh
pnpm --filter @pondbound/api test:database
```

Set `TEST_DB_ADMIN_URL` to a fresh **local** PostgreSQL 17 database named `pondbound_test_*`, in a disposable cluster. The test administrator needs role/schema administration. This suite creates fixture browser roles and the two app roles; it refuses non-loopback hosts and non-test database names. Do not use a shared development cluster. It tests migration reapplication, role permissions, RLS-backed Prisma CRUD, rollback, pooling and real readiness. It does not modify Supabase.

### CI and secret boundaries

[The GitHub Actions workflow](../../.github/workflows/ci.yml) runs on pushes, pull requests and manual dispatch. It uses Node 24, the pinned pnpm version and a disposable PostgreSQL 17 service. It installs from the lockfile, runs `pnpm check`, validates Prisma, then deploys migrations and exercises database permissions through the explicit integration suite. With `CI=true`, that suite first asserts that the `game` schema does not exist. The workflow has read-only repository permissions, pins action revisions, and needs no Supabase project secrets. It verifies migrations without deploying them to Supabase.

`pnpm check:secrets` is part of `pnpm check`, after the browser build. It rejects populated environment files included in source, detects known server credentials in source/build output, and rejects server credentials in browser configuration (including a secret key mislabeled as a publishable key). It compares process and file configuration separately so environment overrides cannot hide a misplaced key. CI also builds with a randomly generated, harmless server-only canary and checks that it is absent from the browser output. This is a boundary check against available configuration, not a general audit of Git history or unknown secrets.

Acceptance verification on November 3, 2026: a fresh local source clone with no credential files passed frozen installation and the CI command sequence under `CI=true`, including all 5 real PostgreSQL tests on an empty database and migration redeployment. Deliberate canary leakage into build output and a secret key assigned to a browser variable were both rejected; the clean scan passed afterward. Workflow YAML was parsed successfully. The actual GitHub-hosted workflow run remains pending until these changes are pushed.

## Sources

- [Supabase Prisma integration](https://supabase.com/docs/guides/database/prisma)
- [Connection modes and Supavisor](https://supabase.com/docs/guides/database/connecting-to-postgres)
- [Supabase CA configuration in the official dashboard source](https://github.com/supabase/supabase/blob/master/apps/studio/hooks/custom-content/custom-content.json)
- [Prisma PostgreSQL TLS](https://www.prisma.io/docs/orm/v7/core-concepts/supported-databases/postgresql)
- [PostgreSQL RLS](https://www.postgresql.org/docs/17/ddl-rowsecurity.html)
