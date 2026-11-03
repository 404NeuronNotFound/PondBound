import { z } from 'zod';

const optionalUrl = z.preprocess(value => value === '' ? undefined : value, z.url().optional());
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  WEB_ORIGIN: z.string().default('http://localhost:5173,http://127.0.0.1:5173')
    .transform(value => value.split(',').map(origin => z.url().parse(origin.trim()))),
  DATABASE_URL: optionalUrl,
});
export function parseEnvironment(input: Record<string, unknown>) { return schema.parse(input); }
export const environment = parseEnvironment(process.env);
