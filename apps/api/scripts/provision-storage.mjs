import { createClient } from '@supabase/supabase-js';
import { isMain, loadProvisioningEnvironment, run } from './provisioning-environment.mjs';
import definition from '../../../deployment/supabase/storage.json' with { type: 'json' };

export const bucket = definition;

export async function ensurePrivateBucket(storage) {
  const existing = await storage.getBucket(bucket.id);
  if (existing.error) {
    if (String(existing.error.statusCode) !== '404')
      throw new Error('Storage bucket lookup failed');
    const created = await storage.createBucket(bucket.id, {
      public: bucket.public,
      fileSizeLimit: bucket.fileSizeLimit,
      allowedMimeTypes: bucket.allowedMimeTypes,
    });
    if (created.error) throw new Error('Storage bucket creation failed');
    return 'created';
  }
  const current = existing.data;
  if (
    !current ||
    current.public !== false ||
    Number(current.file_size_limit) !== bucket.fileSizeLimit ||
    JSON.stringify([...(current.allowed_mime_types ?? [])].sort()) !==
      JSON.stringify([...bucket.allowedMimeTypes].sort())
  ) {
    throw new Error(
      'Existing bucket configuration differs; review its access and limits before changing it',
    );
  }
  return 'verified';
}

if (isMain(import.meta.url))
  await run(async () => {
    const environment = loadProvisioningEnvironment();
    if (!environment.SUPABASE_URL || !environment.SUPABASE_SECRET_KEY) {
      console.error(
        'Set SUPABASE_URL and a server-only SUPABASE_SECRET_KEY in deployment/supabase/.env.',
      );
      process.exitCode = 1;
      return;
    }
    const url = new URL(environment.SUPABASE_URL);
    if (url.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(url.hostname))
      throw new Error('Storage requires HTTPS');
    const client = createClient(url.toString(), environment.SUPABASE_SECRET_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(15000) }),
      },
    });
    console.log(`Private Storage bucket ${await ensurePrivateBucket(client.storage)}.`);
  });
