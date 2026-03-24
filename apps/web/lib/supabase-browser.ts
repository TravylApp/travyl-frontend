import { createBrowserClient } from '@supabase/ssr'

export function getSupabaseBrowser() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  // Return null if Supabase is not configured (for development without auth)
  if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('your-project') || supabaseUrl === '') {
    return null
  }

  return createBrowserClient(
    supabaseUrl,
    supabaseKey,
  )
}
