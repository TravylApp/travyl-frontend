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

// ─── Standard error response ─────────────────────────────────

/**
 * Return a JSON error response with a message and HTTP status code.
 */
export function errorResponse(message: string, status: number = 500): NextResponse {
  return NextResponse.json({ error: message }, { status })
}
