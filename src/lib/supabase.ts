import { createClient, SupabaseClient } from '@supabase/supabase-js';

const metaEnv = (import.meta as unknown as { env?: Record<string, string> }).env || {};

const defaultUrl = metaEnv.VITE_SUPABASE_URL || 'https://kbvriyicbkekxfnjceia.supabase.co';
const defaultKey = metaEnv.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtidnJpeWljYmtla3hmbmpjZWlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxNzQyNDEsImV4cCI6MjA5OTc1MDI0MX0.EHgoexppzpa_RzJ8g65cL0V-1gP7oLdnL8hbBzA0Iec';

let rawStoredKey = localStorage.getItem('sigec_supabase_anon_key');
if (rawStoredKey && !rawStoredKey.startsWith('eyJ')) {
  // Clear non-JWT keys from localStorage so it uses the official anon JWT key
  localStorage.removeItem('sigec_supabase_anon_key');
  rawStoredKey = null;
}

let storedUrl = localStorage.getItem('sigec_supabase_url') || defaultUrl;
let storedKey = rawStoredKey || defaultKey;

export let supabase: SupabaseClient = createClient(storedUrl, storedKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export const getSupabaseConfig = () => ({
  url: storedUrl,
  anonKey: storedKey,
  isPersonalAccessToken: storedKey.startsWith('sbp_'),
  isValidAnonKey: storedKey.startsWith('eyJ') || storedKey.startsWith('sb_publishable_'),
});

export const updateSupabaseCredentials = (url: string, key: string) => {
  const cleanUrl = url.trim();
  const cleanKey = key.trim();
  
  localStorage.setItem('sigec_supabase_url', cleanUrl);
  localStorage.setItem('sigec_supabase_anon_key', cleanKey);
  
  storedUrl = cleanUrl;
  storedKey = cleanKey;

  supabase = createClient(cleanUrl, cleanKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });

  return getSupabaseConfig();
};

