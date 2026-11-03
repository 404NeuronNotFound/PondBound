import assert from 'node:assert/strict';
import { test } from 'node:test';

// Keep foundation tests independent of local or hosted credentials.
process.env.DATABASE_URL = '';
process.env.NODE_ENV = 'test';
const { createApp } = await import('../dist/app.js');
const { parseEnvironment } = await import('../dist/config/environment.js');

test('environment rejects invalid ports and origins', () => {
  assert.throws(() => parseEnvironment({ PORT: '0' }));
  assert.throws(() => parseEnvironment({ WEB_ORIGIN: '*' }));
  assert.throws(() => parseEnvironment({ DATABASE_URL: 'invalid' }));
});

test('HTTP liveness, readiness, CORS, and unknown routes', async () => {
  const app = await createApp();
  try {
    await app.listen(0, '127.0.0.1');
    const base = await app.getUrl();
    const live = await fetch(`${base}/api/health`, {
      headers: { Origin: 'http://localhost:5173' },
    });
    assert.equal(live.status, 200);
    assert.deepEqual(await live.json(), { status: 'ok', service: 'pondbound-api' });
    assert.equal(live.headers.get('access-control-allow-origin'), 'http://localhost:5173');
    const blocked = await fetch(`${base}/api/health`, {
      headers: { Origin: 'https://example.com' },
    });
    assert.equal(blocked.status, 403);
    assert.equal(blocked.headers.get('access-control-allow-origin'), null);
    const ready = await fetch(`${base}/api/health/ready`);
    assert.equal(ready.status, 503);
    assert.equal((await ready.json()).database, 'unconfigured');
    assert.equal((await fetch(`${base}/api/unknown`)).status, 404);
  } finally {
    await app.close();
  }
});

test('CORS preflight allows exact origins and Bearer headers without cookie credentials', async () => {
  const app = await createApp();
  try {
    await app.listen(0, '127.0.0.1');
    const base = await app.getUrl();
    const preflight = (origin) =>
      fetch(`${base}/api/v1/players/me`, {
        method: 'OPTIONS',
        headers: {
          Origin: origin,
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'authorization,content-type',
        },
      });
    const allowed = await preflight('http://localhost:5173');
    assert.equal(allowed.status, 204);
    assert.equal(allowed.headers.get('access-control-allow-origin'), 'http://localhost:5173');
    assert.match(
      allowed.headers.get('access-control-allow-headers').toLowerCase(),
      /authorization/,
    );
    assert.equal(allowed.headers.get('access-control-allow-credentials'), null);
    for (const origin of [
      'http://localhost:5173.evil.test',
      'https://unlisted.example.test',
      'null',
    ]) {
      const rejected = await preflight(origin);
      assert.equal(rejected.status, 403);
      assert.equal(rejected.headers.get('access-control-allow-origin'), null);
      assert.equal((await rejected.json()).statusCode, 403);
    }
    assert.equal((await fetch(`${base}/health`)).status, 200);
  } finally {
    await app.close();
  }
});
