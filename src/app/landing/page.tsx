'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Sun, Zap, BarChart3, Battery, ArrowRight, Shield,
  Globe, TrendingDown, Check, Activity, ChevronRight, Cpu, Leaf, Quote, ArrowUpRight,
  Menu, X,
} from 'lucide-react';
import { BrandLogo } from '@/components/brand-logo';

const features = [
  {
    icon: Zap,
    title: 'Battery Dispatch Optimizer',
    description:
      'Automatically minimize your Kenya Power electricity bill. Our MILP engine calculates the ideal solar battery charge and discharge schedule every 5 minutes -  storing solar energy when it\'s cheap and deploying it during KPLC peak tariff windows.',
    accent: 'var(--battery)',
  },
  {
    icon: BarChart3,
    title: 'Real-Time Solar Analytics',
    description:
      'Monitor your solar panels\' live AC output, track irradiance, catch inverter limits, and detect curtailment -  all from a single dashboard built for Kenyan solar installations.',
    accent: 'var(--solar)',
  },
  {
    icon: Battery,
    title: 'Smart Battery Management',
    description:
      'Keep your battery storage system healthy and cost-effective. Automatic state-of-charge protection, smart charge/discharge logic, and battery health KPIs -  no expensive BMS hardware required.',
    accent: 'var(--grid)',
  },
  {
    icon: Globe,
    title: 'KPLC Tariff Engine',
    description:
      'Model your exact Kenya Power electricity bill -  base rate, fuel surcharge, FERFA, INFA, ERC levy, WRA, and VAT -  across EV, domestic, and commercial tariff profiles.',
    accent: 'var(--ev)',
  },
  {
    icon: TrendingDown,
    title: 'Savings & Carbon Reports',
    description:
      'See monthly KSh savings against your KPLC baseline, grid displacement percentage, CO₂ emissions avoided, and peak demand reduction -  exportable to CSV or PDF.',
    accent: 'var(--consumption)',
  },
  {
    icon: Shield,
    title: 'Scalable to Any Site',
    description:
      'Add diesel generators, EV smart charging, or thermal loads as modular blocks. SafariCharge scales from a single rooftop solar installation to a full microgrid without rewriting your model.',
    accent: 'var(--battery)',
  },
];

const stats = [
  { value: '40%', label: 'Peak demand reduction', sub: 'vs. unoptimised baseline', sparkline: '2,16 16,10 30,12 44,8 58,6' },
  { value: '100%', label: 'Free to use', sub: 'Open-core simulation model', sparkline: '2,14 16,14 30,11 44,9 58,7' },
  { value: '5 min', label: 'Re-optimisation cycle', sub: 'Rolling horizon dispatch', sparkline: '2,15 16,12 30,9 44,7 58,5' },
  { value: '99.2%', label: 'Energy balance accuracy', sub: 'Validated on live sites', sparkline: '2,18 16,14 30,11 44,9 58,8' },
];


const heroKpis = [
  { label: 'Solar Output', value: '47.3 kW', icon: Sun },
  { label: 'BESS SoC', value: '78%', icon: Battery },
  { label: 'Grid Cost Saved', value: 'KES 2,840', icon: TrendingDown },
  { label: 'CO₂ Avoided', value: '12.4 kg', icon: Leaf },
];

const steps = [
  {
    title: 'Define your solar system',
    description: 'Enter your solar panel capacity, battery storage specs, and location -  or connect a live Modbus feed from SMA, Fronius, or Sungrow inverters.',
  },
  {
    title: 'Optimize battery dispatch',
    description: 'SafariCharge calculates the optimal charge and discharge schedule every 5 minutes, automatically shifting load away from KPLC peak tariff windows to cut your electricity bill.',
  },
  {
    title: 'Track savings and export',
    description: 'View real-time solar output, battery state of charge, KPLC cost savings in KSh, and CO₂ avoided -  all exportable to CSV or PDF.',
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
            <Link
              href="/dashboard"
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
              href="/login"
              className="hidden sm:inline-flex items-center gap-1.5 text-sm font-medium px-3.5 py-1.5 rounded-lg transition-colors"
              style={{
                color: 'var(--site-nav-link)',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--battery)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--site-nav-link)'; }}
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-1.5 rounded-lg transition-colors"
              style={{ background: 'var(--battery)', color: '#fff' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = 'var(--battery-bright)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = 'var(--battery)'; }}
            >
              Get Started <ArrowRight className="w-3.5 h-3.5" />
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
            <div className="mt-2 pt-3 flex flex-col gap-2" style={{ borderTop: '1px solid var(--site-page-border)' }}>
              <Link
                href="/dashboard"
                className="flex items-center justify-center gap-1.5 text-sm font-medium px-4 py-2 rounded-xl transition-colors"
                style={{ color: 'var(--site-nav-link)', border: '1px solid var(--site-page-border)' }}
                onClick={() => setMobileMenuOpen(false)}
              >
                <Activity className="w-3.5 h-3.5" /> Dashboard
              </Link>
              <Link
                href="/login"
                className="flex items-center justify-center gap-1.5 text-sm font-medium px-4 py-2 rounded-xl transition-colors"
                style={{ color: 'var(--site-nav-link)', border: '1px solid var(--site-page-border)' }}
                onClick={() => setMobileMenuOpen(false)}
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="flex items-center justify-center gap-1.5 text-sm font-semibold px-4 py-2.5 rounded-xl text-white transition-colors"
                style={{ background: 'var(--battery)' }}
                onClick={() => setMobileMenuOpen(false)}
              >
                Get Started <ArrowRight className="w-3.5 h-3.5" />
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
              Free solar energy simulator · Live
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
            Solar energy management
            <br />
            <span
              style={{
                background: 'linear-gradient(90deg, var(--battery) 10%, var(--battery-bright) 55%, var(--battery-soft) 100%)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              for Kenya &amp; Africa
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
            Reducing your Kenya Power electricity bill takes more than solar panels -  it requires
            smart battery dispatch and accurate tariff modelling. SafariCharge simulates your solar
            + battery system, optimises charge cycles against KPLC peak rates, and shows exactly
            how much you save each month.
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
              href="/dashboard"
              aria-label="Access the application"
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
              Go to App <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </Link>

            <a
              href="#features"
              className="group inline-flex items-center gap-2 text-sm px-5 py-3.5 transition-colors"
              style={{
                color: 'var(--site-page-muted)',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.color = 'var(--site-page-fg)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.color = 'var(--site-page-muted)';
              }}
            >
              Learn more <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </a>
          </div>

          {/* Trust line */}
          <p
            className="text-center lg:text-left text-xs"
            style={{ color: 'var(--site-page-soft)' }}
          >
            For solar engineers &amp; energy managers in Kenya and Africa · KPLC TOU-aware · Free to use
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
              From solar panels to savings in minutes
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
              Solar energy management tools for Kenya
            </h2>
            <p style={{ color: 'var(--site-page-muted)', lineHeight: 1.75, maxWidth: '44ch' }}>
              From solar panel monitoring to battery dispatch optimization and KPLC tariff analysis -  everything a Kenyan solar installation needs in one free platform.
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
            Start reducing your electricity bill today
          </h2>
          <p
            className="mb-10 mx-auto"
            style={{ color: 'var(--site-page-muted)', maxWidth: '46ch', lineHeight: 1.75 }}
          >
            Create a free account to access live solar analytics, automatic battery dispatch, and
            KPLC electricity cost modelling for your Kenya solar system.
          </p>
          <Link
            href="/dashboard"
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
            Go to Dashboard <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
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
              <p className="text-sm" style={{ color: 'var(--site-page-muted)' }}> -  {item.by}</p>
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
            Ready to cut your electricity bill with solar?
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
            Join solar engineers and energy managers across Kenya already using SafariCharge to
            reduce KPLC electricity costs and maximise solar panel output.
          </p>
          <Link
            href="/dashboard"
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
            Get Started Now <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
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
            <p className="mb-2">Solar energy management for Kenya and Africa</p>
            <p>© {new Date().getFullYear()} SafariCharge</p>
          </div>

          <div>
            <p className="font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Links</p>
            <div className="space-y-2">
              <Link href="/dashboard" className="block transition-colors" style={{ color: 'var(--site-page-muted)' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-primary)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--site-page-muted)'; }}
              >Dashboard</Link>
              <a href="#features" className="block transition-colors" style={{ color: 'var(--site-page-muted)' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-primary)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--site-page-muted)'; }}
              >Features</a>

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
