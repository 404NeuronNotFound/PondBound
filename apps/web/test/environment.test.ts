import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { expect, it } from 'vitest';
import { parsePublicEnvironment } from '@pondbound/shared';
import { loadPublicEnvironment } from '../config/environment';

it('validates public origins, paired Auth settings and secret-key rejection', () => {
  for (const values of [
    { VITE_API_URL: 'https://user:PRIVATE_SENTINEL@example.test/path' },
    { VITE_SUPABASE_URL: 'https://identity.example.test' },
    { VITE_SUPABASE_URL: 'https://identity.example.test', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_secret_PRIVATE_SENTINEL' },
    { VITE_API_URL: 'http://localhost:3000' },
  ]) {
    expect(() => parsePublicEnvironment(values, 'production')).toThrow();
    try { parsePublicEnvironment(values, 'production'); } catch (error) { expect(String(error)).not.toContain('PRIVATE_SENTINEL'); }
  }
  expect(parsePublicEnvironment({}, 'production').VITE_SUPABASE_URL).toBe('');
});

it('isolates mode files and exposes only the validated public keys', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'pondbound-web-env-'));
  try {
    await writeFile(join(directory, '.env'), 'VITE_API_URL=http://localhost:3000\n');
    await writeFile(join(directory, '.env.test'), 'VITE_API_URL=http://localhost:3001\n');
    await writeFile(join(directory, '.env.production'), 'VITE_API_URL=https://api.example.test\n');
    expect(loadPublicEnvironment('development', directory, {}).VITE_API_URL).toBe('http://localhost:3000');
    expect(loadPublicEnvironment('test', directory, {}).VITE_API_URL).toBe('http://localhost:3001');
    expect(loadPublicEnvironment('production', directory, {}).VITE_API_URL).toBe('https://api.example.test');
    expect(loadPublicEnvironment('production', directory, { VITE_API_URL: 'https://override.example.test', DATABASE_URL: 'PRIVATE_SENTINEL' }))
      .toEqual({ VITE_API_URL: 'https://override.example.test', VITE_SUPABASE_URL: '', VITE_SUPABASE_PUBLISHABLE_KEY: '' });
    expect(() => loadPublicEnvironment('production', directory, { VITE_SECRET_KEY: 'PRIVATE_SENTINEL' })).toThrow('VITE_SECRET_KEY');
    await writeFile(join(directory, '.env.test.local'), 'SUPABASE_SECRET_KEY=PRIVATE_SENTINEL\n');
    expect(() => loadPublicEnvironment('test', directory, {})).toThrow('SUPABASE_SECRET_KEY');
  } finally {
    expect(dirname(resolve(directory))).toBe(resolve(tmpdir()));
    await rm(directory, { recursive: true, force: true });
  }
});
