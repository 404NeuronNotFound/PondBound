import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { Test } from '@nestjs/testing';
import { apiErrorResponseSchema, apiInfoResponseSchema, readinessResponseSchema } from '@pondbound/shared';

process.env.DATABASE_URL = '';
process.env.NODE_ENV = 'test';
const { AppModule } = await import('../dist/app.module.js');
const { configureApp } = await import('../dist/app.js');
const { DatabaseService } = await import('../dist/database/database.service.js');
const { RequestFixture } = await import('./helpers/request-fixture.mjs');

let app;
let base;
let databaseState = 'unconfigured';
before(async () => {
  const module = await Test.createTestingModule({ imports: [AppModule], controllers: [RequestFixture] })
    .overrideProvider(DatabaseService).useValue({ readiness: async () => databaseState }).compile();
  app = configureApp(module.createNestApplication({ logger: false }));
  await app.listen(0, '127.0.0.1');
  base = await app.getUrl();
});
after(async () => { await app?.close(); });

async function request(path, options) { return fetch(`${base}${path}`, options); }
async function assertError(response, expectedStatus) {
  assert.equal(response.status, expectedStatus);
  const raw = await response.text();
  assert.match(response.headers.get('content-type') ?? '', /application\/json/, `Expected JSON at ${response.url}: ${raw}`);
  const payload = JSON.parse(raw);
  const body = apiErrorResponseSchema.parse(payload);
  assert.equal(body.statusCode, expectedStatus);
  assert.equal(Number.isNaN(Date.parse(body.timestamp)), false);
  assert.equal(raw.includes('PRIVATE_DATABASE_CREDENTIAL'), false);
  assert.equal('stack' in payload, false);
  return body;
}

test('version-neutral probes and original aliases report database readiness', async () => {
  for (const path of ['/health', '/api/health']) {
    const live = await request(path);
    assert.equal(live.status, 200);
    assert.deepEqual(await live.json(), { status: 'ok', service: 'pondbound-api' });
  }
  for (const state of ['unconfigured', 'unavailable', 'connected']) {
    databaseState = state;
    for (const path of ['/ready', '/api/health/ready']) {
      const ready = await request(path);
      assert.equal(ready.status, state === 'connected' ? 200 : 503);
      assert.deepEqual(readinessResponseSchema.parse(await ready.json()), {
        status: state === 'connected' ? 'ok' : 'not_ready', database: state,
      });
    }
    assert.equal((await request('/health')).status, 200);
  }
});

test('URI versioning serves v1 and explicitly declared v2 routes only', async () => {
  const info = await request('/api/v1');
  assert.equal(info.status, 200);
  assert.deepEqual(apiInfoResponseSchema.parse(await info.json()), { service: 'pondbound-api', apiVersion: '1' });
  for (const path of ['/api', '/api/v2', '/api/v9', '/api/v1/health', '/foundation-test/validate']) {
    await assertError(await request(path), 404);
  }
  assert.deepEqual(await (await request('/api/v2/foundation-test/versionTwo')).json(), { version: '2' });
  await assertError(await request('/api/v1/foundation-test/versionTwo'), 404);
});

test('global validation transforms DTOs and rejects missing, invalid and extra fields', async () => {
  const post = body => request('/api/v1/foundation-test/validate', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  const valid = await post({ name: 'Fisher' });
  assert.equal(valid.status, 201);
  assert.deepEqual(await valid.json(), { name: 'Fisher', transformed: true });
  for (const payload of [{}, { name: 42 }, { name: 'a' }, { name: 'Fisher', gold: 1000000 }]) {
    const body = await assertError(await post(payload), 400);
    assert.equal(body.error, 'Bad Request');
    assert.equal(Array.isArray(body.message), true);
    assert.equal(body.path, '/api/v1/foundation-test/validate');
  }
});

test('malformed JSON receives the same error envelope', async () => {
  await assertError(await request('/api/v1/foundation-test/validate', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{broken',
  }), 400);
});

test('root, nested, and unsupported probe methods return JSON 404s', async () => {
  for (const path of ['/', '/health/missing', '/api/v1/missing']) {
    const body = await assertError(await request(path), 404);
    assert.equal(body.path, path);
  }
  await assertError(await request('/health', { method: 'POST' }), 404);
  const missing = await assertError(await request('/api/v99/missing?token=PRIVATE_DATABASE_CREDENTIAL'), 404);
  assert.equal(missing.path, '/api/v99/missing');
});

test('the exception filter normalizes HTTP errors and redacts server failures', async () => {
  const badRequest = await assertError(await request('/api/v1/foundation-test/clientError'), 400);
  assert.equal(badRequest.message, 'The request could not be accepted');
  for (const path of ['/api/v1/foundation-test/unexpected', '/api/v1/foundation-test/serverError']) {
    const body = await assertError(await request(path), 500);
    assert.equal(body.message, 'Internal Server Error');
    assert.equal(body.error, 'Internal Server Error');
  }
  const missing = await assertError(await request('/missing?token=PRIVATE_DATABASE_CREDENTIAL'), 404);
  assert.equal(missing.path, '/missing');
  assert.equal(missing.message, 'Not Found');
});
