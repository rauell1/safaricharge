import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createServerSupabaseClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      const { error: profileError } = await supabase.from('profiles').upsert(
        {
          id: data.user.id,
          email: data.user.email,
          subscription_status: 'inactive',
          plan: 'free',
        },
        // Keep existing rows unchanged on repeat logins.
        { onConflict: 'id', ignoreDuplicates: true }
      )

      if (profileError) {
        return NextResponse.redirect(`${origin}/login?error=profile_upsert_failed`)
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
