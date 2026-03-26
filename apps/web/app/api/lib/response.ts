import { NextResponse } from 'next/server'

/** Standard error payload returned by all API routes. */
export interface ApiError {
  error: string
}

/** Return a JSON error response with a consistent shape. */
export function errorResponse(message: string, status: number): NextResponse<ApiError> {
  return NextResponse.json({ error: message }, { status })
}

/** Return a JSON success response, optionally with Cache-Control headers. */
export function jsonResponse<T>(data: T, cacheSeconds?: number): NextResponse<T> {
  const headers: HeadersInit = cacheSeconds
    ? { 'Cache-Control': `public, s-maxage=${cacheSeconds}, stale-while-revalidate=86400` }
    : {}
  return NextResponse.json(data, { headers })
}

/** Standard fetch cache config for Next.js `fetch()` calls. */
export const CACHE_1H = { next: { revalidate: 3600 } } as const
export const CACHE_24H = { next: { revalidate: 86400 } } as const

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
