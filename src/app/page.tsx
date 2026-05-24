import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { createHmac } from 'crypto'

const SESSION_MAX_AGE_S = 60 * 60; // 1 hour

function signToken(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex');
}

function createAdminToken(secret: string): string {
  const payload = `admin:${Date.now()}`;
  const sig = signToken(payload, secret);
  return Buffer.from(`${payload}.${sig}`).toString('base64url');
}

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

  // Authenticated users
  if (user && user.email_confirmed_at) {
    const adminEmail = process.env.ADMIN_EMAIL || '';
    if (adminEmail && user.email?.toLowerCase() === adminEmail.toLowerCase()) {
      // User is the admin! Write the admin session cookie.
      const secret = process.env.ADMIN_SESSION_SECRET;
      if (secret) {
        const token = createAdminToken(secret);
        const cookieStore = await cookies();
        cookieStore.set('sc_admin_token', token, {
          httpOnly: true,
          secure: true,
          sameSite: 'strict',
          path: '/',
          maxAge: SESSION_MAX_AGE_S,
        });
      }
      redirect('/admin')
    }
    
    // Normal user goes to the standard workspace
    redirect('/dashboard')
  }

  // Everyone else goes to landing
  redirect('/landing')
}
