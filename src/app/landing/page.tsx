'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Sun, Zap, BarChart3, Battery, ArrowRight, Shield,
  Globe, TrendingDown, ChevronRight, Cpu, Leaf, Quote,
} from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { SiteNav, marketingCta } from '@/components/marketing/SiteNav';
import { SiteFooter } from '@/components/marketing/SiteFooter';
import { cn } from '@/lib/utils';

const features = [
  {
    icon: Zap,
    title: 'Battery Dispatch Optimizer',
    description:
      'Automatically minimize your Kenya Power electricity bill. Our MILP engine calculates the ideal solar battery charge and discharge schedule every 5 minutes -  storing solar energy when it\'s cheap and deploying it during KPLC peak tariff windows.',
    accent: 'var(--battery)',
    accentSoft: 'var(--battery-soft)',
  },
  {
    icon: BarChart3,
    title: 'Real-Time Solar Analytics',
    description:
      'Monitor your solar panels\' live AC output, track irradiance, catch inverter limits, and detect curtailment -  all from a single dashboard built for Kenyan solar installations.',
    accent: 'var(--solar)',
    accentSoft: 'var(--solar-soft)',
  },
  {
    icon: Battery,
    title: 'Smart Battery Management',
    description:
      'Keep your battery storage system healthy and cost-effective. Automatic state-of-charge protection, smart charge/discharge logic, and battery health KPIs -  no expensive BMS hardware required.',
    accent: 'var(--grid)',
    accentSoft: 'var(--grid-soft)',
  },
  {
    icon: Globe,
    title: 'KPLC Tariff Engine',
    description:
      'Model your exact Kenya Power electricity bill -  base rate, fuel surcharge, FERFA, INFA, ERC levy, WRA, and VAT -  across EV, domestic, and commercial tariff profiles.',
    accent: 'var(--ev)',
    accentSoft: 'var(--ev-soft)',
  },
  {
    icon: TrendingDown,
    title: 'Savings & Carbon Reports',
    description:
      'See monthly KSh savings against your KPLC baseline, grid displacement percentage, CO₂ emissions avoided, and peak demand reduction -  exportable to CSV or PDF.',
    accent: 'var(--consumption)',
    accentSoft: 'var(--consumption-soft)',
  },
  {
    icon: Shield,
    title: 'Scalable to Any Site',
    description:
      'Add diesel generators, EV smart charging, or thermal loads as modular blocks. SafariCharge scales from a single rooftop solar installation to a full microgrid without rewriting your model.',
    accent: 'var(--battery)',
    accentSoft: 'var(--battery-soft)',
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

const sectionBadgeCls =
  'inline-flex items-center gap-2 text-xs font-semibold px-3 py-1 rounded-full mb-5 ' +
  'bg-[var(--battery-soft)] border border-[var(--battery)]/20 text-[var(--battery)]';

export default function LandingPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        setIsAuthenticated(!!session?.user);
      } catch {
        setIsAuthenticated(false);
      }
    };
    checkAuth();
  }, []);

  const appHref = isAuthenticated ? '/dashboard' : '/signup';

  return (
    <div className="min-h-screen antialiased bg-[var(--bg-primary)] text-[var(--text-primary)]">
      {/* ── Subtle grid bg ── */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 [background-image:linear-gradient(var(--grid-line)_1px,transparent_1px),linear-gradient(90deg,var(--grid-line)_1px,transparent_1px)] [background-size:80px_80px]"
      />
      {/* Top glow */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 z-0 h-[50vh] [background:radial-gradient(ellipse_60%_40%_at_50%_-5%,var(--hero-glow)_0%,transparent_70%)]"
      />

      <SiteNav />

      {/* ── Hero ── */}
      <section className="relative pt-44 pb-32 px-6 sm:px-10 overflow-hidden">
        <div className="relative mx-auto max-w-7xl">
          {/* Live pill */}
          <div className="flex justify-center lg:justify-start mb-9">
            <span className="inline-flex items-center gap-2 text-xs font-semibold px-3.5 py-1.5 rounded-full bg-[var(--battery-soft)] border border-[var(--battery)]/20 text-[var(--battery)]">
              <span className="w-1.5 h-1.5 rounded-full animate-pulse bg-[var(--battery)] shadow-[0_0_8px_var(--battery)]" />
              Free solar energy simulator · Live
            </span>
          </div>

          {/* Headline */}
          <h1 className="font-display text-center lg:text-left font-bold leading-[1.04] tracking-[-0.03em] mb-8 text-[clamp(2.8rem,7vw,5.5rem)] text-[var(--text-primary)]">
            Solar energy management
            <br />
            <span className="bg-gradient-to-r from-[var(--battery)] via-[var(--battery-bright)] to-[var(--solar-bright)] bg-clip-text text-transparent">
              for Kenya &amp; Africa
            </span>
          </h1>

          <p className="text-center lg:text-left mx-auto lg:mx-0 mb-10 max-w-[52ch] leading-[1.75] text-[clamp(1rem,2vw,1.15rem)] text-[var(--text-tertiary)]">
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
                  className="rounded-2xl p-4 bg-[var(--bg-card)] border border-[var(--border)] shadow-[var(--card-shadow)]"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-[var(--text-muted)]">{kpi.label}</span>
                    <Icon className="w-4 h-4 text-[var(--battery)]" />
                  </div>
                  <div className="font-display tabular text-lg font-semibold tracking-tight text-[var(--text-primary)]">
                    {kpi.value}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 mb-14">
            <Link href={appHref} aria-label="Access the application" className={cn(marketingCta, 'text-sm px-7 py-3.5')}>
              {isAuthenticated ? 'Go to Dashboard' : 'Get Started - Free'}
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </Link>

            <a
              href="#features"
              className="group inline-flex items-center gap-2 text-sm px-5 py-3.5 text-[var(--text-tertiary)] transition-colors hover:text-[var(--text-primary)]"
            >
              Learn more <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </a>
          </div>

          {/* Trust line */}
          <p className="text-center lg:text-left text-xs text-[var(--text-muted)]">
            For solar engineers &amp; energy managers in Kenya and Africa · KPLC TOU-aware · Free to use
          </p>
        </div>
      </section>

      {/* ── Stats ── */}
      <section id="stats" className="border-y border-[var(--border)] bg-[var(--bg-card)]/60">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-2 md:grid-cols-4 border-l border-[var(--border)]">
            {stats.map((s) => (
              <div key={s.label} className="py-12 px-8 text-center border-r border-[var(--border)]">
                <div className="font-display tabular font-bold mb-1 tracking-[-0.03em] text-[clamp(2rem,4vw,2.8rem)] text-[var(--battery)]">
                  {s.value}
                </div>
                <div className="text-sm font-medium mb-1 text-[var(--text-primary)]">{s.label}</div>
                <div className="text-xs mb-3 text-[var(--text-muted)]">{s.sub}</div>
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
      <section className="py-28 px-6 sm:px-10 border-b border-[var(--border)]">
        <div className="mx-auto max-w-7xl">
          <div className="mb-14">
            <div className={sectionBadgeCls}>How it works</div>
            <h2 className="font-display font-bold tracking-[-0.03em] mb-4 text-[clamp(1.8rem,4vw,2.8rem)] text-[var(--text-primary)]">
              From solar panels to savings in minutes
            </h2>
          </div>

          <div className="relative">
            <div aria-hidden className="absolute left-8 top-2 bottom-2 hidden sm:block w-px bg-[var(--battery-soft)]" />
            <div className="space-y-10">
              {steps.map((step, index) => (
                <div key={step.title} className="grid sm:grid-cols-[90px_1fr] gap-5 sm:gap-8 items-start">
                  <div className="font-display text-4xl sm:text-5xl font-bold leading-none tracking-[-0.03em] text-[var(--battery)]/70">
                    {index + 1}
                  </div>
                  <div className="rounded-2xl p-6 bg-[var(--bg-card)] border border-[var(--border)] shadow-[var(--card-shadow)]">
                    <h3 className="text-lg font-semibold mb-2 text-[var(--text-primary)]">{step.title}</h3>
                    <p className="text-sm leading-[1.7] text-[var(--text-tertiary)]">{step.description}</p>
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
            <div className={sectionBadgeCls}>
              <Cpu className="w-3 h-3" /> Platform capabilities
            </div>
            <h2 className="font-display font-bold tracking-[-0.03em] mb-4 text-[clamp(1.8rem,4vw,2.8rem)] text-[var(--text-primary)]">
              Solar energy management tools for Kenya
            </h2>
            <p className="max-w-[44ch] leading-[1.75] text-[var(--text-tertiary)]">
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
                  className={cn(
                    'group rounded-2xl p-8 bg-[var(--bg-card)] border border-[var(--border)] shadow-[var(--card-shadow)]',
                    'transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--border-hover)] hover:shadow-[var(--card-shadow-hover)]',
                    isPrimary && 'sm:col-span-2 lg:col-span-2 lg:p-10'
                  )}
                >
                  <div
                    className="w-10 h-10 rounded-xl grid place-items-center mb-5 border border-[var(--border)]"
                    style={{ background: f.accentSoft }}
                  >
                    <Icon className="w-5 h-5" style={{ color: f.accent }} strokeWidth={1.8} />
                  </div>
                  <h3 className={cn('font-semibold mb-3 text-[var(--text-primary)]', isPrimary ? 'text-xl' : 'text-[0.95rem]')}>
                    {f.title}
                  </h3>
                  <p className={cn('leading-relaxed text-[var(--text-secondary)]', isPrimary ? 'text-base max-w-3xl' : 'text-sm')}>
                    {f.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── CTA band ── */}
      <section className="py-24 px-6 sm:px-10 relative overflow-hidden border-t border-[var(--border)] bg-[var(--battery-soft)]">
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none [background:radial-gradient(ellipse_50%_70%_at_50%_50%,var(--hero-glow)_0%,transparent_70%)]"
        />
        <div className="relative mx-auto max-w-3xl text-center">
          <Leaf className="w-10 h-10 mx-auto mb-6 text-[var(--battery)]/60" />
          <h2 className="font-display font-bold tracking-[-0.03em] mb-5 text-[clamp(1.7rem,3.5vw,2.5rem)] text-[var(--text-primary)]">
            Start reducing your electricity bill today
          </h2>
          <p className="mb-10 mx-auto max-w-[46ch] leading-[1.75] text-[var(--text-secondary)]">
            Create a free account to access live solar analytics, automatic battery dispatch, and
            KPLC electricity cost modelling for your Kenya solar system.
          </p>
          <Link href={appHref} className={cn(marketingCta, 'text-[0.95rem] px-8 py-4')}>
            {isAuthenticated ? 'Go to Dashboard' : 'Sign Up for Free'}
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </section>

      {/* ── Social proof ── */}
      <section className="px-6 sm:px-10 pb-24 border-t border-[var(--border)]">
        <div className="mx-auto max-w-7xl grid md:grid-cols-2 gap-4 pt-16">
          {testimonials.map((item) => (
            <div key={item.quote} className="rounded-2xl p-6 bg-[var(--bg-card)] border border-[var(--border)] shadow-[var(--card-shadow)]">
              <Quote className="w-5 h-5 mb-4 text-[var(--battery)]" />
              <p className="text-base mb-3 text-[var(--text-primary)]">
                <em>&ldquo;{item.quote}&rdquo;</em>
              </p>
              <p className="text-sm text-[var(--text-tertiary)]"> -  {item.by}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="py-32 px-6 sm:px-10 border-t border-[var(--border)]">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-display font-bold tracking-[-0.03em] mb-5 text-[clamp(1.8rem,4vw,2.8rem)] text-[var(--text-primary)]">
            Ready to cut your electricity bill with solar?
          </h2>
          <p className="mb-10 mx-auto max-w-[46ch] leading-[1.75] text-[1.05rem] text-[var(--text-tertiary)]">
            Join solar engineers and energy managers across Kenya already using SafariCharge to
            reduce KPLC electricity costs and maximise solar panel output.
          </p>
          <Link href={appHref} className={cn(marketingCta, 'text-[0.95rem] px-9 py-4')}>
            {isAuthenticated ? 'Go to Dashboard' : 'Get Started Now'}
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
