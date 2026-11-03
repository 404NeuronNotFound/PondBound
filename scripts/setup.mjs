import { copyFile, constants } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const args = process.argv.slice(2);
if (args.length && (args.length !== 2 || args[0] !== '--mode' || !['development', 'test', 'production'].includes(args[1]))) throw new Error('Use --mode development, test, or production');
const mode = args[1] ?? 'development';
const files = mode === 'development' ? [
  ['apps/api/.env.example', 'apps/api/.env'],
  ['apps/web/.env.example', 'apps/web/.env'],
  ['apps/api/.env.migrations.example', 'apps/api/.env.migrations'],
  ['deployment/supabase/.env.example', 'deployment/supabase/.env'],
] : [
  [`apps/api/.env.${mode}.example`, `apps/api/.env.${mode}`],
  [`apps/web/.env.${mode}.example`, `apps/web/.env.${mode}`],
];
for (const [source, target] of files) {
  const destination = new URL(target, root);
  try {
    await copyFile(new URL(source, root), destination, constants.COPYFILE_EXCL);
    console.log(`Created ${fileURLToPath(destination)}`);
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
    console.log(`Kept existing ${target}`);
  }
}
console.log(`${mode} environment templates ready; existing settings were preserved.`);
