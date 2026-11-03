import { z } from 'zod';
import { databaseSettingsSchema } from './database-environment.js';
import { securitySettingsSchema } from './security-environment.js';
import {
  adminOnlyEnvironmentKeys,
  environmentModeSchema,
  originSchema,
  parseConfiguration,
  publicSupabaseKeySchema,
  serviceOriginSchema,
} from '@pondbound/shared';

const schema = z
  .object({
    NODE_ENV: environmentModeSchema.default('development'),
    HOST: z.enum(['127.0.0.1', '0.0.0.0', '::1', '::']).default('127.0.0.1'),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    WEB_ORIGIN: z
      .string()
      .transform((value) => value.split(',').map((origin) => origin.trim()))
      .pipe(z.array(originSchema).min(1))
      .transform((value) => [...new Set(value)])
      .optional(),
    SUPABASE_URL: z.preprocess(
      (value) => (value === '' ? undefined : value),
      serviceOriginSchema.optional(),
    ),
    SUPABASE_PUBLISHABLE_KEY: z.preprocess(
      (value) => (value === '' ? undefined : value),
      publicSupabaseKeySchema.optional(),
    ),
  })
  .extend(databaseSettingsSchema.shape)
  .extend(securitySettingsSchema.shape)
  .superRefine((value, context) => {
    if (Boolean(value.SUPABASE_URL) !== Boolean(value.SUPABASE_PUBLISHABLE_KEY)) {
      context.addIssue({
        code: 'custom',
        path: ['SUPABASE_URL'],
        message: 'Configure the Supabase URL and publishable key together',
      });
    }
    if (value.NODE_ENV === 'production') {
      for (const key of [
        'DATABASE_URL',
        'SUPABASE_URL',
        'SUPABASE_PUBLISHABLE_KEY',
        'WEB_ORIGIN',
      ] as const) {
        if (!value[key])
          context.addIssue({ code: 'custom', path: [key], message: 'Required in production' });
      }
      if (value.WEB_ORIGIN?.some((origin) => !origin.startsWith('https:')))
        context.addIssue({
          code: 'custom',
          path: ['WEB_ORIGIN'],
          message: 'Production web origins require HTTPS',
        });
      if (value.SUPABASE_URL && !value.SUPABASE_URL.startsWith('https:'))
        context.addIssue({
          code: 'custom',
          path: ['SUPABASE_URL'],
          message: 'Production Auth requires HTTPS',
        });
    }
  })
  .transform((value) => ({
    ...value,
    WEB_ORIGIN: value.WEB_ORIGIN ?? ['http://localhost:5173', 'http://127.0.0.1:5173'],
  }));
export function parseEnvironment(input: Record<string, unknown>) {
  const forbidden: string[] = adminOnlyEnvironmentKeys.filter(
    (key) => input[key] !== undefined && input[key] !== '',
  );
  if (input.NODE_ENV === 'production' && input.TEST_DB_ADMIN_URL)
    forbidden.push('TEST_DB_ADMIN_URL');
  if (forbidden.length)
    throw new Error(
      `Administrative credentials are not allowed in the API runtime: ${[...new Set(forbidden)].join(', ')}`,
    );
  return parseConfiguration(schema, input, 'API environment');
}
export const environment = parseEnvironment(process.env);
