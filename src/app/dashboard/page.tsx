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

    const checkAuthAndSubscription = async () => {
      const supabase = createClient()
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()

      if (sessionError || !session) {
        router.replace('/')
        return
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('subscription_status, email')
        .eq('id', session.user.id)
        .maybeSingle()

      if (profileError) {
        router.replace('/')
        return
      }

      if (!profile) {
        const { error: insertError } = await supabase.from('profiles').insert({
          id: session.user.id,
          email: session.user.email ?? '',
          subscription_status: 'inactive',
          plan: 'free',
        })
        if (insertError) {
          router.replace('/')
          return
        }
        router.replace('/pricing')
        return
      }

      if (profile.subscription_status !== 'active') {
        router.replace('/pricing')
        return
      }

      if (mounted) {
        setIsAuthorized(true)
      }
    }

    void checkAuthAndSubscription()

    return () => {
      mounted = false
    }
  }, [router])

  if (!isAuthorized) return null

  return <ModularDashboardDemo />
}
