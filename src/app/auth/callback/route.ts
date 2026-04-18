import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'

/**
 * IMPORTANT: adminSupabase is intentionally created *inside* the GET handler,
 * not at module scope. Vercel evaluates module-level code during cold-start
 * before env vars are injected, so a module-scope createClient() receives
 * undefined for URL and key — causing every upsert to fail with a 500.
 * Moving it inside the handler guarantees env vars are read at request time.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'
  const safeNext = next.startsWith('/') ? next : '/dashboard'

  if (code) {
    const supabase = await createServerSupabaseClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      // Instantiate inside the handler — always reads live env vars.
      const adminSupabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
      )

      const metadata = data.user.user_metadata ?? {}
      const isOAuth = data.user.app_metadata?.provider !== 'email'

      // Always upsert with service role — never fails due to RLS
      await adminSupabase.from('profiles').upsert(
        {
          id: data.user.id,
          email: data.user.email,
          full_name: metadata.full_name ?? metadata.name ?? null,
          phone: metadata.phone ?? null,
          organization: metadata.organization ?? metadata.work_org ?? null,
          subscription_status: 'inactive',
          plan: 'free',
        },
        { onConflict: 'id', ignoreDuplicates: false }
      )

      // Check if this OAuth user still needs to complete their profile
      if (isOAuth) {
        const { data: profile } = await adminSupabase
          .from('profiles')
          .select('full_name, phone, organization')
          .eq('id', data.user.id)
          .single()

        const needsOnboarding = !profile?.full_name || !profile?.organization
        if (needsOnboarding) {
          const response = NextResponse.redirect(`${origin}/onboarding?next=${encodeURIComponent(safeNext)}`)
          response.cookies.set('sc_last_seen', String(Date.now()), {
            httpOnly: true, sameSite: 'lax', secure: true, path: '/', maxAge: 15 * 60,
          })
          return response
        }
      }

      const response = NextResponse.redirect(`${origin}${safeNext}`)
      response.cookies.set('sc_last_seen', String(Date.now()), {
        httpOnly: true, sameSite: 'lax', secure: true, path: '/', maxAge: 15 * 60,
      })
      return response
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
