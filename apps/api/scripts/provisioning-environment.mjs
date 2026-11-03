import { config, parse } from 'dotenv';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { Client } from 'pg';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createPoolConfig } from '../src/database/pool-config.ts';
import { databaseSettingsSchema } from '../src/config/database-environment.ts';

export function loadProvisioningEnvironment() {
  config({ path: new URL('../../../deployment/supabase/.env', import.meta.url), quiet: true });
  return process.env;
}
export function databaseClient(url, environment = process.env) {
  if (!url) throw new Error('A database URL is required');
  const parsed = new URL(url);
  if (!['postgres:', 'postgresql:'].includes(parsed.protocol))
    throw new Error('A PostgreSQL URL is required');
  const defaults = databaseSettingsSchema
    .omit({ DATABASE_URL: true })
    .parse({ DB_SSL_CA_FILE: environment.DB_SSL_CA_FILE });
  return new Client(
    createPoolConfig({ ...defaults, DATABASE_URL: url, DB_QUERY_TIMEOUT_MS: 30000 }),
  );
}
export function isMain(moduleUrl) {
  return Boolean(process.argv[1]) && resolve(process.argv[1]) === fileURLToPath(moduleUrl);
}
export function saveEnvironment(file, values, checkOnly = false) {
  let text = existsSync(file) ? readFileSync(file, 'utf8') : '';
  const existing = parse(text);
  for (const [key, value] of Object.entries(values)) {
    if (!value) continue;
    if (existing[key] && existing[key] !== value)
      throw new Error(`Existing ${key} differs; refusing to replace configured credentials`);
    if (existing[key]) continue;
    const line = `${key}=${JSON.stringify(value)}`;
    const pattern = new RegExp(`^${key}=.*$`, 'm');
    text = pattern.test(text) ? text.replace(pattern, () => line) : `${text}\n${line}\n`;
  }
  if (!checkOnly) writeFileSync(file, text, { encoding: 'utf8', mode: 0o600 });
}
export async function run(operation) {
  try {
    await operation();
  } catch (error) {
    console.error(
      `Infrastructure operation failed${typeof error.code === 'string' ? ` (${error.code})` : ''}. Check the required configuration and database privileges. No credentials were printed.`,
    );
    process.exitCode = 1;
  }
}
