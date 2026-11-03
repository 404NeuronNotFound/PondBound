import assert from 'node:assert/strict';
import { test } from 'node:test';
import { setTimeout } from 'node:timers/promises';
import { Test } from '@nestjs/testing';

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = '';
process.env.API_RATE_LIMIT = '8';
process.env.AUTH_RATE_LIMIT = '2';
process.env.RATE_LIMIT_WINDOW_MS = '1000';
process.env.TRUSTED_PROXY_CIDRS = '';
const { AppModule } = await import('../dist/app.module.js');
const { configureApp } = await import('../dist/app.js');
const { JsonLogger } = await import('../dist/observability/json-logger.js');
const { ERROR_REPORTER } = await import('../dist/observability/error-reporting.service.js');
const { DatabaseService } = await import('../dist/database/database.service.js');
const { AUTH_CLIENT } = await import('../dist/modules/auth/auth-client.js');
const { environment } = await import('../dist/config/environment.js');
const { RequestFixture } = await import('./helpers/request-fixture.mjs');
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

async function harness({ failReporter = false, trustedProxy = false, windowMs = 60000 } = {}) {
  const lines = [];
  const reports = [];
  let providerCalls = 0;
  const previousWindow = environment.RATE_LIMIT_WINDOW_MS;
  environment.RATE_LIMIT_WINDOW_MS = windowMs;
  const module = await Test.createTestingModule({
    imports: [AppModule],
    controllers: [RequestFixture],
  })
    .overrideProvider(JsonLogger)
    .useValue(new JsonLogger((line) => lines.push(JSON.parse(line))))
    .overrideProvider(ERROR_REPORTER)
    .useValue({
      capture: (report) => {
        reports.push(report);
        if (failReporter) return Promise.reject(new Error('REPORTER_SECRET'));
      },
    })
    .overrideProvider(DatabaseService)
    .useValue({ readiness: async () => 'connected' })
    .overrideProvider(AUTH_CLIENT)
    .useValue({
      auth: {
        getUser: async () => {
          providerCalls++;
          return { data: { user: null }, error: { status: 401 } };
        },
      },
    })
    .compile()
    .finally(() => {
      environment.RATE_LIMIT_WINDOW_MS = previousWindow;
    });
  const previous = environment.TRUSTED_PROXY_CIDRS;
  environment.TRUSTED_PROXY_CIDRS = trustedProxy ? ['127.0.0.1/32', '::1/128'] : [];
  let app;
  try {
    app = configureApp(module.createNestApplication({ logger: false }));
  } finally {
    environment.TRUSTED_PROXY_CIDRS = previous;
  }
  await app.listen(0, '127.0.0.1');
  const base = await app.getUrl();
  return {
    app,
    lines,
    reports,
    providerCalls: () => providerCalls,
    request: (path, options) => fetch(base + path, options),
  };
}

test('server request IDs correlate headers/errors/logs and reporters receive safe metadata only', async () => {
  const h = await harness();
  try {
    const forgedId = '00000000-0000-4000-8000-000000000001';
    const response = await h.request('/api/v1/foundation-test/unexpected?token=QUERY_SECRET', {
      headers: {
        'X-Request-Id': forgedId,
        Authorization: 'Bearer HEADER_SECRET',
        Cookie: 'PRIVATE_COOKIE',
        Origin: 'http://localhost:5173',
      },
    });
    assert.equal(response.status, 500);
    const id = response.headers.get('x-request-id');
    assert.match(id, uuid);
    assert.notEqual(id, forgedId);
    assert.equal((await response.json()).requestId, id);
    assert.match(response.headers.get('access-control-expose-headers'), /X-Request-Id/i);
    assert.equal(h.reports.length, 1);
    assert.equal(h.reports[0].requestId, id);
    assert.equal(h.reports[0].route, '/api/v1/foundation-test/unexpected');
    assert.equal(h.reports[0].errorKind, 'unexpected_exception');
    assert.ok(Object.isFrozen(h.reports[0]));
    const completion = h.lines.find((line) => line.event === 'request.completed');
    assert.equal(completion.requestId, id);
    assert.equal(completion.statusCode, 500);
    assert.ok(completion.durationMs >= 0);
    for (const secret of [
      'QUERY_SECRET',
      'HEADER_SECRET',
      'PRIVATE_COOKIE',
      'PRIVATE_DATABASE_CREDENTIAL',
    ])
      assert.equal(JSON.stringify([h.lines, h.reports]).includes(secret), false);
    const unknown = await h.request('/unknown/PRIVATE_PATH?value=QUERY_SECRET');
    assert.equal(unknown.status, 404);
    await unknown.text();
    assert.equal(h.lines.at(-1).route, 'unmatched');
    assert.equal(JSON.stringify(h.lines).includes('PRIVATE_PATH'), false);
    const rejected = await h.request('/api/v1/foundation-test/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'PRIVATE_BODY',
        password: 'PRIVATE_PASSWORD',
        nested: { access_token: 'PRIVATE_TOKEN' },
      }),
    });
    assert.equal(rejected.status, 400);
    await rejected.text();
    for (const secret of ['PRIVATE_BODY', 'PRIVATE_PASSWORD', 'PRIVATE_TOKEN'])
      assert.equal(JSON.stringify([h.lines, h.reports]).includes(secret), false);
  } finally {
    await h.app.close();
  }
});

test('API limits return JSON 429/Retry-After, ignore forged forwarding headers and preserve probes', async () => {
  const h = await harness();
  try {
    for (let i = 0; i < 8; i++) {
      const response = await h.request('/api/v1?unique=' + i, {
        headers: { 'X-Forwarded-For': `10.0.0.${i + 1}` },
      });
      assert.equal(response.status, 200);
      await response.text();
    }
    const blocked = await h.request('/api/v1', { headers: { 'X-Forwarded-For': '192.0.2.99' } });
    assert.equal(blocked.status, 429);
    assert.ok(Number(blocked.headers.get('retry-after')) > 0);
    assert.ok(blocked.headers.get('ratelimit'));
    const body = await blocked.json();
    assert.equal(body.statusCode, 429);
    assert.equal(body.requestId, blocked.headers.get('x-request-id'));
    for (const path of ['/health', '/ready', '/api/health', '/api/health/ready']) {
      const response = await h.request(path);
      assert.equal(response.status, 200);
      await response.text();
    }
    const preflight = await h.request('/api/v1/players/me', {
      method: 'OPTIONS',
      headers: { Origin: 'http://localhost:5173', 'Access-Control-Request-Method': 'POST' },
    });
    assert.equal(preflight.status, 204);
  } finally {
    await h.app.close();
  }
});

test('auth verification is limited before upstream calls, and resumes after the window', async () => {
  const h = await harness({ windowMs: 1000 });
  try {
    for (let i = 0; i < 2; i++) {
      const response = await h.request('/api/v1/players/me', {
        headers: { Authorization: 'Bearer signed.invalid.signature' },
      });
      assert.equal(response.status, 401);
      await response.text();
    }
    const blocked = await h.request('/api/v1/players/me', {
      headers: { Authorization: 'Bearer signed.other.signature' },
    });
    assert.equal(blocked.status, 429);
    await blocked.text();
    assert.equal(h.providerCalls(), 2);
    await setTimeout(1100);
    const resumed = await h.request('/api/v1/players/me', {
      headers: { Authorization: 'Bearer signed.invalid.signature' },
    });
    assert.equal(resumed.status, 401);
    await resumed.text();
    assert.equal(h.providerCalls(), 3);
  } finally {
    await h.app.close();
  }
});

test('explicitly trusted proxy addresses separate client rate buckets', async () => {
  const h = await harness({ trustedProxy: true });
  try {
    for (let i = 0; i < 8; i++) {
      const response = await h.request('/api/v1', { headers: { 'X-Forwarded-For': '192.0.2.1' } });
      assert.equal(response.status, 200);
      await response.text();
    }
    const blocked = await h.request('/api/v1', { headers: { 'X-Forwarded-For': '192.0.2.1' } });
    assert.equal(blocked.status, 429);
    await blocked.text();
    const other = await h.request('/api/v1', { headers: { 'X-Forwarded-For': '192.0.2.2' } });
    assert.equal(other.status, 200);
    await other.text();
  } finally {
    await h.app.close();
  }
});

test('malformed/oversize/CORS errors retain IDs and API responses have baseline headers', async () => {
  const h = await harness();
  try {
    for (const [body, status] of [
      ['{', 400],
      [JSON.stringify({ name: 'x'.repeat(20000) }), 413],
    ]) {
      const response = await h.request('/api/v1/foundation-test/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });
      assert.equal(response.status, status);
      assert.equal((await response.json()).requestId, response.headers.get('x-request-id'));
    }
    const cors = await h.request('/api/v1', { headers: { Origin: 'https://untrusted.example' } });
    assert.equal(cors.status, 403);
    assert.equal((await cors.json()).requestId, cors.headers.get('x-request-id'));
    const live = await h.request('/health');
    assert.equal(live.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(live.headers.get('x-powered-by'), null);
    assert.ok(live.headers.get('content-security-policy'));
    assert.equal(live.headers.get('cache-control'), 'no-store');
    assert.equal(h.reports.length, 0);
  } finally {
    await h.app.close();
  }
});

test('a failing reporting sink cannot change the safe 500 response or leak its exception', async () => {
  const h = await harness({ failReporter: true });
  try {
    const response = await h.request('/api/v1/foundation-test/unexpected');
    assert.equal(response.status, 500);
    const body = await response.json();
    assert.equal(body.message, 'Internal Server Error');
    await setTimeout(0);
    assert.ok(h.lines.some((line) => line.event === 'reporting.failed'));
    assert.equal(JSON.stringify(h.lines).includes('REPORTER_SECRET'), false);
  } finally {
    await h.app.close();
  }
});
