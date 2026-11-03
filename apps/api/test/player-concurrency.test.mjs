import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { PlayersService } from '../dist/modules/players/players.service.js';
import { Prisma } from '../dist/generated/prisma/client.js';

test('simultaneous first-login unique conflicts resolve to the already-created identity', async () => {
  const authId = randomUUID();
  const player = { id: randomUUID(), authId, createdAt: new Date(), updatedAt: new Date() };
  const service = new PlayersService({ prisma: { player: {
    upsert: async () => { throw new Prisma.PrismaClientKnownRequestError('Unique constraint', { code: 'P2002', clientVersion: '7.10.0' }); },
    findUnique: async ({ where }) => { assert.deepEqual(where, { authId }); return player; },
  } } });
  const result = await service.initialize(authId);
  assert.equal(result.player.id, player.id);
  assert.equal(result.player.authId, authId);
});
