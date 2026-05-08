import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { safeNextPath } from '@/lib/safe-redirect'

// On AWS Amplify (and most CDN+Lambda setups), `request.nextUrl.origin` can
// resolve to the Lambda's internal bind (e.g. `https://localhost:3000`) — the
// proto comes from `x-forwarded-proto` but the host comes from the raw `Host`
// header, which the CDN does NOT rewrite. Trust the forwarded headers from the
// edge instead so OAuth callbacks redirect to the public origin.
function getPublicOrigin(request: NextRequest): string {
  const proto = request.headers.get('x-forwarded-proto') || request.nextUrl.protocol.replace(':', '')
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || request.nextUrl.host
  return `${proto}://${host}`
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const origin = getPublicOrigin(request)
  const code = searchParams.get('code')
  const next = safeNextPath(searchParams.get('next'))

  if (code) {
    const res = NextResponse.redirect(`${origin}${next}`)

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              res.cookies.set(name, value, options)
            })
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return res
    }
  }

  // Auth code exchange failed — redirect to login with error
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
