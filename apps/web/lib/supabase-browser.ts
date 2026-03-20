import { createBrowserClient } from '@supabase/ssr'

let _instance: ReturnType<typeof createBrowserClient> | null = null

export function getSupabaseBrowser() {
  if (!_instance) {
    _instance = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    )
  }
  return _instance
}
