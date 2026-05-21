import { createClient } from '@supabase/supabase-js';

// The Supabase URL and anon/publishable key are PUBLIC by design (they ship in
// the browser bundle and are protected by Row-Level Security). They are kept as
// inline fallbacks so the app works without a committed .env; env vars override.
const FALLBACK_URL = 'https://wzquszbmbpkbhyythdrj.supabase.co';
const FALLBACK_ANON = 'sb_publishable_7sZQXGDGxGl9M7yEl0UXpg_o0JLwp-L';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string) || FALLBACK_URL;
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || FALLBACK_ANON;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
