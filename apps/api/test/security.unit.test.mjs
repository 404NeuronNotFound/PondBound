import assert from 'node:assert/strict';
import { test } from 'node:test';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { JsonLogger, requestContext } from '../dist/observability/json-logger.js';
import { securitySettingsSchema } from '../dist/config/security-environment.js';
import { adminOnlyEnvironmentKeys } from '@pondbound/shared';

test('structured logs allowlist fields, retain async request IDs and omit raw errors/arguments', async () => {
  const lines = [];
  const logger = new JsonLogger((line) => lines.push(JSON.parse(line)));
  const id = '72ae44d4-2254-49ed-815f-282355ccad0c';
  await requestContext.run({ requestId: id }, async () => {
    await Promise.resolve();
    logger.log({
      event: 'request.completed',
      method: 'GET',
      route: '/safe/:id',
      statusCode: 200,
      password: 'PRIVATE_FIELD',
      headers: { authorization: 'PRIVATE_HEADER' },
    });
  });
  logger.error(new Error('PRIVATE_ERROR'), 'PRIVATE_STACK');
  logger.log('Bearer TOKEN_VALUE');
  assert.equal(lines[0].requestId, id);
  assert.equal(lines[0].service, 'pondbound-api');
  assert.equal(lines[2].message, '[redacted]');
  for (const value of [
    'PRIVATE_FIELD',
    'PRIVATE_HEADER',
    'PRIVATE_ERROR',
    'PRIVATE_STACK',
    'TOKEN_VALUE',
  ])
    assert.equal(JSON.stringify(lines).includes(value), false);
});

test('arbitrary text and nested sensitive fields cannot escape through logger messages', () => {
  const lines = [];
  const logger = new JsonLogger((line) => lines.push(JSON.parse(line)));
  for (const message of [
    'UNLABELLED_PRIVATE_VALUE',
    'person@private.example',
    JSON.stringify({ password: 'PRIVATE_PASSWORD', nested: { access_token: 'PRIVATE_TOKEN' } }),
    'Invalid API environment configuration: PRIVATE_CONFIG_VALUE',
  ]) {
    logger.log(message);
    logger.error({
      message,
      headers: { authorization: 'PRIVATE_HEADER' },
      email: 'PRIVATE_EMAIL',
      nested: { password: 'PRIVATE_PASSWORD' },
    });
  }
  for (const line of lines) assert.equal(line.message, '[redacted]');
  assert.equal(JSON.stringify(lines).includes('PRIVATE_'), false);
  logger.log('Nest application successfully started');
  assert.equal(lines.at(-1).message, 'Nest application successfully started');
});

test('security settings reject invalid limits and blanket/invalid proxy trust', () => {
  assert.equal(securitySettingsSchema.parse({}).API_RATE_LIMIT, 120);
  assert.deepEqual(
    securitySettingsSchema.parse({ TRUSTED_PROXY_CIDRS: '127.0.0.1/32,::1/128' })
      .TRUSTED_PROXY_CIDRS,
    ['127.0.0.1/32', '::1/128'],
  );
  for (const input of [
    { API_RATE_LIMIT: 0 },
    { AUTH_RATE_LIMIT: -1 },
    { RATE_LIMIT_WINDOW_MS: 999 },
    ...[
      '*',
      'true',
      '0.0.0.0/0',
      '::/0',
      '127.0.0.1/33',
      '::1/129',
      'localhost',
      '127.0.0.1,,::1',
    ].map((value) => ({ TRUSTED_PROXY_CIDRS: value })),
  ])
    assert.equal(securitySettingsSchema.safeParse(input).success, false);
});

test('startup failures emit sanitized JSON and exit before serving', () => {
  const result = spawnSync(process.execPath, ['dist/main.js'], {
    cwd: fileURLToPath(new URL('../', import.meta.url)),
    encoding: 'utf8',
    timeout: 15000,
    env: {
      ...process.env,
      ...Object.fromEntries(
        [...adminOnlyEnvironmentKeys, 'TEST_DB_ADMIN_URL'].map((key) => [key, '']),
      ),
      NODE_ENV: 'production',
      DATABASE_URL: 'PRIVATE_INVALID_DATABASE_URL',
      SUPABASE_URL: '',
      SUPABASE_PUBLISHABLE_KEY: '',
      WEB_ORIGIN: '',
    },
  });
  assert.equal(result.status, 1);
  assert.equal((result.stdout + result.stderr).includes('PRIVATE_INVALID_DATABASE_URL'), false);
  const record = JSON.parse(result.stdout.trim());
  assert.equal(record.event, 'startup.failed');
  assert.match(record.message, /DATABASE_URL/);
});

test('fatal process hooks log classifications and exit without serializing errors/rejections', () => {
  const modulePath = new URL('../dist/observability/process-guards.js', import.meta.url).href;
  for (const event of ['uncaughtException', 'unhandledRejection']) {
    const code = `import { installFatalHandlers } from ${JSON.stringify(modulePath)}; installFatalHandlers(); process.emit(${JSON.stringify(event)}, new Error('PRIVATE_FATAL_MESSAGE'));`;
    let output;
    try {
      execFileSync(process.execPath, ['--input-type=module', '-e', code], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      assert.fail('Fatal handler must exit');
    } catch (error) {
      assert.equal(error.status, 1);
      output = error.stderr;
    }
    assert.equal(output.includes('PRIVATE_FATAL_MESSAGE'), false);
    assert.equal(JSON.parse(output.trim()).event, 'process.failed');
  }
});
