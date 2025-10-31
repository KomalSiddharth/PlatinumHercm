import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

// Validate URL format
function isValidSupabaseUrl(url: string | undefined): boolean {
  if (!url) return false;
  return url.startsWith('http://') || url.startsWith('https://');
}

let supabaseClient: SupabaseClient | null = null;
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

// Supabase health check function
export async function checkSupabaseHealth() {
  if (!supabaseClient || !configured) {
    return {
      status: 'unconfigured',
      message: 'Supabase credentials not configured',
      configured: false
    };
  }

  try {
    const startTime = Date.now();
    
    // Simple query to test connection and get row count
    const { data, error, count } = await supabaseClient
      .from('users')
      .select('id', { count: 'exact', head: true });
    
    const responseTime = Date.now() - startTime;

    if (error) {
      return {
        status: 'unhealthy',
        message: 'Supabase connection failed',
        error: error.message,
        responseTime: `${responseTime}ms`,
        configured: true
      };
    }

    // Check if approaching limits (warning at 80%)
    const userCount = count || 0;
    const estimatedSizeMB = (userCount * 0.1).toFixed(2); // Rough estimate
    const limitWarning = userCount > 400000; // 80% of 500k row limit

    return {
      status: 'healthy',
      message: 'Supabase backup database operational',
      responseTime: `${responseTime}ms`,
      configured: true,
      stats: {
        totalUsers: userCount,
        estimatedSizeMB: `${estimatedSizeMB} MB`,
        rowLimitWarning: limitWarning ? '⚠️ Approaching 500k row limit' : '✅ Well under limits'
      }
    };
  } catch (error) {
    return {
      status: 'error',
      message: 'Supabase health check failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      configured: true
    };
  }
}
