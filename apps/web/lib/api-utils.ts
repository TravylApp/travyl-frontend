import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'

// ─── Shared Supabase client for API routes ──────────────────

export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
export const supabaseKey = (
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
)!

export function getSupabase() {
  return createClient(supabaseUrl, supabaseKey)
}

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
        supabaseUrl,
        supabaseKey,
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
    const isPost = req.method === 'POST'
    const fetchOpts: RequestInit = { headers }
    if (isPost) {
      fetchOpts.method = 'POST'
      headers['Content-Type'] = 'application/json'
      fetchOpts.body = await req.text()
    }

    const res = await fetch(url.toString(), fetchOpts)

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
 * Returns true when `hostname` exactly matches `allowed` or is a subdomain
 * of it. Avoids the substring-match footgun where `evilgotravyl.com` or
 * `gotravyl.com.attacker.test` would slip through `.includes()`.
 */
function hostnameMatches(hostname: string, allowed: string): boolean {
  if (!hostname || !allowed) return false
  if (hostname === allowed) return true
  // Subdomain match: hostname must end with `.${allowed}` (note the leading dot)
  return hostname.endsWith(`.${allowed}`)
}

/**
 * Parse origin/referer header and return the hostname, or null if invalid.
 */
function parseSourceHostname(source: string): string | null {
  if (!source) return null
  try {
    return new URL(source).hostname.toLowerCase()
  } catch {
    return null
  }
}

/**
 * Verify the request comes from our own domain.
 * Returns null if OK, or a 403 NextResponse if blocked.
 */
export function checkOrigin(req: NextRequest): NextResponse | null {
  if (IS_DEV) return null // Allow in development

  const origin = req.headers.get('origin') || ''
  const referer = req.headers.get('referer') || ''
  const host = req.headers.get('host') || ''

  // No origin/referer on mutation methods = likely CSRF (block unless auth present)
  const method = req.method.toUpperCase()
  if (!origin && !referer && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    // Allow if a valid Supabase session token is present (API calls from mobile SDK, etc.)
    const auth = req.headers.get('authorization')
    if (!auth) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  } else if (!origin && !referer) {
    return null // GET/HEAD from server-to-server (OK)
  }

  const source = origin || referer
  const sourceHost = parseSourceHostname(source)
  if (!sourceHost) {
    // Unparseable source URL — reject
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Allow localhost (Expo dev, mobile simulators)
  if (sourceHost === 'localhost' || sourceHost === '127.0.0.1') return null

  // host header is just a hostname (or hostname:port) — strip the port.
  const hostName = host.split(':')[0].toLowerCase()
  if (hostName && hostnameMatches(sourceHost, hostName)) return null

  // Allow known domains and their subdomains. Exact-match prevents
  // attacker domains like `evilgotravyl.com` or `x.amplifyapp.com.evil.test`
  // from passing.
  const allowed = ['gotravyl.com', 'deeviaje.com', 'amplifyapp.com']
  if (allowed.some(d => hostnameMatches(sourceHost, d))) return null

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

/** Standard error payload returned by all API routes. */
export interface ApiError {
  error: string
}

/** Return a JSON error response with a message and HTTP status code.
 */
export function errorResponse(message: string, status: number = 500): NextResponse {
  return NextResponse.json({ error: message }, { status })
}

/** Return a JSON success response, optionally with Cache-Control headers. */
export function jsonResponse<T>(data: T, cacheSeconds?: number): NextResponse<T> {
  const headers: HeadersInit = cacheSeconds
    ? { 'Cache-Control': `public, s-maxage=${cacheSeconds}, stale-while-revalidate=86400` }
    : {}
  return NextResponse.json(data, { headers })
}

/**
 * Read a required query parameter or throw a descriptive error string.
 * Use inside a try/catch that calls `errorResponse`.
 */
export function requireParam(
  params: URLSearchParams,
  name: string,
  hint?: string
): string {
  const value = params.get(name)
  if (!value) {
    const msg = hint ? `Missing ${name} parameter (${hint})` : `Missing ${name} parameter`
    throw new MissingParamError(msg)
  }
  return value
}

/** Sentinel error thrown by `requireParam` so routes can distinguish it from upstream failures. */
export class MissingParamError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MissingParamError'
  }
}
