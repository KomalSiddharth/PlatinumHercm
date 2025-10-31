import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

// Validate URL format
function isValidSupabaseUrl(url: string | undefined): boolean {
  if (!url) return false;
  return url.startsWith('http://') || url.startsWith('https://');
}

let supabaseClient = null;
let configured = false;

if (supabaseUrl && supabaseAnonKey && isValidSupabaseUrl(supabaseUrl)) {
  try {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    configured = true;
    console.log('[SUPABASE] ✓ Client configured successfully');
  } catch (error) {
    console.error('[SUPABASE] ✗ Failed to create client:', error);
  }
} else {
  console.log('[SUPABASE] Credentials not configured. Backup functionality disabled.');
  console.log('[SUPABASE] Add valid SUPABASE_URL and SUPABASE_ANON_KEY to enable backups.');
}

export const supabase = supabaseClient;
export const isSupabaseConfigured = configured;
