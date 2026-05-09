'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Check, ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { BrandLogo } from '@/components/brand-logo'
import { ThemeToggle } from '@/components/theme-toggle'

type Plan = 'free' | 'pro' | 'enterprise'

const plans = [
  {
    id: 'free' as Plan,
    name: 'Open Core',
    price: 'Free',
    description: 'Self-hosted. Full simulation and optimisation engine.',
    features: [
      'Pyomo MILP dispatcher',
      'Real-time solar dashboard',
      'KPLC tariff engine',
      '1 site',
      'Community support',
    ],
    cta: 'Open dashboard',
    href: '/demo',
    highlight: false,
  },
  {
    id: 'pro' as Plan,
    name: 'Pro',
    price: 'KES 12,000',
    period: '/mo',
    description: 'Multi-site, forecasting, and priority support.',
    cta: 'Upgrade to Pro',
    href: '/login',
    highlight: true,
    features: [
      'Everything in Open Core',
      'Up to 10 sites',
      'Solar irradiance forecasting',
      'EV smart-charging block',
      'Priority email support',
      'Export KPIs to CSV / PDF',
    ],
  },
  {
    id: 'enterprise' as Plan,
    name: 'Enterprise',
    price: 'Custom',
    description: 'On-prem or private cloud, SLA, and custom integrations.',
    cta: 'Contact us',
    href: 'mailto:hello@safaricharge.ke',
    highlight: false,
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
  const [currentPlan, setCurrentPlan] = useState<Plan | null>(null)

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const supabase = createClient()
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!session) {
          setCurrentPlan(null)
          return
        }

        const { data, error } = await supabase
          .from('profiles')
          .select('plan')
          .eq('id', session.user.id)
          .maybeSingle()

        if (error) {
          console.error('Failed to load pricing subscription status', error)
          setCurrentPlan('free')
          return
        }

        const safePlan = data?.plan
        if (safePlan === 'free' || safePlan === 'pro' || safePlan === 'enterprise') {
          setCurrentPlan(safePlan)
        } else {
          setCurrentPlan('free')
        }
      } catch {
        setCurrentPlan(null)
      }
    }

    void loadProfile()
  }, [])

  return (
    <div
      className="min-h-screen antialiased"
      style={{ background: 'var(--site-page-bg)', color: 'var(--site-page-fg)', fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      {/* Decorative grid */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          backgroundImage: 'linear-gradient(var(--site-grid-line) 1px, transparent 1px), linear-gradient(90deg, var(--site-grid-line) 1px, transparent 1px)',
          backgroundSize: '80px 80px',
        }}
      />
      {/* Top glow */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 z-0"
        style={{ height: '40vh', background: 'radial-gradient(ellipse 60% 40% at 50% -5%, var(--site-top-glow) 0%, transparent 70%)' }}
      />

      {/* Nav */}
      <header
        className="relative z-10"
        style={{
          background: 'var(--site-nav-bg)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          borderBottom: '1px solid var(--site-page-border)',
        }}
      >
        <div className="mx-auto max-w-7xl px-6 sm:px-10 h-16 flex items-center justify-between">
          <BrandLogo href="/landing" />
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 text-sm transition-colors"
              style={{ color: 'var(--site-page-muted)' }}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10 px-6 sm:px-10 py-20">
        <div className="mx-auto max-w-7xl">
          {/* Header */}
          <div className="mb-16">
            <div
              className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1 rounded-full mb-5"
              style={{ background: 'var(--battery-soft)', border: '1px solid rgba(16,185,129,0.18)', color: 'var(--battery)' }}
            >
              Pricing
            </div>
            <h1
              className="font-bold tracking-tight mb-3"
              style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', color: 'var(--site-page-fg)', letterSpacing: '-0.04em' }}
            >
              Simple, transparent pricing
            </h1>
            <p style={{ color: 'var(--site-page-muted)', lineHeight: 1.75 }}>
              Open-core. Start free, scale when ready.
            </p>

            {currentPlan && (
              <div
                className="mt-5 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold"
                style={{ borderColor: 'rgba(16,185,129,0.35)', color: 'var(--battery)', background: 'var(--battery-soft)' }}
              >
                Current plan: {planBadgeLabel(currentPlan)}
              </div>
            )}
          </div>

          {/* Plans grid */}
          <div className="grid gap-4 sm:grid-cols-3 items-start">
            {plans.map((plan) => {
              const isCurrentPlan = currentPlan === plan.id
              return (
                <section
                  key={plan.name}
                  className={`rounded-2xl p-7 relative ${plan.highlight ? 'pro-glow' : ''}`}
                  style={{
                    background: plan.highlight ? 'var(--battery-soft)' : 'var(--site-page-surface)',
                    border: plan.highlight
                      ? '1px solid rgba(16,185,129,0.3)'
                      : '1px solid var(--site-page-border)',
                    boxShadow: plan.highlight ? '0 0 60px rgba(16,185,129,0.1)' : 'none',
                  }}
                >
                  {plan.highlight && (
                    <span
                      className="inline-flex text-xs font-semibold px-2.5 py-0.5 rounded-full mb-4"
                      style={{ background: 'var(--battery-soft)', color: 'var(--battery)', border: '1px solid rgba(16,185,129,0.2)' }}
                    >
                      Most popular
                    </span>
                  )}

                  <h2
                    className="font-semibold text-lg mb-1"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {plan.name}
                  </h2>

                  <div className="flex items-baseline gap-1 mb-2">
                    <span
                      className="text-3xl font-bold"
                      style={{ color: 'var(--site-page-fg)', letterSpacing: '-0.04em' }}
                    >
                      {plan.price}
                    </span>
                    {'period' in plan && plan.period && (
                      <span className="text-sm" style={{ color: 'var(--site-page-muted)' }}>{plan.period}</span>
                    )}
                  </div>

                  <p className="text-sm mb-6" style={{ color: 'var(--site-page-muted)' }}>
                    {plan.description}
                  </p>

                  <ul className="space-y-2.5 mb-8">
                    {plan.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-start gap-2.5 text-sm"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        <Check className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--battery)' }} />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  {isCurrentPlan ? (
                    <div
                      className="block w-full text-center text-sm font-semibold py-2.5 rounded-xl"
                      style={{ background: 'var(--battery-soft)', color: 'var(--battery)', border: '1px solid rgba(16,185,129,0.2)' }}
                    >
                      Current plan
                    </div>
                  ) : (
                    <Link
                      href={plan.href}
                      className="block w-full text-center text-sm font-semibold py-2.5 rounded-xl transition-colors"
                      style={{
                        background: plan.highlight ? 'var(--battery)' : 'transparent',
                        color: plan.highlight ? '#fff' : 'var(--site-page-muted)',
                        border: plan.highlight ? 'none' : '1px solid var(--site-page-border)',
                      }}
                    >
                      {plan.cta}
                    </Link>
                  )}
                </section>
              )
            })}
          </div>

          <p className="mt-6 text-sm" style={{ color: 'var(--site-page-muted)' }}>
            All plans include the Pyomo MILP engine and KPLC tariff calculator.
          </p>
        </div>
      </main>

      <footer
        style={{ borderTop: '1px solid var(--site-page-border)' }}
        className="relative z-10 py-10 px-6 sm:px-10 text-sm text-center"
      >
        <p style={{ color: 'var(--site-page-soft)' }}>
          © {new Date().getFullYear()} SafariCharge · Built in Nairobi 🇰🇪
        </p>
      </footer>
    </div>
  )
}
