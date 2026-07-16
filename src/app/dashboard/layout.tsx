import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient()

  // Zero-config development intentionally runs the dashboard with demo data.
  // Production remains closed until an identity provider is configured.
  if (!supabase) {
    if (process.env.NODE_ENV === 'development') return children
    redirect('/landing?error=auth_not_configured')
  }

  const { data, error } = await supabase.auth.getClaims()
  if (error || !data?.claims?.sub) {
    redirect('/login?next=/dashboard')
  }

  return children
}
