import { z } from 'zod';
import { databaseSettingsSchema } from './database-environment.js';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  WEB_ORIGIN: z.string().default('http://localhost:5173,http://127.0.0.1:5173')
    .transform(value => value.split(',').map(origin => z.url().parse(origin.trim()))),
  SUPABASE_URL: z.preprocess(value => value === '' ? undefined : value,
    z.url().refine(value => {
      const url = new URL(value);
      return url.protocol === 'https:' || (url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname));
    }, 'Use HTTPS for Supabase, except on loopback').optional()),
  SUPABASE_PUBLISHABLE_KEY: z.preprocess(value => value === '' ? undefined : value,
    z.string().min(1).refine(value => !value.startsWith('sb_secret_'), 'Use a publishable key for token verification').optional()),
}).extend(databaseSettingsSchema.shape).superRefine((value, context) => {
  if (Boolean(value.SUPABASE_URL) !== Boolean(value.SUPABASE_PUBLISHABLE_KEY)) {
    context.addIssue({ code: 'custom', path: ['SUPABASE_URL'], message: 'Configure the Supabase URL and publishable key together' });
  }
});
export function parseEnvironment(input: Record<string, unknown>) { return schema.parse(input); }
export const environment = parseEnvironment(process.env);
