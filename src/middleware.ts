import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Exact public paths or path prefixes that do NOT require authentication.
// IMPORTANT: '/' must be listed as an exact match only — do NOT use a
// startsWith check on '/' because every pathname starts with '/'
// which would make all routes public (critical security bug).
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

  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  const now = Date.now()
  const lastSeen = Number(request.cookies.get(SESSION_TOUCH_COOKIE)?.value || '0')
  const isExpired = !lastSeen || now - lastSeen > SESSION_TTL_MS

  if (isExpired) {
    await supabase.auth.signOut()
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    loginUrl.searchParams.set('reason', 'session_expired')
    const response = NextResponse.redirect(loginUrl)
    response.cookies.delete(SESSION_TOUCH_COOKIE)
    return response
  }

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
