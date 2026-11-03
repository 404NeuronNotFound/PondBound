import { readFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { databaseClient, isMain, loadProvisioningEnvironment, run, saveEnvironment } from './provisioning-environment.mjs';

export async function bootstrapDatabase(client, { apiPassword, migratorPassword }) {
  if (!apiPassword || !migratorPassword || apiPassword.length < 24 || migratorPassword.length < 24 || apiPassword === migratorPassword) {
    throw new Error('Set independent PONDBOUND_API_PASSWORD and PONDBOUND_MIGRATOR_PASSWORD values of at least 24 characters');
  }
  await client.query('BEGIN');
  try {
    await client.query(await readFile(new URL('../../../deployment/supabase/roles.sql', import.meta.url), 'utf8'));
    for (const [role, password] of [['pondbound_api', apiPassword], ['pondbound_migrator', migratorPassword]]) {
      const result = await client.query("SELECT format('ALTER ROLE %I WITH LOGIN PASSWORD %L', $1::text, $2::text) AS command", [role, password]);
      await client.query(result.rows[0].command);
    }
    await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK'); throw error; }
}

if (isMain(import.meta.url)) await run(async () => {
  const environment = loadProvisioningEnvironment();
  if (!environment.SUPABASE_DB_ADMIN_URL) {
    console.error('Set SUPABASE_DB_ADMIN_URL in deployment/supabase/.env. Role passwords will be generated if missing.');
    process.exitCode = 1;
    return;
  }
  const adminUrl = new URL(environment.SUPABASE_DB_ADMIN_URL);
  if (adminUrl.port === '6543') throw new Error('Provisioning requires a direct or session-pooler connection');
  const apiPassword = environment.PONDBOUND_API_PASSWORD || randomBytes(32).toString('base64url');
  const migratorPassword = environment.PONDBOUND_MIGRATOR_PASSWORD || randomBytes(32).toString('base64url');
  const suffix = adminUrl.hostname.includes('pooler.') ? decodeURIComponent(adminUrl.username).replace(/^[^.]+/, '') : '';
  const runtimeUrl = new URL(adminUrl);
  runtimeUrl.username = `pondbound_api${suffix}`;
  runtimeUrl.password = apiPassword;
  const migrationUrl = new URL(adminUrl);
  migrationUrl.username = `pondbound_migrator${suffix}`;
  migrationUrl.password = migratorPassword;
  migrationUrl.searchParams.set('schema', 'game');
  if (!['localhost', '127.0.0.1', '[::1]'].includes(migrationUrl.hostname)) {
    migrationUrl.searchParams.set('sslmode', 'require');
    migrationUrl.searchParams.set('sslaccept', 'strict');
    if (environment.DB_SSL_CA_FILE) migrationUrl.searchParams.set('sslcert', environment.DB_SSL_CA_FILE);
  }
  const apiFile = new URL('../.env', import.meta.url);
  const migrationFile = new URL('../.env.migrations', import.meta.url);
  const apiValues = { DATABASE_URL: runtimeUrl.toString(), DB_SSL_CA_FILE: environment.DB_SSL_CA_FILE };
  const migrationValues = { DIRECT_URL: migrationUrl.toString() };
  saveEnvironment(apiFile, apiValues, true);
  saveEnvironment(migrationFile, migrationValues, true);
  saveEnvironment(new URL('../../../deployment/supabase/.env', import.meta.url), {
    PONDBOUND_API_PASSWORD: apiPassword, PONDBOUND_MIGRATOR_PASSWORD: migratorPassword,
  });
  const client = databaseClient(environment.SUPABASE_DB_ADMIN_URL, environment);
  try {
    await client.connect();
    await bootstrapDatabase(client, { apiPassword, migratorPassword });
    saveEnvironment(apiFile, apiValues);
    saveEnvironment(migrationFile, migrationValues);
    console.log('Provisioned separate roles and private game schema. Saved runtime/migration URLs in separate ignored files.');
  } finally { await client.end(); }
});
