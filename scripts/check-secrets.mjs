import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(new URL('../apps/api/package.json', import.meta.url));
const { parse } = require('dotenv');
const serverConfigurations = [process.env];
for (const file of ['apps/api/.env', 'apps/api/.env.migrations', 'deployment/supabase/.env']) {
  const path = join(root, file);
  if (existsSync(path)) serverConfigurations.push(parse(readFileSync(path, 'utf8')));
}
const secretKeys = ['DATABASE_URL', 'DIRECT_URL', 'SHADOW_DATABASE_URL', 'SUPABASE_DB_ADMIN_URL', 'SUPABASE_SECRET_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'PONDBOUND_API_PASSWORD', 'PONDBOUND_MIGRATOR_PASSWORD', 'SERVER_ONLY_SECRET_CANARY'];
const secrets = new Set(serverConfigurations.flatMap(values => secretKeys.map(key => values[key])).filter(value => typeof value === 'string' && value.length >= 12));
for (const values of serverConfigurations) {
  for (const key of ['DATABASE_URL', 'DIRECT_URL', 'SHADOW_DATABASE_URL', 'SUPABASE_DB_ADMIN_URL']) {
    if (!values[key]) continue;
    const url = new URL(values[key]);
    for (const value of [url.password, decodeURIComponent(url.password)]) if (value.length >= 12) secrets.add(value);
  }
}

const failures = new Set();
const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean);
for (const file of files) {
  if (/(^|\/)\.env($|\.)/.test(file) && !file.endsWith('.example')) failures.add(`Environment file included in source: ${file}`);
  const path = join(root, file);
  if (!existsSync(path)) continue;
  const source = readFileSync(path, 'utf8');
  if ([...secrets].some(value => source.includes(value))) failures.add(`Server-only value found in source: ${file}`);
}

// Vite exposes VITE_* values to the browser. Detect misplaced credentials even
// when they have been given the publishable-key variable's name.
const browserConfigurations = [process.env];
for (const file of ['apps/web/.env', 'apps/web/.env.local', 'apps/web/.env.production', 'apps/web/.env.production.local']) {
  const path = join(root, file);
  if (existsSync(path)) {
    const browserValues = parse(readFileSync(path, 'utf8'));
    for (const key of secretKeys) if (browserValues[key]) failures.add(`Server-only credential stored in browser environment: ${key}`);
    browserConfigurations.push(browserValues);
  }
}
for (const [key, value] of browserConfigurations.flatMap(values => Object.entries(values))) {
  if (!key.startsWith('VITE_') || !value) continue;
  let serverRole = false;
  try { serverRole = JSON.parse(Buffer.from(value.split('.')[1] ?? '', 'base64url').toString()).role === 'service_role'; } catch { /* Non-JWT public keys are valid. */ }
  if (/SECRET|PASSWORD|DATABASE_URL|DIRECT_URL|SERVICE_ROLE/.test(key) || value.startsWith('sb_secret_') || serverRole || [...secrets].some(secret => value.includes(secret))) {
    failures.add(`Server-only credential assigned to browser variable: ${key}`);
  }
}

function scanBuild(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) scanBuild(path);
    else if ([...secrets].some(value => readFileSync(path, 'utf8').includes(value))) failures.add('Server-only value found in browser build');
  }
}
const output = join(root, 'apps/web/dist');
if (!existsSync(output)) failures.add('Browser build is missing; run pnpm build before check:secrets');
else scanBuild(output);

if (failures.size) {
  for (const failure of failures) console.error(failure);
  process.exitCode = 1;
} else console.log('Secret boundary checks passed: source, browser environment and browser build.');
