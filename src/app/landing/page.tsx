'use client';

import Link from 'next/link';
import {
  Sun, Zap, BarChart3, Battery, ArrowRight, Shield,
  Globe, TrendingDown, Check, Activity, ChevronRight, Cpu, Leaf,
} from 'lucide-react';

const features = [
  {
    icon: Zap,
    title: 'Pyomo MILP Optimizer',
    description:
      'Goes beyond rule-based dispatch. Our MILP engine finds the globally optimal BESS charge/discharge schedule against KPLC peak and off-peak windows.',
    accent: '#10b981',
  },
  {
    icon: BarChart3,
    title: 'Real-Time Solar Analytics',
    description:
      'Live AC output, irradiance correlation, inverter limit tracking, and curtailment detection — all in a single dashboard.',
    accent: '#f59e0b',
  },
  {
    icon: Battery,
    title: 'BESS SoC Intelligence',
    description:
      'SoC bounds enforcement, binary charge/discharge mutex, and battery health KPIs surfaced without a proprietary BMS integration.',
    accent: '#3b82f6',
  },
  {
    icon: Globe,
    title: 'KPLC Tariff Engine',
    description:
      'Full all-in pricing — base rate, fuel surcharge, FERFA, INFA, ERC, WRA, and VAT — for EV, domestic, and small-commercial profiles.',
    accent: '#a855f7',
  },
  {
    icon: TrendingDown,
    title: 'Cost & Carbon KPIs',
    description:
      'Per-cycle cost savings, grid displacement percentage, CO₂ avoided, and peak demand shaving — exportable to CSV or PDF.',
    accent: '#06b6d4',
  },
  {
    icon: Shield,
    title: 'Block-Structured Extensibility',
    description:
      'Add gensets, EV smart charging, or thermal loads as new optimiser blocks without modifying existing simulation logic.',
    accent: '#10b981',
  },
];

const stats = [
  { value: '40%', label: 'Peak demand reduction', sub: 'vs. unoptimised baseline' },
  { value: 'KES 0', label: 'Licence fee', sub: 'Open-core model' },
  { value: '5 min', label: 'Re-optimisation cycle', sub: 'Rolling horizon dispatch' },
  { value: '99.2%', label: 'Energy balance accuracy', sub: 'Validated on live sites' },
];

const plans = [
  {
    name: 'Open Core',
    price: 'Free',
    description: 'Self-hosted. Full simulation and optimisation engine.',
    cta: 'Open dashboard',
    href: '/demo',
    highlight: false,
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
    price: 'KES 12,000',
    period: '/mo',
    description: 'Multi-site, forecasting, and priority support.',
    cta: 'Start free trial',
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
];

export default function LandingPage() {
  return (
    <div
      className="min-h-screen text-white antialiased"
      style={{ background: '#03070f', fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      {/* ── Subtle grid bg ── */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          backgroundImage:
            'linear-gradient(rgba(16,185,129,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(16,185,129,0.03) 1px, transparent 1px)',
          backgroundSize: '80px 80px',
        }}
      />
      {/* Top glow */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 z-0"
        style={{
          height: '50vh',
          background: 'radial-gradient(ellipse 60% 40% at 50% -5%, rgba(16,185,129,0.18) 0%, transparent 70%)',
        }}
      />

      {/* ── Nav ── */}
      <header
        className="fixed top-0 inset-x-0 z-50"
        style={{
          background: 'rgba(3,7,15,0.8)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <div className="mx-auto max-w-7xl px-6 sm:px-10 h-16 flex items-center justify-between">
          <Link href="/landing" className="flex items-center gap-2.5">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-label="SafariCharge logo">
              <circle cx="14" cy="14" r="13" stroke="rgba(16,185,129,0.35)" strokeWidth="1"/>
              <path d="M14 7 L17.5 13 L21 13 L14 21 L16 15 L12 15 Z" fill="#10b981" opacity="0.9"/>
              <circle cx="14" cy="14" r="2" fill="#10b981"/>
            </svg>
            <span className="font-semibold text-sm tracking-tight" style={{ color: '#e2e8f0' }}>SafariCharge</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {[
              { label: 'Features', href: '#features' },
              { label: 'Performance', href: '#stats' },
              { label: 'Pricing', href: '#pricing' },
              { label: 'GitHub', href: 'https://github.com/rauell1/safaricharge', external: true },
            ].map((item) => (
              <a
                key={item.label}
                href={item.href}
                target={item.external ? '_blank' : undefined}
                rel={item.external ? 'noopener noreferrer' : undefined}
                className="text-sm px-3.5 py-2 rounded-lg"
                style={{ color: 'rgba(255,255,255,0.45)', transition: 'color 150ms, background 150ms' }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.85)';
                  (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.45)';
                  (e.currentTarget as HTMLElement).style.background = 'transparent';
                }}
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/demo"
              className="hidden sm:inline-flex items-center gap-1.5 text-sm font-medium px-3.5 py-1.5 rounded-lg"
              style={{
                color: 'rgba(255,255,255,0.55)',
                border: '1px solid rgba(255,255,255,0.09)',
                transition: 'color 150ms, border-color 150ms',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.9)';
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.18)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.55)';
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.09)';
              }}
            >
              <Activity className="w-3.5 h-3.5" />
              Dashboard
            </Link>
            <Link
              href="/demo"
              className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-1.5 rounded-lg"
              style={{
                background: '#10b981',
                color: '#fff',
                transition: 'background 150ms',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#059669'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '#10b981'; }}
            >
              Open app <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative pt-44 pb-32 px-6 sm:px-10 overflow-hidden">
        <div className="relative mx-auto max-w-5xl">
          {/* Live pill */}
          <div className="flex justify-center mb-9">
            <span
              className="inline-flex items-center gap-2 text-xs font-semibold px-3.5 py-1.5 rounded-full"
              style={{
                background: 'rgba(16,185,129,0.08)',
                border: '1px solid rgba(16,185,129,0.22)',
                color: '#34d399',
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full animate-pulse"
                style={{ background: '#10b981', boxShadow: '0 0 8px #10b981' }}
              />
              Pyomo MILP optimizer · Live
            </span>
          </div>

          {/* Headline */}
          <h1
            className="text-center font-bold leading-[1.06] mb-8"
            style={{
              fontSize: 'clamp(2.8rem, 7vw, 5.5rem)',
              letterSpacing: '-0.04em',
              color: '#f0fdf8',
            }}
          >
            Solar intelligence
            <br />
            <span
              style={{
                background: 'linear-gradient(90deg, #10b981 10%, #6ee7b7 55%, #a7f3d0 100%)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              built for Kenya
            </span>
          </h1>

          <p
            className="text-center mx-auto mb-12"
            style={{
              fontSize: 'clamp(1rem, 2vw, 1.15rem)',
              color: 'rgba(255,255,255,0.45)',
              maxWidth: '52ch',
              lineHeight: 1.75,
            }}
          >
            SafariCharge turns your PV + BESS site into an optimised asset. Our MILP dispatch
            engine cuts KPLC peak charges, maximises self-consumption, and gives you real-time
            visibility into every kilowatt-hour.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 mb-14">
            <Link
              href="/demo"
              className="inline-flex items-center gap-2 font-semibold text-sm px-7 py-3.5 rounded-xl"
              style={{
                background: '#10b981',
                color: '#fff',
                boxShadow: '0 0 40px rgba(16,185,129,0.3)',
                transition: 'background 150ms, box-shadow 150ms',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = '#059669';
                (e.currentTarget as HTMLElement).style.boxShadow = '0 0 56px rgba(16,185,129,0.45)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = '#10b981';
                (e.currentTarget as HTMLElement).style.boxShadow = '0 0 40px rgba(16,185,129,0.3)';
              }}
            >
              Open dashboard <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="#features"
              className="inline-flex items-center gap-2 text-sm px-6 py-3.5 rounded-xl"
              style={{
                color: 'rgba(255,255,255,0.55)',
                border: '1px solid rgba(255,255,255,0.09)',
                transition: 'color 150ms, border-color 150ms, background 150ms',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.9)';
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.18)';
                (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.55)';
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.09)';
                (e.currentTarget as HTMLElement).style.background = 'transparent';
              }}
            >
              See features <ChevronRight className="w-4 h-4" />
            </a>
          </div>

          {/* Trust line */}
          <p className="text-center text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>
            Built for Nairobi&rsquo;s C&amp;I solar sites · KPLC TOU-aware · Open source
          </p>
        </div>
      </section>

      {/* ── Stats ── */}
      <section
        id="stats"
        style={{ borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
      >
        <div className="mx-auto max-w-7xl">
          <div
            className="grid grid-cols-2 md:grid-cols-4"
            style={{ borderLeft: '1px solid rgba(255,255,255,0.05)' }}
          >
            {stats.map((s) => (
              <div
                key={s.label}
                className="py-12 px-8 text-center"
                style={{ borderRight: '1px solid rgba(255,255,255,0.05)' }}
              >
                <div
                  className="font-black tabular-nums mb-1"
                  style={{
                    fontSize: 'clamp(2rem, 4vw, 2.8rem)',
                    color: '#10b981',
                    letterSpacing: '-0.04em',
                  }}
                >
                  {s.value}
                </div>
                <div className="text-sm font-medium mb-1" style={{ color: 'rgba(255,255,255,0.65)' }}>{s.label}</div>
                <div className="text-xs" style={{ color: 'rgba(255,255,255,0.28)' }}>{s.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-32 px-6 sm:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="mb-20">
            <div
              className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1 rounded-full mb-5"
              style={{ background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.18)', color: '#34d399' }}
            >
              <Cpu className="w-3 h-3" /> Platform capabilities
            </div>
            <h2
              className="font-bold tracking-tight mb-4"
              style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', color: '#f0fdf8', letterSpacing: '-0.04em' }}
            >
              Everything your site needs
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.4)', lineHeight: 1.75, maxWidth: '44ch' }}>
              From raw inverter telemetry to globally-optimal dispatch schedules — all in one platform.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px" style={{ background: 'rgba(255,255,255,0.05)' }}>
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="p-8 group"
                  style={{ background: '#03070f', transition: 'background 200ms' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#06100a'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '#03070f'; }}
                >
                  <div
                    className="w-10 h-10 rounded-xl grid place-items-center mb-5"
                    style={{ background: `${f.accent}12`, border: `1px solid ${f.accent}20` }}
                  >
                    <Icon className="w-5 h-5" style={{ color: f.accent }} strokeWidth={1.8} />
                  </div>
                  <h3 className="font-semibold mb-3" style={{ color: '#e2e8f0', fontSize: '0.95rem' }}>{f.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.38)' }}>
                    {f.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── CTA band ── */}
      <section
        className="py-24 px-6 sm:px-10 relative overflow-hidden"
        style={{ borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(16,185,129,0.025)' }}
      >
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 pointer-events-none"
          style={{
            height: '100%',
            background: 'radial-gradient(ellipse 50% 70% at 50% 50%, rgba(16,185,129,0.07) 0%, transparent 70%)',
          }}
        />
        <div className="relative mx-auto max-w-3xl text-center">
          <Leaf className="w-10 h-10 mx-auto mb-6" style={{ color: '#10b981', opacity: 0.6 }} />
          <h2
            className="font-bold tracking-tight mb-5"
            style={{ fontSize: 'clamp(1.7rem, 3.5vw, 2.5rem)', color: '#f0fdf8', letterSpacing: '-0.04em' }}
          >
            Your dashboard is ready
          </h2>
          <p className="mb-10 mx-auto" style={{ color: 'rgba(255,255,255,0.42)', maxWidth: '46ch', lineHeight: 1.75 }}>
            No sign-in required. Explore real-time solar analytics, BESS dispatch, and
            KPLC cost modelling right now.
          </p>
          <Link
            href="/demo"
            className="inline-flex items-center gap-2 font-semibold text-sm px-8 py-4 rounded-xl"
            style={{
              background: '#10b981',
              color: '#fff',
              boxShadow: '0 0 40px rgba(16,185,129,0.28)',
              transition: 'background 150ms, box-shadow 150ms',
              fontSize: '0.95rem',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = '#059669';
              (e.currentTarget as HTMLElement).style.boxShadow = '0 0 56px rgba(16,185,129,0.42)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = '#10b981';
              (e.currentTarget as HTMLElement).style.boxShadow = '0 0 40px rgba(16,185,129,0.28)';
            }}
          >
            Open dashboard <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="py-32 px-6 sm:px-10" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-20">
            <div
              className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1 rounded-full mb-5"
              style={{ background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.18)', color: '#34d399' }}
            >
              Pricing
            </div>
            <h2
              className="font-bold tracking-tight mb-4"
              style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', color: '#f0fdf8', letterSpacing: '-0.04em' }}
            >
              Simple, transparent pricing
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.4)' }}>Open-core. Start free, scale when ready.</p>
          </div>

          <div className="grid sm:grid-cols-3 gap-4 items-start">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className="rounded-2xl p-7"
                style={{
                  background: plan.highlight ? 'rgba(16,185,129,0.06)' : 'rgba(255,255,255,0.02)',
                  border: plan.highlight ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(255,255,255,0.06)',
                  boxShadow: plan.highlight ? '0 0 60px rgba(16,185,129,0.1)' : 'none',
                }}
              >
                {plan.highlight && (
                  <span
                    className="inline-flex text-xs font-semibold px-2.5 py-0.5 rounded-full mb-4"
                    style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}
                  >
                    Most popular
                  </span>
                )}
                <h3 className="font-semibold text-lg mb-1" style={{ color: '#e2e8f0' }}>{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-3xl font-bold" style={{ color: '#f0fdf8', letterSpacing: '-0.04em' }}>{plan.price}</span>
                  {plan.period && <span className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>{plan.period}</span>}
                </div>
                <p className="text-sm mb-7" style={{ color: 'rgba(255,255,255,0.4)' }}>{plan.description}</p>
                <ul className="space-y-2.5 mb-9">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-2.5 text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>
                      <Check className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#10b981' }} />
                      {feat}
                    </li>
                  ))}
                </ul>
                <Link
                  href={plan.href}
                  className="block w-full text-center text-sm font-semibold py-2.5 rounded-xl"
                  style={{
                    background: plan.highlight ? '#10b981' : 'transparent',
                    color: plan.highlight ? '#fff' : 'rgba(255,255,255,0.6)',
                    border: plan.highlight ? 'none' : '1px solid rgba(255,255,255,0.1)',
                    transition: 'background 150ms, border-color 150ms, color 150ms',
                  }}
                  onMouseEnter={(e) => {
                    if (plan.highlight) {
                      (e.currentTarget as HTMLElement).style.background = '#059669';
                    } else {
                      (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.22)';
                      (e.currentTarget as HTMLElement).style.color = '#fff';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (plan.highlight) {
                      (e.currentTarget as HTMLElement).style.background = '#10b981';
                    } else {
                      (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.1)';
                      (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.6)';
                    }
                  }}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="py-32 px-6 sm:px-10" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="mx-auto max-w-3xl text-center">
          <h2
            className="font-bold tracking-tight mb-5"
            style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', color: '#f0fdf8', letterSpacing: '-0.04em' }}
          >
            Ready to optimise your site?
          </h2>
          <p
            className="mb-10 mx-auto"
            style={{ color: 'rgba(255,255,255,0.42)', maxWidth: '46ch', lineHeight: 1.75, fontSize: '1.05rem' }}
          >
            Join energy managers across Kenya already using SafariCharge to cut KPLC bills and
            maximise solar yield.
          </p>
          <Link
            href="/demo"
            className="inline-flex items-center gap-2 font-semibold px-9 py-4 rounded-xl"
            style={{
              background: '#10b981',
              color: '#fff',
              boxShadow: '0 0 48px rgba(16,185,129,0.3)',
              fontSize: '0.95rem',
              transition: 'background 150ms, box-shadow 150ms',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = '#059669';
              (e.currentTarget as HTMLElement).style.boxShadow = '0 0 64px rgba(16,185,129,0.44)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = '#10b981';
              (e.currentTarget as HTMLElement).style.boxShadow = '0 0 48px rgba(16,185,129,0.3)';
            }}
          >
            Open dashboard <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }} className="py-10 px-6 sm:px-10">
        <div
          className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-4 text-sm"
          style={{ color: 'rgba(255,255,255,0.22)' }}
        >
          <div className="flex items-center gap-2.5">
            <svg width="16" height="16" viewBox="0 0 28 28" fill="none">
              <path d="M14 7 L17.5 13 L21 13 L14 21 L16 15 L12 15 Z" fill="rgba(16,185,129,0.6)"/>
            </svg>
            <span>© {new Date().getFullYear()} SafariCharge · Nairobi, Kenya</span>
          </div>
          <div className="flex items-center gap-6">
            <Link
              href="/demo"
              style={{ transition: 'color 150ms' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.55)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.22)'; }}
            >Dashboard</Link>
            <a
              href="https://github.com/rauell1/safaricharge"
              target="_blank"
              rel="noopener noreferrer"
              style={{ transition: 'color 150ms' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.55)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.22)'; }}
            >GitHub</a>
            <a
              href="mailto:hello@safaricharge.ke"
              style={{ transition: 'color 150ms' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.55)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.22)'; }}
            >Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
