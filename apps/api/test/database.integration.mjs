import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { randomBytes, randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../dist/generated/prisma/client.js';
import { bootstrapDatabase } from '../scripts/bootstrap-database.mjs';
import { verifyRuntimePrivileges } from '../scripts/verify-database.mjs';
import { databaseClient } from '../scripts/provisioning-environment.mjs';
import { databaseSettingsSchema } from '../src/config/database-environment.ts';
import { createPoolConfig } from '../src/database/pool-config.ts';
import { seedDatabase, seedPlayers } from '../scripts/seed-database.mjs';

// This suite creates roles in an explicitly disposable local PostgreSQL cluster.
const adminUrl = new URL(process.env.TEST_DB_ADMIN_URL ?? 'invalid:');
if (
  !['localhost', '127.0.0.1', '[::1]'].includes(adminUrl.hostname) ||
  !adminUrl.pathname.startsWith('/pondbound_test_')
) {
  throw new Error('Set TEST_DB_ADMIN_URL to a disposable local pondbound_test_* database');
}
const admin = databaseClient(adminUrl.toString());
const runtimeUrl = new URL(adminUrl);
runtimeUrl.username = 'pondbound_api';
runtimeUrl.password = randomBytes(32).toString('base64url');
const migrationUrl = new URL(adminUrl);
migrationUrl.username = 'pondbound_migrator';
migrationUrl.password = randomBytes(32).toString('base64url');
migrationUrl.searchParams.set('schema', 'game');
const passwords = {
  apiPassword: decodeURIComponent(runtimeUrl.password),
  migratorPassword: decodeURIComponent(migrationUrl.password),
};
const pool = new Pool(
  createPoolConfig(
    databaseSettingsSchema.parse({ DATABASE_URL: runtimeUrl.toString(), DB_POOL_MAX: 2 }),
  ),
);
const prisma = new PrismaClient({ adapter: new PrismaPg(pool, { schema: 'game' }) });
const execute = promisify(execFile);
const apiRoot = fileURLToPath(new URL('../', import.meta.url));
async function migrate(command, url = migrationUrl, extra = []) {
  await execute(
    process.execPath,
    [
      fileURLToPath(new URL('../node_modules/prisma/build/index.js', import.meta.url)),
      'migrate',
      command,
      ...extra,
    ],
    {
      cwd: apiRoot,
      env: { ...process.env, DIRECT_URL: url.toString() },
    },
  );
}
const deploy = () => migrate('deploy');

before(async () => {
  await admin.connect();
  if (process.env.CI === 'true') {
    const {
      rows: [state],
    } = await admin.query("SELECT to_regnamespace('game') IS NULL AS clean");
    assert.equal(state.clean, true, 'CI must deploy the migration to a clean database');
  }
  await admin.query(
    "DO $$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon NOLOGIN; END IF; IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF; END $$;",
  );
  await bootstrapDatabase(admin, passwords);
  await deploy();
});
after(async () => {
  await prisma.$disconnect();
  await pool.end();
  await admin.end();
});

test('migrations apply and redeploy without pending changes', async () => {
  await bootstrapDatabase(admin, passwords);
  await deploy();
  const { rows } = await admin.query(
    'SELECT migration_name FROM game._prisma_migrations WHERE finished_at IS NOT NULL ORDER BY migration_name',
  );
  assert.deepEqual(
    rows.map((row) => row.migration_name),
    ['20261103000000_foundation', '20261103010000_database_foundations'],
  );
});

test('real runtime role has no elevated, DDL, migration or browser permissions', async () => {
  const client = databaseClient(runtimeUrl.toString());
  try {
    await client.connect();
    await verifyRuntimePrivileges(client);
  } finally {
    await client.end();
  }
  await assert.rejects(
    pool.query('CREATE TABLE game.forbidden (id int)'),
    (error) => error.code === '42501',
  );
  await assert.rejects(
    pool.query('ALTER TABLE game."Player" ADD COLUMN forbidden int'),
    (error) => error.code === '42501',
  );
  await assert.rejects(
    pool.query('SELECT * FROM game._prisma_migrations'),
    (error) => error.code === '42501',
  );
});

test('migrated database matches the Prisma schema and expected lookup indexes', async () => {
  await migrate('diff', migrationUrl, [
    '--from-config-datasource',
    '--to-schema',
    'prisma/schema.prisma',
    '--exit-code',
  ]);
  const { rows } = await admin.query(
    "SELECT indexname, indexdef FROM pg_indexes WHERE schemaname = 'game' AND tablename IN ('Player', 'AuditEvent')",
  );
  assert.ok(
    rows.some((row) => row.indexname === 'Player_authId_key' && row.indexdef.includes('UNIQUE')),
  );
  for (const name of [
    'AuditEvent_entityType_entityId_occurredAt_id_idx',
    'AuditEvent_actorPlayerId_occurredAt_id_idx',
    'AuditEvent_occurredAt_id_idx',
  ]) {
    assert.ok(
      rows.some((row) => row.indexname === name),
      `Missing lookup index: ${name}`,
    );
  }
});

test('Prisma CRUD works through RLS and failed transactions roll back', async () => {
  const player = await prisma.player.create({ data: { authId: randomUUID() } });
  try {
    assert.equal(
      (await prisma.player.findUnique({ where: { id: player.id } })).authId,
      player.authId,
    );
    const updated = await prisma.player.update({
      where: { id: player.id },
      data: { updatedAt: new Date(0) },
    });
    assert.ok(updated.updatedAt >= player.updatedAt);
    assert.equal(updated.createdAt.toISOString(), player.createdAt.toISOString());
    await assert.rejects(prisma.player.create({ data: { authId: player.authId } }));
    const rolledBackAuth = randomUUID();
    await assert.rejects(
      prisma.$transaction(async (tx) => {
        await tx.player.create({ data: { authId: rolledBackAuth } });
        throw new Error('Rollback test');
      }),
    );
    assert.equal(await prisma.player.count({ where: { authId: rolledBackAuth } }), 0);
  } finally {
    await prisma.player.delete({ where: { id: player.id } });
  }
});

test('raw SQL gets UUID/timestamp defaults and cannot change Player identity or creation time', async () => {
  const {
    rows: [player],
  } = await pool.query('INSERT INTO game."Player" ("authId") VALUES ($1) RETURNING *', [
    randomUUID(),
  ]);
  try {
    assert.match(
      player.id,
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    assert.ok(player.updatedAt >= player.createdAt);
    for (const [column, value] of [
      ['id', randomUUID()],
      ['authId', randomUUID()],
      ['createdAt', new Date(0)],
    ]) {
      await assert.rejects(
        pool.query(`UPDATE game."Player" SET "${column}" = $1 WHERE id = $2`, [value, player.id]),
        (error) => error.code === '23514',
      );
    }
    await assert.rejects(
      pool.query('INSERT INTO game."Player" ("authId") VALUES ($1)', ['invalid-uuid']),
      (error) => error.code === '22P02',
    );
    const {
      rows: [normalized],
    } = await pool.query(
      'INSERT INTO game."Player" ("authId", "createdAt", "updatedAt") VALUES ($1, $2, $3) RETURNING *',
      [randomUUID(), new Date('2030-01-01'), new Date('2020-01-01')],
    );
    assert.equal(normalized.createdAt.getTime(), normalized.updatedAt.getTime());
    assert.ok(normalized.createdAt.getTime() >= player.createdAt.getTime());
    await prisma.player.delete({ where: { id: normalized.id } });
  } finally {
    await prisma.player.delete({ where: { id: player.id } });
  }
});

test('Player lifecycle audit is atomic, survives deletion and rolls back with failed writes', async () => {
  const player = await prisma.player.create({ data: { authId: randomUUID() } });
  const created = await prisma.auditEvent.findMany({ where: { entityId: player.id } });
  assert.equal(created.length, 1);
  assert.equal(created[0].eventType, 'player.created');
  assert.equal(created[0].actorPlayerId, null);
  assert.deepEqual(created[0].data, {});
  const rolledBackId = randomUUID();
  await assert.rejects(
    prisma.$transaction(async (tx) => {
      await tx.player.create({ data: { id: rolledBackId, authId: randomUUID() } });
      throw new Error('Rollback audit and business write');
    }),
  );
  assert.equal(await prisma.auditEvent.count({ where: { entityId: rolledBackId } }), 0);
  await prisma.player.delete({ where: { id: player.id } });
  const events = await prisma.auditEvent.findMany({ where: { entityId: player.id } });
  assert.deepEqual(events.map((event) => event.eventType).sort(), [
    'player.created',
    'player.deleted',
  ]);
});

test('audit supports append/read and rejects runtime mutations, invalid metadata and browser access', async () => {
  const event = await prisma.auditEvent.create({
    data: {
      eventType: 'foundation.checked',
      entityType: 'player',
      entityId: randomUUID(),
      actorPlayerId: randomUUID(),
      data: { version: 1 },
    },
  });
  assert.deepEqual((await prisma.auditEvent.findUnique({ where: { id: event.id } })).data, {
    version: 1,
  });
  for (const query of [
    'UPDATE game."AuditEvent" SET data = \'{}\' WHERE id = $1',
    'DELETE FROM game."AuditEvent" WHERE id = $1',
  ]) {
    await assert.rejects(pool.query(query, [event.id]), (error) => error.code === '42501');
  }
  await assert.rejects(pool.query('TRUNCATE game."AuditEvent"'), (error) => error.code === '42501');
  for (const [eventType, entityType, data] of [
    ['bad', 'player', {}],
    ['player.checked', 'Player', {}],
    ['player.checked', 'player', []],
    ['player.checked', 'player', { text: 'x'.repeat(16384) }],
  ]) {
    await assert.rejects(
      pool.query(
        'INSERT INTO game."AuditEvent" ("eventType", "entityType", "entityId", data) VALUES ($1, $2, $3, $4::jsonb)',
        [eventType, entityType, randomUUID(), JSON.stringify(data)],
      ),
      (error) => error.code === '23514',
    );
  }
  for (const role of ['anon', 'authenticated']) {
    const {
      rows: [access],
    } = await admin.query(
      "SELECT has_table_privilege($1, 'game.\"AuditEvent\"', 'SELECT, INSERT, UPDATE, DELETE, TRUNCATE') AS allowed",
      [role],
    );
    assert.equal(access.allowed, false);
  }
});

test('audit immutability triggers also stop ordinary owner UPDATE, DELETE and TRUNCATE', async () => {
  const owner = databaseClient(migrationUrl.toString());
  try {
    await owner.connect();
    for (const sql of [
      'UPDATE game."AuditEvent" SET data = \'{}\'',
      'DELETE FROM game."AuditEvent"',
      'TRUNCATE game."AuditEvent"',
    ]) {
      await assert.rejects(owner.query(sql), (error) => error.code === '55000');
    }
  } finally {
    await owner.end();
  }
});

test('local seeds are repeatable, preserve timestamps/audits and refuse conflicting identities', async () => {
  const owner = databaseClient(migrationUrl.toString());
  try {
    await owner.connect();
    await execute(
      process.execPath,
      [
        fileURLToPath(new URL('../node_modules/prisma/build/index.js', import.meta.url)),
        'db',
        'seed',
      ],
      {
        cwd: apiRoot,
        env: { ...process.env, DIRECT_URL: migrationUrl.toString(), NODE_ENV: 'test' },
      },
    );
    const ids = seedPlayers.map((player) => player.id);
    const original = await prisma.player.findMany({
      where: { id: { in: ids } },
      orderBy: { id: 'asc' },
    });
    assert.equal(original.length, 2);
    const eventCount = await prisma.auditEvent.count({ where: { entityId: { in: ids } } });
    await seedDatabase(owner);
    assert.deepEqual(
      await prisma.player.findMany({ where: { id: { in: ids } }, orderBy: { id: 'asc' } }),
      original,
    );
    assert.equal(await prisma.auditEvent.count({ where: { entityId: { in: ids } } }), eventCount);
    await prisma.player.deleteMany({ where: { id: { in: ids } } });
    const conflicting = await prisma.player.create({ data: { authId: seedPlayers[1].authId } });
    try {
      await assert.rejects(seedDatabase(owner), /conflicts/);
      assert.equal(await prisma.player.count({ where: { id: seedPlayers[0].id } }), 0);
      assert.equal(
        (await prisma.player.findUnique({ where: { id: conflicting.id } })).authId,
        conflicting.authId,
      );
    } finally {
      await prisma.player.delete({ where: { id: conflicting.id } });
    }
  } finally {
    await owner.end();
  }
});

test('ownership convention enforces Player references, owner-scoped uniqueness and matching parent owners', async () => {
  const owner = databaseClient(migrationUrl.toString());
  try {
    await owner.connect();
    await owner.query('BEGIN');
    await owner.query('SET LOCAL search_path = game, pg_catalog');
    // Test-only tables exercise the convention without adding gameplay models.
    await owner.query(`CREATE TABLE ownership_fixture (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      "ownerPlayerId" UUID NOT NULL REFERENCES game."Player"(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
      slot INTEGER NOT NULL,
      UNIQUE (id, "ownerPlayerId"), UNIQUE ("ownerPlayerId", slot)
    )`);
    await owner.query('CREATE INDEX ON ownership_fixture ("ownerPlayerId")');
    await owner.query(`CREATE TABLE ownership_child_fixture (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      "ownerPlayerId" UUID NOT NULL REFERENCES game."Player"(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
      "parentId" UUID NOT NULL,
      FOREIGN KEY ("parentId", "ownerPlayerId") REFERENCES ownership_fixture(id, "ownerPlayerId") ON UPDATE RESTRICT ON DELETE RESTRICT
    )`);
    await owner.query('CREATE INDEX ON ownership_child_fixture ("ownerPlayerId")');
    const { rows: players } = await owner.query(
      'INSERT INTO game."Player" ("authId") VALUES ($1), ($2) RETURNING id',
      [randomUUID(), randomUUID()],
    );
    const {
      rows: [parent],
    } = await owner.query(
      'INSERT INTO ownership_fixture ("ownerPlayerId", slot) VALUES ($1, 1) RETURNING id',
      [players[0].id],
    );
    await owner.query('INSERT INTO ownership_fixture ("ownerPlayerId", slot) VALUES ($1, 1)', [
      players[1].id,
    ]);
    await owner.query(
      'INSERT INTO ownership_child_fixture ("ownerPlayerId", "parentId") VALUES ($1, $2)',
      [players[0].id, parent.id],
    );
    for (const [sql, values, code] of [
      [
        'INSERT INTO ownership_fixture ("ownerPlayerId", slot) VALUES ($1, 2)',
        [randomUUID()],
        '23503',
      ],
      [
        'INSERT INTO ownership_fixture ("ownerPlayerId", slot) VALUES ($1, 1)',
        [players[0].id],
        '23505',
      ],
      [
        'INSERT INTO ownership_child_fixture ("ownerPlayerId", "parentId") VALUES ($1, $2)',
        [players[1].id, parent.id],
        '23503',
      ],
      ['DELETE FROM game."Player" WHERE id = $1', [players[0].id], '23503'],
      [
        'UPDATE ownership_fixture SET "ownerPlayerId" = $1, slot = 2 WHERE id = $2',
        [players[1].id, parent.id],
        '23503',
      ],
    ]) {
      await owner.query('SAVEPOINT ownership_case');
      await assert.rejects(owner.query(sql, values), (error) => error.code === code);
      await owner.query('ROLLBACK TO SAVEPOINT ownership_case');
      await owner.query('RELEASE SAVEPOINT ownership_case');
    }
  } finally {
    await owner.query('ROLLBACK');
    await owner.end();
  }
});

test('forward upgrade preserves identity/time and a failed migration rolls back schema and data', async () => {
  const databaseName = 'pondbound_test_upgrade_' + randomUUID().replaceAll('-', '');
  const upgradeAdminUrl = new URL(adminUrl);
  upgradeAdminUrl.pathname = '/' + databaseName;
  const upgradeMigrationUrl = new URL(migrationUrl);
  upgradeMigrationUrl.pathname = '/' + databaseName;
  const upgradeAdmin = databaseClient(upgradeAdminUrl.toString());
  const owner = databaseClient(upgradeMigrationUrl.toString());
  const upgradeRuntimeUrl = new URL(runtimeUrl);
  upgradeRuntimeUrl.pathname = '/' + databaseName;
  const upgradePool = new Pool(
    createPoolConfig(databaseSettingsSchema.parse({ DATABASE_URL: upgradeRuntimeUrl.toString() })),
  );
  const upgradePrisma = new PrismaClient({
    adapter: new PrismaPg(upgradePool, { schema: 'game' }),
  });
  await admin.query(`CREATE DATABASE "${databaseName}"`);
  try {
    await upgradeAdmin.connect();
    await bootstrapDatabase(upgradeAdmin, passwords);
    await owner.connect();
    await owner.query(
      await readFile(
        new URL('../prisma/migrations/20261103000000_foundation/migration.sql', import.meta.url),
        'utf8',
      ),
    );
    // The new backend can still initialize profiles before the hosted migration.
    process.env.DATABASE_URL = runtimeUrl.toString();
    const { PlayersService } = await import('../dist/modules/players/players.service.js');
    const service = new PlayersService({ prisma: upgradePrisma });
    const compatibilityAuthId = randomUUID();
    const compatibilityProfile = await service.initialize(compatibilityAuthId);
    assert.equal(compatibilityProfile.player.authId, compatibilityAuthId);
    const id = randomUUID();
    const authId = randomUUID();
    await owner.query(
      'INSERT INTO game."Player" (id, "authId", "createdAt", "updatedAt") VALUES ($1, $2, \'2026-10-01 12:34:56.789\', \'2026-10-02 13:00:00.123\')',
      [id, authId],
    );
    const skewedId = randomUUID();
    await owner.query(
      'INSERT INTO game."Player" (id, "authId", "createdAt", "updatedAt") VALUES ($1, $2, \'2026-10-01 00:00:00\', \'2026-09-30 23:59:59.999\')',
      [skewedId, randomUUID()],
    );
    await migrate('resolve', upgradeMigrationUrl, ['--applied', '20261103000000_foundation']);
    const migrationSql = await readFile(
      new URL(
        '../prisma/migrations/20261103010000_database_foundations/migration.sql',
        import.meta.url,
      ),
      'utf8',
    );
    const failedMigration = migrationSql.replace(
      /COMMIT;\s*$/,
      () => "DO $$ BEGIN RAISE EXCEPTION 'Intentional rollback verification'; END $$;\nCOMMIT;",
    );
    assert.notEqual(failedMigration, migrationSql);
    await assert.rejects(owner.query(failedMigration), (error) => error.code === 'P0001');
    await owner.query('ROLLBACK');
    const {
      rows: [rollbackState],
    } = await owner.query(
      `SELECT
      to_regclass('game."AuditEvent"') IS NULL AS no_audit_table,
      (SELECT pg_get_expr(d.adbin, d.adrelid) FROM pg_attrdef d JOIN pg_attribute a ON a.attrelid = d.adrelid AND a.attnum = d.adnum WHERE d.adrelid = 'game."Player"'::regclass AND a.attname = 'id') AS id_default,
      (SELECT count(*)::int FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'game' AND p.proname IN ('protect_player_identity', 'reject_audit_mutation', 'audit_player_lifecycle')) AS foundation_functions,
      (SELECT data_type FROM information_schema.columns WHERE table_schema = 'game' AND table_name = 'Player' AND column_name = 'createdAt') AS created_type,
      (SELECT count(*)::int FROM pg_trigger WHERE tgrelid = 'game."Player"'::regclass AND NOT tgisinternal) AS player_triggers,
      (SELECT "updatedAt" < "createdAt" FROM game."Player" WHERE id = $1) AS legacy_skew_preserved`,
      [skewedId],
    );
    assert.deepEqual(rollbackState, {
      no_audit_table: true,
      id_default: null,
      foundation_functions: 0,
      created_type: 'timestamp without time zone',
      player_triggers: 0,
      legacy_skew_preserved: true,
    });
    await migrate('deploy', upgradeMigrationUrl);
    assert.equal(
      (await service.initialize(compatibilityAuthId)).player.id,
      compatibilityProfile.player.id,
    );
    const {
      rows: [player],
    } = await owner.query('SELECT * FROM game."Player" WHERE id = $1', [id]);
    assert.equal(player.authId, authId);
    assert.equal(player.createdAt.toISOString(), '2026-10-01T12:34:56.789Z');
    assert.equal(player.updatedAt.toISOString(), '2026-10-02T13:00:00.123Z');
    const {
      rows: [repaired],
    } = await owner.query('SELECT "createdAt", "updatedAt" FROM game."Player" WHERE id = $1', [
      skewedId,
    ]);
    assert.equal(repaired.createdAt.getTime(), repaired.updatedAt.getTime());
    await owner.query('DELETE FROM game."Player" WHERE id = $1', [id]);
    assert.equal(
      (await owner.query('SELECT "eventType" FROM game."AuditEvent" WHERE "entityId" = $1', [id]))
        .rows[0].eventType,
      'player.deleted',
    );
  } finally {
    await upgradePrisma.$disconnect();
    await upgradePool.end();
    await owner.end();
    await upgradeAdmin.end();
    await admin.query(`DROP DATABASE "${databaseName}"`);
  }
});

test('connection pool stays within its configured maximum under concurrent queries', async () => {
  let peak = 0;
  const measure = () => {
    peak = Math.max(peak, pool.totalCount);
  };
  pool.on('acquire', measure);
  try {
    await Promise.all(Array.from({ length: 8 }, () => pool.query('SELECT pg_sleep(0.02)')));
    assert.ok(peak > 0 && peak <= 2);
    assert.equal(pool.waitingCount, 0);
  } finally {
    pool.off('acquire', measure);
  }
});

test('readiness succeeds through Prisma with real least-privilege credentials', async () => {
  process.env.DATABASE_URL = runtimeUrl.toString();
  const { DatabaseService } = await import('../dist/database/database.service.js');
  const service = new DatabaseService();
  try {
    assert.equal(await service.readiness(), 'connected');
  } finally {
    await service.onModuleDestroy();
  }
});
