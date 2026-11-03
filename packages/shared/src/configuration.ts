import { z } from 'zod';

export const environmentModeSchema = z.enum(['development', 'test', 'production']);
export type EnvironmentMode = z.infer<typeof environmentModeSchema>;
export const adminOnlyEnvironmentKeys = [
  'DIRECT_URL', 'SHADOW_DATABASE_URL', 'SUPABASE_DB_ADMIN_URL', 'SUPABASE_SECRET_KEY',
  'SUPABASE_SERVICE_ROLE_KEY', 'PONDBOUND_API_PASSWORD', 'PONDBOUND_MIGRATOR_PASSWORD',
] as const;
export const publicEnvironmentKeys = ['VITE_API_URL', 'VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY'] as const;
export const isLoopback = (host: string) => ['localhost', '127.0.0.1', '[::1]'].includes(host);

export const originSchema = z.string().superRefine((value, context) => {
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || url.hostname.includes('*') || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
      context.addIssue({ code: 'custom', message: 'Use an exact HTTP(S) origin without credentials, paths, queries or fragments' });
    }
  } catch { context.addIssue({ code: 'custom', message: 'Use an exact HTTP(S) origin' }); }
}).transform(value => new URL(value).origin);

// Credential classification only; this decoded role is never used for authorization.
export function isServerSupabaseKey(value: string) {
  if (value.startsWith('sb_secret_')) return true;
  try {
    const payload = value.split('.')[1] ?? '';
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))).role === 'service_role';
  } catch { return false; }
}
export const publicSupabaseKeySchema = z.string().min(1).refine(value => !isServerSupabaseKey(value), 'Use a public publishable/anon key');
export const serviceOriginSchema = originSchema.refine(value => new URL(value).protocol === 'https:' || isLoopback(new URL(value).hostname), 'Remote services require HTTPS');

export function parseConfiguration<T extends z.ZodType>(schema: T, input: unknown, label: string): z.output<T> {
  const result = schema.safeParse(input);
  if (!result.success) {
    const keys = [...new Set(result.error.issues.map(issue => String(issue.path[0] ?? 'configuration')))];
    // Do not attach the input, original validation error, or credential values.
    throw new Error(`Invalid ${label} configuration: ${keys.join(', ')}`);
  }
  return result.data;
}

const publicSchema = z.object({
  VITE_API_URL: z.union([z.literal(''), originSchema]).default(''),
  VITE_SUPABASE_URL: z.union([z.literal(''), serviceOriginSchema]).default(''),
  VITE_SUPABASE_PUBLISHABLE_KEY: z.union([z.literal(''), publicSupabaseKeySchema]).default(''),
});
export function parsePublicEnvironment(input: Record<string, unknown>, mode: EnvironmentMode) {
  return parseConfiguration(publicSchema.superRefine((value, context) => {
    if (Boolean(value.VITE_SUPABASE_URL) !== Boolean(value.VITE_SUPABASE_PUBLISHABLE_KEY)) {
      context.addIssue({ code: 'custom', path: ['VITE_SUPABASE_URL'], message: 'Configure the public Supabase pair together' });
    }
    if (mode === 'production') {
      for (const key of ['VITE_API_URL', 'VITE_SUPABASE_URL'] as const) {
        if (value[key] && !value[key].startsWith('https:')) context.addIssue({ code: 'custom', path: [key], message: 'Production origins require HTTPS' });
      }
    }
  }), input, 'public environment');
}
