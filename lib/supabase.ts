import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { localStore } from './localStore';

const CONFIGURED_SUPABASE_URL = 'https://pzjkgoebjttuxoiopcqu.supabase.co';
const CONFIGURED_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6amtnb2VianR0dXhvaW9wY3F1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0ODY2NDYsImV4cCI6MjA5MTA2MjY0Nn0.284IbEwcWqPp73D3R6B_aVf5ezf26lkPVe3KqrHfjcw';

function cleanSupabaseUrl(url: string): string {
  return url.trim().replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
}

function isValidSupabaseConfig(u: unknown, k: unknown): boolean {
  if (typeof u !== 'string' || typeof k !== 'string') return false;
  const trimmedUrl = cleanSupabaseUrl(u);
  const trimmedKey = k.trim();
  if (!trimmedUrl || !trimmedKey) return false;
  if (
    trimmedUrl === 'your_supabase_project_url' ||
    trimmedKey === 'your_supabase_anon_key' ||
    trimmedUrl.includes('your_supabase_project_url') ||
    trimmedKey.includes('your_supabase_anon_key')
  ) {
    return false;
  }
  try {
    const parsed = new URL(trimmedUrl);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

const getEnv = (key: string): string | undefined => {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env && typeof import.meta.env[key] !== 'undefined') {
      return import.meta.env[key];
    }
  } catch {}
  try {
    if (typeof process !== 'undefined' && process.env && typeof process.env[key] !== 'undefined') {
      return process.env[key];
    }
  } catch {}
  return undefined;
};

// Select configured URL or environment override if valid
const envUrl = getEnv('VITE_SUPABASE_URL');
const envKey = getEnv('VITE_SUPABASE_ANON_KEY');

const targetUrl = isValidSupabaseConfig(envUrl, envKey) ? cleanSupabaseUrl(envUrl!) : CONFIGURED_SUPABASE_URL;
const targetKey = isValidSupabaseConfig(envUrl, envKey) ? envKey!.trim() : CONFIGURED_SUPABASE_KEY;

const hasValidConfig = isValidSupabaseConfig(targetUrl, targetKey);

// If database is disabled explicitly or config is invalid, run local mode; otherwise use live Supabase
export const isLocalMode = getEnv('VITE_ENABLE_DATABASE') === 'false' || !hasValidConfig;
export const isSheetsSyncEnabled = getEnv('VITE_ENABLE_GOOGLE_SHEETS_SYNC') === 'true';

let databaseClient: SupabaseClient | undefined;
const getDatabaseClient = () => {
  if (!hasValidConfig || !targetUrl || !targetKey) {
    return localStore as unknown as SupabaseClient;
  }
  try {
    databaseClient ??= createClient(targetUrl, targetKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    });
    return databaseClient;
  } catch (err) {
    console.warn('Failed to initialize Supabase client, falling back to localStore:', err);
    return localStore as unknown as SupabaseClient;
  }
};

export const supabase: SupabaseClient = isLocalMode ? (localStore as unknown as SupabaseClient) : new Proxy({} as SupabaseClient, {
  get(_target, property) {
    const client = getDatabaseClient();
    const value = Reflect.get(client, property);
    return typeof value === 'function' ? value.bind(client) : value;
  },
});
