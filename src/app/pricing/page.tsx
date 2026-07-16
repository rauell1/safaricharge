import type { Metadata } from 'next'
import Link from 'next/link'
import { Check } from 'lucide-react'
import { SiteNav } from '@/components/marketing/SiteNav'
import { SiteFooter } from '@/components/marketing/SiteFooter'

export const metadata: Metadata = {
  title: 'Pricing -  Free Solar Simulation Platform',
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
    title: 'Pricing -  Free Solar Simulation Platform | SafariCharge',
    description: 'SafariCharge is free to use for solar + BESS simulation and KPLC tariff analysis.',
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'SafariCharge Pricing' }],
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
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: 'https://solar.rauell.systems/landing',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Pricing',
      },
    ],
  }

  const softwareAppJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'SafariCharge',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    description: 'Free solar PV + BESS microgrid simulation and KPLC tariff optimization tool.',
    url: 'https://solar.rauell.systems/pricing',
    image: 'https://solar.rauell.systems/opengraph-image',
    author: {
      '@type': 'Organization',
      name: 'SafariCharge',
      url: 'https://solar.rauell.systems',
    },
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      description: 'Free Plan',
    },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppJsonLd) }}
      />
      <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
        {/* Top glow backdrop, matching the landing hero */}
        <div
          aria-hidden
          className="pointer-events-none fixed inset-x-0 top-0 z-0 h-[40vh] [background:radial-gradient(ellipse_60%_40%_at_50%_-5%,var(--hero-glow)_0%,transparent_70%)]"
        />

        <SiteNav />

        <main className="relative flex flex-col items-center px-4 pt-40 pb-24">
          <div className="max-w-2xl w-full text-center">
            <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-[-0.03em] mb-4">
              Simple, transparent pricing
            </h1>
            <p className="text-[var(--text-tertiary)] text-lg mb-12">
              SafariCharge is free to use -  no credit card, no hidden fees.
            </p>

            {tiers.map((tier) => (
              <div
                key={tier.name}
                className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] shadow-[var(--card-shadow)] p-8 mb-8 text-left"
              >
                <div className="flex items-baseline gap-3 mb-2">
                  <span className="font-display tabular text-5xl font-bold text-[var(--battery)]">{tier.price}</span>
                  <span className="text-[var(--text-tertiary)]">/ {tier.period}</span>
                </div>
                <p className="text-xl font-semibold mb-6">{tier.name} plan</p>
                <ul className="space-y-3 mb-8">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm text-[var(--text-secondary)]">
                      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[var(--battery-soft)]">
                        <Check className="h-3 w-3 text-[var(--battery)]" strokeWidth={3} />
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/signup"
                  className="inline-block w-full text-center rounded-full bg-[var(--battery-bright)] text-white font-semibold py-3 px-6 shadow-[0_1px_2px_rgba(4,120,87,0.35),0_0_0_1px_rgba(4,120,87,0.12)] transition-all duration-200 hover:bg-[var(--battery)] hover:shadow-[0_4px_12px_rgba(4,120,87,0.25)] hover:-translate-y-px"
                >
                  Sign Up to Access Dashboard
                </Link>
              </div>
            ))}

            <p className="text-sm text-[var(--text-tertiary)]">
              Need enterprise deployment or custom integrations?{' '}
              <a href="mailto:royokola3@gmail.com" className="text-[var(--battery)] hover:underline">
                Contact us
              </a>
            </p>
          </div>
        </main>

        <SiteFooter />
      </div>
    </>
  )
}
