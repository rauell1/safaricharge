import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'

/**
 * POST /api/profile
 * Upserts the authenticated user's own profile row using the service role.
 * Requires a valid session — the caller's user id is taken from the session,
 * never from the request body, preventing any user from overwriting another.
 */
export async function POST(request: Request) {
  // Verify the caller has a valid session first.
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorised.' }, { status: 401 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('[profile/route] Missing env vars:', { supabaseUrl: !!supabaseUrl, serviceRoleKey: !!serviceRoleKey })
    return NextResponse.json(
      { error: 'Server misconfiguration: missing Supabase credentials.' },
      { status: 500 }
    )
  }

  const adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  try {
    const body = await request.json()
    const { full_name, phone, organization } = body

    // id and email always come from the verified session — never the body.
    const { error } = await adminSupabase.from('profiles').upsert(
      {
        id: user.id,
        email: user.email,
        full_name: full_name ?? null,
        phone: phone ?? null,
        organization: organization ?? null,
        subscription_status: 'inactive',
        plan: 'free',
      },
      { onConflict: 'id', ignoreDuplicates: false }
    )

    if (error) {
      console.error('[profile/route] upsert error:', error.message, error.details)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[profile/route] unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
