import { environmentModeSchema, parseConfiguration, parsePublicEnvironment } from '@pondbound/shared';

const mode = parseConfiguration(environmentModeSchema, import.meta.env.MODE, 'web mode');
export const publicEnvironment = parsePublicEnvironment({
  VITE_API_URL: import.meta.env.VITE_API_URL,
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  VITE_SUPABASE_PUBLISHABLE_KEY: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
}, mode);
