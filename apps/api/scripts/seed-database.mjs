import { config } from 'dotenv';
import { databaseClient, isMain, run } from './provisioning-environment.mjs';

export const seedPlayers = Object.freeze([
  { id: '00000000-0000-4000-8000-000000000001', authId: '00000000-0000-4000-9000-000000000001' },
  { id: '00000000-0000-4000-8000-000000000002', authId: '00000000-0000-4000-9000-000000000002' },
]);

export function validateSeedTarget(value, mode = process.env.NODE_ENV) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error('Configure an explicit local migration URL for seeding');
  }
  if (
    mode === 'production' ||
    !['postgres:', 'postgresql:'].includes(url.protocol) ||
    !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) ||
    !/^\/pondbound_(dev|test)_[a-z0-9_]+$/.test(url.pathname) ||
    decodeURIComponent(url.username) !== 'pondbound_migrator' ||
    url.searchParams.get('schema') !== 'game' ||
    [...url.searchParams.keys()].some((key) => key !== 'schema')
  ) {
    throw new Error(
      'Seeds require a disposable loopback pondbound_dev_* or pondbound_test_* database, migration role and non-production mode',
    );
  }
  return url;
}

export async function seedDatabase(client) {
  await client.query('BEGIN');
  try {
    // Serialize repeated seed commands; never alter an existing player's identity.
    await client.query("SELECT pg_advisory_xact_lock(hashtext('pondbound.foundation.seed.v1'))");
    for (const player of seedPlayers) {
      const { rows } = await client.query(
        'SELECT id, "authId" FROM game."Player" WHERE id = $1 OR "authId" = $2',
        [player.id, player.authId],
      );
      if (rows.some((row) => row.id !== player.id || row.authId !== player.authId))
        throw new Error('Seed fixture identity conflicts with existing data');
      if (!rows.length)
        await client.query('INSERT INTO game."Player" (id, "authId") VALUES ($1, $2)', [
          player.id,
          player.authId,
        ]);
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

if (isMain(import.meta.url))
  await run(async () => {
    config({ path: new URL('../.env.migrations', import.meta.url), quiet: true });
    const url = validateSeedTarget(process.env.DIRECT_URL);
    const client = databaseClient(url.toString());
    try {
      await client.connect();
      await seedDatabase(client);
      console.log(
        'Local seed fixtures ready. No Auth users, passwords, wallets or gameplay rewards created.',
      );
    } finally {
      await client.end();
    }
  });
