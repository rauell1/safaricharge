import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Exact public paths or path prefixes that do NOT require authentication.
const PUBLIC_EXACT: Set<string> = new Set(['/', '/login', '/landing'])
const PUBLIC_PREFIXES: string[] = ['/auth/', '/api/', '/forgot-password', '/signup']

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

export async function proxy(request: NextRequest) {
  const middlewareStart = Date.now()
  const { pathname } = request.nextUrl
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
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    loginUrl.searchParams.set('reason', 'session_expired')
    const response = NextResponse.redirect(loginUrl)
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

  if (sessionError || !session?.user) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    const response = NextResponse.redirect(loginUrl)
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

    if (error || !user) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('next', pathname)
      const response = NextResponse.redirect(loginUrl)
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