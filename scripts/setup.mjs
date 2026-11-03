import { copyFile, constants } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
for (const app of ['api', 'web']) {
  const destination = new URL(`apps/${app}/.env`, root);
  try {
    await copyFile(new URL(`apps/${app}/.env.example`, root), destination, constants.COPYFILE_EXCL);
    console.log(`Created ${fileURLToPath(destination)}`);
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
    console.log(`Kept existing apps/${app}/.env`);
  }
}
console.log('Environment templates ready. Add dedicated project settings locally, then run pnpm dev.');
