import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = '';
const { parseEnvironment } = await import('../dist/config/environment.js');
const { loadEnvironment } = await import('../dist/config/environment-loader.js');

const production = {
  NODE_ENV: 'production',
  WEB_ORIGIN: 'https://play.example.test',
  DATABASE_URL: 'postgresql://pondbound_api:fixture-only-password@db.example.test/postgres',
  SUPABASE_URL: 'https://identity.example.test',
  SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_fixture',
};

test('production requires explicit database, Auth and CORS configuration', () => {
  assert.equal(parseEnvironment(production).NODE_ENV, 'production');
  for (const key of ['DATABASE_URL', 'SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY', 'WEB_ORIGIN']) {
    assert.throws(() => parseEnvironment({ ...production, [key]: undefined }), new RegExp(key));
  }
  assert.throws(() => parseEnvironment({ ...production, WEB_ORIGIN: 'http://localhost:5173' }));
  assert.throws(() => parseEnvironment({ ...production, SUPABASE_URL: 'http://localhost:54321' }));
});

test('CORS configuration accepts only exact origins and normalizes duplicates', () => {
  const result = parseEnvironment({
    WEB_ORIGIN: 'https://play.example.test/, https://play.example.test',
  });
  assert.deepEqual(result.WEB_ORIGIN, ['https://play.example.test']);
  for (const origin of [
    '*',
    'null',
    '',
    'file:///tmp',
    'https://*.example.test',
    'https://user:password@example.test',
    'https://example.test/path',
    'https://example.test?key=secret',
    'https://example.test#hash',
    'https://example.test,',
  ]) {
    assert.throws(() => parseEnvironment({ WEB_ORIGIN: origin }), undefined, origin);
  }
});

test('runtime rejects administrative credentials and secret/service-role keys', () => {
  for (const key of [
    'DIRECT_URL',
    'SHADOW_DATABASE_URL',
    'SUPABASE_SECRET_KEY',
    'SUPABASE_DB_ADMIN_URL',
  ]) {
    assert.throws(
      () => parseEnvironment({ [key]: 'PRIVATE_CONFIG_SENTINEL' }),
      (error) => error.message.includes(key) && !error.message.includes('PRIVATE_CONFIG_SENTINEL'),
    );
  }
  const legacyServiceKey = `header.${Buffer.from(JSON.stringify({ role: 'service_role' })).toString('base64url')}.signature`;
  for (const key of ['sb_secret_PRIVATE_CONFIG_SENTINEL', legacyServiceKey])
    assert.throws(() =>
      parseEnvironment({
        SUPABASE_URL: 'https://identity.example.test',
        SUPABASE_PUBLISHABLE_KEY: key,
      }),
    );
  assert.throws(() =>
    parseEnvironment({ ...production, TEST_DB_ADMIN_URL: 'PRIVATE_CONFIG_SENTINEL' }),
  );
});

test('configuration failures identify fields without exposing submitted credentials', () => {
  for (const values of [
    { DATABASE_URL: 'postgresql://postgres:PRIVATE_CONFIG_SENTINEL@db.example.test/postgres' },
    { WEB_ORIGIN: 'https://user:PRIVATE_CONFIG_SENTINEL@example.test/path' },
    { SUPABASE_URL: 'https://user:PRIVATE_CONFIG_SENTINEL@example.test/path' },
  ]) {
    assert.throws(
      () => parseEnvironment(values),
      (error) =>
        !error.message.includes('PRIVATE_CONFIG_SENTINEL') &&
        !error.message.includes('postgresql://'),
    );
  }
});

async function withDirectory(operation) {
  const directory = await mkdtemp(join(tmpdir(), 'pondbound-env-'));
  try {
    await operation(directory);
  } finally {
    assert.equal(dirname(resolve(directory)), resolve(tmpdir()));
    await rm(directory, { recursive: true, force: true });
  }
}

test('mode loading isolates test/production from development and preserves process precedence', async () =>
  withDirectory(async (directory) => {
    await writeFile(join(directory, '.env'), 'DATABASE_URL=development-only\nVALUE=base\n');
    await writeFile(join(directory, '.env.local'), 'VALUE=local\n');
    await writeFile(join(directory, '.env.development'), 'VALUE=development\n');
    await writeFile(join(directory, '.env.development.local'), 'VALUE=development-local\n');
    await writeFile(join(directory, '.env.test'), 'NODE_ENV=test\nVALUE=test-only\n');
    const development = {};
    loadEnvironment({ directory, environment: development });
    assert.equal(development.VALUE, 'development-local');
    const explicit = { NODE_ENV: 'development', VALUE: 'process-value' };
    loadEnvironment({ directory, environment: explicit });
    assert.equal(explicit.VALUE, 'process-value');
    const testing = { NODE_ENV: 'test' };
    loadEnvironment({ directory, environment: testing });
    assert.equal(testing.VALUE, 'test-only');
    assert.equal(testing.DATABASE_URL, undefined);
    const deployed = { NODE_ENV: 'production' };
    assert.deepEqual(loadEnvironment({ directory, environment: deployed }).loaded, []);
    assert.equal(deployed.DATABASE_URL, undefined);
    await writeFile(join(directory, '.env.production'), 'NODE_ENV=development\n');
    assert.throws(() => loadEnvironment({ directory, environment: { NODE_ENV: 'production' } }));
  }));
