import { isIP } from 'node:net';
import { z } from 'zod';

function trustedNetwork(value: string) {
  const match = /^([^/\s]+)(?:\/(\d{1,3}))?$/.exec(value);
  if (!match?.[1]) return false;
  const family = isIP(match[1]);
  if (!family) return false;
  return (
    match[2] === undefined ||
    (Number(match[2]) >= 1 && Number(match[2]) <= (family === 4 ? 32 : 128))
  );
}

export const securitySettingsSchema = z.object({
  API_RATE_LIMIT: z.coerce.number().int().min(1).max(10000).default(120),
  AUTH_RATE_LIMIT: z.coerce.number().int().min(1).max(10000).default(30),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1000).max(3600000).default(60000),
  TRUSTED_PROXY_CIDRS: z
    .string()
    .default('')
    .transform((value) => (value === '' ? [] : value.split(',').map((item) => item.trim())))
    .pipe(z.array(z.string().refine(trustedNetwork, 'Use explicit trusted proxy IPs/CIDRs'))),
});
