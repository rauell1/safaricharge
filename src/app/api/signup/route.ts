import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * POST /api/signup
 * Server-side signup helper — called when you need a service-role upsert
 * immediately after supabase.auth.signUp() on the client.
 *
 * The login page calls supabase.auth.signUp() directly (client-side Supabase),
 * which is correct. This route exists as a server-side fallback or for
 * server-to-server signup flows (e.g. admin provisioning).
 */
export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('[signup/route] Missing Supabase env vars')
    return NextResponse.json(
      { error: 'Server misconfiguration: missing Supabase credentials.' },
      { status: 500 }
    )
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const { email, password, full_name, phone, organization } = body as Record<string, string>

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return NextResponse.json({ error: 'A valid email address is required.' }, { status: 400 })
  }
  if (!password || typeof password !== 'string' || password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 })
  }

  const adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Create the user via service role (bypasses email confirmation for admin flows)
  const { data, error: createError } = await adminSupabase.auth.admin.createUser({
    email: email.trim().toLowerCase(),
    password,
    user_metadata: {
      full_name: full_name?.trim() ?? null,
      phone: phone?.trim() ?? null,
      organization: organization?.trim() ?? null,
    },
    email_confirm: false, // let Supabase send the confirmation email normally
  })

  if (createError) {
    console.error('[signup/route] createUser error:', createError.message)
    return NextResponse.json({ error: createError.message }, { status: 400 })
  }

  // Pre-create the profile row so the FK is satisfied when the callback fires
  if (data.user) {
    await adminSupabase.from('profiles').upsert(
      {
        id: data.user.id,
        email: data.user.email,
        full_name: full_name?.trim() ?? null,
        phone: phone?.trim() ?? null,
        organization: organization?.trim() ?? null,
        subscription_status: 'inactive',
        plan: 'free',
      },
      { onConflict: 'id', ignoreDuplicates: true }
    )
  }

  return NextResponse.json({ ok: true, userId: data.user?.id })
}
