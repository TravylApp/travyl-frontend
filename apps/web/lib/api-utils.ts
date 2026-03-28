import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// ─── Parameter extraction + validation ───────────────────────

/**
 * Extract required query parameters from a request.
 * Returns a record of key-value pairs if all are present,
 * or a 400 NextResponse if any are missing.
 */
export function getRequiredParams(
  req: NextRequest,
  ...keys: string[]
): Record<string, string> | NextResponse {
  const params: Record<string, string> = {}
  const missing: string[] = []

  for (const key of keys) {
    const value = req.nextUrl.searchParams.get(key)
    if (!value) {
      missing.push(key)
    } else {
      params[key] = value
    }
  }

  if (missing.length > 0) {
    return NextResponse.json(
      { error: `Missing required parameter${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}` },
      { status: 400 },
    )
  }

  return params
}

/**
 * Extract an optional query parameter, returning a default if absent.
 */
export function getOptionalParam(
  req: NextRequest,
  key: string,
  defaultValue: string,
): string {
  return req.nextUrl.searchParams.get(key) ?? defaultValue
}

// ─── External API fetch with error handling ──────────────────

/**
 * Fetch an external URL and return parsed JSON.
 * If the request fails and a `fallback` is provided, returns the fallback.
 * Otherwise throws the underlying error.
 */
export async function fetchExternal<T>(
  url: string,
  options?: RequestInit & { fallback?: T },
): Promise<T> {
  const { fallback, ...fetchOptions } = options ?? {}

  try {
    const res = await fetch(url, fetchOptions)

    if (!res.ok) {
      if (fallback !== undefined) return fallback
      throw new Error(`External fetch failed: ${res.status} ${res.statusText}`)
    }

    return (await res.json()) as T
  } catch (err) {
    if (fallback !== undefined) return fallback
    throw err
  }
}

// ─── Cache constants ─────────────────────────────────────────

export const CACHE_1H = { next: { revalidate: 3600 } } as const
export const CACHE_24H = { next: { revalidate: 86400 } } as const

// ─── Backend proxy helper ────────────────────────────────────

export const BACKEND_URL = process.env.NEXT_PUBLIC_RECOMMENDATION_API_URL || ''

/**
 * Proxy a request to the backend API.
 * Builds the URL from BACKEND_URL + path + query params,
 * forwards the Authorization header if present,
 * and returns the backend response as a NextResponse.
 */
export async function proxyToBackend(
  path: string,
  req: NextRequest,
  options?: { params?: Record<string, string> },
): Promise<NextResponse> {
  if (!BACKEND_URL) {
    return NextResponse.json(
      { error: 'Backend URL not configured' },
      { status: 503 },
    )
  }

  const url = new URL(path, BACKEND_URL)

  // Append any extra query params
  if (options?.params) {
    for (const [key, value] of Object.entries(options.params)) {
      url.searchParams.set(key, value)
    }
  }

  const headers: HeadersInit = {}
  let auth = req.headers.get('authorization')

  // If no explicit Authorization header, extract the session token from
  // Supabase auth cookies so backend Lambdas can validate the user.
  if (!auth) {
    try {
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!,
        {
          cookies: {
            getAll() { return req.cookies.getAll() },
            setAll() {},
          },
        },
      )
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) {
        auth = `Bearer ${session.access_token}`
      }
    } catch {
      // No session available — continue without auth
    }
  }

  if (auth) {
    headers['Authorization'] = auth
  }

  try {
    const res = await fetch(url.toString(), { headers })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      console.error(`[proxy ${path}] Backend error:`, res.status, body)
      return NextResponse.json(
        { error: 'Backend request failed' },
        { status: res.status },
      )
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (err) {
    console.error(`[proxy ${path}] error:`, err)
    return NextResponse.json(
      { error: 'Backend unavailable' },
      { status: 502 },
    )
  }
}

// ─── Origin check ───────────────────────────────────────────

const IS_DEV = process.env.NODE_ENV === 'development'

/**
 * Verify the request comes from our own domain.
 * Returns null if OK, or a 403 NextResponse if blocked.
 */
export function checkOrigin(req: NextRequest): NextResponse | null {
  if (IS_DEV) return null // Allow in development

  const origin = req.headers.get('origin') || ''
  const referer = req.headers.get('referer') || ''
  const host = req.headers.get('host') || ''

  // No origin header = same-origin or server-to-server (OK)
  if (!origin && !referer) return null

  const source = origin || referer
  if (host && source.includes(host)) return null

  // Allow known domains
  const allowed = ['gotravyl.com', 'deeviaje.com', 'amplifyapp.com']
  if (allowed.some(d => source.includes(d))) return null

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

// ─── Rate limiting ──────────────────────────────────────────

interface RateLimitEntry { count: number; resetAt: number }
const rateLimitStore = new Map<string, RateLimitEntry>()

// Clean up expired entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of rateLimitStore) {
      if (now > entry.resetAt) rateLimitStore.delete(key)
    }
  }, 5 * 60 * 1000)
}

/**
 * Simple in-memory rate limiter by IP.
 * Returns null if OK, or a 429 NextResponse if rate limited.
 * @param req - The incoming request
 * @param key - Namespace for the limit (e.g., 'flights-search')
 * @param maxRequests - Max requests per window
 * @param windowMs - Window duration in milliseconds
 */
export function rateLimit(
  req: NextRequest,
  key: string,
  maxRequests: number,
  windowMs: number,
): NextResponse | null {
  if (IS_DEV) return null

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || 'unknown'
  const storeKey = `${key}:${ip}`
  const now = Date.now()

  const entry = rateLimitStore.get(storeKey)
  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(storeKey, { count: 1, resetAt: now + windowMs })
    return null
  }

  entry.count++
  if (entry.count > maxRequests) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000)
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } },
    )
  }

  return null
}

// ─── Standard error response ─────────────────────────────────

/**
 * Return a JSON error response with a message and HTTP status code.
 */
export function errorResponse(message: string, status: number = 500): NextResponse {
  return NextResponse.json({ error: message }, { status })
}
