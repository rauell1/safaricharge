import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * IMPORTANT: createClient is intentionally called *inside* the POST handler,
 * not at module scope. Vercel serverless/edge runtimes can evaluate the module
 * before env vars are injected, causing process.env.SUPABASE_SERVICE_ROLE_KEY
 * to be undefined at bundle time even though it is set in the Vercel dashboard.
 * Moving the call inside the handler guarantees env vars are read at
 * request time, after the runtime has fully initialised.
 */
export async function POST(request: Request) {
  // Instantiate inside the handler — always reads live env vars.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    console.error(
      '[profile/route] Missing env vars:',
      { supabaseUrl: !!supabaseUrl, serviceRoleKey: !!serviceRoleKey }
    )
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
    const { id, email, full_name, phone, organization } = body

    if (!id || !email) {
      return NextResponse.json(
        { error: 'id and email are required' },
        { status: 400 }
      )
    }

    const { error } = await adminSupabase.from('profiles').upsert(
      {
        id,
        email,
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
