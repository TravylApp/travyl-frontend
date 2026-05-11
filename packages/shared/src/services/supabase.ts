/**
 * @module supabase
 * Supabase client initialization for the shared package.
 * Provides a lazy-initialized proxy client that can be swapped at runtime via
 * `configureSupabase()`. Web uses a cookie-based client; mobile uses AsyncStorage.
 * All data-fetching functions in `api.ts` consume the `supabase` export from here.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/** Supabase project URL — resolved from EXPO_PUBLIC or NEXT_PUBLIC env vars. */
const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL ??
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  'https://placeholder.supabase.co';

/** Supabase anon/publishable key — resolved from EXPO_PUBLIC or NEXT_PUBLIC env vars. */
const supabasePublishableKey =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  'placeholder';

// Lazy-initialized default client. On web, configureSupabase() replaces this
// before first use, avoiding a duplicate GoTrue instance.
// persistSession OFF by default to prevent auth leaking across users on SSR.
// Web overrides via configureSupabase() with a cookie-based browser client.
// Mobile overrides via configureSupabase() with an AsyncStorage-based client.
let _configuredClient: SupabaseClient | null = null;
let _fallbackClient: SupabaseClient | null = null;

/**
 * Returns the configured client if available, otherwise a fallback.
 * The fallback is session-less (for SSR safety).
 * Once configureSupabase() is called, all future calls return the configured client.
 */
function getDefaultClient(): SupabaseClient {
  if (_configuredClient) return _configuredClient;
  if (!_fallbackClient) {
    _fallbackClient = createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
        storageKey: 'sb-fallback-auth-token',
      },
    });
  }
  return _fallbackClient;
}

/**
 * Shared Supabase client proxy. Lazily resolves to whichever client was last
 * set by `configureSupabase()`, falling back to the default session-less client.
 * Import this in all service modules instead of creating a new client directly.
 */
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    return Reflect.get(getDefaultClient(), prop, receiver);
  },
});

/**
 * Replaces the underlying Supabase client used by the proxy.
 * Must be called once at app startup — before any Supabase query executes.
 * Web calls this with a cookie-based browser client; mobile with an AsyncStorage client.
 * @param client - Fully configured SupabaseClient instance
 */
export function configureSupabase(client: SupabaseClient) {
  _configuredClient = client;
}
