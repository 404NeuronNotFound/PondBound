import { healthResponseSchema } from '@pondbound/shared';

export async function getHealth(signal?: AbortSignal) {
  const base = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');
  const response = await fetch(`${base}/api/health`, { signal });
  if (!response.ok) throw new Error('The server is unavailable.');
  return healthResponseSchema.parse(await response.json());
}
