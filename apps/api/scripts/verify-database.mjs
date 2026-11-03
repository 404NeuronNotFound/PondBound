import assert from 'node:assert/strict';
import { config } from 'dotenv';
import { databaseSettingsSchema } from '../src/config/database-environment.ts';
import { databaseClient, isMain, run } from './provisioning-environment.mjs';

export async function verifyRuntimePrivileges(client) {
  const {
    rows: [role],
  } = await client.query(`
    SELECT current_user AS name, rolsuper, rolcreatedb, rolcreaterole, rolreplication, rolbypassrls,
      EXISTS (SELECT FROM pg_auth_members WHERE member = pg_roles.oid) AS memberships
    FROM pg_roles WHERE rolname = current_user
  `);
  assert.equal(role.name, 'pondbound_api');
  for (const key of [
    'rolsuper',
    'rolcreatedb',
    'rolcreaterole',
    'rolreplication',
    'rolbypassrls',
    'memberships',
  ])
    assert.equal(role[key], false, `Unexpected runtime privilege: ${key}`);
  const {
    rows: [access],
  } = await client.query(`
    SELECT has_schema_privilege(current_user, 'game', 'USAGE') AS use_game,
      has_schema_privilege(current_user, 'game', 'CREATE') AS create_game,
      has_schema_privilege(current_user, 'public', 'CREATE') AS create_public,
      has_database_privilege(current_user, current_database(), 'CREATE') AS create_schema,
      has_table_privilege(current_user, 'game."_prisma_migrations"', 'INSERT') AS migrate,
      (SELECT relrowsecurity FROM pg_class WHERE oid = 'game."Player"'::regclass) AS rls,
      (SELECT pg_get_userbyid(relowner) FROM pg_class WHERE oid = 'game."Player"'::regclass) AS owner
  `);
  assert.equal(access.use_game, true);
  assert.equal(access.rls, true);
  assert.equal(access.owner, 'pondbound_migrator');
  for (const key of ['create_game', 'create_public', 'create_schema', 'migrate'])
    assert.equal(access[key], false, `Unexpected runtime permission: ${key}`);
  await client.query('SELECT id FROM game."Player" LIMIT 1');
  const { rows: browserRoles } = await client.query(
    "SELECT rolname FROM pg_roles WHERE rolname IN ('anon', 'authenticated')",
  );
  for (const { rolname } of browserRoles) {
    const {
      rows: [browser],
    } = await client.query(
      "SELECT has_schema_privilege($1, 'game', 'USAGE') AS schema_access, has_table_privilege($1, 'game.\"Player\"', 'SELECT') AS table_access",
      [rolname],
    );
    assert.equal(browser.schema_access, false);
    assert.equal(browser.table_access, false);
  }
}

if (isMain(import.meta.url))
  await run(async () => {
    config({ path: new URL('../.env', import.meta.url), quiet: true });
    const settings = databaseSettingsSchema.parse(process.env);
    if (!settings.DATABASE_URL) {
      console.error('Set the runtime DATABASE_URL in apps/api/.env before verification.');
      process.exitCode = 1;
      return;
    }
    const client = databaseClient(settings.DATABASE_URL, process.env);
    try {
      await client.connect();
      await verifyRuntimePrivileges(client);
      console.log(
        'Runtime role, RLS, schema ownership, migration isolation and browser access checks passed.',
      );
    } finally {
      await client.end();
    }
  });
