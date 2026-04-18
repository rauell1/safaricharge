import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Uses the service-role key — runs server-side only, bypasses RLS entirely.
const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { id, email, full_name, phone, organization } = body

    if (!id || !email) {
      return NextResponse.json({ error: 'id and email are required' }, { status: 400 })
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
      console.error('[profile/route] upsert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[profile/route] unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
