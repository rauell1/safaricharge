import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'
  const safeNext = next.startsWith('/') ? next : '/dashboard'

  if (code) {
    const supabase = await createServerSupabaseClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      const metadata = data.user.user_metadata ?? {}
      const { error: profileError } = await supabase.from('profiles').upsert(
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

      if (profileError) {
        return NextResponse.redirect(`${origin}/login?error=profile_upsert_failed`)
      }

      const response = NextResponse.redirect(`${origin}${safeNext}`)
      response.cookies.set('sc_last_seen', String(Date.now()), {
        httpOnly: true,
        sameSite: 'lax',
        secure: true,
        path: '/',
        maxAge: 15 * 60,
      })
      return response
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
