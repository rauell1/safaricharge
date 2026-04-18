import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Exact public paths or path prefixes that do NOT require authentication.
const PUBLIC_EXACT: Set<string> = new Set(['/', '/login', '/landing'])
const PUBLIC_PREFIXES: string[] = ['/auth/', '/api/', '/forgot-password', '/signup']

const SESSION_TTL_MS = 15 * 60 * 1000
const SESSION_TOUCH_COOKIE = 'sc_last_seen'

function isPublic(pathname: string): boolean {
  if (PUBLIC_EXACT.has(pathname)) return true
  return PUBLIC_PREFIXES.some(p => pathname.startsWith(p))
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (isPublic(pathname)) return NextResponse.next()

  // ── Session TTL check (cookie-only, zero network cost) ──────────────────
  // Do this BEFORE the Supabase getUser() call. If the session has expired
  // we can redirect immediately without making any network request at all.
  const now = Date.now()
  const lastSeen = Number(request.cookies.get(SESSION_TOUCH_COOKIE)?.value || '0')
  const isExpired = !lastSeen || now - lastSeen > SESSION_TTL_MS

  if (isExpired) {
    // No need to call signOut() here — the Supabase session will expire
    // naturally, and calling signOut() from middleware adds a second network
    // round-trip on every expired-session redirect. The client will sign out
    // when it next calls getUser() and receives an invalid session.
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    loginUrl.searchParams.set('reason', 'session_expired')
    const response = NextResponse.redirect(loginUrl)
    response.cookies.delete(SESSION_TOUCH_COOKIE)
    return response
  }

  // ── Single Supabase getUser() call ───────────────────────────────────────
  // Called only when the TTL cookie is present and valid. Uses getSession()
  // first to avoid an unnecessary network hit when the JWT is still fresh;
  // falls back to getUser() (server-side token validation) only when needed.
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // getUser() makes one network call to validate the JWT with Supabase.
  // This is the only remote call in the hot path.
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Touch the TTL cookie so active users never get logged out mid-session.
  supabaseResponse.cookies.set(SESSION_TOUCH_COOKIE, String(now), {
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    path: '/',
    maxAge: 15 * 60,
  })

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
