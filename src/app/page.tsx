import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'

async function ensureAdminUserExists() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const secretKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY
  const adminEmail = process.env.ADMIN_EMAIL
  const adminPassword = process.env.ADMIN_PASSWORD

  if (!url || !secretKey || !adminEmail || !adminPassword) {
    return
  }

  const adminClient = createClient(url, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  try {
    const { data: { users }, error: listError } = await adminClient.auth.admin.listUsers()
    if (listError) {
      console.error('[RootPage] Failed to list users for admin auto-seed:', listError.message)
      return
    }

    const adminExists = users.some(u => u.email?.toLowerCase() === adminEmail.toLowerCase())
    if (!adminExists) {
      console.log('[RootPage] Auto-creating admin user in Supabase Auth:', adminEmail)
      const { error: createError } = await adminClient.auth.admin.createUser({
        email: adminEmail,
        password: adminPassword,
        email_confirm: true, // Mark as confirmed instantly
      })
      if (createError) {
        console.error('[RootPage] Failed to auto-create admin user:', createError.message)
      } else {
        console.log('[RootPage] Successfully auto-created admin user!')
      }
    }
  } catch (err) {
    console.error('[RootPage] Error during auto-admin check:', err)
  }
}

export default async function RootPage() {
  // Ensure the admin account exists in Supabase Auth
  await ensureAdminUserExists()

  const supabase = await createServerSupabaseClient()
  if (!supabase) {
    redirect('/landing')
  }
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Authenticated users go straight to their dashboard
  if (user && user.email_confirmed_at) {
    redirect('/dashboard')
  }

  // Everyone else sees the landing page
  redirect('/landing')
}
