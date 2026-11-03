import { expect, it, vi } from 'vitest';
import { initializePlayer } from '../src/lib/api';

it('sends only the session Bearer token, with no client-selected profile identity', async () => {
  const player = {
    id: '72ae44d4-2254-49ed-815f-282355ccad0c',
    authId: 'e662c562-93bd-4eac-ad9f-b60226744543',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ player })));
  vi.stubGlobal('fetch', fetch);
  expect(await initializePlayer('test-access-token')).toEqual(player);
  expect(fetch).toHaveBeenCalledWith(
    '/api/v1/players/me',
    expect.objectContaining({
      method: 'POST',
      headers: { Authorization: 'Bearer test-access-token', 'Content-Type': 'application/json' },
      body: '{}',
    }),
  );
});
