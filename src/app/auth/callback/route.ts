import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createHmac } from 'crypto'

const SESSION_MAX_AGE_S = 60 * 60; // 1 hour
const AUTH_VALIDATED_AT_COOKIE = 'sc_auth_checked_at'
const AUTH_VALIDATION_WINDOW_MS = Number(process.env.AUTH_VALIDATION_WINDOW_MS ?? 60_000)

function signToken(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex');
}

function createAdminToken(secret: string): string {
  const payload = `admin:${Date.now()}`;
  const sig = signToken(payload, secret);
  return Buffer.from(`${payload}.${sig}`).toString('base64url');
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'
  const safeNext = next.startsWith('/') ? next : '/dashboard'

  if (code) {
    const supabase = await createServerSupabaseClient()
    if (!supabase) {
      console.error('[auth/callback] Missing Supabase server client')
      return NextResponse.redirect(`${origin}/login?error=missing_credentials`)
    }

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error && data.user) {
      const user = data.user
      const adminEmail = process.env.ADMIN_EMAIL || ''
      const adminEmailsEnv = process.env.ADMIN_EMAILS || adminEmail
      const adminEmails = adminEmailsEnv.split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
      const isAdmin = user.email && adminEmails.includes(user.email.toLowerCase())

      const redirectTarget = isAdmin ? '/admin' : safeNext
      const response = NextResponse.redirect(`${origin}${redirectTarget}`)

      // Touch active session cookies
      response.cookies.set('sc_last_seen', String(Date.now()), {
        httpOnly: true, sameSite: 'lax', secure: true, path: '/', maxAge: 60 * 60,
      })
      response.cookies.set(AUTH_VALIDATED_AT_COOKIE, String(Date.now()), {
        httpOnly: true, sameSite: 'lax', secure: true, path: '/', maxAge: Math.max(30, Math.floor(AUTH_VALIDATION_WINDOW_MS / 1000)),
      })

      // If it is the admin, seed their admin dashboard session cookie instantly
      if (isAdmin) {
        const secret = process.env.ADMIN_SESSION_SECRET
        if (secret) {
          const token = createAdminToken(secret)
          response.cookies.set('sc_admin_token', token, {
            httpOnly: true,
            secure: true,
            sameSite: 'strict',
            path: '/',
            maxAge: SESSION_MAX_AGE_S,
          })
        }
      }

      return response
    }
  }

  // Fallback to login on failure
  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
