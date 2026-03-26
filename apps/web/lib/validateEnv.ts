/**
 * Startup environment validation.
 * Import this in the root layout so the app fails loudly
 * when required env vars are missing.
 */

const REQUIRED_PUBLIC = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
] as const

const REQUIRED_SERVER: readonly string[] = []

export function validateEnv() {
  // Only validate on the server
  if (typeof window !== 'undefined') return

  const missing: string[] = []

  for (const key of REQUIRED_PUBLIC) {
    if (!process.env[key]) missing.push(key)
  }
  for (const key of REQUIRED_SERVER) {
    if (!process.env[key]) missing.push(key)
  }

  if (missing.length > 0) {
    console.error(
      `\n❌ Missing required environment variables:\n${missing.map((k) => `   - ${k}`).join('\n')}\n\nSet them via \`sst secret set <Name> <value>\` or in your .env.local for local dev.\n`
    )
  }
}
