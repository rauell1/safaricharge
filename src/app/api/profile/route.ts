import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'

/**
 * POST /api/profile
 * Upserts the authenticated user's own profile row using the service role.
 * Requires a valid session -  the caller's user id is taken from the session,
 * never from the request body, preventing any user from overwriting another.
 */
export async function POST(request: Request) {
  // Verify the caller has a valid session first.
  const supabase = await createServerSupabaseClient()
  if (!supabase) {
    return NextResponse.json(
      { error: 'Server misconfiguration: missing Supabase credentials.' },
      { status: 500 }
    )
  }
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user || user.email?.toLowerCase() !== 'royokola3@gmail.com') {
    return NextResponse.json({ error: 'Unauthorised.' }, { status: 401 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY

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

    // id and email always come from the verified session -  never the body.
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

    const response = NextResponse.json({ ok: true })
    // Mark onboarding complete -  middleware reads this cookie to skip the DB check
    // on every subsequent request.
    response.cookies.set('sc_onboarded', '1', {
      httpOnly: true, sameSite: 'lax', secure: true, path: '/',
      maxAge: 365 * 24 * 60 * 60,
    })
    return response
  } catch (err) {
    console.error('[profile/route] unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * GET /api/profile
 * Retrieves the authenticated user's profile and returns whether they are an admin.
 */
export async function GET() {
  const supabase = await createServerSupabaseClient()
  if (!supabase) {
    return NextResponse.json(
      { error: 'Server misconfiguration: missing Supabase credentials.' },
      { status: 500 }
    )
  }
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user || user.email?.toLowerCase() !== 'royokola3@gmail.com') {
    return NextResponse.json({ error: 'Unauthorised.' }, { status: 401 })
  }

  const adminEmail = process.env.ADMIN_EMAIL || ''
  const adminEmailsEnv = process.env.ADMIN_EMAILS || adminEmail
  const adminEmails = adminEmailsEnv.split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
  const isAdmin = user.email && adminEmails.includes(user.email.toLowerCase())

  // Query profiles to determine whether this user has completed onboarding.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY
  let needsOnboarding = false
  if (supabaseUrl && serviceRoleKey) {
    const adminDb = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const { data: profile } = await adminDb
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single()
    needsOnboarding = !profile?.full_name
  }

  const responseBody = NextResponse.json({
    id: user.id,
    email: user.email,
    isAdmin: !!isAdmin,
    needs_onboarding: needsOnboarding,
  })

  // If onboarding is complete, set the cookie so the middleware doesn't redirect
  // on subsequent requests. This handles existing users who lack the cookie.
  if (!needsOnboarding) {
    responseBody.cookies.set('sc_onboarded', '1', {
      httpOnly: true, sameSite: 'lax', secure: true, path: '/',
      maxAge: 365 * 24 * 60 * 60,
    })
  }
  return responseBody
}
