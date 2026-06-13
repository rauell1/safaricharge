import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Pricing — Free Solar Simulation Platform | SafariCharge',
  description:
    'SafariCharge is free to use. Simulate solar PV + BESS systems, run MILP dispatch optimization, and analyze KPLC tariff savings at no cost.',
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-snippet': -1 },
  },
  alternates: {
    canonical: 'https://solar.rauell.systems/pricing',
  },
  openGraph: {
    type: 'website',
    locale: 'en_KE',
    url: 'https://solar.rauell.systems/pricing',
    siteName: 'SafariCharge',
    title: 'Pricing — Free Solar Simulation Platform | SafariCharge',
    description: 'SafariCharge is free to use for solar + BESS simulation and KPLC tariff analysis.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'SafariCharge Pricing' }],
  },
}

const tiers = [
  {
    name: 'Free',
    price: 'KSh 0',
    period: 'forever',
    highlight: true,
    features: [
      'Full solar PV + BESS simulator',
      'MILP dispatch optimizer',
      'KPLC tariff engine (all surcharges)',
      'EV, domestic & commercial profiles',
      'Financial ROI & NPV analysis',
      'Carbon footprint tracking',
      '200+ Africa location presets',
      'CSV & PDF export',
      'Scenario save & compare',
      'AI energy assistant',
    ],
  },
]

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex flex-col items-center justify-center px-4 py-24">
      <div className="max-w-2xl w-full text-center">
        <h1 className="text-4xl font-bold mb-4">Simple, transparent pricing</h1>
        <p className="text-[var(--text-secondary)] text-lg mb-12">
          SafariCharge is free to use — no credit card, no hidden fees.
        </p>

        {tiers.map((tier) => (
          <div
            key={tier.name}
            className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-8 mb-8 text-left"
          >
            <div className="flex items-baseline gap-3 mb-2">
              <span className="text-5xl font-bold text-[var(--solar)]">{tier.price}</span>
              <span className="text-[var(--text-secondary)]">/ {tier.period}</span>
            </div>
            <p className="text-xl font-semibold mb-6">{tier.name} plan</p>
            <ul className="space-y-3 mb-8">
              {tier.features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                  <span className="text-[var(--solar)]">✓</span>
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href="/demo"
              className="inline-block w-full text-center bg-[var(--solar)] text-black font-semibold py-3 px-6 rounded-lg hover:opacity-90 transition-opacity"
            >
              Try the demo — no sign-up
            </Link>
          </div>
        ))}

        <p className="text-sm text-[var(--text-secondary)]">
          Need enterprise deployment or custom integrations?{' '}
          <a href="mailto:royokola3@gmail.com" className="text-[var(--solar)] hover:underline">
            Contact us
          </a>
        </p>
      </div>
    </main>
  )
}
