import { createClient, SupabaseClient } from '@supabase/supabase-js';

const metaEnv = (import.meta as unknown as { env?: Record<string, string> }).env || {};

const defaultUrl = metaEnv.VITE_SUPABASE_URL || 'https://wlcresxkwvlvyvoqclgn.supabase.co';
const defaultKey = metaEnv.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsY3Jlc3hrd3Zsdnl2b3FjbGduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc3MzIxNjAsImV4cCI6MjEwMzMwODE2MH0.d0bOPcYhdAd4Hl8KKsVDmq69MmwHMValq9bzsanSTK0';

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

