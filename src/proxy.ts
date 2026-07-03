import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Exact public paths or path prefixes that do NOT require authentication.
const PUBLIC_EXACT: Set<string> = new Set([
  '/',
  '/landing',
  '/pricing',
  '/sitemap.xml',
  '/robots.txt',
  '/opengraph-image',
  '/BingSiteAuth.xml',
  '/googlee69e3a7319b06c7f.html',
])
const PUBLIC_PREFIXES: string[] = ['/auth/']
const API_PUBLIC_PREFIXES: string[] = [
  '/api/health',
  '/api/admin/',
  '/api/component-library',
  '/api/battery-modules',
  '/api/irradiance-presets',
  '/api/locations',
]

const SESSION_TTL_MS = 60 * 60 * 1000       // 1 hour inactivity → force re-login
const SESSION_COOKIE_MAX_AGE = 8 * 60 * 60  // Cookie outlives TTL so the value-check fires on return
const SESSION_TOUCH_COOKIE = 'sc_last_seen'
const ONBOARDING_COOKIE = 'sc_onboarded'
// Routes that authenticated users may visit before completing onboarding
const ONBOARDING_EXEMPT = new Set(['/onboarding', '/site-setup'])
const AUTH_VALIDATED_AT_COOKIE = 'sc_auth_checked_at'
const AUTH_VALIDATION_WINDOW_MS = Number(process.env.AUTH_VALIDATION_WINDOW_MS ?? 60_000)
const AUTH_TIMING_DEBUG = process.env.AUTH_TIMING_DEBUG === '1'

function withTimingHeaders(response: NextResponse, metrics: Record<string, number>) {
  const entries = Object.entries(metrics)
  if (entries.length === 0) return response

  response.headers.set(
    'Server-Timing',
    entries.map(([name, duration]) => `${name};dur=${duration.toFixed(1)}`).join(', ')
  )
  if (typeof metrics.total === 'number') {
    response.headers.set('x-auth-middleware-ms', metrics.total.toFixed(1))
  }

  return response
}

function redirectWithCookies(request: NextRequest, toPath: string, supabaseResponse: NextResponse) {
  const response = NextResponse.redirect(new URL(toPath, request.url))
  // Copy cookies from supabaseResponse to the redirect response
  supabaseResponse.cookies.getAll().forEach((cookie) => {
    response.cookies.set(cookie.name, cookie.value, {
      path: cookie.path,
      domain: cookie.domain,
      maxAge: cookie.maxAge,
      secure: cookie.secure,
      httpOnly: cookie.httpOnly,
      sameSite: cookie.sameSite,
    } as any)
  })
  return response
}

function isPublic(pathname: string): boolean {
  if (PUBLIC_EXACT.has(pathname)) return true
  return PUBLIC_PREFIXES.some(p => pathname.startsWith(p))
}

function isPublicApi(pathname: string): boolean {
  return API_PUBLIC_PREFIXES.some(p => pathname.startsWith(p))
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Dev-only bypass: `next dev` sets NODE_ENV to 'development'; production
  // builds (Vercel) always run with NODE_ENV 'production', so this branch is
  // unreachable in prod. Lets local development test authed pages without a
  // live session.
  if (process.env.NODE_ENV === 'development') {
    return NextResponse.next()
  }

  const middlewareStart = Date.now()
  const isApiRoute = pathname.startsWith('/api/')
  const isAuthRoute = pathname.startsWith('/auth/')

  if (isApiRoute || isAuthRoute) {
    const requestId = crypto.randomUUID()
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-request-id', requestId)

    if (isAuthRoute || isPublicApi(pathname)) {
      const response = NextResponse.next({ request: { headers: requestHeaders } })
      response.headers.set('x-request-id', requestId)
      return response
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Server misconfiguration.' },
        { status: 500, headers: { 'x-request-id': requestId } }
      )
    }

    const response = NextResponse.next({ request: { headers: requestHeaders } })
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    })
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()
    if (error || !user || user.email?.toLowerCase() !== 'royokola3@gmail.com') {
      return NextResponse.json(
        { error: 'Authentication required.' },
        { status: 401, headers: { 'x-request-id': requestId } }
      )
    }

    response.headers.set('x-user-id', user.id)
    response.headers.set('x-request-id', requestId)
    return response
  }

  if (isPublic(pathname)) return NextResponse.next()

  // ── Session TTL check (cookie-only, zero network cost) ──────────────────
  // Do this BEFORE the Supabase getUser() call. If the session has expired
  // we can redirect immediately without making any network request at all.
  const now = Date.now()
  const ttlCheckStart = Date.now()
  const lastSeen = Number(request.cookies.get(SESSION_TOUCH_COOKIE)?.value || '0')
  // A missing cookie is expected right after fresh sign-in. Treat only a
  // present-but-stale cookie as expired.
  const isExpired = lastSeen > 0 && now - lastSeen > SESSION_TTL_MS
  const ttlCheckMs = Date.now() - ttlCheckStart

  if (isExpired) {
    // If the user is visiting the login or signup page, do not redirect them to landing.
    // Instead, just clear the expired session cookies and allow them to proceed.
    if (pathname === '/login' || pathname === '/signup') {
      const response = NextResponse.next()
      response.cookies.delete(SESSION_TOUCH_COOKIE)
      response.cookies.delete(ONBOARDING_COOKIE)
      request.cookies.getAll()
        .filter(c => c.name.startsWith('sb-'))
        .forEach(c => response.cookies.delete(c.name))
      return response
    }

    const response = NextResponse.redirect(new URL('/landing?reason=session_expired', request.url))
    response.cookies.delete(SESSION_TOUCH_COOKIE)
    response.cookies.delete(ONBOARDING_COOKIE)
    // Delete Supabase auth cookies so the Supabase session cannot be reused
    // after our TTL expires - prevents a bypass via direct URL navigation.
    request.cookies.getAll()
      .filter(c => c.name.startsWith('sb-'))
      .forEach(c => response.cookies.delete(c.name))
    const totalMs = Date.now() - middlewareStart
    if (AUTH_TIMING_DEBUG) {
      console.info(`[auth-timing][middleware] expired_session ttl=${ttlCheckMs}ms total=${totalMs}ms path=${pathname}`)
    }
    return withTimingHeaders(response, {
      ttl_check: ttlCheckMs,
      total: totalMs,
    })
  }

  // ── Single Supabase getUser() call ───────────────────────────────────────
  // Called only when the TTL cookie is present and valid. We use getSession()
  // every request (cookie-backed, typically cheap) and only perform remote
  // getUser() validation periodically to reduce auth latency.
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

  const getSessionStart = Date.now()
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  const getSessionMs = Date.now() - getSessionStart

  if (session?.user && session.user.email?.toLowerCase() !== 'royokola3@gmail.com') {
    const response = pathname === '/login' || pathname === '/signup'
      ? supabaseResponse
      : redirectWithCookies(request, `/login?error=auth_failed`, supabaseResponse)
    response.cookies.delete(SESSION_TOUCH_COOKIE)
    response.cookies.delete(ONBOARDING_COOKIE)
    response.cookies.delete(AUTH_VALIDATED_AT_COOKIE)
    request.cookies.getAll()
      .filter(c => c.name.startsWith('sb-'))
      .forEach(c => response.cookies.delete(c.name))
    return response
  }

  if (sessionError || !session?.user || !session.user.email_confirmed_at) {
    if (pathname === '/login' || pathname === '/signup') {
      return supabaseResponse
    }
    const response = redirectWithCookies(request, `/login?next=${encodeURIComponent(pathname)}`, supabaseResponse)
    const totalMs = Date.now() - middlewareStart
    if (AUTH_TIMING_DEBUG) {
      console.info(`[auth-timing][middleware] unauthenticated get_session=${getSessionMs}ms total=${totalMs}ms path=${pathname}`)
    }
    return withTimingHeaders(response, {
      ttl_check: ttlCheckMs,
      supabase_get_session: getSessionMs,
      total: totalMs,
    })
  }

  const lastValidatedAt = Number(request.cookies.get(AUTH_VALIDATED_AT_COOKIE)?.value || '0')
  const needsServerValidation =
    !lastValidatedAt ||
    now - lastValidatedAt > AUTH_VALIDATION_WINDOW_MS

  let getUserMs = 0
  let currentUser = session.user
  if (needsServerValidation) {
    // getUser() performs remote JWT validation with Supabase.
    const getUserStart = Date.now()
    const { data: { user }, error } = await supabase.auth.getUser()
    getUserMs = Date.now() - getUserStart

    if (error || !user || !user.email_confirmed_at) {
      if (pathname === '/login' || pathname === '/signup') {
        return supabaseResponse
      }
      const response = redirectWithCookies(request, `/login?next=${encodeURIComponent(pathname)}`, supabaseResponse)
      const totalMs = Date.now() - middlewareStart
      if (AUTH_TIMING_DEBUG) {
        console.info(`[auth-timing][middleware] invalid_user get_session=${getSessionMs}ms get_user=${getUserMs}ms total=${totalMs}ms path=${pathname}`)
      }
      return withTimingHeaders(response, {
        ttl_check: ttlCheckMs,
        supabase_get_session: getSessionMs,
        supabase_get_user: getUserMs,
        total: totalMs,
      })
    }
    currentUser = user
    supabaseResponse.cookies.set(AUTH_VALIDATED_AT_COOKIE, String(now), {
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
      path: '/',
      maxAge: Math.max(30, Math.floor(AUTH_VALIDATION_WINDOW_MS / 1000)),
    })
  }

  // Enforce role-based dashboard access
  const adminEmail = process.env.ADMIN_EMAIL || ''
  const adminEmailsEnv = process.env.ADMIN_EMAILS || adminEmail
  const adminEmails = adminEmailsEnv.split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
  const isAdmin = currentUser.email && adminEmails.includes(currentUser.email.toLowerCase())

  if (pathname === '/login' || pathname === '/signup' || pathname === '/landing') {
    return redirectWithCookies(request, isAdmin ? '/admin' : '/dashboard', supabaseResponse)
  }

  // Enforce onboarding: non-admin users must have a complete profile before
  // accessing any protected route. The cookie is set by /api/profile (GET + POST).
  // ONBOARDING_EXEMPT paths are allowed through so users can complete the flow.
  if (!isAdmin && !request.cookies.get(ONBOARDING_COOKIE)?.value && !ONBOARDING_EXEMPT.has(pathname)) {
    return redirectWithCookies(request, '/onboarding', supabaseResponse)
  }

  if (pathname.startsWith('/admin')) {
    if (!isAdmin) {
      return redirectWithCookies(request, '/dashboard', supabaseResponse)
    }
  }

  // Touch the TTL cookie so active users never get logged out mid-session.
  // maxAge is longer than SESSION_TTL_MS so the cookie is still present when
  // the user returns after inactivity - allowing the value check to fire.
  supabaseResponse.cookies.set(SESSION_TOUCH_COOKIE, String(now), {
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    path: '/',
    maxAge: SESSION_COOKIE_MAX_AGE,
  })

  const totalMs = Date.now() - middlewareStart
  if (AUTH_TIMING_DEBUG) {
    if (needsServerValidation) {
      console.info(`[auth-timing][middleware] ok get_session=${getSessionMs}ms get_user=${getUserMs}ms total=${totalMs}ms path=${pathname}`)
    } else {
      console.info(`[auth-timing][middleware] ok get_session=${getSessionMs}ms validation=skipped total=${totalMs}ms path=${pathname}`)
    }
  }

  return withTimingHeaders(
    supabaseResponse,
    needsServerValidation
      ? {
          ttl_check: ttlCheckMs,
          supabase_get_session: getSessionMs,
          supabase_get_user: getUserMs,
          total: totalMs,
        }
      : {
          ttl_check: ttlCheckMs,
          supabase_get_session: getSessionMs,
          total: totalMs,
        }
  )
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|xml|txt|html)$).*)',
  ],
}