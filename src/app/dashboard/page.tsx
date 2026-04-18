'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import ModularDashboardDemo from '@/app/demo/page'
import { createClient } from '@/lib/supabase'

export default function DashboardPage() {
  const router = useRouter()
  const [isAuthorized, setIsAuthorized] = useState(false)

  useEffect(() => {
    let mounted = true

    const init = async () => {
      const supabase = createClient()

      // Use getUser() — validates JWT against Supabase server, never returns stale cache
      const { data: { user }, error: userError } = await supabase.auth.getUser()

      if (userError || !user) {
        router.replace('/login')
        return
      }

      // Fetch or create profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('subscription_status, plan')
        .eq('id', user.id)
        .maybeSingle()

      if (profileError) {
        // DB error — still let them in rather than looping
        if (mounted) setIsAuthorized(true)
        return
      }

      if (!profile) {
        // First sign-in: create profile, then let them in
        await supabase.from('profiles').insert({
          id: user.id,
          email: user.email ?? '',
          subscription_status: 'inactive',
          plan: 'free',
        })
        // New users go to pricing to choose a plan,
        // but don't loop — pricing is a one-way trip
        if (mounted) router.replace('/pricing')
        return
      }

      // All authenticated users with an existing profile can use the dashboard.
      // Subscription gating is handled inside the dashboard per-feature,
      // not as a hard redirect that causes loops.
      if (mounted) setIsAuthorized(true)
    }

    void init()
    return () => { mounted = false }
  }, [router])

  if (!isAuthorized) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#03070f',
        color: 'rgba(255,255,255,0.35)',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '14px',
        gap: '10px',
      }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          style={{ animation: 'spin 1s linear infinite' }}>
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
        Loading dashboard…
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  return <ModularDashboardDemo />
}
