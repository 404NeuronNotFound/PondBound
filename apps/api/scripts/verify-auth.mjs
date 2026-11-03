import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { randomBytes, randomUUID } from 'node:crypto';
import { parse } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { databaseClient, isMain, loadProvisioningEnvironment, run } from './provisioning-environment.mjs';

// Explicit live smoke test only. Creates confirmed temporary users without email,
// verifies identity boundaries, then removes those users and their Player rows.
export async function verifyLiveAuth() {
  const environment = loadProvisioningEnvironment();
  const runtime = parse(readFileSync(new URL('../.env', import.meta.url), 'utf8'));
  const base = new URL(process.env.AUTH_VERIFY_API_URL || 'http://127.0.0.1:3000');
  if (!['localhost', '127.0.0.1', '[::1]'].includes(base.hostname)) throw new Error('The smoke test must use a loopback API');
  if (!environment.SUPABASE_SECRET_KEY || !runtime.SUPABASE_PUBLISHABLE_KEY || !runtime.DATABASE_URL) throw new Error('Configure provisioning and runtime environments first');
  const options = { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(15000) }) } };
  const admin = createClient(environment.SUPABASE_URL, environment.SUPABASE_SECRET_KEY, options);
  const database = databaseClient(runtime.DATABASE_URL, runtime);
  const users = [];
  const tokens = [];
  let phase = 'anonymous token rejection';
  async function create(metadata) {
    const email = `foundation-${randomUUID()}@example.com`;
    const password = randomBytes(32).toString('base64url');
    const result = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: metadata });
    if (result.error || !result.data.user) throw new Error('Temporary Auth user could not be created');
    users.push(result.data.user.id);
    const browser = createClient(environment.SUPABASE_URL, runtime.SUPABASE_PUBLISHABLE_KEY, options);
    const login = await browser.auth.signInWithPassword({ email, password });
    if (login.error || !login.data.session) throw new Error('Temporary Auth user could not sign in');
    tokens.push(login.data.session.access_token);
    return { id: result.data.user.id, token: login.data.session.access_token };
  }
  async function request(token, method = 'GET', body, query = '') {
    return fetch(new URL(`/api/v1/players/me${query}`, base), { method,
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(15000),
    });
  }
  try {
    await database.connect();
    assert.equal((await request(null)).status, 401);
    assert.equal((await request('not-a-jwt')).status, 401);
    phase = 'temporary user sign-in';
    const bob = await create({});
    const alice = await create({ role: 'admin', authId: bob.id });
    const tokenParts = alice.token.split('.');
    tokenParts[2] = (tokenParts[2][0] === 'a' ? 'b' : 'a') + tokenParts[2].slice(1);
    phase = 'tampered token rejection';
    assert.equal((await request(tokenParts.join('.'), 'POST', {})).status, 401);
    phase = 'concurrent profile initialization';
    const attempts = await Promise.all(Array.from({ length: 5 }, () => request(alice.token, 'POST', {})));
    for (const response of attempts) assert.equal(response.status, 200, 'Concurrent initialization failed');
    const profiles = await Promise.all(attempts.map(response => response.json()));
    assert.equal(new Set(profiles.map(response => response.player.id)).size, 1);
    assert.equal(profiles[0].player.authId, alice.id);
    assert.equal('role' in profiles[0].player, false);
    phase = 'client identity and role overrides';
    assert.equal((await request(alice.token, 'POST', { authId: bob.id, role: 'admin' })).status, 400);
    const current = await request(alice.token, 'GET', undefined, `?authId=${bob.id}`);
    assert.equal(current.status, 200);
    assert.equal((await current.json()).player.authId, alice.id);
    assert.equal((await request(bob.token)).status, 404);
    phase = 'second-user identity isolation';
    const bobProfile = await request(bob.token, 'POST', {});
    assert.equal(bobProfile.status, 200);
    assert.equal((await bobProfile.json()).player.authId, bob.id);
    const { rows: [count] } = await database.query('SELECT count(*)::int AS count FROM game."Player" WHERE "authId" = $1', [alice.id]);
    assert.equal(count.count, 1);
    console.log('Live Auth checks passed: invalid/tampered tokens rejected, correct Player resolved, concurrent initialization reused one profile, and client identity/role overrides rejected.');
  } catch (error) {
    console.error(`Live Auth verification failed during ${phase}.`);
    if (typeof error.actual === 'number' && typeof error.expected === 'number') console.error(`HTTP/status check: expected ${error.expected}, received ${error.actual}.`);
    throw error;
  } finally {
    let cleanupFailed = false;
    if (users.length) {
      try { await database.query('DELETE FROM game."Player" WHERE "authId" = ANY($1::uuid[])', [users]); }
      catch { cleanupFailed = true; }
      for (const id of users) {
        const result = await admin.auth.admin.deleteUser(id);
        if (result.error) cleanupFailed = true;
      }
    }
    await database.end();
    tokens.length = 0;
    if (cleanupFailed) throw new Error('Temporary authentication data cleanup requires attention');
    console.log('Temporary Auth users and Player profiles removed. No credentials or tokens printed.');
  }
}

if (isMain(import.meta.url)) await run(verifyLiveAuth);
