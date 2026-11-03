import { readFileSync } from 'node:fs';
import type { PoolConfig } from 'pg';
import type { z } from 'zod';
import type { databaseSettingsSchema } from '../config/database-environment.js';

export function createPoolConfig(settings: z.infer<typeof databaseSettingsSchema>): PoolConfig {
  if (!settings.DATABASE_URL) throw new Error('DATABASE_URL is not configured');
  const url = new URL(settings.DATABASE_URL);
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  const tls =
    !local ||
    ['require', 'verify-ca', 'verify-full'].includes(url.searchParams.get('sslmode') ?? '');
  // node-postgres URL SSL options can override the explicit ssl object. Keep one authority.
  for (const key of [
    'sslmode',
    'sslrootcert',
    'sslcert',
    'sslkey',
    'sslpassword',
    'schema',
    'pgbouncer',
  ])
    url.searchParams.delete(key);
  return {
    connectionString: url.toString(),
    ssl: tls
      ? {
          rejectUnauthorized: true,
          ...(settings.DB_SSL_CA_FILE ? { ca: readFileSync(settings.DB_SSL_CA_FILE, 'utf8') } : {}),
        }
      : false,
    max: settings.DB_POOL_MAX,
    connectionTimeoutMillis: settings.DB_CONNECTION_TIMEOUT_MS,
    idleTimeoutMillis: settings.DB_IDLE_TIMEOUT_MS,
    query_timeout: settings.DB_QUERY_TIMEOUT_MS,
    application_name: 'pondbound-api',
  };
}
