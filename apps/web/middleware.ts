import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow all trip routes and share token routes without auth
  if (pathname.startsWith('/trip/') || pathname.startsWith('/t/')) {
    return NextResponse.next()
  }

  const res = NextResponse.next()

  // Skip Supabase middleware if credentials are not configured (dev mode)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('your-project')) {
    // Missing Supabase credentials - skip auth checks in development
    return res
  }

  try {
    const supabase = createServerClient(
      supabaseUrl,
      supabaseKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => {
              request.cookies.set(name, value)
            })
            cookiesToSet.forEach(({ name, value, options }) => {
              res.cookies.set(name, value, options)
            })
          },
        },
      }
    )

    // Refresh session tokens
    await supabase.auth.getSession()
  } catch {
    // Supabase auth error — continue without session
  }

  // CRITICAL: any response that touches Supabase auth cookies MUST be marked
  // private + no-store so an upstream CDN (CloudFront, etc.) doesn't cache
  // the Set-Cookie header and serve one user's session to the next visitor.
  res.headers.set('Cache-Control', 'private, no-store, max-age=0, must-revalidate')

  return res
}

export const config = {
  matcher: [
    // Run on all routes except static assets and Next.js internals
    '/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
