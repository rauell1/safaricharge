'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

type Plan = 'free' | 'pro' | 'enterprise'

const plans = [
  {
    name: 'Free',
    price: 'Free',
    description: 'Self-hosted. Full simulation and optimisation engine.',
    features: [
      'Pyomo MILP dispatcher',
      'Real-time solar dashboard',
      'KPLC tariff engine',
      '1 site',
      'Community support',
    ],
  },
  {
    name: 'Pro',
    price: 'KES 12,000/mo',
    description: 'Multi-site, forecasting, and priority support.',
    cta: 'Upgrade to Pro — KES 12,000/mo',
    features: [
      'Everything in Free',
      'Up to 10 sites',
      'Solar irradiance forecasting',
      'EV smart-charging block',
      'Priority email support',
      'Export KPIs to CSV / PDF',
    ],
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    description: 'On-prem or private cloud, SLA, and custom integrations.',
    features: [
      'Everything in Pro',
      'Unlimited sites',
      'Genset & thermal-load blocks',
      'MPC rolling-horizon control',
      'Dedicated Slack channel',
      'Custom SLA',
    ],
  },
] as const

function planBadgeLabel(plan: Plan) {
  if (plan === 'enterprise') return 'Enterprise'
  if (plan === 'pro') return 'Pro'
  return 'Free Plan'
}

export default function PricingPage() {
  const [plan, setPlan] = useState<Plan | null>(null)

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const supabase = createClient()
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!session) {
          setPlan(null)
          return
        }

        const { data, error } = await supabase.from('profiles').select('plan').eq('id', session.user.id).maybeSingle()

        if (error) {
          console.error('Failed to load pricing subscription status', error)
          setPlan('free')
          return
        }

        const safePlan = data?.plan
        if (safePlan === 'free' || safePlan === 'pro' || safePlan === 'enterprise') {
          setPlan(safePlan)
        } else {
          setPlan('free')
        }
      } catch {
        setPlan(null)
      }
    }

    void loadProfile()
  }, [])

  return (
    <main
      className="min-h-screen px-4 py-14"
      style={{ background: '#03070f', fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      <div className="mx-auto w-full max-w-6xl">
        <h1 className="text-3xl font-bold mb-3" style={{ color: '#f8fafc' }}>
          Upgrade to unlock full access
        </h1>
        <p className="text-sm mb-8" style={{ color: 'rgba(255,255,255,0.7)' }}>
          Choose the plan that fits your site operations.
        </p>

        {plan ? (
          <div
            className="mb-8 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold"
            style={{
              borderColor: 'rgba(16,185,129,0.35)',
              color: '#10b981',
              background: 'rgba(16,185,129,0.08)',
            }}
          >
            Current plan: {planBadgeLabel(plan)}
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-3">
          {plans.map((currentPlan) => (
            <section
              key={currentPlan.name}
              className="rounded-2xl border p-6"
              style={{ borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)' }}
            >
              <h2 className="text-xl font-semibold mb-1" style={{ color: '#f0fdf8' }}>
                {currentPlan.name}
              </h2>
              <p className="text-sm font-medium mb-2" style={{ color: '#10b981' }}>
                {currentPlan.price}
              </p>
              <p className="text-sm mb-4" style={{ color: 'rgba(255,255,255,0.7)' }}>
                {currentPlan.description}
              </p>
              <ul className="space-y-2 mb-5">
                {currentPlan.features.map((feature) => (
                  <li key={feature} className="text-sm" style={{ color: 'rgba(255,255,255,0.75)' }}>
                    • {feature}
                  </li>
                ))}
              </ul>
              {currentPlan.name === 'Pro' ? (
                <button
                  type="button"
                  className="w-full rounded-xl py-2.5 text-sm font-semibold text-white"
                  style={{ background: '#10b981' }}
                >
                  {currentPlan.cta}
                </button>
              ) : null}
            </section>
          ))}
        </div>

        <Link
          href="/dashboard"
          className="inline-block mt-8 text-sm underline"
          style={{ color: 'rgba(255,255,255,0.75)' }}
        >
          Back to dashboard
        </Link>
      </div>
    </main>
  )
}
