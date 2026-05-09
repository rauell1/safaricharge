import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export default async function RootPage() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Authenticated users go straight to their dashboard
  if (user) {
    redirect('/dashboard')
  }

  // Everyone else sees the landing page
  redirect('/landing')
}
