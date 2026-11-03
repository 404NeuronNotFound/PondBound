import { healthResponseSchema, playerProfileResponseSchema } from '@pondbound/shared';
import { publicEnvironment } from './environment';

export async function getHealth(signal?: AbortSignal) {
  const base = publicEnvironment.VITE_API_URL;
  const response = await fetch(`${base}/api/health`, { signal });
  if (!response.ok) throw new Error('The server is unavailable.');
  return healthResponseSchema.parse(await response.json());
}

export class ApiRequestError extends Error {
  constructor(
    public readonly status: number,
    public readonly requestId?: string,
  ) {
    super('The request could not be completed.');
  }
}

export async function initializePlayer(accessToken: string, signal?: AbortSignal) {
  const base = publicEnvironment.VITE_API_URL;
  const response = await fetch(`${base}/api/v1/players/me`, {
    method: 'POST',
    signal,
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: '{}',
  });
  if (!response.ok) {
    const candidate = response.headers.get('x-request-id');
    const requestId =
      candidate && /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(candidate)
        ? candidate
        : undefined;
    throw new ApiRequestError(response.status, requestId);
  }
  return playerProfileResponseSchema.parse(await response.json()).player;
}
