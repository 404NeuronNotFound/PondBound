import { z } from 'zod';

const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess((value) => (value === '' ? undefined : value), schema.optional());
export const runtimeDatabaseUrl = z.url().superRefine((value, context) => {
  const url = new URL(value);
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) {
    context.addIssue({ code: 'custom', message: 'Use a PostgreSQL URL' });
  }
  let role = '';
  try {
    role = decodeURIComponent(url.username).split('.')[0] ?? '';
  } catch {
    /* Invalid escaping is rejected below. */
  }
  if (role !== 'pondbound_api') {
    context.addIssue({
      code: 'custom',
      message: 'The runtime must use the pondbound_api database role',
    });
  }
  if (
    !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) &&
    ['disable', 'allow', 'prefer', 'no-verify'].includes(url.searchParams.get('sslmode') ?? '')
  ) {
    context.addIssue({
      code: 'custom',
      message: 'Remote database connections require verified TLS',
    });
  }
});

export const databaseSettingsSchema = z.object({
  DATABASE_URL: optional(runtimeDatabaseUrl),
  DB_POOL_MAX: z.coerce.number().int().min(1).max(20).default(5),
  DB_CONNECTION_TIMEOUT_MS: z.coerce.number().int().min(100).max(30000).default(3000),
  DB_QUERY_TIMEOUT_MS: z.coerce.number().int().min(100).max(30000).default(5000),
  DB_IDLE_TIMEOUT_MS: z.coerce.number().int().min(1000).max(300000).default(10000),
  DB_SSL_CA_FILE: optional(z.string().min(1)),
});
