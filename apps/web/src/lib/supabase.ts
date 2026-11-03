import { createClient } from '@supabase/supabase-js';
import { publicEnvironment } from './environment';

const url = publicEnvironment.VITE_SUPABASE_URL;
const key = publicEnvironment.VITE_SUPABASE_PUBLISHABLE_KEY;
// Optional until a dedicated Pondbound Supabase project is configured.
export const supabase = url && key ? createClient(url, key) : null;
