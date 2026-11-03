import assert from 'node:assert/strict';
import { test } from 'node:test';
import { databaseSettingsSchema } from '../src/config/database-environment.ts';
import { createPoolConfig } from '../src/database/pool-config.ts';
import { bucket, ensurePrivateBucket } from '../scripts/provision-storage.mjs';

test('database settings reject elevated runtime roles and invalid pool limits', () => {
  for (const role of ['postgres', 'pondbound_migrator']) {
    assert.throws(() =>
      databaseSettingsSchema.parse({
        DATABASE_URL: `postgresql://${role}:test@localhost/pondbound`,
      }),
    );
  }
  for (const value of [0, -1, 21, 'invalid'])
    assert.throws(() => databaseSettingsSchema.parse({ DB_POOL_MAX: value }));
  assert.throws(() => databaseSettingsSchema.parse({ DATABASE_URL: 'https://example.com' }));
  assert.throws(() =>
    databaseSettingsSchema.parse({
      DATABASE_URL: 'postgresql://pondbound_api:test@remote.example/postgres?sslmode=no-verify',
    }),
  );
});

test('pool configuration bounds connections and timeouts and verifies remote TLS', () => {
  const settings = databaseSettingsSchema.parse({
    DATABASE_URL:
      'postgresql://pondbound_api.project:test@remote.example:5432/postgres?sslmode=require&schema=game',
    DB_POOL_MAX: 2,
  });
  const pool = createPoolConfig(settings);
  assert.equal(pool.max, 2);
  assert.equal(pool.connectionTimeoutMillis, 3000);
  assert.equal(pool.query_timeout, 5000);
  assert.equal(pool.idleTimeoutMillis, 10000);
  assert.equal(pool.ssl.rejectUnauthorized, true);
  assert.equal(new URL(pool.connectionString).searchParams.has('sslmode'), false);
  const local = createPoolConfig(
    databaseSettingsSchema.parse({
      DATABASE_URL: 'postgresql://pondbound_api:test@127.0.0.1/test',
    }),
  );
  assert.equal(local.ssl, false);
});

test('Storage provisioning creates only the private bucket with explicit limits', async () => {
  let created = false;
  const outcome = await ensurePrivateBucket({
    getBucket: async () => ({ error: { statusCode: '404' } }),
    createBucket: async (id, options) => {
      assert.equal(id, bucket.id);
      assert.deepEqual(options, {
        public: false,
        fileSizeLimit: bucket.fileSizeLimit,
        allowedMimeTypes: bucket.allowedMimeTypes,
      });
      created = true;
      return { error: null };
    },
  });
  assert.equal(outcome, 'created');
  assert.equal(created, true);
});

test('Storage provisioning is idempotent and refuses unsafe or unauthorized configurations', async () => {
  const current = {
    public: false,
    file_size_limit: bucket.fileSizeLimit,
    allowed_mime_types: bucket.allowedMimeTypes,
  };
  const storage = {
    getBucket: async () => ({ data: current }),
    createBucket: async () => {
      assert.fail('Must not recreate an existing bucket');
    },
  };
  assert.equal(await ensurePrivateBucket(storage), 'verified');
  await assert.rejects(
    ensurePrivateBucket({
      ...storage,
      getBucket: async () => ({ data: { ...current, public: true } }),
    }),
  );
  await assert.rejects(
    ensurePrivateBucket({ ...storage, getBucket: async () => ({ error: { statusCode: '403' } }) }),
  );
});
