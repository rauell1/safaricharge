'use client'

import { useEffect } from 'react'
import ModularDashboardDemo from '@/app/demo/page'
import { createClient } from '@/lib/supabase'

export default function DashboardPage() {
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = createClient()
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!session) {
          window.location.href = '/login'
        }
      } catch {
        window.location.href = '/login'
      }
      // Optionally check subscription:
      // const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
      // if (profile?.subscription_status !== 'active') { window.location.href = '/pricing' }
    }

    void checkAuth()
  }, [])

  return <ModularDashboardDemo />
}
