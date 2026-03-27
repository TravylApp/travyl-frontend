import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL ??
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  'https://placeholder.supabase.co';

const supabasePublishableKey =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  'placeholder';

// Lazy-initialized default client. On web, configureSupabase() replaces this
// before first use, avoiding a duplicate GoTrue instance.
let _client: SupabaseClient | null = null;

function getDefaultClient(): SupabaseClient {
  if (!_client) {
    _client = createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return _client;
}

// Proxy that lazily resolves to the configured (or default) client.
// This lets `configureSupabase` swap the underlying client before any
// Supabase call happens, preventing duplicate GoTrue auth instances.
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    return Reflect.get(getDefaultClient(), prop, receiver);
  },
});

export function configureSupabase(client: SupabaseClient) {
  _client = client;
}
