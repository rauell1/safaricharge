import Link from 'next/link';
import { Sun, Zap, BarChart3, Battery, ArrowRight, Shield, Globe, TrendingDown, Check } from 'lucide-react';

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
  },
  {
    icon: BarChart3,
    title: 'Real-Time Solar Analytics',
    description:
      'Live AC output, irradiance correlation, inverter limit tracking, and curtailment detection — all in a single dashboard.',
  },
  {
    icon: Battery,
    title: 'BESS State-of-Charge Intelligence',
    description:
      'SoC bounds enforcement, binary charge/discharge mutex, and battery health KPIs surfaced without a proprietary BMS integration.',
  },
  {
    icon: Globe,
    title: 'KPLC Tariff Engine',
    description:
      'Full all-in pricing — base rate, fuel surcharge, FERFA, INFA, ERC, WRA, and VAT — for EV, domestic, and small-commercial profiles.',
  },
  {
    icon: TrendingDown,
    title: 'Cost & Carbon KPIs',
    description:
      'Per-cycle cost savings, grid displacement percentage, CO₂ avoided, and peak demand shaving — exportable to CSV or PDF.',
  },
  {
    icon: Shield,
    title: 'Block-Structured Extensibility',
    description:
      'Add gensets, EV smart charging, or thermal loads as new optimiser blocks without modifying existing simulation logic.',
  },
];

const stats = [
  { value: '40%', label: 'Average peak demand reduction' },
  { value: 'KES 0', label: 'Licence fee — open-core model' },
  { value: '5 min', label: 'Dispatch re-optimisation cycle' },
  { value: '99.2%', label: 'Energy balance accuracy' },
];

const plans = [
  {
    name: 'Open Core',
    price: 'Free',
    description: 'Self-hosted. Full simulation and optimisation engine.',
    cta: 'Get started',
    href: '/login',
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
    <div className="min-h-screen bg-[#0d1117] text-white font-sans antialiased">
      {/* ── Nav ── */}
      <header className="fixed top-0 inset-x-0 z-50 border-b border-white/[0.06] bg-[#0d1117]/80 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/landing" className="flex items-center gap-2.5">
            <span className="grid place-items-center w-8 h-8 rounded-lg bg-emerald-500/15">
              <Sun className="w-4 h-4 text-emerald-400" strokeWidth={2.5} />
            </span>
            <span className="font-semibold tracking-tight text-white">SafariCharge</span>
          </Link>
          <nav className="hidden md:flex items-center gap-7 text-sm text-white/60">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#stats" className="hover:text-white transition-colors">Performance</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <a href="https://github.com/rauell1/safaricharge" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">GitHub</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm text-white/60 hover:text-white transition-colors px-3 py-1.5"
            >
              Sign in
            </Link>
            <Link
              href="/login"
              className="text-sm font-medium bg-emerald-500 hover:bg-emerald-400 text-black px-4 py-1.5 rounded-lg transition-colors"
            >
              Get access
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative pt-36 pb-24 px-4 sm:px-6 overflow-hidden">
        {/* Ambient glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-[520px]"
          style={{
            background:
              'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(16,185,129,0.18) 0%, transparent 70%)',
          }}
        />
        <div className="relative mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 text-xs font-medium text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-3 py-1 rounded-full mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Pyomo MILP optimizer now live
          </span>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-white leading-[1.1] mb-6">
            AI-Optimised Solar EMS
            <span className="block text-emerald-400">Built for Kenya</span>
          </h1>
          <p className="text-lg text-white/55 max-w-2xl mx-auto mb-10 leading-relaxed">
            SafariCharge turns your PV + BESS site into an optimised asset. Our MILP dispatch
            engine cuts KPLC peak charges, maximises self-consumption, and gives you real-time
            visibility into every kilowatt-hour.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-sm px-6 py-3 rounded-xl transition-colors"
            >
              Get early access <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/demo"
              className="inline-flex items-center gap-2 border border-white/15 hover:border-white/30 text-white/70 hover:text-white text-sm px-6 py-3 rounded-xl transition-colors"
            >
              Live demo
            </Link>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section id="stats" className="py-16 px-4 sm:px-6 border-y border-white/[0.06]">
        <div className="mx-auto max-w-6xl grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-emerald-400 tabular-nums mb-1">
                {s.value}
              </div>
              <div className="text-sm text-white/45">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-24 px-4 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Everything your site needs</h2>
            <p className="text-white/45 max-w-xl mx-auto">
              From raw inverter telemetry to globally-optimal dispatch schedules — all in one platform.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="rounded-2xl border border-white/[0.07] bg-white/[0.03] hover:bg-white/[0.05] p-6 transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 grid place-items-center mb-4">
                    <Icon className="w-5 h-5 text-emerald-400" strokeWidth={1.8} />
                  </div>
                  <h3 className="font-semibold text-white mb-2">{f.title}</h3>
                  <p className="text-sm text-white/45 leading-relaxed">{f.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="py-24 px-4 sm:px-6 border-t border-white/[0.06]">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Simple pricing</h2>
            <p className="text-white/45 max-w-md mx-auto">Open-core. Start free, scale when ready.</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-5 items-start">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl p-6 border ${
                  plan.highlight
                    ? 'border-emerald-500/40 bg-emerald-500/[0.06] ring-1 ring-emerald-500/20'
                    : 'border-white/[0.07] bg-white/[0.03]'
                }`}
              >
                {plan.highlight && (
                  <span className="inline-flex text-xs font-medium text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2.5 py-0.5 rounded-full mb-3">
                    Most popular
                  </span>
                )}
                <h3 className="font-semibold text-white text-lg mb-1">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-3xl font-bold text-white">{plan.price}</span>
                  {plan.period && <span className="text-sm text-white/40">{plan.period}</span>}
                </div>
                <p className="text-sm text-white/45 mb-6">{plan.description}</p>
                <ul className="space-y-2.5 mb-8">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-2.5 text-sm text-white/60">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      {feat}
                    </li>
                  ))}
                </ul>
                <Link
                  href={plan.href}
                  className={`block w-full text-center text-sm font-medium py-2.5 rounded-xl transition-colors ${
                    plan.highlight
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-black'
                      : 'border border-white/15 hover:border-white/30 text-white/70 hover:text-white'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-5">
            Ready to optimise your site?
          </h2>
          <p className="text-white/45 mb-8">
            Join energy managers across Kenya already using SafariCharge to cut KPLC bills and
            maximise solar yield.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-sm px-8 py-3.5 rounded-xl transition-colors"
          >
            Get early access <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/[0.06] py-10 px-4 sm:px-6">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-white/30">
          <div className="flex items-center gap-2">
            <Sun className="w-4 h-4 text-emerald-500/60" />
            <span>© {new Date().getFullYear()} SafariCharge. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/login" className="hover:text-white/60 transition-colors">Sign in</Link>
            <a href="https://github.com/rauell1/safaricharge" target="_blank" rel="noopener noreferrer" className="hover:text-white/60 transition-colors">GitHub</a>
            <a href="mailto:hello@safaricharge.ke" className="hover:text-white/60 transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
