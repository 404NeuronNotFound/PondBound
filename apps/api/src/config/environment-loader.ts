import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'dotenv';
import { environmentModeSchema, parseConfiguration } from '@pondbound/shared';

export function loadEnvironment({ directory, environment = process.env }: { directory: string; environment?: Record<string, string | undefined> }) {
  const mode = parseConfiguration(environmentModeSchema, environment.NODE_ENV ?? 'development', 'NODE_ENV');
  const names = [`.env.${mode}.local`, `.env.${mode}`, ...(mode === 'development' ? ['.env.local', '.env'] : [])];
  const loaded: string[] = [];
  for (const name of names) {
    const path = join(directory, name);
    if (!existsSync(path)) continue;
    const values = parse(readFileSync(path));
    if (values.NODE_ENV && values.NODE_ENV !== mode) throw new Error(`NODE_ENV conflicts with selected mode in ${name}`);
    for (const [key, value] of Object.entries(values)) if (environment[key] === undefined) environment[key] = value;
    loaded.push(name);
  }
  environment.NODE_ENV = mode;
  return { mode, loaded };
}
