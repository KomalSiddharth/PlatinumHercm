import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

function isValidUrl(urlString: string | undefined): boolean {
  if (!urlString) return false;
  try {
    const url = new URL(urlString);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

let supabaseClient: ReturnType<typeof createClient> | null = null;

try {
  if (supabaseUrl && supabaseAnonKey && isValidUrl(supabaseUrl)) {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    console.log('✅ Supabase backup service configured successfully');
  } else {
    console.warn('⚠️ Supabase credentials not found or invalid. Backup service disabled.');
    if (supabaseUrl && !isValidUrl(supabaseUrl)) {
      console.warn(`   Invalid SUPABASE_URL format: ${supabaseUrl}`);
    }
  }
} catch (error: any) {
  console.error('❌ Failed to initialize Supabase client:', error.message);
  supabaseClient = null;
}

export const supabase = supabaseClient;

export function isSupabaseConfigured(): boolean {
  return supabase !== null;
}
