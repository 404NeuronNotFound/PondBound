import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'dotenv';
import { adminOnlyEnvironmentKeys, environmentModeSchema, parseConfiguration, parsePublicEnvironment, publicEnvironmentKeys } from '@pondbound/shared';

export function loadPublicEnvironment(modeInput: string, directory = fileURLToPath(new URL('../', import.meta.url)), processValues: Record<string, string | undefined> = process.env) {
  const mode = parseConfiguration(environmentModeSchema, modeInput, 'web mode');
  const names = [`.env.${mode}.local`, `.env.${mode}`, ...(mode === 'development' ? ['.env.local', '.env'] : [])];
  const values: Record<string, string> = {};
  const checkPublicNames = (input: Record<string, string | undefined>) => {
    const unknown = Object.keys(input).filter(key => key.startsWith('VITE_') && !publicEnvironmentKeys.some(allowed => allowed === key));
    if (unknown.length) throw new Error(`Unsupported public environment variables: ${unknown.join(', ')}`);
  };
  for (const name of names) {
    const path = join(directory, name);
    if (!existsSync(path)) continue;
    const parsed = parse(readFileSync(path));
    checkPublicNames(parsed);
    const forbidden = ['DATABASE_URL', ...adminOnlyEnvironmentKeys].filter(key => Boolean(parsed[key]));
    if (forbidden.length) throw new Error(`Server credentials are not allowed in ${name}: ${forbidden.join(', ')}`);
    for (const [key, value] of Object.entries(parsed)) if (values[key] === undefined) values[key] = value;
  }
  checkPublicNames(processValues);
  for (const key of publicEnvironmentKeys) if (processValues[key] !== undefined) values[key] = processValues[key];
  // No arbitrary VITE_* variables are exposed. Only this validated public set is defined.
  return parsePublicEnvironment(values, mode);
}
