'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

type Plan = 'free' | 'pro' | 'enterprise'

const DEFAULT_PLAN: Plan = 'free'

export function SubscriptionBadge() {
  const router = useRouter()
  const [plan, setPlan] = useState<Plan>(DEFAULT_PLAN)

  useEffect(() => {
    const loadPlan = async () => {
      try {
        const supabase = createClient()
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!session) {
          setPlan(DEFAULT_PLAN)
          return
        }

        const { data, error } = await supabase.from('profiles').select('plan').eq('id', session.user.id).maybeSingle()

        if (error) {
          console.error('Failed to load subscription plan', error)
          setPlan(DEFAULT_PLAN)
          return
        }

        const safePlan = data?.plan
        if (safePlan === 'pro' || safePlan === 'enterprise' || safePlan === 'free') {
          setPlan(safePlan)
        } else {
          setPlan(DEFAULT_PLAN)
        }
      } catch {
        setPlan(DEFAULT_PLAN)
      }
    }

    void loadPlan()
  }, [])

  const { label, style } = useMemo(() => {
    if (plan === 'enterprise') {
      return {
        label: 'Enterprise',
        style: {
          background: 'rgba(245,158,11,0.12)',
          border: '1px solid rgba(245,158,11,0.3)',
          color: '#f59e0b',
        },
      }
    }

    if (plan === 'pro') {
      return {
        label: 'Pro',
        style: {
          background: 'rgba(16,185,129,0.12)',
          border: '1px solid rgba(16,185,129,0.3)',
          color: '#10b981',
        },
      }
    }

    return {
      label: 'Free Plan',
      style: {
        background: 'rgba(148,163,184,0.12)',
        border: '1px solid rgba(148,163,184,0.32)',
        color: '#cbd5e1',
      },
    }
  }, [plan])

  return (
    <button
      type="button"
      className="h-9 rounded-full px-3 text-xs font-semibold"
      style={style}
      onClick={() => {
        if (plan === 'free') {
          router.push('/pricing')
        }
      }}
    >
      {label}
    </button>
  )
}
