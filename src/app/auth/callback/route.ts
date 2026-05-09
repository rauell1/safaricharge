import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'

const AUTH_TIMING_DEBUG = process.env.AUTH_TIMING_DEBUG === '1'
const AUTH_VALIDATED_AT_COOKIE = 'sc_auth_checked_at'
const AUTH_VALIDATION_WINDOW_MS = Number(process.env.AUTH_VALIDATION_WINDOW_MS ?? 60_000)

function withTimingHeaders(response: NextResponse, metrics: Record<string, number>) {
  const entries = Object.entries(metrics)
  if (entries.length === 0) return response

  response.headers.set(
    'Server-Timing',
    entries.map(([name, duration]) => `${name};dur=${duration.toFixed(1)}`).join(', ')
  )
  if (typeof metrics.total === 'number') {
    response.headers.set('x-auth-callback-ms', metrics.total.toFixed(1))
  }

  return response
}

/**
 * GET /auth/callback
 * Exchanges the OAuth / magic-link code for a session, upserts the profile
 * row with service-role (bypasses RLS), then redirects to the next path.
 *
 * adminSupabase is created inside the handler — not at module scope — so env
 * vars are always read at request time after Vercel has injected them.
 */
export async function GET(request: Request) {
  const callbackStart = Date.now()
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'
  const safeNext = next.startsWith('/') ? next : '/dashboard'

  if (code) {
    const supabase = await createServerSupabaseClient()
    const exchangeStart = Date.now()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    const exchangeMs = Date.now() - exchangeStart

    if (!error && data.user) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

      // Guard against missing env vars — fail gracefully instead of throwing.
      if (!supabaseUrl || !serviceRoleKey) {
        console.error('[auth/callback] Missing Supabase env vars — skipping profile upsert')
        const response = NextResponse.redirect(`${origin}${safeNext}`)
        response.cookies.set('sc_last_seen', String(Date.now()), {
          httpOnly: true, sameSite: 'lax', secure: true, path: '/', maxAge: 60 * 60,
        })
        response.cookies.set(AUTH_VALIDATED_AT_COOKIE, String(Date.now()), {
          httpOnly: true, sameSite: 'lax', secure: true, path: '/', maxAge: Math.max(30, Math.floor(AUTH_VALIDATION_WINDOW_MS / 1000)),
        })
        const totalMs = Date.now() - callbackStart
        if (AUTH_TIMING_DEBUG) {
          console.info(`[auth-timing][callback] exchange=${exchangeMs}ms total=${totalMs}ms reason=missing_env`)
        }
        return withTimingHeaders(response, {
          exchange_code_for_session: exchangeMs,
          total: totalMs,
        })
      }

      const adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })

      const metadata = data.user.user_metadata ?? {}
      const isOAuth = data.user.app_metadata?.provider !== 'email'
      const fullName = (metadata.full_name ?? metadata.name ?? '').toString().trim()
      const phone = (metadata.phone ?? '').toString().trim()
      const organization = (metadata.organization ?? metadata.work_org ?? '').toString().trim()

      const profilePayload: {
        id: string
        email: string | null
        subscription_status: 'inactive'
        plan: 'free'
        full_name?: string
        phone?: string
        organization?: string
      } = {
        id: data.user.id,
        email: data.user.email,
        subscription_status: 'inactive',
        plan: 'free',
      }

      // Only send non-empty values so we never overwrite existing profile
      // fields with null/empty strings during OAuth sign-ins.
      if (fullName) profilePayload.full_name = fullName
      if (phone) profilePayload.phone = phone
      if (organization) profilePayload.organization = organization

      // Single DB round-trip: upsert and return the effective profile fields.
      const profileUpsertStart = Date.now()
      const { data: profileRow, error: profileError } = await adminSupabase
        .from('profiles')
        .upsert(profilePayload, { onConflict: 'id', ignoreDuplicates: false })
        .select('full_name, organization')
        .single()
      const profileUpsertMs = Date.now() - profileUpsertStart

      if (profileError) {
        console.error('[auth/callback] Profile upsert failed:', profileError.message)
      }

      // OAuth users who haven't filled in their profile yet go to onboarding.
      const onboardingCheckStart = Date.now()
      if (isOAuth) {
        const needsOnboarding = profileError
          ? (!fullName || !organization)
          : (!profileRow?.full_name || !profileRow?.organization)

        const onboardingCheckMs = Date.now() - onboardingCheckStart

        if (needsOnboarding) {
          const response = NextResponse.redirect(`${origin}/onboarding?next=${encodeURIComponent(safeNext)}`)
          response.cookies.set('sc_last_seen', String(Date.now()), {
            httpOnly: true, sameSite: 'lax', secure: true, path: '/', maxAge: 60 * 60,
          })
          response.cookies.set(AUTH_VALIDATED_AT_COOKIE, String(Date.now()), {
            httpOnly: true, sameSite: 'lax', secure: true, path: '/', maxAge: Math.max(30, Math.floor(AUTH_VALIDATION_WINDOW_MS / 1000)),
          })
          const totalMs = Date.now() - callbackStart
          if (AUTH_TIMING_DEBUG) {
            console.info(
              `[auth-timing][callback] exchange=${exchangeMs}ms upsert=${profileUpsertMs}ms onboarding_check=${onboardingCheckMs}ms total=${totalMs}ms target=onboarding`
            )
          }
          return withTimingHeaders(response, {
            exchange_code_for_session: exchangeMs,
            profile_upsert: profileUpsertMs,
            onboarding_check: onboardingCheckMs,
            total: totalMs,
          })
        }

        const totalMs = Date.now() - callbackStart
        if (AUTH_TIMING_DEBUG) {
          console.info(
            `[auth-timing][callback] exchange=${exchangeMs}ms upsert=${profileUpsertMs}ms onboarding_check=${onboardingCheckMs}ms total=${totalMs}ms target=next`
          )
        }

        const response = NextResponse.redirect(`${origin}${safeNext}`)
        response.cookies.set('sc_last_seen', String(Date.now()), {
          httpOnly: true, sameSite: 'lax', secure: true, path: '/', maxAge: 60 * 60,
        })
        response.cookies.set(AUTH_VALIDATED_AT_COOKIE, String(Date.now()), {
          httpOnly: true, sameSite: 'lax', secure: true, path: '/', maxAge: Math.max(30, Math.floor(AUTH_VALIDATION_WINDOW_MS / 1000)),
        })
        return withTimingHeaders(response, {
          exchange_code_for_session: exchangeMs,
          profile_upsert: profileUpsertMs,
          onboarding_check: onboardingCheckMs,
          total: totalMs,
        })
      }

      const response = NextResponse.redirect(`${origin}${safeNext}`)
      response.cookies.set('sc_last_seen', String(Date.now()), {
        httpOnly: true, sameSite: 'lax', secure: true, path: '/', maxAge: 60 * 60,
      })
      response.cookies.set(AUTH_VALIDATED_AT_COOKIE, String(Date.now()), {
        httpOnly: true, sameSite: 'lax', secure: true, path: '/', maxAge: Math.max(30, Math.floor(AUTH_VALIDATION_WINDOW_MS / 1000)),
      })
      const totalMs = Date.now() - callbackStart
      if (AUTH_TIMING_DEBUG) {
        console.info(`[auth-timing][callback] exchange=${exchangeMs}ms upsert=${profileUpsertMs}ms total=${totalMs}ms target=next`)
      }
      return withTimingHeaders(response, {
        exchange_code_for_session: exchangeMs,
        profile_upsert: profileUpsertMs,
        total: totalMs,
      })
    }

    if (AUTH_TIMING_DEBUG) {
      console.info(`[auth-timing][callback] exchange_failed exchange=${exchangeMs}ms`)
    }
  }

  const failed = NextResponse.redirect(`${origin}/login?error=auth_failed`)
  const totalMs = Date.now() - callbackStart
  if (AUTH_TIMING_DEBUG) {
    console.info(`[auth-timing][callback] failed total=${totalMs}ms`)
  }
  return withTimingHeaders(failed, { total: totalMs })
}
