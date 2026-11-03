import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { randomBytes, randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../dist/generated/prisma/client.js';
import { bootstrapDatabase } from '../scripts/bootstrap-database.mjs';
import { verifyRuntimePrivileges } from '../scripts/verify-database.mjs';
import { databaseClient } from '../scripts/provisioning-environment.mjs';
import { databaseSettingsSchema } from '../src/config/database-environment.ts';
import { createPoolConfig } from '../src/database/pool-config.ts';

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
async function deploy() {
  await execute(
    process.execPath,
    [
      fileURLToPath(new URL('../node_modules/prisma/build/index.js', import.meta.url)),
      'migrate',
      'deploy',
    ],
    {
      cwd: apiRoot,
      env: { ...process.env, DIRECT_URL: migrationUrl.toString() },
    },
  );
}

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
    'SELECT migration_name FROM game._prisma_migrations WHERE finished_at IS NOT NULL',
  );
  assert.deepEqual(
    rows.map((row) => row.migration_name),
    ['20261103000000_foundation'],
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

test('Prisma CRUD works through RLS and failed transactions roll back', async () => {
  const player = await prisma.player.create({ data: { authId: randomUUID() } });
  try {
    assert.equal(
      (await prisma.player.findUnique({ where: { id: player.id } })).authId,
      player.authId,
    );
    const nextAuthId = randomUUID();
    assert.equal(
      (await prisma.player.update({ where: { id: player.id }, data: { authId: nextAuthId } }))
        .authId,
      nextAuthId,
    );
    await assert.rejects(prisma.player.create({ data: { authId: nextAuthId } }));
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
