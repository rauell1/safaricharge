import { createServerClient } from '@supabase/ssr'
import { randomUUID } from 'crypto'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Exact public paths or path prefixes that do NOT require authentication.
const PUBLIC_EXACT: Set<string> = new Set(['/', '/landing', '/demo', '/pricing'])
const PUBLIC_PREFIXES: string[] = ['/auth/']
const API_PUBLIC_PREFIXES: string[] = [
  '/api/health',
  '/api/admin/',
  '/api/component-library',
  '/api/battery-modules',
  '/api/irradiance-presets',
  '/api/locations',
]

const SESSION_TTL_MS = 60 * 60 * 1000
const SESSION_TOUCH_COOKIE = 'sc_last_seen'
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

function isPublic(pathname: string): boolean {
  if (PUBLIC_EXACT.has(pathname)) return true
  return PUBLIC_PREFIXES.some(p => pathname.startsWith(p))
}

function isPublicApi(pathname: string): boolean {
  return API_PUBLIC_PREFIXES.some(p => pathname.startsWith(p))
}

export async function proxy(request: NextRequest) {
  const middlewareStart = Date.now()
  const { pathname } = request.nextUrl
  const isApiRoute = pathname.startsWith('/api/')
  const isAuthRoute = pathname.startsWith('/auth/')

  if (isApiRoute || isAuthRoute) {
    const requestId = randomUUID()
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
    if (error || !user) {
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
    // No need to call signOut() here — the Supabase session will expire
    // naturally, and calling signOut() from middleware adds a second network
    // round-trip on every expired-session redirect. The client will sign out
    // when it next calls getUser() and receives an invalid session.
    const response = NextResponse.redirect(new URL('/landing', request.url))
    response.cookies.delete(SESSION_TOUCH_COOKIE)
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

  if (sessionError || !session?.user || !session.user.email_confirmed_at) {
    const response = NextResponse.redirect(new URL('/landing', request.url))
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
  if (needsServerValidation) {
    // getUser() performs remote JWT validation with Supabase.
    const getUserStart = Date.now()
    const { data: { user }, error } = await supabase.auth.getUser()
    getUserMs = Date.now() - getUserStart

    if (error || !user || !user.email_confirmed_at) {
      const response = NextResponse.redirect(new URL('/landing', request.url))
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

    supabaseResponse.cookies.set(AUTH_VALIDATED_AT_COOKIE, String(now), {
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
      path: '/',
      maxAge: Math.max(30, Math.floor(AUTH_VALIDATION_WINDOW_MS / 1000)),
    })
  }

  // Touch the TTL cookie so active users never get logged out mid-session.
  supabaseResponse.cookies.set(SESSION_TOUCH_COOKIE, String(now), {
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    path: '/',
    maxAge: 60 * 60,
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
    '/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}