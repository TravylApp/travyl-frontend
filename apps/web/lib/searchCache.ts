// Server-side shared cache for upstream travel-search calls.
//
// Why Supabase, not DynamoDB?
//  - Supabase is already in the stack and provisions instantly.
//  - The win we care about is "don't pay SerpAPI twice for the same trip"
//    — that's about deduplicating identical requests across users/devices,
//    which a single key-value store with TTL handles trivially.
//  - DynamoDB-via-SST is the harder, more correct choice if we ever outgrow
//    Postgres for this; revisit when Supabase row count or write QPS hurts.
//
// Behavior contract:
//  - get() returns null on miss, stale entry, or any error. Never throws.
//  - set() returns void. Never throws. Failed writes are silently swallowed.
//  - Caller MUST be ready to fall through to the upstream API on every call.
//    The cache is opportunistic — never load-bearing.

import { createClient, SupabaseClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey =
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

let client: SupabaseClient | null = null
function getClient(): SupabaseClient | null {
  if (client) return client
  if (!url || !serviceKey) return null
  client = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return client
}

interface CacheRow {
  payload: unknown
  expires_at: string
}

/** Fetch a cached payload by key. Returns null on miss, expiry, or any error. */
export async function getCached<T>(key: string): Promise<T | null> {
  const sb = getClient()
  if (!sb) return null
  try {
    const { data, error } = await sb
      .from('search_cache')
      .select('payload, expires_at')
      .eq('cache_key', key)
      .maybeSingle<CacheRow>()
    if (error || !data) return null
    if (new Date(data.expires_at).getTime() <= Date.now()) return null
    return data.payload as T
  } catch {
    return null
  }
}

/** Write a payload with TTL. Errors swallowed — never breaks the caller. */
export async function setCached(
  key: string,
  payload: unknown,
  ttlSeconds: number,
): Promise<void> {
  const sb = getClient()
  if (!sb) return
  const expires_at = new Date(Date.now() + ttlSeconds * 1000).toISOString()
  try {
    await sb
      .from('search_cache')
      .upsert(
        { cache_key: key, payload, expires_at },
        { onConflict: 'cache_key' },
      )
  } catch {
    // intentionally silent
  }
}

/**
 * Convenience wrapper: look up the cache, fall through to fetcher() on miss,
 * write the result with the given TTL. The fetcher is only called on miss.
 *
 * `cacheable(result)` is an optional gate that decides whether a result is
 * worth caching — e.g., don't cache empty error responses or upstream 4xx
 * payloads we wouldn't want to serve back.
 */
export async function withCache<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>,
  cacheable: (v: T) => boolean = () => true,
): Promise<{ data: T; cacheHit: boolean }> {
  const hit = await getCached<T>(key)
  if (hit !== null) return { data: hit, cacheHit: true }
  const fresh = await fetcher()
  if (cacheable(fresh)) {
    void setCached(key, fresh, ttlSeconds)
  }
  return { data: fresh, cacheHit: false }
}
