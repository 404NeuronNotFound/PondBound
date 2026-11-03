import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { before, after, test } from 'node:test';
import { Test } from '@nestjs/testing';
import { createClient } from '@supabase/supabase-js';
import { playerProfileResponseSchema } from '@pondbound/shared';

process.env.DATABASE_URL = '';
process.env.NODE_ENV = 'test';
const { AppModule } = await import('../dist/app.module.js');
const { configureApp } = await import('../dist/app.js');
const { AUTH_CLIENT } = await import('../dist/modules/auth/auth-client.js');
const { AuthService } = await import('../dist/modules/auth/auth.service.js');
const { DatabaseService } = await import('../dist/database/database.service.js');

const alice = randomUUID();
const bob = randomUUID();
const players = new Map();
const verified = [];
const provider = {
  auth: {
    getUser: async (token) => {
      verified.push(token);
      if (token === 'signed.unavailable.signature')
        return { data: { user: null }, error: { status: 503, message: 'UPSTREAM_SECRET' } };
      if (token === 'signed.network.signature') throw new Error('UPSTREAM_SECRET');
      if (token === 'signed.invalid-uuid.signature')
        return { data: { user: { id: 'not-a-uuid' } }, error: null };
      const id =
        token === 'signed.alice.signature' ? alice : token === 'signed.bob.signature' ? bob : null;
      return id
        ? { data: { user: { id, user_metadata: { role: 'admin', authId: bob } } }, error: null }
        : { data: { user: null }, error: { status: 401, message: 'UPSTREAM_SECRET' } };
    },
  },
};
let app;
let base;
before(async () => {
  const module = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(AUTH_CLIENT)
    .useValue(provider)
    .overrideProvider(DatabaseService)
    .useValue({
      readiness: async () => 'connected',
      prisma: {
        player: {
          upsert: async ({ where, create }) => {
            assert.equal(create.authId, where.authId);
            if (!players.has(where.authId))
              players.set(where.authId, {
                id: randomUUID(),
                authId: where.authId,
                createdAt: new Date(),
                updatedAt: new Date(),
              });
            return players.get(where.authId);
          },
          findUnique: async ({ where }) => players.get(where.authId) ?? null,
        },
      },
    })
    .compile();
  app = configureApp(module.createNestApplication({ logger: false }));
  await app.listen(0, '127.0.0.1');
  base = await app.getUrl();
});
after(async () => {
  await app?.close();
});

function request(path, token, method = 'GET', body) {
  return fetch(`${base}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: token } : {}),
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}
async function expectStatus(response, status) {
  assert.equal(response.status, status);
  const text = await response.text();
  assert.equal(text.includes('UPSTREAM_SECRET'), false);
  assert.equal(text.includes('signed.alice.signature'), false);
  return JSON.parse(text);
}

test('protected routes reject missing and malformed Bearer tokens before provider/database access', async () => {
  const count = verified.length;
  for (const header of [
    undefined,
    'Basic credentials',
    'Bearer opaque',
    'Bearer a.b.c, Bearer d.e.f',
    'Bearer a.b.c extra',
  ]) {
    await expectStatus(await request('/api/v1/players/me', header, 'POST', {}), 401);
  }
  assert.equal(verified.length, count);
  assert.equal(players.size, 0);
});

test('invalid, expired and foreign tokens cannot initialize profiles', async () => {
  for (const token of [
    'signed.invalid.signature',
    'signed.expired.signature',
    'signed.foreign.signature',
  ]) {
    await expectStatus(await request('/api/v1/players/me', `Bearer ${token}`, 'POST', {}), 401);
  }
  assert.equal(players.size, 0);
});

test('provider/network failures fail closed with safe 503 responses', async () => {
  for (const token of [
    'signed.unavailable.signature',
    'signed.network.signature',
    'signed.invalid-uuid.signature',
  ]) {
    await expectStatus(await request('/api/v1/players/me', `Bearer ${token}`, 'POST', {}), 503);
  }
  await assert.rejects(new AuthService(null).verify('a.b.c'), (error) => error.getStatus() === 503);
  assert.equal(players.size, 0);
});

test('public probes and API identity remain available without authentication', async () => {
  const count = verified.length;
  for (const path of ['/health', '/ready', '/api/health', '/api/v1'])
    await expectStatus(await request(path, 'invalid'), 200);
  assert.equal(verified.length, count);
});

test('profile initialization uses only verified UUID and is idempotent', async () => {
  await expectStatus(await request('/api/v1/players/me', 'Bearer signed.alice.signature'), 404);
  const first = playerProfileResponseSchema.parse(
    await expectStatus(
      await request('/api/v1/players/me', 'Bearer signed.alice.signature', 'POST', {}),
      200,
    ),
  );
  const second = await expectStatus(
    await request('/api/v1/players/me', 'bearer signed.alice.signature', 'POST', {}),
    200,
  );
  assert.deepEqual(second, first);
  assert.equal(first.player.authId, alice);
  assert.equal(players.size, 1);
});

test('clients cannot select or override another identity/profile', async () => {
  for (const body of [{ authId: bob }, { id: randomUUID() }, { gold: 1000000 }, []]) {
    await expectStatus(
      await request('/api/v1/players/me', 'Bearer signed.alice.signature', 'POST', body),
      400,
    );
  }
  const current = await expectStatus(
    await request(`/api/v1/players/me?authId=${bob}`, 'Bearer signed.alice.signature'),
    200,
  );
  assert.equal(current.player.authId, alice);
  await expectStatus(await request('/api/v1/players/me', 'Bearer signed.bob.signature'), 404);
  const other = await expectStatus(
    await request('/api/v1/players/me', 'Bearer signed.bob.signature', 'POST', {}),
    200,
  );
  assert.equal(other.player.authId, bob);
  assert.notEqual(other.player.id, current.player.id);
});

test('Supabase verification transport sends the token to the configured Auth user endpoint', async () => {
  let calls = 0;
  const client = createClient('https://identity.example.test', 'public-test-key', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      fetch: async (input, init) => {
        calls++;
        assert.equal(String(input), 'https://identity.example.test/auth/v1/user');
        const headers = new Headers(init.headers);
        assert.equal(headers.get('Authorization'), 'Bearer signed.alice.signature');
        assert.equal(headers.get('apikey'), 'public-test-key');
        return new Response(JSON.stringify({ id: alice, aud: 'authenticated' }), {
          headers: { 'Content-Type': 'application/json' },
        });
      },
    },
  });
  assert.deepEqual(await new AuthService(client).verify('signed.alice.signature'), { id: alice });
  assert.equal(calls, 1);
});
