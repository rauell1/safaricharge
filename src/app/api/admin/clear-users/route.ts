import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const confirm = searchParams.get('confirm')

  if (confirm !== 'true') {
    return NextResponse.json({ error: 'Please append ?confirm=true to the URL to confirm deletion' }, { status: 400 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: 'Supabase URL or Service Role key is missing in production environment.' }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  try {
    const { data: { users }, error } = await supabase.auth.admin.listUsers()
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const log: string[] = []
    log.push(`Found ${users.length} saved accounts in the database.`)

    for (const user of users) {
      log.push(`Deleting user: ${user.email} (${user.id})...`)
      const { error: deleteErr } = await supabase.auth.admin.deleteUser(user.id)
      if (deleteErr) {
        log.push(`Failed to delete user ${user.email}: ${deleteErr.message}`)
      } else {
        log.push(`Successfully deleted ${user.email}.`)
      }
    }

    return NextResponse.json({ success: true, log })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Unexpected error' }, { status: 500 })
  }
}
