# Database foundations

The backend owns the private PostgreSQL `game` schema through Prisma. Supabase Auth supplies identity; the browser has no direct access to application tables. The SQL migrations are authoritative for triggers, CHECK constraints, grants and RLS that Prisma cannot fully describe.

## Player, identity and time

`Player.id` is the internal application UUID. PostgreSQL generates a random UUID when omitted, including for raw SQL inserts. `authId` is a required, unique Supabase Auth UUID. Identity is resolved from a verified token, never from client metadata or a submitted owner ID. Neither identifier can be updated in place. An identity-provider migration requires a separately reviewed migration and explicit account-recovery policy.

There is deliberately no cross-schema foreign key into provider-managed `auth.users`: database/CI setup remains independent of Supabase internals. The API verifies Auth before creating a Player. Auth deletion and application-data deletion remain separate operations; no provider cascade silently destroys application history.

`createdAt` and `updatedAt` use millisecond `timestamptz` storage, returned by the API as UTC ISO strings. A database trigger assigns both creation timestamps from the database statement clock, so client clock skew cannot invalidate the row. `createdAt` is immutable; every update assigns `updatedAt` from the database clock without moving it backward. The database also checks `updatedAt >= createdAt`. Prisma's timestamp annotation remains compatible with database enforcement.

The forward migration interprets the old timezone-free values as UTC. This is a migration precondition: confirm the historical timezone before applying it to an environment. It preserves valid historical values and UUIDs. Only legacy rows with `updatedAt < createdAt` are repaired by raising `updatedAt` to `createdAt`.

## Ownership convention

Future player-owned tables use `ownerPlayerId UUID NOT NULL REFERENCES game."Player"(id) ON UPDATE RESTRICT ON DELETE RESTRICT`, plus an index beginning with `ownerPlayerId`. Add ownership only when the relevant gameplay model is introduced; there are no placeholder inventory or economy tables in this phase.

- API handlers resolve the authenticated Player, then constrain every owned read/write by that internal ID. Reject client-selected ownership fields.
- Scope uniqueness to the intended owner when appropriate, such as `UNIQUE(ownerPlayerId, slot)`. PostgreSQL does not automatically index referencing foreign-key columns.
- Validate parent and child ownership together. When both tables store ownership, use a composite foreign key against a unique `(id, ownerPlayerId)` parent key to prevent cross-player references.
- Default deletion is restrictive. Decide explicit disposal/transfer behavior before allowing a cascade. Ownership transfers and their audit events belong in one transaction; use row locks or conditional writes for concurrent transfers.
- RLS grants backend access only. The shared backend database role is not an individual player's identity; API ownership checks remain mandatory.

## Append-only audit events

`AuditEvent` contains a generated UUID, database occurrence timestamp, dotted lowercase event type, lowercase entity type, UUID entity ID, optional actor Player UUID and a JSON object. Metadata is limited to 16 KiB. Store small, allowlisted facts needed to explain the action; never serialize request bodies, tokens, passwords, emails or full player objects into it.

Entity and actor IDs are immutable snapshots, intentionally without foreign keys. History survives entity/player deletion without cascade deletes or `SET NULL` updates. A missing actor means a database/system action, rather than an unverified player identity. These snapshots are the explicit exception to normal player-owned table conventions. Future server event producers must derive the actor from the verified Player and append within the same Prisma transaction as the business write. Corrections append a new event referencing the original event UUID rather than rewriting history.

Player insert/delete triggers append `player.created` and `player.deleted` events in the same transaction. They store the internal Player ID and empty metadata, with no Auth UUID copied into the event. Failed transactions roll back both the Player write and its events. Existing pre-migration Players receive no fabricated creation event. A no-op login/seed does not append another creation event.

Runtime can only SELECT and INSERT audit rows. UPDATE, DELETE and TRUNCATE privileges are absent; RLS permits only backend reads/appends. Additional always-enabled triggers reject ordinary owner UPDATE, DELETE and TRUNCATE too. Functions use a fixed trusted search path and no security-definer escalation. The trusted migration owner/database administrator can still change DDL or disable protections; this is application-level immutability, not tamper-proof external evidence. No audit mutation endpoint or retention purge is provided.

Indexes support entity history `(entityType, entityId, occurredAt, id)`, actor history `(actorPlayerId, occurredAt, id)` and chronological scans `(occurredAt, id)`. Use timestamp-plus-ID ordering/cursors to handle equal millisecond timestamps. The existing unique Auth UUID index also supports Player identity lookups; no duplicate index is needed.

## Seed strategy

`pnpm db:seed` runs the explicit Prisma seed command. It is never called automatically on startup, migration deployment or application build. Set `DIRECT_URL` to the migration login for a disposable loopback database named `pondbound_dev_*` or `pondbound_test_*`, with `schema=game`. Other query parameters and production mode are rejected; the hosted development URL is rejected too. Do not change the hosted migration file just to run local seeds: inject the local URL into the command's environment instead.

Two deterministic fixture Players support local relational tests. They create no Auth users, login passwords, wallets, currency or game rewards and cannot be used to sign in. A transaction and advisory lock serialize seed runs. Matching fixtures are preserved byte-for-byte on rerun; mismatched IDs/Auth IDs fail and roll back the whole seed instead of reassigning identity. Reset disposable databases by recreating the cluster, rather than trying to delete immutable audit history.

No production reference-data seed is needed yet. Future fish, rod and world catalogs should use versioned, idempotent data migrations or a separately reviewed reference importer with stable identifiers. Keep production reference data separate from development accounts and balance fixtures. Never overwrite live economic state during a seed run.

## Migration policy and checks

1. Author against disposable local application and shadow databases. Use migration-only credentials; never author or reset against the hosted project.
2. Make schema changes with `pnpm db:migrate --name descriptive_change`; review the generated SQL and add required constraints, indexes, grants, RLS and triggers. The initial schema bootstrap remains separate.
3. Commit schema and migration together. Never edit, rename or delete an applied migration. Use a new forward migration for corrections; never use hosted `db push` or `migrate reset`.
4. Run `pnpm check`, `pnpm db:validate` and `pnpm test:database` against an empty disposable PostgreSQL 17 cluster. The database suite also upgrades a database with the original migration and representative legacy rows, then checks Prisma drift, ownership privileges, immutable audit behavior, rollback and seed repeatability.
5. Obtain a backup/recovery point and assess row counts/locks before a hosted change. Prefer expand/backfill/contract changes when later tables become large. The foundation migration is transactional, with a 5-second lock timeout and a 60-second statement timeout; it aborts rather than waiting indefinitely.
6. Deploy reviewed migrations with `pnpm db:deploy`, then run `pnpm db:status` and `pnpm db:verify`. A failed migration requires inspecting its transaction/state before any `migrate resolve`; never mark a failed change applied merely to bypass it. Restore/back out only through a reviewed recovery procedure or a corrective forward migration.

The existing PR workflow runs the full database suite, and the required `verify` check blocks merging on a failure. See [infrastructure](../deployment/supabase/README.md) for credentials and [quality checks](CODE_QUALITY.md) for runners.

## Rollback and recovery runbook for 00.08

Target migration: `20261103010000_database_foundations`. Keep the exact deployed source revision and migration checksum with the deployment record. No automatic destructive down-migration is supplied: dropping audit history or reinterpreting timezone-aware data would lose information.

1. **Before deployment:** record the current migration status, confirm the legacy timestamps were UTC and obtain an authorized, verified recovery point. Pause application writes for the migration/recovery window. Keep the previous backend release available. An attempted local export of the hosted development database was rejected by automatic approval review; explicit authorization is still needed before making that backup or applying the hosted change.
2. **If deployment fails before commit:** this migration wraps all DDL and data repair in one transaction. Confirm the migration connection has rolled back/disconnected, then inspect `pnpm db:status` with the migration role. Verify `AuditEvent` and the new Player triggers/functions are absent, Player timestamps are still `timestamp without time zone`, UUID defaults remain unchanged and existing rows retain their prior values. If the failure state differs, stop and investigate rather than assuming rollback.
3. **Retry only after confirming rollback:** correct the lock, connection or privilege problem. If Prisma recorded this migration as failed and all its effects are rolled back, run `pnpm --filter @pondbound/api exec prisma migrate resolve --rolled-back 20261103010000_database_foundations`, then retry `pnpm db:deploy`. This only reconciles Prisma's failed-migration record; it does not undo SQL. Do not use `--applied` to hide an incomplete migration, or alter an already-applied migration file.
4. **If deployment committed but the application must be rolled back:** restore the last working backend release while retaining the applied database migration and its audit rows. The migration keeps the Player columns and Auth identity mapping and adds server defaults/protections. Check `/health`, `/ready`, verified-user profile lookup and repeated profile initialization before resuming writes. If the database change itself caused the issue, prepare and test a corrective forward migration; do not delete audit rows or drop the audit table.
5. **If forward recovery is impossible:** keep writes paused, preserve the failed database for investigation and restore the authorized recovery point into a separate recovery database. Validate schema, role permissions, Player identities, timestamp interpretation and audit history. Reconcile legitimate writes/events after the recovery point before switching the API connection; do not silently discard them or overwrite the live database. Run readiness/Auth smoke checks and document the recovered migration state before resuming traffic.

The disposable-database upgrade test injects an intentional failure immediately before COMMIT, explicitly rolls back, and verifies that the audit table, new Player triggers, timezone conversion and legacy clock-skew repair did not persist. It then deploys the unmodified migration successfully and checks identity/time preservation and backend profile creation. This verifies transactional rollback locally; it does not claim a hosted backup restore has been rehearsed.

## Ownership and seed verification

The database suite creates parent/child test tables inside a rolled-back transaction to exercise the ownership convention against the real Player UUID key. It accepts valid owners and owner-scoped slots, rejects missing owners and duplicate slots for one owner, rejects mismatched parent/child owners and restricts deleting/transferring referenced owners. The test tables and fixture rows do not persist after the test. Production gameplay-owned models will be introduced in their roadmap phases.

The seed test runs the actual Prisma seed CLI, reruns the seed and compares full Player rows plus audit-event counts. It also introduces an identity conflict and verifies the seed transaction rolls back earlier fixture inserts while preserving the existing player. Separate guard tests reject hosted/production targets and connection-query overrides.

References: [Prisma seeding](https://www.prisma.io/docs/orm/v7/prisma-migrate/workflows/seeding), [PostgreSQL triggers](https://www.postgresql.org/docs/17/sql-createtrigger.html), [Supabase function security](https://supabase.com/docs/guides/database/functions).
