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

      // Validate session server-side — never stale
      const { data: { user }, error: userError } = await supabase.auth.getUser()

      if (userError || !user) {
        router.replace('/login')
        return
      }

      // Ensure a profile row exists for this user (fire-and-forget, don't block)
      supabase.from('profiles').upsert(
        {
          id: user.id,
          email: user.email ?? '',
          subscription_status: 'inactive',
          plan: 'free',
        },
        { onConflict: 'id', ignoreDuplicates: true }
      ).then(() => { /* no-op — profile creation is best-effort */ })

      // All authenticated users go straight to the dashboard.
      // Payment / subscription gating will be added later per-feature.
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
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
        Loading dashboard…
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  return <ModularDashboardDemo />
}
