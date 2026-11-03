import { copyFile, constants } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
for (const [source, target] of [
  ['apps/api/.env.example', 'apps/api/.env'],
  ['apps/web/.env.example', 'apps/web/.env'],
  ['apps/api/.env.migrations.example', 'apps/api/.env.migrations'],
  ['deployment/supabase/.env.example', 'deployment/supabase/.env'],
]) {
  const destination = new URL(target, root);
  try {
    await copyFile(new URL(source, root), destination, constants.COPYFILE_EXCL);
    console.log(`Created ${fileURLToPath(destination)}`);
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
    console.log(`Kept existing ${target}`);
  }
}
console.log('Environment templates ready. Add dedicated project settings locally, then run pnpm dev.');
