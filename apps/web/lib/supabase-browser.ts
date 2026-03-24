import { createBrowserClient } from '@supabase/ssr'

export function getSupabaseBrowser() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  if (!url || !key) {
    // During static prerendering (build time), env vars may not be available.
    // Return a placeholder client that will be replaced at runtime.
    return createBrowserClient(
      'https://placeholder.supabase.co',
      'placeholder',
    )
  }

  return createBrowserClient(url, key)
}
