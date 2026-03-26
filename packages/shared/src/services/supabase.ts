import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL ??
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const supabasePublishableKey =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  'placeholder';

// Helper function to check if Supabase is properly configured
function isSupabaseConfigured(url?: string, key?: string): boolean {
  if (!url || !key) return false;
  if (url.includes('your-project') || url.includes('placeholder')) return false;
  if (key === 'placeholder' || key === '') return false;
  return true;
}

// Default client (localStorage-based — fine for mobile, overridden for web)
// Only create client if credentials are properly configured
export let supabase: SupabaseClient | null = isSupabaseConfigured(supabaseUrl, supabasePublishableKey)
  ? createClient(supabaseUrl!, supabasePublishableKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export function configureSupabase(client: SupabaseClient) {
  supabase = client;
}
