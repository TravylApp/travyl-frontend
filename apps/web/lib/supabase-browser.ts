import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | null = null

export function getSupabaseBrowser(): SupabaseClient {
  if (client) return client

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key || url.includes('your-project') || url === '') {
    // During static prerendering (build time), env vars may not be available.
    // Return a placeholder client that will be replaced at runtime.
    return createBrowserClient(
      'https://placeholder.supabase.co',
      'placeholder',
    )
  }

  client = createBrowserClient(url, key)
  return client
}
