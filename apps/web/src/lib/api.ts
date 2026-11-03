import { healthResponseSchema, playerProfileResponseSchema } from '@pondbound/shared';
import { publicEnvironment } from './environment';

export async function getHealth(signal?: AbortSignal) {
  const base = publicEnvironment.VITE_API_URL;
  const response = await fetch(`${base}/api/health`, { signal });
  if (!response.ok) throw new Error('The server is unavailable.');
  return healthResponseSchema.parse(await response.json());
}

export class ApiRequestError extends Error {
  constructor(public readonly status: number) {
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
  if (!response.ok) throw new ApiRequestError(response.status);
  return playerProfileResponseSchema.parse(await response.json()).player;
}
