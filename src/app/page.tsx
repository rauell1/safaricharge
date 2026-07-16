import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export default async function RootPage() {
  const supabase = await createServerSupabaseClient()

  if (!supabase) {
    redirect('/landing')
  }

  const { data, error } = await supabase.auth.getClaims()
  if (error || !data?.claims?.sub) {
    redirect('/landing')
  }

  const email = typeof data.claims.email === 'string' ? data.claims.email.toLowerCase() : ''
  const adminEmails = (process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)

  redirect(email && adminEmails.includes(email) ? '/admin' : '/dashboard')
}
