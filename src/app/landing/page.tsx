'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Sun, Zap, BarChart3, Battery, ArrowRight, Shield,
  Globe, TrendingDown, Check, Activity, ChevronRight, Cpu, Leaf, Quote, ArrowUpRight,
  Menu, X,
} from 'lucide-react';
import { BrandLogo } from '@/components/brand-logo';
import { ThemeToggle } from '@/components/theme-toggle';

const features = [
  {
    icon: Zap,
    title: 'Pyomo MILP Optimizer',
    description:
      'Goes beyond rule-based dispatch. Our MILP engine finds the globally optimal BESS charge/discharge schedule against KPLC peak and off-peak windows.',
    accent: 'var(--battery)',
  },
  {
    icon: BarChart3,
    title: 'Real-Time Solar Analytics',
    description:
      'Live AC output, irradiance correlation, inverter limit tracking, and curtailment detection — all in a single dashboard.',
    accent: 'var(--solar)',
  },
  {
    icon: Battery,
    title: 'BESS SoC Intelligence',
    description:
      'SoC bounds enforcement, binary charge/discharge mutex, and battery health KPIs surfaced without a proprietary BMS integration.',
    accent: 'var(--grid)',
  },
  {
    icon: Globe,
    title: 'KPLC Tariff Engine',
    description:
      'Full all-in pricing — base rate, fuel surcharge, FERFA, INFA, ERC, WRA, and VAT — for EV, domestic, and small-commercial profiles.',
    accent: 'var(--ev)',
  },
  {
    icon: TrendingDown,
    title: 'Cost & Carbon KPIs',
    description:
      'Per-cycle cost savings, grid displacement percentage, CO₂ avoided, and peak demand shaving — exportable to CSV or PDF.',
    accent: 'var(--consumption)',
  },
  {
    icon: Shield,
    title: 'Block-Structured Extensibility',
    description:
      'Add gensets, EV smart charging, or thermal loads as new optimiser blocks without modifying existing simulation logic.',
    accent: 'var(--battery)',
  },
];

const stats = [
  { value: '40%', label: 'Peak demand reduction', sub: 'vs. unoptimised baseline', sparkline: '2,16 16,10 30,12 44,8 58,6' },
  { value: 'KES 0', label: 'Licence fee', sub: 'Open-core model', sparkline: '2,14 16,14 30,11 44,9 58,7' },
  { value: '5 min', label: 'Re-optimisation cycle', sub: 'Rolling horizon dispatch', sparkline: '2,15 16,12 30,9 44,7 58,5' },
  { value: '99.2%', label: 'Energy balance accuracy', sub: 'Validated on live sites', sparkline: '2,18 16,14 30,11 44,9 58,8' },
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

const heroKpis = [
  { label: 'Solar Output', value: '47.3 kW', icon: Sun },
  { label: 'BESS SoC', value: '78%', icon: Battery },
  { label: 'Grid Cost Saved', value: 'KES 2,840', icon: TrendingDown },
  { label: 'CO₂ Avoided', value: '12.4 kg', icon: Leaf },
];

const steps = [
  {
    title: 'Connect your inverter',
    description: 'Point SafariCharge at your SMA, Fronius, or Sungrow Modbus feed',
  },
  {
    title: 'MILP engine optimises',
    description: 'Pyomo solves the dispatch schedule every 5 minutes against KPLC TOU windows',
  },
  {
    title: 'Track and export',
    description: 'Real-time KPIs, cost savings, and CO₂ reports in one dashboard',
  },
];

const testimonials = [
  {
    quote: 'Cut our KPLC peak bill by 38% in the first month.',
    by: 'Energy Manager, Nairobi Industrial Park',
  },
  {
    quote: "Finally a tool built for Kenya's grid reality.",
    by: 'Solar Engineer, Mombasa SEZ',
  },
];

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'Performance', href: '#stats' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'GitHub', href: 'https://github.com/rauell1/safaricharge', external: true },
] as const;

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div
      className="min-h-screen antialiased"
      style={{
        background: 'var(--site-page-bg)',
        color: 'var(--site-page-fg)',
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      <style jsx>{`
        @keyframes proPulse {
          0% { opacity: 0.42; transform: scale(1); }
          50% { opacity: 0.78; transform: scale(1.01); }
          100% { opacity: 0.42; transform: scale(1); }
        }
        .pro-glow::before {
          content: '';
          position: absolute;
          inset: -1px;
          border-radius: 1rem;
          border: 1px solid rgba(16,185,129,0.55);
          box-shadow: 0 0 30px rgba(16,185,129,0.25), 0 0 60px rgba(16,185,129,0.1);
          animation: proPulse 3s ease-in-out infinite;
          pointer-events: none;
        }
      `}</style>

      {/* ── Subtle grid bg ── */}
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
        style={{
          height: '50vh',
          background: 'radial-gradient(ellipse 60% 40% at 50% -5%, var(--site-top-glow) 0%, transparent 70%)',
        }}
      />

      {/* ── Nav ── */}
      <header
        className="fixed top-0 inset-x-0 z-50"
        style={{
          background: 'var(--site-nav-bg)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          borderBottom: '1px solid var(--site-page-border)',
        }}
      >
        <div className="mx-auto max-w-7xl px-6 sm:px-10 h-16 flex items-center justify-between">
          <BrandLogo href="/landing" />

          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((item) => (
              <a
                key={item.label}
                href={item.href}
                target={'external' in item && item.external ? '_blank' : undefined}
                rel={'external' in item && item.external ? 'noopener noreferrer' : undefined}
                className="text-sm px-3.5 py-2 rounded-lg transition-colors"
                style={{ color: 'var(--site-nav-link)', background: 'transparent' }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.color = 'var(--site-nav-link-hover)';
                  (e.currentTarget as HTMLAnchorElement).style.background = 'var(--site-nav-link-bg-hover)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.color = 'var(--site-nav-link)';
                  (e.currentTarget as HTMLAnchorElement).style.background = 'transparent';
                }}
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              href="/demo"
              className="hidden sm:inline-flex items-center gap-1.5 text-sm font-medium px-3.5 py-1.5 rounded-lg transition-colors"
              style={{
                color: 'var(--site-nav-link)',
                border: '1px solid var(--site-page-border)',
              }}
            >
              <Activity className="w-3.5 h-3.5" />
              Dashboard
            </Link>
            <Link
              href="/demo"
              className="hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-1.5 rounded-lg transition-colors"
              style={{ background: 'var(--battery)', color: '#fff' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = 'var(--battery-bright)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = 'var(--battery)'; }}
            >
              Open app <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            {/* Mobile hamburger */}
            <button
              type="button"
              className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-lg transition-colors"
              style={{ color: 'var(--site-page-muted)', border: '1px solid var(--site-page-border)' }}
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen((prev) => !prev)}
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div
            className="md:hidden border-t px-6 py-4 flex flex-col gap-1"
            style={{ borderColor: 'var(--site-page-border)', background: 'var(--site-nav-bg)' }}
          >
            {NAV_LINKS.map((item) => (
              <a
                key={item.label}
                href={item.href}
                target={'external' in item && item.external ? '_blank' : undefined}
                rel={'external' in item && item.external ? 'noopener noreferrer' : undefined}
                className="text-sm px-3 py-2.5 rounded-lg transition-colors"
                style={{ color: 'var(--site-nav-link)' }}
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.label}
              </a>
            ))}
            <div className="mt-2 pt-3" style={{ borderTop: '1px solid var(--site-page-border)' }}>
              <Link
                href="/demo"
                className="flex items-center justify-center gap-1.5 text-sm font-semibold px-4 py-2.5 rounded-xl text-white transition-colors"
                style={{ background: 'var(--battery)' }}
                onClick={() => setMobileMenuOpen(false)}
              >
                Open app <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ── Hero ── */}
      <section className="relative pt-44 pb-32 px-6 sm:px-10 overflow-hidden">
        <div className="relative mx-auto max-w-7xl">
          {/* Live pill */}
          <div className="flex justify-center lg:justify-start mb-9">
            <span
              className="inline-flex items-center gap-2 text-xs font-semibold px-3.5 py-1.5 rounded-full"
              style={{
                background: 'var(--battery-soft)',
                border: '1px solid rgba(16,185,129,0.22)',
                color: 'var(--battery)',
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full animate-pulse"
                style={{ background: 'var(--battery)', boxShadow: '0 0 8px var(--battery)' }}
              />
              Pyomo MILP optimizer · Live
            </span>
          </div>

          {/* Headline */}
          <h1
            className="text-center lg:text-left font-bold leading-[1.06] mb-8"
            style={{
              fontSize: 'clamp(2.8rem, 7vw, 5.5rem)',
              letterSpacing: '-0.04em',
              color: 'var(--site-page-fg)',
            }}
          >
            Solar intelligence
            <br />
            <span
              style={{
                background: 'linear-gradient(90deg, var(--battery) 10%, var(--battery-bright) 55%, var(--battery-soft) 100%)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              built for Kenya
            </span>
          </h1>

          <p
            className="text-center lg:text-left mx-auto lg:mx-0 mb-10"
            style={{
              fontSize: 'clamp(1rem, 2vw, 1.15rem)',
              color: 'var(--site-page-muted)',
              maxWidth: '52ch',
              lineHeight: 1.75,
            }}
          >
            SafariCharge turns your PV + BESS site into an optimised asset. Our MILP dispatch
            engine cuts KPLC peak charges, maximises self-consumption, and gives you real-time
            visibility into every kilowatt-hour.
          </p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-12">
            {heroKpis.map((kpi) => {
              const Icon = kpi.icon;
              return (
                <div
                  key={kpi.label}
                  className="rounded-2xl p-4"
                  style={{
                    background: 'var(--site-page-surface)',
                    border: '1px solid rgba(16,185,129,0.15)',
                    boxShadow: '0 0 24px rgba(16,185,129,0.08)',
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs" style={{ color: 'var(--site-page-muted)' }}>{kpi.label}</span>
                    <Icon className="w-4 h-4" style={{ color: 'var(--battery)' }} />
                  </div>
                  <div
                    className="text-lg font-semibold"
                    style={{ color: 'var(--site-page-fg)', letterSpacing: '-0.02em' }}
                  >
                    {kpi.value}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 mb-14">
            <Link
              href="/demo"
              aria-label="Open demo dashboard"
              className="group inline-flex items-center gap-2 font-semibold text-sm px-7 py-3.5 rounded-xl text-white transition-all"
              style={{
                background: 'var(--battery)',
                boxShadow: '0 0 40px rgba(16,185,129,0.3)',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.background = 'var(--battery-bright)';
                (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 0 56px rgba(16,185,129,0.45)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.background = 'var(--battery)';
                (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 0 40px rgba(16,185,129,0.3)';
              }}
            >
              Open dashboard <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a
              href="#features"
              className="group inline-flex items-center gap-2 text-sm px-6 py-3.5 rounded-xl transition-colors"
              style={{
                color: 'var(--site-page-muted)',
                border: '1px solid var(--site-page-border)',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.color = 'var(--site-page-fg)';
                (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--site-page-soft)';
                (e.currentTarget as HTMLAnchorElement).style.background = 'var(--site-page-surface)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.color = 'var(--site-page-muted)';
                (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--site-page-border)';
                (e.currentTarget as HTMLAnchorElement).style.background = 'transparent';
              }}
            >
              See features <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </a>
          </div>

          {/* Trust line */}
          <p
            className="text-center lg:text-left text-xs"
            style={{ color: 'var(--site-page-soft)' }}
          >
            Built for Nairobi&rsquo;s C&amp;I solar sites · KPLC TOU-aware · Open source
          </p>
        </div>
      </section>

      {/* ── Stats ── */}
      <section
        id="stats"
        style={{
          borderTop: '1px solid var(--site-page-border)',
          borderBottom: '1px solid var(--site-page-border)',
        }}
      >
        <div className="mx-auto max-w-7xl">
          <div
            className="grid grid-cols-2 md:grid-cols-4"
            style={{ borderLeft: '1px solid var(--site-page-border)' }}
          >
            {stats.map((s) => (
              <div
                key={s.label}
                className="py-12 px-8 text-center"
                style={{ borderRight: '1px solid var(--site-page-border)' }}
              >
                <div
                  className="font-black tabular-nums mb-1"
                  style={{
                    fontSize: 'clamp(2rem, 4vw, 2.8rem)',
                    color: 'var(--battery)',
                    letterSpacing: '-0.04em',
                  }}
                >
                  {s.value}
                </div>
                <div
                  className="text-sm font-medium mb-1"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {s.label}
                </div>
                <div className="text-xs mb-3" style={{ color: 'var(--site-page-soft)' }}>{s.sub}</div>
                <svg className="mx-auto" width="64" height="20" viewBox="0 0 60 20" fill="none" aria-hidden>
                  <polyline
                    points={s.sparkline}
                    fill="none"
                    stroke="var(--battery)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section
        className="py-28 px-6 sm:px-10"
        style={{ borderBottom: '1px solid var(--site-page-border)' }}
      >
        <div className="mx-auto max-w-7xl">
          <div className="mb-14">
            <div
              className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1 rounded-full mb-5"
              style={{
                background: 'var(--battery-soft)',
                border: '1px solid rgba(16,185,129,0.18)',
                color: 'var(--battery)',
              }}
            >
              How it works
            </div>
            <h2
              className="font-bold tracking-tight mb-4"
              style={{
                fontSize: 'clamp(1.8rem, 4vw, 2.8rem)',
                color: 'var(--site-page-fg)',
                letterSpacing: '-0.04em',
              }}
            >
              From telemetry to dispatch in minutes
            </h2>
          </div>

          <div className="relative">
            <div
              aria-hidden
              className="absolute left-8 top-2 bottom-2 hidden sm:block"
              style={{ width: '1px', background: 'var(--battery-soft)' }}
            />
            <div className="space-y-10">
              {steps.map((step, index) => (
                <div key={step.title} className="grid sm:grid-cols-[90px_1fr] gap-5 sm:gap-8 items-start">
                  <div
                    className="text-4xl sm:text-5xl font-black leading-none"
                    style={{ color: 'var(--battery)', letterSpacing: '-0.04em', opacity: 0.7 }}
                  >
                    {index + 1}
                  </div>
                  <div
                    className="rounded-2xl p-6"
                    style={{
                      background: 'var(--site-page-surface)',
                      border: '1px solid var(--site-page-border)',
                    }}
                  >
                    <h3
                      className="text-lg font-semibold mb-2"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {step.title}
                    </h3>
                    <p
                      className="text-sm"
                      style={{ color: 'var(--site-page-muted)', lineHeight: 1.7 }}
                    >
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-32 px-6 sm:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="mb-20">
            <div
              className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1 rounded-full mb-5"
              style={{
                background: 'var(--battery-soft)',
                border: '1px solid rgba(16,185,129,0.18)',
                color: 'var(--battery)',
              }}
            >
              <Cpu className="w-3 h-3" /> Platform capabilities
            </div>
            <h2
              className="font-bold tracking-tight mb-4"
              style={{
                fontSize: 'clamp(1.8rem, 4vw, 2.8rem)',
                color: 'var(--site-page-fg)',
                letterSpacing: '-0.04em',
              }}
            >
              Everything your site needs
            </h2>
            <p style={{ color: 'var(--site-page-muted)', lineHeight: 1.75, maxWidth: '44ch' }}>
              From raw inverter telemetry to globally-optimal dispatch schedules — all in one platform.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f, index) => {
              const Icon = f.icon;
              const isPrimary = index === 0;
              return (
                <div
                  key={f.title}
                  className={`group rounded-2xl p-8 transition-colors ${isPrimary ? 'sm:col-span-2 lg:col-span-2 lg:p-10' : ''}`}
                  style={{
                    background: 'var(--site-page-surface)',
                    border: '1px solid var(--site-page-border)',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-card-hover)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.background = 'var(--site-page-surface)';
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-xl grid place-items-center mb-5"
                    style={{
                      background: 'var(--battery-soft)',
                      border: '1px solid var(--battery-soft)',
                    }}
                  >
                    <Icon className="w-5 h-5" style={{ color: f.accent }} strokeWidth={1.8} />
                  </div>
                  <h3
                    className={`font-semibold mb-3 ${isPrimary ? 'text-xl' : 'text-[0.95rem]'}`}
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {f.title}
                  </h3>
                  <p
                    className={`leading-relaxed transition-colors ${isPrimary ? 'text-base max-w-3xl' : 'text-sm'}`}
                    style={{ color: 'var(--text-secondary)' }}
                  >
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
        style={{
          borderTop: '1px solid var(--site-page-border)',
          background: 'var(--battery-soft)',
        }}
      >
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 pointer-events-none"
          style={{
            height: '100%',
            background: 'radial-gradient(ellipse 50% 70% at 50% 50%, var(--battery-soft) 0%, transparent 70%)',
          }}
        />
        <div className="relative mx-auto max-w-3xl text-center">
          <Leaf className="w-10 h-10 mx-auto mb-6" style={{ color: 'var(--battery)', opacity: 0.6 }} />
          <h2
            className="font-bold tracking-tight mb-5"
            style={{
              fontSize: 'clamp(1.7rem, 3.5vw, 2.5rem)',
              color: 'var(--site-page-fg)',
              letterSpacing: '-0.04em',
            }}
          >
            Your dashboard is ready
          </h2>
          <p
            className="mb-10 mx-auto"
            style={{ color: 'var(--site-page-muted)', maxWidth: '46ch', lineHeight: 1.75 }}
          >
            No sign-in required. Explore real-time solar analytics, BESS dispatch, and
            KPLC cost modelling right now.
          </p>
          <Link
            href="/demo"
            className="group inline-flex items-center gap-2 font-semibold text-sm px-8 py-4 rounded-xl text-white transition-all"
            style={{
              background: 'var(--battery)',
              fontSize: '0.95rem',
              boxShadow: '0 0 40px rgba(16,185,129,0.28)',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.background = 'var(--battery-bright)';
              (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 0 56px rgba(16,185,129,0.42)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.background = 'var(--battery)';
              (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 0 40px rgba(16,185,129,0.28)';
            }}
          >
            Open dashboard <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section
        id="pricing"
        className="py-32 px-6 sm:px-10"
        style={{ borderTop: '1px solid var(--site-page-border)' }}
      >
        <div className="mx-auto max-w-7xl">
          <div className="mb-20">
            <div
              className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1 rounded-full mb-5"
              style={{
                background: 'var(--battery-soft)',
                border: '1px solid rgba(16,185,129,0.18)',
                color: 'var(--battery)',
              }}
            >
              Pricing
            </div>
            <h2
              className="font-bold tracking-tight mb-4"
              style={{
                fontSize: 'clamp(1.8rem, 4vw, 2.8rem)',
                color: 'var(--site-page-fg)',
                letterSpacing: '-0.04em',
              }}
            >
              Simple, transparent pricing
            </h2>
            <p style={{ color: 'var(--site-page-muted)' }}>Open-core. Start free, scale when ready.</p>
          </div>

          <div className="grid sm:grid-cols-3 gap-4 items-start">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`group rounded-2xl p-7 relative ${plan.highlight ? 'pro-glow' : ''}`}
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
                    style={{
                      background: 'var(--battery-soft)',
                      color: 'var(--battery)',
                      border: '1px solid rgba(16,185,129,0.2)',
                    }}
                  >
                    Most popular
                  </span>
                )}
                <h3 className="font-semibold text-lg mb-1" style={{ color: 'var(--text-primary)' }}>{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-2">
                  <span
                    className="text-3xl font-bold"
                    style={{ color: 'var(--site-page-fg)', letterSpacing: '-0.04em' }}
                  >
                    {plan.price}
                  </span>
                  {plan.period && (
                    <span className="text-sm" style={{ color: 'var(--site-page-muted)' }}>{plan.period}</span>
                  )}
                </div>
                <p className="text-sm mb-7" style={{ color: 'var(--site-page-muted)' }}>{plan.description}</p>
                <ul className="space-y-2.5 mb-9">
                  {plan.features.map((feat) => (
                    <li
                      key={feat}
                      className="flex items-start gap-2.5 text-sm"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      <Check className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--battery)' }} />
                      {feat}
                    </li>
                  ))}
                </ul>
                <Link
                  href={plan.href}
                  className={`block w-full text-center text-sm font-semibold py-2.5 rounded-xl transition-colors`}
                  style={{
                    background: plan.highlight ? 'var(--battery)' : 'transparent',
                    color: plan.highlight ? '#fff' : 'var(--site-page-muted)',
                    border: plan.highlight ? 'none' : '1px solid var(--site-page-border)',
                  }}
                  onMouseEnter={(e) => {
                    if (plan.highlight) {
                      (e.currentTarget as HTMLAnchorElement).style.background = 'var(--battery-bright)';
                    } else {
                      (e.currentTarget as HTMLAnchorElement).style.color = 'var(--site-page-fg)';
                      (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--site-page-soft)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (plan.highlight) {
                      (e.currentTarget as HTMLAnchorElement).style.background = 'var(--battery)';
                    } else {
                      (e.currentTarget as HTMLAnchorElement).style.color = 'var(--site-page-muted)';
                      (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--site-page-border)';
                    }
                  }}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
          <p className="mt-6 text-sm" style={{ color: 'var(--site-page-muted)' }}>
            All plans include the Pyomo MILP engine and KPLC tariff calculator
          </p>
        </div>
      </section>

      {/* ── Social proof ── */}
      <section
        className="px-6 sm:px-10 pb-24"
        style={{ borderTop: '1px solid var(--site-page-border)' }}
      >
        <div className="mx-auto max-w-7xl grid md:grid-cols-2 gap-4 pt-16">
          {testimonials.map((item) => (
            <div
              key={item.quote}
              className="rounded-2xl p-6"
              style={{
                background: 'var(--site-page-surface)',
                border: '1px solid var(--site-page-border)',
              }}
            >
              <Quote className="w-5 h-5 mb-4" style={{ color: 'var(--battery)' }} />
              <p className="text-base mb-3" style={{ color: 'var(--text-primary)' }}>
                <em>&ldquo;{item.quote}&rdquo;</em>
              </p>
              <p className="text-sm" style={{ color: 'var(--site-page-muted)' }}>— {item.by}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section
        className="py-32 px-6 sm:px-10"
        style={{ borderTop: '1px solid var(--site-page-border)' }}
      >
        <div className="mx-auto max-w-3xl text-center">
          <h2
            className="font-bold tracking-tight mb-5"
            style={{
              fontSize: 'clamp(1.8rem, 4vw, 2.8rem)',
              color: 'var(--site-page-fg)',
              letterSpacing: '-0.04em',
            }}
          >
            Ready to optimise your site?
          </h2>
          <p
            className="mb-10 mx-auto"
            style={{
              color: 'var(--site-page-muted)',
              maxWidth: '46ch',
              lineHeight: 1.75,
              fontSize: '1.05rem',
            }}
          >
            Join energy managers across Kenya already using SafariCharge to cut KPLC bills and
            maximise solar yield.
          </p>
          <Link
            href="/demo"
            className="group inline-flex items-center gap-2 font-semibold px-9 py-4 rounded-xl text-white transition-all"
            style={{
              background: 'var(--battery)',
              fontSize: '0.95rem',
              boxShadow: '0 0 48px rgba(16,185,129,0.3)',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.background = 'var(--battery-bright)';
              (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 0 64px rgba(16,185,129,0.44)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.background = 'var(--battery)';
              (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 0 48px rgba(16,185,129,0.3)';
            }}
          >
            Open dashboard <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer
        style={{ borderTop: '1px solid var(--site-page-border)' }}
        className="py-12 px-6 sm:px-10"
      >
        <div
          className="mx-auto max-w-7xl grid gap-10 md:grid-cols-3 text-sm"
          style={{ color: 'var(--site-page-muted)' }}
        >
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <svg width="18" height="18" viewBox="0 0 28 28" fill="none">
                <path d="M14 7 L17.5 13 L21 13 L14 21 L16 15 L12 15 Z" fill="var(--battery)" />
              </svg>
              <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>SafariCharge</span>
            </div>
            <p className="mb-2">Solar intelligence built for Kenya</p>
            <p>© {new Date().getFullYear()} SafariCharge</p>
          </div>

          <div>
            <p className="font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Links</p>
            <div className="space-y-2">
              <Link href="/demo" className="block transition-colors" style={{ color: 'var(--site-page-muted)' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-primary)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--site-page-muted)'; }}
              >Dashboard</Link>
              <a href="#features" className="block transition-colors" style={{ color: 'var(--site-page-muted)' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-primary)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--site-page-muted)'; }}
              >Features</a>
              <a href="#pricing" className="block transition-colors" style={{ color: 'var(--site-page-muted)' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-primary)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--site-page-muted)'; }}
              >Pricing</a>
              <a
                href="https://github.com/rauell1/safaricharge"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 transition-colors"
                style={{ color: 'var(--site-page-muted)' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-primary)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--site-page-muted)'; }}
              >
                GitHub <ArrowUpRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          <div>
            <p className="font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Contact</p>
            <a
              href="mailto:hello@safaricharge.ke"
              className="inline-flex mb-2 transition-colors"
              style={{ color: 'var(--site-page-muted)' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-primary)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--site-page-muted)'; }}
            >
              hello@safaricharge.ke
            </a>
            <p>Built in Nairobi 🇰🇪</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
