import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { localStore } from './localStore';

export const isLocalMode = import.meta.env.VITE_ENABLE_DATABASE !== 'true';
export const isSheetsSyncEnabled = import.meta.env.VITE_ENABLE_GOOGLE_SHEETS_SYNC === 'true';
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Database setup must not prevent the independent server login from opening.
let databaseClient: SupabaseClient | undefined;
const getDatabaseClient = () => {
  if (!url || !key) throw new Error('Database connection is enabled. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local.');
  databaseClient ??= createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  return databaseClient;
};
export const supabase: SupabaseClient = isLocalMode ? localStore as unknown as SupabaseClient : new Proxy({} as SupabaseClient, {
  get(_target, property) {
    const client = getDatabaseClient();
    const value = Reflect.get(client, property);
    return typeof value === 'function' ? value.bind(client) : value;
  },
});
