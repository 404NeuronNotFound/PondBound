import { createClient } from '@supabase/supabase-js';
import { environment } from '../../config/environment.js';

export const AUTH_CLIENT = Symbol('AUTH_CLIENT');
export function createAuthClient() {
  if (!environment.SUPABASE_URL || !environment.SUPABASE_PUBLISHABLE_KEY) return null;
  return createClient(environment.SUPABASE_URL, environment.SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(5000) }),
    },
  });
}
