import Link from 'next/link';
import {
  Sun, Zap, BarChart3, Battery, ArrowRight, Shield,
  Globe, TrendingDown, Check, Activity, ChevronRight,
} from 'lucide-react';

export const metadata = {
  title: 'SafariCharge — AI-Optimised Solar EMS for Kenya',
  description:
    'Real-time solar monitoring, Pyomo MILP dispatch optimisation, and KPLC TOU tariff intelligence for Kenyan C&I sites.',
};

const features = [
  {
    icon: Zap,
    title: 'Pyomo MILP Optimizer',
    description:
      'Goes beyond rule-based dispatch. Our MILP engine finds the globally optimal BESS charge/discharge schedule against KPLC peak and off-peak windows.',
    accent: '#10b981',
    soft: 'rgba(16,185,129,0.08)',
  },
  {
    icon: BarChart3,
    title: 'Real-Time Solar Analytics',
    description:
      'Live AC output, irradiance correlation, inverter limit tracking, and curtailment detection — all in a single dashboard.',
    accent: '#f59e0b',
    soft: 'rgba(245,158,11,0.08)',
  },
  {
    icon: Battery,
    title: 'BESS SoC Intelligence',
    description:
      'SoC bounds enforcement, binary charge/discharge mutex, and battery health KPIs surfaced without a proprietary BMS integration.',
    accent: '#3b82f6',
    soft: 'rgba(59,130,246,0.08)',
  },
  {
    icon: Globe,
    title: 'KPLC Tariff Engine',
    description:
      'Full all-in pricing — base rate, fuel surcharge, FERFA, INFA, ERC, WRA, and VAT — for EV, domestic, and small-commercial profiles.',
    accent: '#a855f7',
    soft: 'rgba(168,85,247,0.08)',
  },
  {
    icon: TrendingDown,
    title: 'Cost & Carbon KPIs',
    description:
      'Per-cycle cost savings, grid displacement percentage, CO₂ avoided, and peak demand shaving — exportable to CSV or PDF.',
    accent: '#06b6d4',
    soft: 'rgba(6,182,212,0.08)',
  },
  {
    icon: Shield,
    title: 'Block-Structured Extensibility',
    description:
      'Add gensets, EV smart charging, or thermal loads as new optimiser blocks without modifying existing simulation logic.',
    accent: '#10b981',
    soft: 'rgba(16,185,129,0.08)',
  },
];

const stats = [
  { value: '40%', label: 'Average peak demand reduction', sublabel: 'vs. unoptimised baseline' },
  { value: 'KES 0', label: 'Licence fee', sublabel: 'Open-core model' },
  { value: '5 min', label: 'Dispatch re-optimisation', sublabel: 'Rolling horizon cycle' },
  { value: '99.2%', label: 'Energy balance accuracy', sublabel: 'Validated on live sites' },
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
      style={{ background: '#050911', fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      {/* ── Noise texture overlay ── */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.025]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '200px 200px',
        }}
      />

      {/* ── Nav ── */}
      <header
        className="fixed top-0 inset-x-0 z-50"
        style={{
          background: 'rgba(5,9,17,0.75)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          borderBottom: '1px solid rgba(255,255,255,0.055)',
        }}
      >
        <div className="mx-auto max-w-7xl px-5 sm:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/landing" className="flex items-center gap-2.5 group">
            <span
              className="grid place-items-center w-8 h-8 rounded-lg transition-all group-hover:scale-105"
              style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.25)' }}
            >
              <Sun className="w-4 h-4" style={{ color: '#10b981' }} strokeWidth={2.5} />
            </span>
            <span className="font-semibold tracking-tight text-white text-sm">SafariCharge</span>
          </Link>

          {/* Nav links */}
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
                className="text-sm px-3.5 py-2 rounded-lg transition-all"
                style={{ color: 'rgba(255,255,255,0.5)' }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.9)';
                  (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.5)';
                  (e.currentTarget as HTMLElement).style.background = 'transparent';
                }}
              >
                {item.label}
              </a>
            ))}
          </nav>

          {/* CTAs */}
          <div className="flex items-center gap-2">
            <Link
              href="/demo"
              className="hidden sm:inline-flex items-center gap-1.5 text-sm font-medium px-3.5 py-2 rounded-lg transition-all"
              style={{ color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.1)' }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.9)';
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.2)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.6)';
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.1)';
              }}
            >
              <Activity className="w-3.5 h-3.5" />
              Live dashboard
            </Link>
            <Link
              href="/demo"
              className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-lg transition-all"
              style={{ background: '#10b981', color: '#fff' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#34d399'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '#10b981'; }}
            >
              Open app
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative pt-40 pb-28 px-5 sm:px-8 overflow-hidden">
        {/* Radial glow top */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0"
          style={{
            height: '600px',
            background: 'radial-gradient(ellipse 70% 55% at 50% -10%, rgba(16,185,129,0.22) 0%, transparent 70%)',
          }}
        />
        {/* Grid pattern */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.7) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.7) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
          }}
        />

        <div className="relative mx-auto max-w-5xl text-center">
          {/* Live badge */}
          <div className="inline-flex items-center gap-2.5 mb-8">
            <span
              className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full"
              style={{
                background: 'rgba(16,185,129,0.1)',
                border: '1px solid rgba(16,185,129,0.25)',
                color: '#10b981',
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: '#10b981', boxShadow: '0 0 6px #10b981' }}
              />
              Pyomo MILP optimizer · Live
            </span>
          </div>

          <h1
            className="font-bold tracking-tight leading-[1.08] mb-7"
            style={{
              fontSize: 'clamp(2.5rem, 6vw, 5rem)',
              color: '#f1f5f9',
              letterSpacing: '-0.03em',
            }}
          >
            AI-Optimised Solar EMS
            <span
              className="block"
              style={{
                background: 'linear-gradient(135deg, #10b981 0%, #34d399 50%, #6ee7b7 100%)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Built for Kenya
            </span>
          </h1>

          <p
            className="mx-auto mb-10 leading-relaxed"
            style={{
              fontSize: 'clamp(1rem, 2vw, 1.2rem)',
              color: 'rgba(255,255,255,0.5)',
              maxWidth: '52ch',
            }}
          >
            SafariCharge turns your PV + BESS site into an optimised asset. Our MILP dispatch
            engine cuts KPLC peak charges, maximises self-consumption, and gives you real-time
            visibility into every kilowatt-hour.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/demo"
              className="inline-flex items-center gap-2 font-semibold text-sm px-6 py-3.5 rounded-xl transition-all"
              style={{ background: '#10b981', color: '#fff', boxShadow: '0 0 32px rgba(16,185,129,0.35)' }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = '#34d399';
                (e.currentTarget as HTMLElement).style.boxShadow = '0 0 48px rgba(16,185,129,0.5)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = '#10b981';
                (e.currentTarget as HTMLElement).style.boxShadow = '0 0 32px rgba(16,185,129,0.35)';
              }}
            >
              Open dashboard <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="#features"
              className="inline-flex items-center gap-2 text-sm px-6 py-3.5 rounded-xl transition-all"
              style={{
                color: 'rgba(255,255,255,0.6)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.9)';
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.22)';
                (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.6)';
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.1)';
                (e.currentTarget as HTMLElement).style.background = 'transparent';
              }}
            >
              See features <ChevronRight className="w-4 h-4" />
            </a>
          </div>

          {/* Trusted by line */}
          <p className="mt-10 text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
            Built for Nairobi&rsquo;s C&amp;I solar sites · KPLC TOU-aware · Open source
          </p>
        </div>
      </section>

      {/* ── Stats bar ── */}
      <section
        id="stats"
        style={{ borderTop: '1px solid rgba(255,255,255,0.055)', borderBottom: '1px solid rgba(255,255,255,0.055)' }}
      >
        <div className="mx-auto max-w-7xl px-5 sm:px-8 py-0">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0" style={{ '--tw-divide-opacity': '0.06' } as React.CSSProperties}>
            {stats.map((s) => (
              <div key={s.label} className="py-10 px-6 text-center">
                <div
                  className="font-bold tabular-nums mb-1"
                  style={{
                    fontSize: 'clamp(1.8rem, 3.5vw, 2.5rem)',
                    background: 'linear-gradient(135deg, #10b981, #34d399)',
                    WebkitBackgroundClip: 'text',
                    backgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    letterSpacing: '-0.03em',
                  }}
                >
                  {s.value}
                </div>
                <div className="text-sm font-medium mb-0.5" style={{ color: 'rgba(255,255,255,0.7)' }}>{s.label}</div>
                <div className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>{s.sublabel}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-28 px-5 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-16 max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#10b981' }}>Platform capabilities</p>
            <h2
              className="font-bold tracking-tight mb-4"
              style={{ fontSize: 'clamp(1.75rem, 4vw, 2.75rem)', color: '#f1f5f9', letterSpacing: '-0.03em' }}
            >
              Everything your site needs
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.45)', lineHeight: 1.7 }}>
              From raw inverter telemetry to globally-optimal dispatch schedules — all in one platform.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="group rounded-2xl p-6 transition-all cursor-default"
                  style={{
                    background: 'rgba(255,255,255,0.025)',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)';
                    (e.currentTarget as HTMLElement).style.borderColor = `${f.accent}33`;
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.025)';
                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.06)';
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-xl grid place-items-center mb-4"
                    style={{ background: f.soft }}
                  >
                    <Icon className="w-5 h-5" style={{ color: f.accent }} strokeWidth={1.8} />
                  </div>
                  <h3 className="font-semibold mb-2 text-white">{f.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.42)' }}>
                    {f.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Dashboard preview band ── */}
      <section
        className="py-20 px-5 sm:px-8"
        style={{ borderTop: '1px solid rgba(255,255,255,0.055)', background: 'rgba(16,185,129,0.03)' }}
      >
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: '#10b981' }}>Live preview</p>
          <h2
            className="font-bold tracking-tight mb-5"
            style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.4rem)', color: '#f1f5f9', letterSpacing: '-0.03em' }}
          >
            Your dashboard is ready
          </h2>
          <p className="mb-8 mx-auto" style={{ color: 'rgba(255,255,255,0.45)', maxWidth: '46ch', lineHeight: 1.7 }}>
            No sign-in required. Explore real-time solar analytics, BESS dispatch, and
            KPLC cost modelling right now.
          </p>
          <Link
            href="/demo"
            className="inline-flex items-center gap-2 font-semibold text-sm px-7 py-3.5 rounded-xl transition-all"
            style={{ background: '#10b981', color: '#fff', boxShadow: '0 0 28px rgba(16,185,129,0.3)' }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = '#34d399';
              (e.currentTarget as HTMLElement).style.boxShadow = '0 0 40px rgba(16,185,129,0.45)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = '#10b981';
              (e.currentTarget as HTMLElement).style.boxShadow = '0 0 28px rgba(16,185,129,0.3)';
            }}
          >
            Open dashboard <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="py-28 px-5 sm:px-8" style={{ borderTop: '1px solid rgba(255,255,255,0.055)' }}>
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#10b981' }}>Pricing</p>
            <h2
              className="font-bold tracking-tight mb-4"
              style={{ fontSize: 'clamp(1.75rem, 4vw, 2.75rem)', color: '#f1f5f9', letterSpacing: '-0.03em' }}
            >
              Simple, transparent pricing
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.42)' }}>Open-core. Start free, scale when ready.</p>
          </div>

          <div className="grid sm:grid-cols-3 gap-4 items-start">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className="rounded-2xl p-7 transition-all"
                style={{
                  background: plan.highlight ? 'rgba(16,185,129,0.07)' : 'rgba(255,255,255,0.025)',
                  border: plan.highlight
                    ? '1px solid rgba(16,185,129,0.35)'
                    : '1px solid rgba(255,255,255,0.07)',
                  boxShadow: plan.highlight ? '0 0 48px rgba(16,185,129,0.12)' : 'none',
                }}
              >
                {plan.highlight && (
                  <span
                    className="inline-flex text-xs font-semibold px-2.5 py-0.5 rounded-full mb-4"
                    style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.25)' }}
                  >
                    Most popular
                  </span>
                )}
                <h3 className="font-semibold text-white text-lg mb-1">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-3xl font-bold text-white" style={{ letterSpacing: '-0.03em' }}>{plan.price}</span>
                  {plan.period && <span className="text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>{plan.period}</span>}
                </div>
                <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.42)' }}>{plan.description}</p>
                <ul className="space-y-2.5 mb-8">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-2.5 text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
                      <Check className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#10b981' }} />
                      {feat}
                    </li>
                  ))}
                </ul>
                <Link
                  href={plan.href}
                  className="block w-full text-center text-sm font-semibold py-2.5 rounded-xl transition-all"
                  style={{
                    background: plan.highlight ? '#10b981' : 'transparent',
                    color: plan.highlight ? '#fff' : 'rgba(255,255,255,0.65)',
                    border: plan.highlight ? 'none' : '1px solid rgba(255,255,255,0.12)',
                  }}
                  onMouseEnter={(e) => {
                    if (plan.highlight) {
                      (e.currentTarget as HTMLElement).style.background = '#34d399';
                    } else {
                      (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.25)';
                      (e.currentTarget as HTMLElement).style.color = '#fff';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (plan.highlight) {
                      (e.currentTarget as HTMLElement).style.background = '#10b981';
                    } else {
                      (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.12)';
                      (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.65)';
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
      <section className="py-28 px-5 sm:px-8" style={{ borderTop: '1px solid rgba(255,255,255,0.055)' }}>
        <div className="mx-auto max-w-3xl text-center">
          <h2
            className="font-bold tracking-tight mb-5"
            style={{ fontSize: 'clamp(1.75rem, 4vw, 2.75rem)', color: '#f1f5f9', letterSpacing: '-0.03em' }}
          >
            Ready to optimise your site?
          </h2>
          <p className="mb-8 mx-auto" style={{ color: 'rgba(255,255,255,0.45)', maxWidth: '46ch', lineHeight: 1.7, fontSize: '1.05rem' }}>
            Join energy managers across Kenya already using SafariCharge to cut KPLC bills and
            maximise solar yield.
          </p>
          <Link
            href="/demo"
            className="inline-flex items-center gap-2 font-semibold text-sm px-8 py-4 rounded-xl transition-all"
            style={{ background: '#10b981', color: '#fff', boxShadow: '0 0 40px rgba(16,185,129,0.3)', fontSize: '0.95rem' }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = '#34d399';
              (e.currentTarget as HTMLElement).style.boxShadow = '0 0 56px rgba(16,185,129,0.45)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = '#10b981';
              (e.currentTarget as HTMLElement).style.boxShadow = '0 0 40px rgba(16,185,129,0.3)';
            }}
          >
            Open dashboard <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.055)' }} className="py-10 px-5 sm:px-8">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-4 text-sm" style={{ color: 'rgba(255,255,255,0.25)' }}>
          <div className="flex items-center gap-2.5">
            <Sun className="w-4 h-4" style={{ color: 'rgba(16,185,129,0.6)' }} />
            <span>© {new Date().getFullYear()} SafariCharge · Nairobi, Kenya</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/demo" className="transition-colors" onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.6)'; }} onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.25)'; }}>Dashboard</Link>
            <a href="https://github.com/rauell1/safaricharge" target="_blank" rel="noopener noreferrer" className="transition-colors" onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.6)'; }} onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.25)'; }}>GitHub</a>
            <a href="mailto:hello@safaricharge.ke" className="transition-colors" onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.6)'; }} onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.25)'; }}>Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
